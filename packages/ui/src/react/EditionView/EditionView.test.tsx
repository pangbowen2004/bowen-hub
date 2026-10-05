import type { Article, Edition } from "@bowen-hub/contracts";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import articleRaw from "../../../../../fixtures/samples/news/Article.synthetic.json";
import raw from "../../../../../fixtures/samples/news/Edition.morning-2026-09-30.json";
import { ArticleContent, EditionView, SourceLink } from "./index";

it("完整栏目保留零、缺失、原文依据和反馈标识", () => {
  const edition = structuredClone(raw) as Edition;
  const snapshot = edition.sections.find((section) => section.kind === "close_snapshot");
  if (snapshot?.kind !== "close_snapshot" || !snapshot.items[0]) throw new Error("样例缺少快照");
  snapshot.items[0].data.indices = [{ symbol: "ZERO", change: 0 }];
  snapshot.items[0].data.vix = null;
  const { container } = render(
    <EditionView edition={edition} flag={(id) => <span data-feedback={id} />} />,
  );
  expect(screen.getByText("0.00%")).toBeTruthy();
  expect(container.textContent).toContain("VIX —");
  expect(screen.getByRole("heading", { name: /^内部人$/ })).toBeTruthy();
  expect(container.textContent).toContain("示例姓名");
  expect(container.querySelectorAll("[data-feedback]").length).toBeGreaterThanOrEqual(9);
});
it("来源只接受http与https，不执行危险协议或伪造业务ID网址", () => {
  const { container } = render(
    <>
      <SourceLink url="javascript:alert(1)" />
      <SourceLink url="https://example.com/source">有效原文</SourceLink>
    </>,
  );
  expect(container.querySelectorAll("a").length).toBe(1);
  expect(screen.getByRole("link", { name: "有效原文" }).getAttribute("href")).toBe(
    "https://example.com/source",
  );
});

it("免费原文不误标为订阅内容", () => {
  const { container } = render(<ArticleContent article={articleRaw as Article} />);
  expect(container.textContent).not.toContain("可能需要订阅");
});

it("下周日程保留已知日期，空态不混淆今晚", () => {
  const edition = structuredClone(raw) as Edition;
  const calendar = edition.sections.find((section) => section.kind === "calendar");
  if (calendar?.kind !== "calendar" || !calendar.items[0]) throw new Error("样例缺少日程");
  const item = calendar.items[0];
  item.data.at = null;
  item.data.date = "2026-10-08";
  edition.sections = [{ kind: "next_week_calendar", title: "下周日程", items: [item] }];
  const view = render(<EditionView edition={edition} />);
  expect(view.container.textContent).toContain("2026-10-08 · 时间待确认");
  edition.sections = [{ kind: "next_week_calendar", title: "下周日程", items: [] }];
  view.rerender(<EditionView edition={edition} />);
  expect(view.container.querySelectorAll("section").length).toBe(0);
  expect(view.container.textContent).not.toContain("今晚没有重要日程");
});
