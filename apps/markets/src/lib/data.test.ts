import { expect, it } from "vitest";
import { getDay, getReference, listDays } from "./data";

it("读取真实公开样例且保持契约", async () => {
  expect((await getDay()).date).toBe("2026-08-28");
  expect(await listDays()).toHaveLength(2);
  expect((await getReference()).directions).toHaveLength(16);
});
