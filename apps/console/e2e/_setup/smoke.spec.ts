import { expect, test } from "@playwright/test";

for (const path of [
  "/",
  "/login",
  "/news",
  "/news/morning-2026-09-30",
  "/news/tickers/NVDA",
  "/news/search",
  "/watchlist",
  "/papers",
  "/papers/arxiv-2505.07078",
  "/papers/inbox",
  "/papers/graph",
  "/markets/events",
  "/ops",
  "/settings",
]) {
  test(`外壳 ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("样例连接成功");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}
test("主题切换和响应式导航", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "主题：跟随系统" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "主题：浅色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const mobile = (page.viewportSize()?.width ?? 0) < 768;
  await expect(
    page.getByRole("navigation", { name: mobile ? "手机标签栏" : "主导航" }),
  ).toBeVisible();
});
