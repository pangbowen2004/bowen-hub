import { expect, test } from "@playwright/test";

test("归档版次筛选、游标和刷新", async ({ page }) => {
  await page.goto("/news");
  await expect(page.getByRole("heading", { name: "新闻归档", exact: true })).toBeVisible();
  await page.getByRole("combobox").selectOption("legacy");
  await expect(page.locator(".news-archive article")).toHaveCount(20);
  await page.locator(".news-archive article").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".news-archive article")).toHaveCount(25);
  await page.getByRole("combobox").selectOption("premarket");
  await expect(page.locator(".news-archive article")).toHaveCount(1);
  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await expect(page.getByRole("heading", { name: "盘前简报" })).toBeVisible();
});
test("期次全部栏目、隔夜自选股和底部评分实际保存", async ({ page }) => {
  await page.goto("/news/morning-2026-09-30");
  for (const title of [
    "收盘快照",
    "自选股动态",
    "美股要闻",
    "财报",
    "公告",
    "内部人",
    "今晚日程",
    "国际与科技",
  ])
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "4 分", exact: true }).click();
  await expect(page.getByRole("button", { name: "4 分", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("region", { name: "全部自选股隔夜涨跌" })).toBeVisible();
  await expect(page.getByRole("button", { name: "没用", exact: true })).toHaveCount(0);
  const rows = await page.evaluate(async () => (await fetch("/v1/news/feedback")).json());
  expect(rows.some((row: { score?: number }) => row.score === 4)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("评分失败回滚且重试可恢复", async ({ page }) => {
  await page.goto("/news/morning-2026-09-30");
  await expect(page.getByRole("button", { name: "3 分" })).toBeEnabled();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("hub-mock-failure", {
        detail: { path: "/v1/news/editions/morning-2026-09-30/feedback", enabled: true },
      }),
    ),
  );
  await page.getByRole("button", { name: "3 分" }).click();
  await expect(page.getByRole("alert")).toContainText("已回滚");
  await expect(page.getByRole("button", { name: "3 分" })).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("hub-mock-failure", {
        detail: { path: "/v1/news/editions/morning-2026-09-30/feedback", enabled: false },
      }),
    ),
  );
  await page.getByRole("button", { name: "3 分" }).click();
  await expect(page.getByRole("button", { name: "3 分" })).toHaveAttribute("aria-pressed", "true");
});
test("全文搜索传股票和天数筛选，先成功后空结果不保留旧内容", async ({ page }) => {
  await page.goto("/news/search");
  await page.getByLabel("关键词", { exact: true }).fill("财报");
  await page.getByLabel("股票代码（可选）").fill("nvda");
  await page.getByLabel("最近天数").fill("7");
  const request = page.waitForRequest(
    (url) => url.url().includes("/articles/search") && url.url().includes("days=7"),
  );
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  expect(new URL((await request).url()).searchParams.get("ticker")).toBe("NVDA");
  await expect(page.getByRole("heading", { name: "示例公司发布财报" })).toBeVisible();
  await page.getByLabel("关键词", { exact: true }).fill("不存在的词");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByText("没有符合筛选条件的新闻。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "示例公司发布财报" })).toHaveCount(0);
});
test("个股完整时间线包含内部人交易与财报原文", async ({ page }) => {
  await page.goto("/news/tickers/NVDA");
  await expect(page.getByText("示例姓名", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "NVDA · 8-K" })).toBeVisible();
  await expect(page.getByText("营收 · GAAP")).toBeVisible();
  await expect(page.getByText("买入 100 股", { exact: false })).toBeVisible();
});
test("自选股增删改启停和实际接口状态", async ({ page }) => {
  await page.goto("/watchlist");
  await page.getByRole("button", { name: "新增自选股" }).click();
  await page.getByLabel("代码", { exact: true }).fill("SYN");
  await page.getByLabel("名称", { exact: true }).fill("合成测试公司");
  await page.getByLabel("分组", { exact: true }).fill("测试组");
  await page.getByLabel("别名", { exact: false }).fill("Synthetic\n测试公司");
  await page.getByRole("button", { name: "保存自选股" }).click();
  await expect(page.getByRole("heading", { name: "SYN · 合成测试公司" })).toBeVisible();
  await page.getByRole("button", { name: "编辑 SYN" }).click();
  await page.getByLabel("名称", { exact: true }).fill("修改后的测试公司");
  await page.getByRole("button", { name: "保存自选股" }).click();
  await expect(page.getByRole("heading", { name: "SYN · 修改后的测试公司" })).toBeVisible();
  await page.getByRole("button", { name: "停用 SYN" }).click();
  await expect(page.getByRole("button", { name: "启用 SYN" })).toBeVisible();
  const inactive = await page.evaluate(async () => (await fetch("/v1/watchlist")).json());
  expect(inactive.find((row: { symbol: string }) => row.symbol === "SYN").active).toBe(false);
  await page.getByRole("button", { name: "删除 SYN" }).click();
  await expect(page.getByRole("heading", { name: "SYN · 修改后的测试公司" })).toHaveCount(0);
});
test("自选股写入失败恢复原记录", async ({ page }) => {
  await page.goto("/watchlist");
  await expect(page.getByRole("button", { name: "停用 TSM", exact: true })).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("hub-mock-failure", { detail: { path: "/v1/watchlist/TSM", enabled: true } }),
    ),
  );
  await page.getByRole("button", { name: "停用 TSM", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("已回滚");
  await expect(page.getByRole("button", { name: "停用 TSM", exact: true })).toBeVisible();
});
test("今日显示真实聚合入口而非占位", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("最新一期 · 美股早报")).toBeVisible();
  await expect(page.getByText("最新一期 · 盘前简报")).toBeVisible();
  await expect(page.getByRole("heading", { name: "待审与待修订" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "本月AI费用" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("内容准备中");
});

test("刷新今日概览取回两个最新期次", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "2026-09-30", exact: true })).toHaveCount(2);
  await page.evaluate(() => window.dispatchEvent(new Event("hub-mock-publish-edition")));
  await page.getByRole("button", { name: "刷新今日概览", exact: true }).click();
  await expect(page.getByRole("link", { name: "2026-10-02", exact: true })).toHaveCount(2);
  await expect(page.getByRole("link", { name: "2026-09-30", exact: true })).toHaveCount(0);
});
