import type { Article, Edition, WatchItem } from "@bowen-hub/contracts";
import { useState } from "react";
import { pct } from "../../format";
import { useAnimatedNumber, useReducedMotion } from "../../hooks/motion";
import { articleSourceLabel } from "../EditionView";
import "./stage.css";

export function overnightQuotes(edition: Edition) {
  const prices = new Map<string, number | null>();
  for (const section of edition.sections) {
    if (section.kind === "close_snapshot" || section.kind === "weekly_performance")
      for (const item of section.items)
        for (const quote of item.data.watchlist) prices.set(quote.symbol, quote.change);
    if (section.kind === "ticker_digests" || section.kind === "ticker_weekly")
      for (const item of section.items)
        if (!prices.has(item.data.symbol)) prices.set(item.data.symbol, item.data.change);
  }
  return prices;
}
function Quote({ value, reduced }: { value: number | null; reduced: boolean }) {
  const displayed = useAnimatedNumber(value ?? 0, reduced);
  return (
    <strong className={value && value > 0 ? "up" : value && value < 0 ? "down" : ""}>
      {value === null ? "—" : pct(displayed)}
    </strong>
  );
}
export function NewsMarketStage({
  edition,
  watchlist,
  articles = [],
  onSelect,
}: {
  edition: Edition;
  watchlist: WatchItem[];
  articles?: Article[];
  onSelect?: (symbol: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const prices = overnightQuotes(edition);
  const active = watchlist.filter((w) => w.active);
  const entries = active.length
    ? active
    : [...prices.keys()].map((symbol) => ({
        symbol,
        name: symbol,
        group: "自选股",
        underlying: null,
      }));
  const rows = [...entries].sort(
    (a, b) =>
      Number(prices.get(b.symbol) != null) - Number(prices.get(a.symbol) != null) ||
      Math.abs(prices.get(b.symbol) ?? 0) - Math.abs(prices.get(a.symbol) ?? 0),
  );
  const news = new Map<string, Set<string>>();
  for (const section of edition.sections) {
    if (section.kind !== "ticker_digests" && section.kind !== "ticker_weekly") continue;
    for (const { data } of section.items) {
      if (!/[\u3400-\u9fff]/.test(data.whatHappened)) continue;
      news.set(data.symbol, new Set(data.sourceIds));
    }
  }
  const referenceIds = new Set([...news.values()].flatMap((ids) => [...ids]));
  const events = articles.filter(
    (a) =>
      referenceIds.has(a.id) &&
      new Set(a.tickers.filter((t) => rows.some((w) => w.symbol === t))).size >= 2,
  );
  return (
    <section
      className="data-stage news-market-stage"
      aria-label="全部自选股隔夜涨跌"
      data-reduced={reduced}
    >
      <header>
        <div>
          <p className="eyebrow">隔夜观察 / OVERNIGHT WATCH</p>
          <h2>全部自选股隔夜涨跌</h2>
        </div>
        <p className="stage-muted">{edition.date}</p>
      </header>
      <div className="overnight-grid">
        {rows.map((row, i) => {
          const symbol = row.underlying ?? row.symbol;
          const count = news.get(symbol)?.size ?? 0;
          return (
            <button
              type="button"
              key={row.symbol}
              aria-pressed={selected === row.symbol}
              style={{ "--order": i } as React.CSSProperties}
              onClick={() => {
                setSelected(row.symbol);
                onSelect?.(symbol);
              }}
            >
              <span className="overnight-symbol">
                {row.symbol}
                <small>{count > 0 ? `● ${count} 篇` : ""}</small>
              </span>
              <Quote value={prices.get(row.symbol) ?? null} reduced={reduced} />
              <span className="overnight-name">{row.name}</span>
            </button>
          );
        })}
      </div>
      {events.length > 0 && (
        <div className="overnight-events">
          {events.map((article) => (
            <div key={article.id}>
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {articleSourceLabel(article)}
              </a>
              <div className="linked-stocks">
                {[...new Set(article.tickers)]
                  .filter((t) => rows.some((w) => w.symbol === t))
                  .map((symbol) => (
                    <button
                      type="button"
                      key={symbol}
                      onClick={() => {
                        setSelected(symbol);
                        onSelect?.(symbol);
                      }}
                    >
                      {symbol}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
