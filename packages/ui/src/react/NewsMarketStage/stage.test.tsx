import type { Article, Edition, WatchItem } from "@bowen-hub/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import articleRaw from "../../../../../fixtures/samples/news/Article.synthetic.json";
import raw from "../../../../../fixtures/samples/news/Edition.morning-2026-09-30.json";
import { EditionView } from "../EditionView";
import { NewsMarketStage, overnightQuotes } from "./index";

const watch = (symbol: string, underlying: string | null = null): WatchItem => ({
  symbol,
  underlying,
  name: symbol,
  active: true,
  group: "测试",
  kind: "stock",
  sectorEtf: null,
  aliases: [],
});
it("shows every watchlist entry without substituting an underlying quote for a leveraged ETF", () => {
  const edition = structuredClone(raw) as Edition;
  const snapshot = edition.sections.find((s) => s.kind === "close_snapshot");
  if (snapshot?.kind !== "close_snapshot") throw Error("missing fixture");
  snapshot.items[0]!.data.watchlist = [{ symbol: "TSM", change: 0.03 }];
  const select = vi.fn();
  const { container } = render(
    <NewsMarketStage
      edition={edition}
      watchlist={[watch("TSM"), watch("TSMX", "TSM")]}
      onSelect={select}
    />,
  );
  expect(overnightQuotes(edition).get("TSMX")).toBeUndefined();
  expect(container.querySelectorAll(".overnight-grid button")).toHaveLength(2);
  expect(container.querySelectorAll(".overnight-grid button")[1]?.textContent).toContain("—");
  expect(container.querySelector(".overnight-missing")?.hasAttribute("open")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: /TSMX/ }));
  expect(select).toHaveBeenCalledWith("TSM");
});
it("each original article keeps its own title or publication time, never the shared digest title", () => {
  const edition = structuredClone(raw) as Edition;
  const section = edition.sections.find((s) => s.kind === "ticker_digests");
  if (section?.kind !== "ticker_digests") throw Error("missing fixture");
  section.items = section.items.slice(0, 1);
  section.items[0]!.data.whatHappened = "亚马逊核电协议与AWS成本变化";
  section.items[0]!.data.sourceIds = ["one", "two"];
  edition.sections = [section, { kind: "calendar", title: "今晚日程", items: [] }];
  const first: Article = {
    ...(articleRaw as Article),
    id: "one",
    title: "English nuclear article",
    url: "https://benzinga.com/one",
    publishedAt: "2026-10-01T12:00:00Z",
  };
  const second: Article = {
    ...first,
    id: "two",
    title: "AWS自己的中文标题",
    url: "https://benzinga.com/two",
  };
  const { container } = render(<EditionView edition={edition} articles={[first, second]} />);
  expect(screen.getByRole("heading", { name: "亚马逊核电协议与AWS成本变化" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /benzinga.com.*20:00/ }).getAttribute("href")).toBe(
    first.url,
  );
  expect(
    screen.getByRole("link", { name: /benzinga.com · AWS自己的中文标题/ }).getAttribute("href"),
  ).toBe(second.url);
  expect(container.textContent).not.toContain("今晚日程");
});

it("prioritizes news, sorts other available quotes by absolute move and folds missing data", () => {
  const edition = structuredClone(raw) as Edition;
  const snapshot = edition.sections.find((s) => s.kind === "close_snapshot");
  const digests = edition.sections.find((s) => s.kind === "ticker_digests");
  if (snapshot?.kind !== "close_snapshot" || digests?.kind !== "ticker_digests")
    throw Error("missing fixture");
  snapshot.items[0]!.data.watchlist = [
    { symbol: "NEWS", change: 0.001 },
    { symbol: "DROP", change: -0.08 },
    { symbol: "RISE", change: 0.02 },
  ];
  digests.items = digests.items.slice(0, 1);
  digests.items[0]!.data.symbol = "NEWS";
  digests.items[0]!.data.whatHappened = "真实中文测试消息";
  const { container } = render(
    <NewsMarketStage
      edition={edition}
      watchlist={[watch("RISE"), watch("DROP"), watch("NEWS"), watch("MISSING")]}
    />,
  );
  const main = container.querySelector(".overnight-grid");
  expect(
    [...main!.querySelectorAll(".overnight-symbol")].map((e) => e.textContent?.split("●")[0]),
  ).toEqual(["NEWS", "DROP", "RISE"]);
  expect(container.querySelector(".overnight-missing summary")?.textContent).toBe(
    "暂无行情 · 1 只",
  );
});
