import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const id = "arxiv-2505.07078";
test("catalog is SSR; local search and filters never fetch APIs", async ({ page }) => {
  const html = await readFile("dist/library/index.html", "utf8");
  expect(html).toContain("基于大语言模型的金融投资策略能否长期跑赢市场");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/v1/")) requests.push(r.url());
  });
  await page.goto("/library/");
  await page.getByRole("searchbox").fill("不存在的论文");
  await expect(page.locator("#empty-results")).toBeVisible();
  await page.getByRole("searchbox").fill("Weixian");
  await expect(page.locator("[data-paper-card]")).toBeVisible();
  await page.getByText("更多筛选", { exact: true }).click();
  await page.locator("#depth-filter").selectOption("R3");
  await expect(page.locator("#empty-results")).toBeVisible();
  await page.locator("#depth-filter").selectOption("");
  expect(requests).toEqual([]);
});
test("reading evidence, collapsed answers and markdown export", async ({ page, request }) => {
  await page.goto(`/papers/${id}/`);
  await expect(page.getByRole("heading", { name: "30 秒读懂" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "读完，试着回答" })).toBeVisible();
  const answer = page.locator("details").filter({ hasText: "论文研究什么问题？" }).first();
  if (await answer.count()) {
    await expect(answer).not.toHaveAttribute("open", "");
    await answer.locator("summary").click();
    await expect(answer).toHaveAttribute("open", "");
  }
  await page.locator("#claim-filter").selectOption("limitation");
  for (const row of await page.locator("[data-claim-kind]:visible").all())
    expect(await row.getAttribute("data-claim-kind")).toBe("limitation");
  await page.locator("#claim-filter").selectOption("all");
  await page.getByRole("button", { name: "查看证据" }).first().click();
  await expect(page.getByRole("dialog", { name: "原文证据与解释边界" })).toBeVisible();
  await page.getByRole("button", { name: "关闭证据" }).click();
  await expect(page.getByRole("dialog", { name: "原文证据与解释边界" })).toBeHidden();
  await page.getByText("技术附录", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "方法与组成" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const markdown = await request.get(`/papers/${id}.md`);
  expect(await markdown.text()).toContain("原文证据");
  expect(await markdown.text()).not.toContain("legacyCards");
  const llms = await request.get("/llms.txt");
  expect(await llms.text()).toContain(`/papers/${id}.md`);
  expect((await request.get("/papers/acl-2021.acl-long.500/")).status()).toBe(404);
});
test("知识宇宙成为首页，研究空间、列表与阅读焦点共享选中状态", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("知识宇宙");
  await expect(page.locator('nav[aria-label="主导航"]')).not.toContainText("关于");
  await expect(page.locator("[data-universe-canvas] canvas")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "列表视图", exact: true }).click();
  await expect(page.locator("[data-universe-canvas] canvas")).toBeHidden();
  await page
    .locator("#paper-list")
    .getByRole("button", { name: /在宇宙中查看/ })
    .click();
  await expect(page.locator(".atlas-focus")).toContainText("金融投资策略");
  await page.getByRole("button", { name: "宇宙视图", exact: true }).click();
  await expect(page.locator("[data-universe-canvas] canvas")).toBeVisible();
  await page.getByRole("link", { name: "阅读这篇", exact: true }).click();
  await expect(page).toHaveURL(`/papers/${id}/`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("旧图谱和关于链接转到首页，不再出现独立入口", async ({ page }) => {
  for (const route of ["/graph/", "/about/"]) {
    await page.goto(route);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("知识宇宙");
  }
});
test("减少动态时可以搜索作者与阅读，目录标记当前章节", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("searchbox").fill("Weixian");
  await expect(page.locator("#paper-list li")).toHaveCount(1);
  await page.getByRole("link", { name: "阅读这篇", exact: true }).click();
  await expect(page.getByRole("heading", { name: "30 秒读懂" })).toBeVisible();
  if (await page.locator(".reading-toc").isVisible()) {
    await expect(page.locator('#reading-toc a[aria-current="location"]')).toHaveCount(1);
    const evidence = page.locator('#reading-toc a[href="#evidence"]');
    await evidence.click();
    await expect(page.locator("#evidence")).toBeInViewport();
  }
});
test("formal reading screenshots", async ({ page }, info) => {
  if (info.project.name === "平板") return;
  await page.goto(`/papers/${id}/`);
  await page.screenshot({ path: `/tmp/t33-reading-${info.project.name}.png`, fullPage: true });
  await page.goto("/");
  await page.screenshot({ path: `/tmp/t33-catalog-${info.project.name}.png`, fullPage: true });
});
