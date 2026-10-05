// /ops 运维页（MSW 样例，三个屏宽）：运行记录、AI 用量与费用、数据源健康、能力清单与评测走势。
// 样例数据见 src/mocks/ops（确定的合成数据）；这里的数量与它一一对应。
import { expect as baseExpect, type Page, test } from "@playwright/test";

// 机器负载高时（并行跑别的检查）首屏渲染会慢，默认的 5 秒断言等待太紧。
const expect = baseExpect.configure({ timeout: 15_000 });

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
/** 切换样例场景或让某个接口失败；样例模块监听这两个窗口事件。 */
const scenario = (page: Page, name: "normal" | "over-budget" | "empty") =>
  page.evaluate(
    (value) =>
      window.dispatchEvent(new CustomEvent("hub-mock-ops", { detail: { scenario: value } })),
    name,
  );
const failPath = (page: Page, path: string, enabled: boolean) =>
  page.evaluate(
    ([target, flag]) =>
      window.dispatchEvent(
        new CustomEvent("hub-mock-failure", { detail: { path: target, enabled: flag } }),
      ),
    [path, enabled] as const,
  );
const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });
const refreshAll = (page: Page) => page.getByRole("button", { name: "刷新全部" }).click();

test("四个分区都有内容，概要数字齐全，没有控制台报错，任何屏宽都不横向滚动", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/ops");
  await expect(page.getByRole("heading", { level: 1, name: "运维" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "样例连接成功：20 条运行记录、11 个能力、8 个数据源",
  );
  const summary = page.locator(".ops-summary");
  await expect(summary).toContainText("$3.84");
  await expect(summary).toContainText("本月 AI 费用，预算 $20.00（已用 19%）");
  await expect(summary).toContainText("最近 20 条运行里失败的任务");
  await expect(summary).toContainText("检查失败的数据源（共 8 个）");
  await expect(summary).toContainText("评测未达标的能力；另有 1 个还没评测");
  for (const name of ["运行记录", "AI 用量与费用", "数据源健康", "能力清单与评测走势"])
    await expect(region(page, name)).toBeVisible();
  // 20 条运行记录、11 个能力、8 个数据源。
  await expect(page.locator(".ops-run")).toHaveCount(20);
  await expect(page.locator(".ops-capability")).toHaveCount(11);
  await expect(region(page, "数据源健康").locator("tbody tr")).toHaveCount(8);
  expect(await noHorizontalScroll(page)).toBe(true);
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: `/tmp/bowen-t41-ops-${width}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("运行记录：失败任务带错误；按任务筛选；只看失败；加载更多；运行中没有耗时", async ({
  page,
}) => {
  await page.goto("/ops");
  const runs = region(page, "运行记录");
  await expect(page.locator(".ops-run")).toHaveCount(20);
  // 失败的任务：状态、错误摘要都看得见。
  const failed = page.locator(".ops-run[data-status='failed']");
  await expect(failed).toHaveCount(1);
  await expect(failed).toContainText("A 股收盘");
  await expect(failed).toContainText("失败");
  await expect(failed).toContainText("核心表未就绪：已过 22:00 截止时间");
  // 还在运行的任务显示“运行中”。
  const running = page.locator(".ops-run[data-status='running']");
  await expect(running).toHaveCount(1);
  await expect(running).toContainText("论文入库");
  await expect(running).toContainText("耗时 运行中");
  // 统计与运行 ID 折叠起来，点开才看。
  await failed.getByText("统计与运行 ID").click();
  await expect(failed.locator("details .ops-mono").first()).toContainText("market-eod-2026-09-30-");
  // 只看失败（只作用在已加载的记录上）。
  await runs.getByLabel("只看失败").check();
  await expect(page.locator(".ops-run")).toHaveCount(1);
  await runs.getByRole("button", { name: "加载更多" }).click();
  await expect(page.locator(".ops-run")).toHaveCount(2);
  await expect(page.locator(".ops-run[data-status='failed']").last()).toContainText("论文重写");
  await runs.getByLabel("只看失败").uncheck();
  await expect(page.locator(".ops-run")).toHaveCount(25);
  await expect(runs.getByRole("button", { name: "加载更多" })).toHaveCount(0);
  // 按任务筛选：服务端按 job 过滤，请求里带着任务名。
  const request = page.waitForRequest(
    (value) => value.url().includes("/v1/runs") && value.url().includes("job=market-eod"),
  );
  await runs.getByLabel("任务").selectOption("market-eod");
  await request;
  await expect(page.locator(".ops-run")).toHaveCount(5);
  await expect(page.locator(".ops-run").filter({ hasNotText: "A 股收盘" })).toHaveCount(0);
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("AI 用量：本月费用对比预算；切换统计窗口；按能力与逐日明细", async ({ page }) => {
  await page.goto("/ops");
  const usage = region(page, "AI 用量与费用");
  await expect(usage).toContainText("$3.84 / 月度预算 $20.00");
  await expect(usage).toContainText("已用 19%");
  await expect(usage.getByRole("img", { name: "本月已用月度预算的 19%" })).toBeVisible();
  await expect(usage.getByRole("alert")).toHaveCount(0);
  await expect(usage).toContainText("最近 30 天调用次数");
  await expect(usage).toContainText("套餐运行的调用，费用记为 0，token 数照实记录");
  // 按能力：9 个能力，费用最高的在前。
  const rows = usage.locator("table").first().locator("tbody tr");
  await expect(rows).toHaveCount(9);
  await expect(rows.first()).toContainText("news.ticker_digest");
  // 逐日明细折叠；30 天窗口里 25 天有调用。
  await usage.getByText("逐日明细（25 天）").click();
  await expect(usage.locator("table").nth(1).locator("tbody tr")).toHaveCount(25);
  // 切换窗口：请求带 days=7，窗口内 6 天有调用。
  const request = page.waitForRequest(
    (value) => value.url().includes("/v1/ai/usage") && value.url().includes("days=7"),
  );
  await usage.getByRole("button", { name: "最近 7 天" }).click();
  await request;
  await expect(usage.getByRole("button", { name: "最近 7 天" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(usage).toContainText("最近 7 天调用次数");
  await expect(usage).toContainText("逐日明细（6 天）");
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("本月费用超过预算时红字提醒，只提醒不降级", async ({ page }) => {
  await page.goto("/ops");
  await expect(page.getByRole("status")).toContainText("样例连接成功");
  await scenario(page, "over-budget");
  await refreshAll(page);
  const usage = region(page, "AI 用量与费用");
  const alert = usage.getByRole("alert");
  await expect(alert).toContainText("本月 AI 费用已超过月度预算，超出 $1.37");
  await expect(alert).toContainText("只提醒，不会自动降级模型");
  await expect(page.locator(".ops-summary")).toContainText("$21.37");
  await expect(page.locator(".ops-summary")).toContainText("已超");
  await expect(page.locator(".ops-summary strong.ops-over")).toHaveText("$21.37");
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("数据源健康：失败的排前面，带错误信息和检查时间", async ({ page }) => {
  await page.goto("/ops");
  const sources = region(page, "数据源健康");
  await expect(sources).toContainText("共 8 个来源，3 个检查失败");
  const rows = sources.locator("tbody tr");
  await expect(rows.first()).toContainText("finnhub-earnings");
  await expect(rows.first()).toContainText("失败");
  await expect(rows.first()).toContainText("没有配置 FINNHUB_API_KEY");
  await expect(rows.first()).toContainText("2026-10-04 07:11");
  await expect(rows.last()).toContainText("sec-edgar");
  await expect(rows.last()).toContainText("正常");
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("能力清单与评测走势：未达标自动展开，评分对照门槛，走势与历史可看", async ({ page }) => {
  await page.goto("/ops");
  const capabilities = region(page, "能力清单与评测走势");
  await expect(page.locator(".ops-capability")).toHaveCount(11);
  // 未达标的排最前并自动展开；还没评测过的紧随其后。
  const first = page.locator(".ops-capability").first();
  await expect(first).toContainText("news.us_rank");
  await expect(first).toContainText("未达标");
  await expect(first).toHaveJSProperty("open", true);
  await expect(first.locator("tbody tr").filter({ hasText: "✗ 未达标" }).first()).toBeVisible();
  await expect(first.locator("tbody tr").filter({ hasText: "✓ 达标" }).first()).toBeVisible();
  // 每个评分器都有走势图，数字读得出来；评测过 4 次。
  const trend = first.getByRole("img", { name: /最近 4 次：/ }).first();
  await expect(trend).toBeVisible();
  await expect(first.getByText("评测历史（4 次）")).toBeVisible();
  await expect(first.getByText("走势（共 4 次）")).toBeVisible();
  // 清单信息：档位、模型、上限、校验、降级、评测集。
  await expect(first).toContainText("档位与模型");
  await expect(first).toContainText("openai/gpt-6-luna");
  await expect(first).toContainText("确定性校验");
  await expect(first).toContainText("失败时降级");
  const second = page.locator(".ops-capability").nth(1);
  await expect(second).toContainText("news.curate");
  await expect(second).toContainText("未评测");
  await expect(second).toHaveJSProperty("open", false);
  await second.locator(":scope > summary").click();
  await expect(second).toContainText("还没有评测结果");
  // 达标的默认折叠；点开能看到门槛与最近得分。
  const passed = page.locator(".ops-capability[data-status='passed']").first();
  await expect(passed).toHaveJSProperty("open", false);
  await passed.locator(":scope > summary").click();
  await expect(passed.getByText(/≥ [01]\.\d{3}/).first()).toBeVisible();
  // 两个“仅改动时评测”的论文能力只评测过一次。
  const author = page.locator(".ops-capability").filter({ hasText: "papers.author" });
  await author.locator(":scope > summary").click();
  await expect(author).toContainText("仅改动时评测");
  await expect(author.getByText("评测历史（1 次）")).toBeVisible();
  await expect(capabilities).toContainText("虚线是清单里的最低要求");
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("某个分区读取失败：只影响它，提示原因，恢复后点重试即可", async ({ page }) => {
  await page.goto("/ops");
  await expect(page.getByRole("status")).toContainText("样例连接成功");
  await failPath(page, "/v1/ai/usage", true);
  await refreshAll(page);
  const usage = region(page, "AI 用量与费用");
  await expect(usage.getByRole("alert")).toContainText("加载失败：模拟读取失败");
  // 其他分区不受影响。
  await expect(page.locator(".ops-run")).toHaveCount(20);
  await expect(region(page, "数据源健康").locator("tbody tr")).toHaveCount(8);
  await failPath(page, "/v1/ai/usage", false);
  await usage.getByRole("button", { name: "重试" }).click();
  await expect(usage.getByRole("alert")).toHaveCount(0);
  await expect(usage).toContainText("$3.84 / 月度预算 $20.00");
  expect(await noHorizontalScroll(page)).toBe(true);
});

test("评测历史读不到时，能力清单仍显示最近一次评测并提示", async ({ page }) => {
  // 样例模块支持用地址参数让接口从一开始就失败（窗口事件只能在页面加载之后发）。
  await page.goto("/ops?mock-fail=/v1/evals");
  await expect(page.getByText("评测历史没有读到，走势暂时只显示最近一次。")).toBeVisible();
  await expect(page.locator(".ops-capability")).toHaveCount(11);
  await expect(page.locator(".ops-capability").first()).toContainText("news.us_rank");
  await expect(page.locator(".ops-capability").first().getByText("走势（共 1 次）")).toBeVisible();
  await failPath(page, "/v1/evals", false);
  await page.getByRole("button", { name: "重试" }).click();
  await expect(page.getByText("评测历史没有读到")).toHaveCount(0);
  await expect(page.locator(".ops-capability").first().getByText("走势（共 4 次）")).toBeVisible();
});

test("什么记录都还没有时，各分区给出明确的空状态", async ({ page }) => {
  await page.goto("/ops");
  await expect(page.getByRole("status")).toContainText("样例连接成功");
  await scenario(page, "empty");
  await refreshAll(page);
  await expect(page.getByText("还没有运行记录。")).toBeVisible();
  await expect(page.getByText("这个窗口里没有 AI 调用。")).toBeVisible();
  await expect(page.getByText("还没有来源检查记录。")).toBeVisible();
  await expect(page.locator(".ops-capability[data-status='none']")).toHaveCount(11);
  await expect(page.locator(".ops-summary")).toContainText("另有 11 个还没评测");
  expect(await noHorizontalScroll(page)).toBe(true);
});
