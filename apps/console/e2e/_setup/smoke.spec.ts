import { expect, test } from "@playwright/test";

for (const path of [
  "/",
  "/login",
  "/news",
  "/news/morning-2026-09-30",
  "/news/tickers/NVDA",
  "/news/search",
  "/papers",
  "/papers/arxiv-2505.07078",
  "/papers/inbox",
  "/papers/graph",
  "/markets/events",
]) {
  test(`外壳 ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Bowen/i);
    if (path === "/markets/events")
      await expect(
        page.locator(".calendar-event").filter({ hasText: "样例：产业应用验证窗口" }).first(),
      ).toBeVisible();
    else if (path === "/login")
      await expect(page.getByRole("button", { name: "使用通行密钥登录" })).toBeVisible();
    else await expect(page.locator("body")).not.toContainText("内容准备中");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
test("账户外观切换持久化并支持键盘关闭", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "账户", exact: false }).click();
  await page.getByRole("button", { name: "外观 · 跟随系统" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "外观 · 浅色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const mobile = (page.viewportSize()?.width ?? 0) < 768;
  await expect(
    page.getByRole("navigation", { name: mobile ? "手机标签栏" : "主导航", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
