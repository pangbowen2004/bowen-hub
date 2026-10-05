import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const routes = readdirSync("dist", { recursive: true })
  .filter((file): file is string => typeof file === "string" && file.endsWith("index.html"))
  .map((file) => "/" + file.replace(/index\.html$/, ""));
for (const path of routes) {
  test(`静态页 ${path}`, async ({ page }) => {
    const errors: string[] = [];
    const api: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/v1/")) api.push(request.url());
    });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Bowen/i);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(errors).toEqual([]);
    expect(api).toEqual([]);
  });
}

// 静态首屏的轻量表盘仍须支持键盘选择，并保持减弱动态偏好。
test("驾驶舱方向可用键盘选择，面板与指针同步", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const sectors = page.locator(".dial-sector");
  expect(await sectors.count()).toBeGreaterThan(1);
  const nextName = (await sectors.nth(1).getAttribute("aria-label"))?.split("，")[0];
  await sectors.nth(0).focus();
  await sectors.nth(0).press("ArrowRight");
  await expect(sectors.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".instrument-side h2")).toHaveText(nextName ?? "");
  await expect(page.locator(".instrument-side")).toContainText("相对全 A");
  expect(await page.locator("astro-island[component-url*=MarketInstrument]").count()).toBe(0);
});
