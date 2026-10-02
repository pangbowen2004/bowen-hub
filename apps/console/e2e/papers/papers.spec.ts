import { expect, test } from "@playwright/test";

test("论文筛选、批量公开与刷新保存", async ({ page }) => {
  await page.goto("/papers");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("把读过的论文");
  await expect(page.getByText("样例数据 · 操作仅用于页面预览")).toBeVisible();
  await page.getByLabel("搜索论文", { exact: true }).fill("OpenMEVA");
  await expect(page.locator(".paper-card")).toHaveCount(1);
  await page.locator(".paper-card input[type=checkbox]").check();
  await page.getByRole("button", { name: "批量公开" }).click();
  await expect(page.getByText("1 篇已公开，公开站将在更新后显示。")).toBeVisible();
  await page.reload();
  await page.getByLabel("搜索论文", { exact: true }).fill("OpenMEVA");
  await expect(page.locator(".paper-card").getByText("已公开", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("问答流、解释卡、自动保存笔记及原文页", async ({ page }) => {
  await page.goto("/papers/arxiv-2505.07078");
  await page.getByLabel("私人笔记").fill("本次验证：先核对回测与材料边界。");
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "问这篇论文", exact: true }).click();
  await page.getByLabel("你的问题").fill("指标的适用边界是什么？");
  await page.getByRole("button", { name: "提问", exact: true }).click();
  await expect(page.getByText(/这是一段样例回答/)).toBeVisible();
  await page.getByRole("button", { name: "保存为解释卡" }).click();
  await expect(page.getByRole("button", { name: "已保存解释卡" })).toBeVisible();
  await page.getByRole("button", { name: "原文第 1 页", exact: true }).click();
  await expect(page.getByRole("img", { name: "PDF 原文第 1 页" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "原文第 1 页" })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "问这篇论文" })
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.getByRole("button", { name: "确认这张解释卡" }).last().click();
  await page.reload();
  await expect(page.getByLabel("私人笔记")).toHaveValue("本次验证：先核对回测与材料边界。");
  await expect(page.getByRole("heading", { name: "指标的适用边界是什么？" })).toBeVisible();
  await page.screenshot({
    path: `/tmp/bowen-T34-reader-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `/tmp/bowen-T34-reader-viewport-${test.info().project.name}.png` });
});
test("失败回答不能保存；上传重试刷新后保留队列状态", async ({ page }) => {
  await page.goto("/papers/arxiv-2505.07078");
  await page.getByRole("button", { name: "问这篇论文", exact: true }).click();
  await page.getByLabel("你的问题").fill("模拟失败");
  await page.getByRole("button", { name: "提问", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "这次没答上来" })).toBeVisible();
  await expect(page.getByRole("button", { name: "保存为解释卡" })).toHaveCount(0);
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.goto("/papers/inbox");
  await page.getByRole("button", { name: "重试入库" }).click();
  await expect(page.getByText("已提交入库，处理状态会自动更新。")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "重试入库" })).toHaveCount(0);
  await page.getByLabel("arXiv 链接").fill("https://arxiv.org/abs/1706.03762");
  await page.getByRole("button", { name: "提交链接" }).click();
  await expect(
    page.getByRole("heading", { name: "https://arxiv.org/abs/1706.03762" }),
  ).toBeVisible();
});
