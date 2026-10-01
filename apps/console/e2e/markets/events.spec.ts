import { expect, test } from "@playwright/test";

test("事件新增编辑删除走通", async ({ page }) => {
  await page.goto("/markets/events");
  await expect(page.getByRole("heading", { name: "样例：产业应用验证窗口" })).toBeVisible();
  await page.getByRole("button", { name: "新增事件" }).click();
  await page.getByLabel("事件标题", { exact: true }).fill("测试：真实表单事件");
  await page.getByLabel("来源名称", { exact: true }).fill("合成测试");
  await page.getByLabel("来源网址", { exact: true }).fill("https://example.test/source");
  await page.getByLabel("开始日期", { exact: true }).fill("2026-10-01");
  await page.getByLabel("结束日期", { exact: true }).fill("2026-10-20");
  await page.getByLabel("确认条件", { exact: true }).fill("明确确认条件");
  await page.getByLabel("失效条件", { exact: true }).fill("明确失效条件");
  await page.getByLabel("观察项（每行一项）").fill("核对来源");
  await page.getByRole("button", { name: "保存事件" }).click();
  const article = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "测试：真实表单事件" }) });
  await expect(article).toBeVisible();
  await article.getByRole("button", { name: "编辑" }).click();
  await page.getByLabel("事件标题", { exact: true }).fill("测试：已更新事件");
  await page.getByRole("button", { name: "保存事件" }).click();
  const edited = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "测试：已更新事件" }) });
  await expect(edited).toBeVisible();
  await edited.getByRole("button", { name: "删除" }).click();
  await expect(edited).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("事件已删除");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("结束日期早于开始日期时不提交", async ({ page }) => {
  await page.goto("/markets/events");
  await page.getByRole("button", { name: "新增事件" }).click();
  await page.getByLabel("事件标题", { exact: true }).fill("无效时间");
  await page.getByLabel("来源名称", { exact: true }).fill("测试");
  await page.getByLabel("开始日期", { exact: true }).fill("2026-10-20");
  await page.getByLabel("结束日期", { exact: true }).fill("2026-10-01");
  await page.getByLabel("确认条件", { exact: true }).fill("确认");
  await page.getByLabel("失效条件", { exact: true }).fill("失效");
  await page.getByRole("button", { name: "保存事件" }).click();
  await expect(page.getByRole("alert")).toHaveText("结束日期不能早于开始日期。");
});
