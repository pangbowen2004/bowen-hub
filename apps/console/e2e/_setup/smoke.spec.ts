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
    await expect(page.locator("body")).not.toContainText(/Bowen/i);
    if (path === "/markets/events") {
      await expect(page.getByRole("heading", { name: "样例：产业应用验证窗口" })).toBeVisible();
    } else if (path === "/login") {
      await expect(page.getByRole("button", { name: "使用通行密钥登录" })).toBeVisible();
    } else if (path === "/settings") {
      await expect(page.getByText("样例：本机通行密钥")).toBeVisible();
    } else if (path === "/" || path.startsWith("/news") || path === "/watchlist") {
      await expect(page.locator("body")).not.toContainText("内容准备中");
    } else if (path.startsWith("/papers")) {
      await expect(
        page.getByRole("status").filter({ hasText: /样例连接成功|样例数据 · 操作仅用于页面预览/ }),
      ).toBeVisible();
    } else if (path === "/ops") {
      for (const title of ["运行记录", "AI 用量与费用", "数据源健康", "能力清单与评测走势"])
        await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(page.getByRole("status")).toContainText("样例连接成功");
      await expect(page.locator("body")).not.toContainText("内容准备中");
    }
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

// 视觉更新仍应保留主题、路由入口和减少动效偏好。
test("纸面主题和全部导航入口", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(242, 241, 237)");
  await page.getByRole("button", { name: "主题：跟随系统" }).click();
  await page.getByRole("button", { name: "主题：浅色" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(22, 28, 28)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const width = page.viewportSize()?.width ?? 0;
  if (width >= 768) {
    for (const label of ["今日", "新闻", "论文", "自选股", "事件日历", "运维", "设置"]) {
      await expect(
        page
          .getByRole("navigation", { name: "主导航" })
          .getByRole("link", { name: label, exact: true }),
      ).toBeVisible();
    }
  } else {
    await page
      .getByRole("navigation", { name: "手机标签栏" })
      .getByRole("link", { name: "更多" })
      .click();
    await expect(page).toHaveURL(/\/ops$/);
  }
  await page.screenshot({ path: `/tmp/visual-refresh-console-${width}-dark.png`, fullPage: true });
});

test("主题按钮悬停与手机触控目标", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.goto("/");
  const theme = page.getByRole("button", { name: "主题：跟随系统" });
  await theme.hover();
  await expect(theme).toHaveCSS("background-color", "rgb(36, 40, 42)");
  await expect(theme).toHaveCSS("color", "rgb(242, 241, 237)");
  await theme.click();
  await page.getByRole("button", { name: "主题：浅色" }).click();
  await page.getByRole("button", { name: "主题：深色" }).hover();
  const darkTheme = page.getByRole("button", { name: "主题：深色" });
  await expect(darkTheme).toHaveCSS("background-color", "rgb(233, 233, 222)");
  await expect(darkTheme).toHaveCSS("color", "rgb(22, 28, 28)");
  if ((page.viewportSize()?.width ?? 0) < 768) {
    const links = page.getByRole("navigation", { name: "手机标签栏" }).getByRole("link");
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});
