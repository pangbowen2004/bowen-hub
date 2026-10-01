import { expect, test } from "@playwright/test";

test("驾驶舱内容与原始行情", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "把市场拆成可核对的数字" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "三项风险" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "上证 K 线" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("内容准备中");
  await page.getByText("查看原始日线表", { exact: true }).click();
  await expect(
    page.locator("table").filter({ has: page.locator("caption", { hasText: "指数日线" }) }),
  ).toBeVisible();
});
test("行业排序改变实际行顺序", async ({ page }) => {
  await page.goto("/industries/");
  const table = page
    .locator("table")
    .filter({ has: page.locator("caption", { hasText: "申万一级行业" }) });
  const before = await table.locator("tbody tr").first().textContent();
  await table.getByRole("button", { name: "行业", exact: true }).click();
  await expect(table.locator("th").first()).toHaveAttribute("aria-sort", "ascending");
  await table.getByRole("button", { name: "行业", exact: true }).click();
  await expect(table.locator("th").first()).toHaveAttribute("aria-sort", "descending");
  expect(await table.locator("tbody tr").first().textContent()).not.toBe(before);
});
test("假设按结果和日期筛选并重置", async ({ page }) => {
  await page.goto("/validation/");
  await page.getByLabel("结果", { exact: true }).selectOption("NOT_CONFIRMED");
  const visible = page.locator("[data-hypothesis]:visible");
  expect(await visible.count()).toBeGreaterThan(0);
  for (const row of await visible.all())
    await expect(row).toHaveAttribute("data-result", "NOT_CONFIRMED");
  await page.getByLabel("日期", { exact: true }).fill("2020-01-01");
  await expect(page.locator("[data-filter-count]")).toHaveText("显示 0 条假设");
  await page.getByRole("button", { name: "清除筛选" }).click();
  await expect(page.locator("[data-hypothesis]:visible").first()).toBeVisible();
});
test("关闭JS仍有完整数据表与验证条件", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/directions/`);
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.goto(`${baseURL}/weekly/2026-08-28/`);
  await expect(page.getByRole("heading", { name: "Research Error" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "下周只验证三件事" })).toBeVisible();
  await context.close();
});

test("格式化收益仍按数值排序", async ({ page }) => {
  await page.goto("/directions/");
  const table = page
    .locator("table")
    .filter({ has: page.locator("caption", { hasText: "ETF八组" }) });
  await table.getByRole("button", { name: "中位1日", exact: true }).click();
  const cells = await table.locator("tbody tr td:nth-child(4)").allTextContents();
  const values = cells
    .filter((x) => x !== "—")
    .map((x) => Number(x.replaceAll(",", "").replace("%", "")));
  expect(values.length).toBeGreaterThan(1);
  expect(values).toEqual([...values].sort((a, b) => a - b));
});

test("历史页不泄露后一天才结算的结果", async ({ page }) => {
  await page.goto("/archive/2026-08-27/");
  await expect(page.locator('[data-hypothesis][data-date="2026-08-07"]').first()).toHaveAttribute(
    "data-result",
    "NOT_CONFIRMED",
  );
  const rows = page.locator('[data-hypothesis][data-date="2026-08-27"]');
  expect(await rows.count()).toBeGreaterThan(0);
  for (const row of await rows.all()) {
    await expect(row).toHaveAttribute("data-result", "PENDING");
    await expect(row.locator("pre")).toHaveCount(0);
  }
  await expect(
    page.getByText("截至该归档日尚未结算；后续结果请到验证中心查看。").first(),
  ).toBeVisible();
});
