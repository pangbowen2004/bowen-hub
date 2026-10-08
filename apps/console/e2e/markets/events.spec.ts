import { expect, test } from "@playwright/test";

test("月历跨周横条、只读详情与日期切换", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-07T04:00:00Z"));
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/markets/events") && request.method() !== "GET")
      writes.push(request.method());
  });
  await page.goto("/markets/events");
  await expect(page.getByRole("heading", { name: "2026 年 10 月" })).toBeVisible();
  await expect(page.locator(".calendar-weekdays > span")).toHaveCount(7);
  await expect(
    page.locator(".calendar-event").filter({ hasText: "样例：产业应用验证窗口" }),
  ).toHaveCount(0);
  const ongoing = page.getByRole("region", { name: "本月持续事项" });
  await expect(ongoing.getByRole("button", { name: "样例：产业应用验证窗口" })).toHaveCount(1);
  await ongoing.getByRole("button", { name: "样例：产业应用验证窗口" }).click();
  const dialog = page.getByRole("dialog", { name: "事件详情" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("公开来源验证应用进展", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "合成测试来源" })).toHaveAttribute(
    "href",
    "https://example.test/event",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator(".calendar-event.market-us").filter({ hasText: "美国 CPI" }),
  ).toHaveCount(1);
  await page.locator(".calendar-event").filter({ hasText: "美国 CPI" }).click();
  await expect(dialog.getByText("2026-10-14 — 2026-10-14 · 美东 08:30")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "下个月" }).click();
  await expect(page.getByRole("heading", { name: "2026 年 11 月" })).toBeVisible();
  await expect(page.getByText("本月暂无事件。")).toBeVisible();
  await page.getByRole("button", { name: "本月", exact: true }).click();
  await expect(page.getByRole("button", { name: /新增|编辑|删除/ })).toHaveCount(0);
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("四个导航入口，安全设置在账户弹层", async ({ page }) => {
  await page.goto("/markets/events");
  const nav = (page.viewportSize()?.width ?? 0) < 768 ? "手机标签栏" : "主导航";
  await expect(
    page.getByRole("navigation", { name: nav, exact: true }).getByRole("link"),
  ).toHaveText(["今日", "新闻室", "论文", "事件日历"]);
  await page.getByRole("button", { name: "账户", exact: false }).click();
  await expect(page.getByRole("dialog", { name: "账户与访问" })).toBeVisible();
  await page.getByRole("tab", { name: "已授权的应用（MCP）" }).click();
  await expect(page.getByRole("tabpanel", { name: "已授权的应用（MCP）" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  for (const path of ["/settings", "/ops", "/watchlist"]) {
    await page.goto(path);
    await expect(page.getByText("页面不存在", { exact: true })).toBeVisible();
  }
});
