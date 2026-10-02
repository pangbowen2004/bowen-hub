import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { atomicWrite } from "../scripts/atomic-write";

it("并发发布期间实际文件读者只看见旧版或新版完整模块", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-registry-"));
  const target = join(directory, "registry.ts");
  const module = (version: string) =>
    `export const registryData = ${JSON.stringify({ version, content: version.repeat(512 * 1024) })};\n`;
  const old = module("old");
  const next = module("new");
  try {
    await writeFile(target, old);
    let finished = false;
    const writes = Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        for (let round = 0; round < 6; round++) {
          await atomicWrite(target, (round + index) % 2 === 0 ? next : old);
        }
      }),
    ).finally(() => {
      finished = true;
    });
    const snapshots: string[] = [];
    // 始终收尾写者；即使发现截断也不让后台写入越过测试清理。
    try {
      do {
        snapshots.push(await readFile(target, "utf8"));
      } while (!finished);
    } finally {
      await writes;
    }
    expect(snapshots.length).toBeGreaterThan(0);
    for (const snapshot of snapshots) {
      expect(snapshot === old || snapshot === next).toBe(true);
    }
    for (const snapshot of new Set(snapshots)) {
      const loaded = await import(
        `data:text/javascript;base64,${Buffer.from(snapshot).toString("base64")}`
      );
      expect(["old", "new"]).toContain(loaded.registryData.version);
    }
    expect(await readdir(directory)).toEqual(["registry.ts"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("发布失败保留原错误和目标并清除临时文件", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-registry-failure-"));
  const target = join(directory, "registry.ts");
  try {
    await mkdir(target);
    await writeFile(join(target, "sentinel"), "unchanged");
    await expect(atomicWrite(target, "export const registryData = {};\n")).rejects.toMatchObject({
      code: expect.stringMatching(/^(EISDIR|EPERM)$/),
    });
    expect(await readFile(join(target, "sentinel"), "utf8")).toBe("unchanged");
    expect(await readdir(directory)).toEqual(["registry.ts"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
