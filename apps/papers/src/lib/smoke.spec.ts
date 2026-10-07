import { readdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const routes = readdirSync("dist", { recursive: true })
  .filter((file): file is string => typeof file === "string" && file.endsWith("index.html"))
  .map((file) => "/" + file.replace(/index\.html$/, ""))
  .filter((path) => !["/about/", "/graph/"].includes(path));
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
