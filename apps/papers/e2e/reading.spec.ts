import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

import { clickPaintedPaper } from "./canvas";

const id = "arxiv-2505.07078";
test("catalog is SSR; local search and filters never fetch APIs", async ({ page }) => {
  const html = await readFile("dist/index.html", "utf8");
  expect(html).toContain("基于大语言模型的金融投资策略能否长期跑赢市场");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/v1/")) requests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("searchbox").fill("不存在的论文");
  await expect(page.locator("#empty-results")).toBeVisible();
  await page.getByRole("searchbox").fill("Weixian");
  await expect(page.locator("[data-paper-card]")).toBeVisible();
  await page.locator("#depth-filter").selectOption("R3");
  await expect(page.locator("#empty-results")).toBeVisible();
  await page.locator("#depth-filter").selectOption("");
  expect(requests).toEqual([]);
});
test("reading evidence, collapsed answers and markdown export", async ({ page, request }) => {
  await page.goto(`/papers/${id}/`);
  await expect(page.getByRole("heading", { name: "30 秒读懂" })).toBeVisible();
  await expect(page.getByText("读完，试着回答")).toBeVisible();
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
test("2D graph renders, switches to concept cooccurrence; 3D loads automatically with complete list navigation", async ({
  page,
}) => {
  await page.goto("/graph/");
  await expect(page.getByRole("status")).toHaveText("2D 图谱已加载", { timeout: 20000 });
  await expect(page.locator("[data-graph-canvas] canvas").first()).toBeVisible();
  await page.getByRole("combobox").selectOption("cooccurrence");
  await expect(page.getByRole("status")).toHaveText("2D 图谱已加载");
  await page.goto("/universe/");
  await expect(page.locator("[data-universe-canvas] canvas")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "列表视图" }).click();
  await expect(page.locator("[data-universe-canvas] canvas")).toBeHidden();
  await expect(
    page.locator("#paper-list").getByRole("link", { name: /金融投资策略/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "图谱视图" }).click();
  await expect(page.locator("[data-universe-canvas] canvas")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("formal reading screenshots", async ({ page }, info) => {
  if (info.project.name === "平板") return;
  await page.goto(`/papers/${id}/`);
  await page.screenshot({ path: `/tmp/t33-reading-${info.project.name}.png`, fullPage: true });
  await page.goto("/");
  await page.screenshot({ path: `/tmp/t33-catalog-${info.project.name}.png`, fullPage: true });
});

test("P-5 2D canvas navigation and 3D reading focus lead to the paper", async ({ page }) => {
  test.setTimeout(45000);
  await page.goto("/graph/");
  await expect(page.getByRole("status")).toHaveText("2D 图谱已加载", { timeout: 20000 });
  await clickPaintedPaper(page, page.locator("[data-graph-canvas]"));
  await expect(page).toHaveURL(`/papers/${id}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("金融投资策略");
  await page.goto("/universe/");
  await expect(page.locator("[data-universe-canvas] canvas")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "列表视图" }).click();
  await page
    .locator("#paper-list")
    .getByRole("button", { name: /在图谱中定位/ })
    .click();
  await expect(page.locator(".atlas-focus")).toContainText("金融投资策略");
  await page.getByRole("link", { name: /阅读这篇/ }).click();
  await expect(page).toHaveURL(`/papers/${id}/`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("金融投资策略");
});
