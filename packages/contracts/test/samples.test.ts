// fixtures/samples 全部通过 JSON Schema 校验（T01 验收；TS 这一侧，Python 那一侧在 hub-contracts/tests）。
// 自动发现全部样例，包括以后任务放在 fixtures/samples/<任务ID>/ 下的；文件名里的模型名决定用哪个 schema。
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createAjv,
  listSampleFiles,
  parseSampleName,
  readJson,
  SAMPLES,
  SCHEMAS,
} from "./support/repo";

const files = listSampleFiles();
const ajv = createAjv();

describe("fixtures/samples", () => {
  it("找得到样例（至少有平台和自选股的）", () => {
    expect(files.some((file) => file.startsWith("platform/"))).toBe(true);
    expect(files.some((file) => file.startsWith("watchlist/"))).toBe(true);
  });

  it.each(files)("%s 通过对应模型的 JSON Schema", (file) => {
    const parsed = parseSampleName(basename(file));
    if (parsed === undefined) {
      throw new Error(`${file}：样例文件名必须是 <模型名>.<变体>.json（模型名大写开头）`);
    }
    if (!existsSync(join(SCHEMAS, `${parsed.model}.json`))) {
      throw new Error(
        `${file}：找不到模型 ${parsed.model} 的 JSON Schema（contracts/generated/schemas/${parsed.model}.json）`,
      );
    }
    const validate = ajv.getSchema(`${parsed.model}.json`);
    if (validate === undefined) throw new Error(`${parsed.model}.json 没有载入`);
    const content = readJson(join(SAMPLES, file));
    const items = Array.isArray(content) ? content : [content];
    expect(items.length, `${file} 是空数组`).toBeGreaterThan(0);
    const problems = items.flatMap((item, index) =>
      validate(item)
        ? []
        : [`第 ${index + 1} 份：${ajv.errorsText(validate.errors, { separator: "；" })}`],
    );
    expect(problems, file).toEqual([]);
  });
});
