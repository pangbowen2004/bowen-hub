import type {
  Article,
  EarningsCard,
  Edition,
  Filing,
  InsiderTrade,
  NewsSection,
} from "@bowen-hub/contracts";
import type { ReactNode } from "react";
import { count, date, num, pct, time, usd } from "../../format";
import "./edition.css";
export function SourceLink({ url, children = "原文 →" }: { url: string; children?: ReactNode }) {
  try {
    if (!["http:", "https:"].includes(new URL(url).protocol))
      return <span className="muted">来源链接无效</span>;
  } catch {
    return <span className="muted">来源链接无效</span>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
export function ArticleContent({
  article,
  summary,
  why,
}: {
  article: Article;
  summary?: string | null;
  why?: string | null;
}) {
  return (
    <>
      <h3>
        <SourceLink url={article.url}>{article.title}</SourceLink>
      </h3>
      <p className="muted">
        {article.sourceId} · {date(article.publishedAt)} {time(article.publishedAt)}
        {article.paywall !== "none" ? " · 可能需要订阅" : ""}
      </p>
      {(summary ?? article.summary) && <p>{summary ?? article.summary}</p>}
      {why && <p>为什么重要：{why}</p>}
      <div className="row">
        {article.tickers.map((symbol) => (
          <a key={symbol} href={`/news/tickers/${encodeURIComponent(symbol)}`}>
            {symbol}
          </a>
        ))}
      </div>
    </>
  );
}
export function EarningsContent({ card }: { card: EarningsCard }) {
  return (
    <>
      <h3>
        {card.symbol} · {card.period}
      </h3>
      <dl className="edition-figures">
        {card.figures.map((figure) => (
          <div key={`${figure.name}-${figure.basis}-${figure.value}`}>
            <dt>
              {figure.name} ·{" "}
              {figure.basis === "gaap"
                ? "GAAP"
                : figure.basis === "adjusted"
                  ? "调整后"
                  : "其他口径"}
            </dt>
            <dd>
              {figure.value}
              {figure.yoy ? `（同比 ${figure.yoy}）` : ""}
            </dd>
            <details>
              <summary>原文依据</summary>
              <blockquote>{figure.quote}</blockquote>
            </details>
          </div>
        ))}
      </dl>
      {card.guidance && (
        <>
          <p>指引：{card.guidance.text}</p>
          <details>
            <summary>指引依据</summary>
            <blockquote>{card.guidance.quote}</blockquote>
          </details>
        </>
      )}
      {card.takeaway && <p>{card.takeaway}</p>}
      <SourceLink url={card.sourceUrl} />
    </>
  );
}
export function FilingContent({ filing, digest }: { filing: Filing; digest?: string | null }) {
  return (
    <>
      <h3>
        {filing.ticker} · {filing.form}
      </h3>
      <p>{filing.items.length ? `Item ${filing.items.join("、")}` : "已发布"}</p>
      {digest && <p>{digest}</p>}
      <SourceLink url={filing.url} />
      {filing.exhibits.map((exhibit) => (
        <p key={`${exhibit.name}-${exhibit.url}`}>
          <SourceLink url={exhibit.url}>{exhibit.name} →</SourceLink>
        </p>
      ))}
    </>
  );
}
export function InsiderContent({ trade }: { trade: InsiderTrade }) {
  return (
    <>
      <h3>
        {trade.ticker} · {trade.insider}（{trade.role}）
      </h3>
      <p>
        {trade.code === "P" ? "买入" : trade.code === "S" ? "卖出" : `交易代码 ${trade.code}`}{" "}
        {count(trade.shares, "股")}，均价 {usd(trade.priceUsd)}，合计 {usd(trade.valueUsd)}
      </p>
      <SourceLink url={trade.url} />
    </>
  );
}
type Flag = (id: string) => ReactNode;
function Content({ section, flag }: { section: NewsSection; flag?: Flag }) {
  switch (section.kind) {
    case "close_snapshot":
    case "weekly_performance":
      return section.items.map((item) => (
        <article key={item.id}>
          <div className="edition-prices">
            {[...item.data.indices, ...item.data.watchlist].map((entry) => (
              <span key={entry.symbol}>
                <a href={`/news/tickers/${encodeURIComponent(entry.symbol)}`}>{entry.symbol}</a>{" "}
                <strong className={entry.change > 0 ? "up" : entry.change < 0 ? "down" : ""}>
                  {pct(entry.change)}
                </strong>
              </span>
            ))}
          </div>
          <p>
            10年美债 {pct(item.data.treasury10Year, { sign: false })} · VIX {num(item.data.vix)}
          </p>
          {flag?.(item.id)}
        </article>
      ));
    case "ticker_digests":
    case "ticker_weekly":
      return section.items.map(({ id, data }) => (
        <article key={id}>
          <h3>
            <a href={`/news/tickers/${encodeURIComponent(data.symbol)}`}>{data.symbol}</a>{" "}
            <span className={(data.change ?? 0) > 0 ? "up" : (data.change ?? 0) < 0 ? "down" : ""}>
              {pct(data.change)}
            </span>
          </h3>
          <p>{data.whatHappened}</p>
          {data.whyItMatters && <p>为什么重要：{data.whyItMatters}</p>}
          <ul>
            {data.points.map((point) => (
              <li key={point.text}>
                {point.text}
                <SourceIds ids={point.sourceIds} />
              </li>
            ))}
          </ul>
          <SourceIds ids={data.sourceIds} />
          {flag?.(id)}
        </article>
      ));
    case "unchanged_tickers":
      return section.items.map((item) => (
        <article key={item.id}>
          <p>无重要消息：{item.data.symbols.join("、") || "暂无"}</p>
          {flag?.(item.id)}
        </article>
      ));
    case "us_news":
    case "new_messages":
    case "international_weekly":
      return section.items.map((item) => (
        <article key={item.id}>
          <ArticleContent
            article={item.data.article}
            summary={item.data.summary}
            why={item.data.whyItMatters}
          />
          {item.data.topic && <p className="muted">{item.data.topic}</p>}
          {flag?.(item.id)}
        </article>
      ));
    case "earnings":
    case "premarket_earnings":
    case "earnings_review":
      return section.items.map((item) => (
        <article key={item.id}>
          <EarningsContent card={item.data} />
          {flag?.(item.id)}
        </article>
      ));
    case "filings":
    case "important_filings":
      return section.items.map((item) => (
        <article key={item.id}>
          <FilingContent filing={item.data.filing} digest={item.data.digest} />
          {flag?.(item.id)}
        </article>
      ));
    case "insider_trades":
      return section.items.map((item) => (
        <article key={item.id}>
          <InsiderContent trade={item.data} />
          {flag?.(item.id)}
        </article>
      ));
    case "calendar":
    case "next_week_calendar":
      return section.items.length ? (
        section.items.map((item) => (
          <article key={item.id}>
            <h3>{item.data.title}</h3>
            <p>
              {item.data.at
                ? `${date(item.data.at)} ${time(item.data.at)}（新加坡）`
                : `${item.data.date} · 时间待确认`}
              {item.data.timing === "bmo" ? " · 盘前" : item.data.timing === "amc" ? " · 盘后" : ""}
            </p>
            <p>{item.data.tickers.join("、")}</p>
            {flag?.(item.id)}
          </article>
        ))
      ) : (
        <p>{section.kind === "next_week_calendar" ? "下周没有重要日程" : "今晚没有重要日程"}</p>
      );
    case "international":
    case "legacy_headlines":
      return section.items.map((item) => (
        <article key={item.id}>
          {item.data.overview && <p>{item.data.overview}</p>}
          {[...item.data.top5, ...item.data.briefs].map((entry) => (
            <div className="edition-international" key={entry.id}>
              <ArticleContent
                article={entry.data.article}
                summary={entry.data.summary}
                why={entry.data.whyItMatters}
              />
              {flag?.(entry.id)}
            </div>
          ))}
          {flag?.(item.id)}
        </article>
      ));
  }
}
// URL直接提供链接，业务来源ID保留原值，不能伪造外部来源网址。
function SourceIds({ ids }: { ids: string[] }) {
  return (
    <div className="row">
      {ids.map((id) =>
        /^https?:\/\//.test(id) ? (
          <SourceLink key={id} url={id} />
        ) : (
          <span key={id} className="muted">
            来源：{id}
          </span>
        ),
      )}
    </div>
  );
}
export function EditionView({
  edition,
  flag,
  children,
}: {
  edition?: Edition;
  flag?: Flag;
  children?: ReactNode;
}) {
  if (!edition)
    return (
      <section className="edition-view">{children ?? <p className="muted">内容准备中</p>}</section>
    );
  return (
    <div className="edition-view">
      {edition.lede && (
        <div className="edition-lede">
          {edition.lede.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      <nav aria-label="本期目录" className="edition-directory">
        {edition.sections.map((section, index) => (
          <a href={`#edition-section-${index}`} key={`${section.kind}-${section.title}`}>
            {section.title}
          </a>
        ))}
      </nav>
      {edition.sections.map((section, index) => (
        <section id={`edition-section-${index}`} key={`${section.kind}-${section.title}`}>
          <h2>{section.title}</h2>
          <Content section={section} flag={flag} />
          {section.items.length === 0 &&
            section.kind !== "calendar" &&
            section.kind !== "next_week_calendar" && <p className="muted">本期没有相关内容。</p>}
        </section>
      ))}
      <footer>
        <h2>来源与用量</h2>
        <ul>
          {edition.sources.map((source) => (
            <li key={source.id}>
              {source.id}：
              {source.status === "ok" ? "正常" : `失败 · ${source.error ?? "未提供原因"}`}
            </li>
          ))}
        </ul>
        <p>
          AI输入 {count(edition.aiUsage?.inputTokens)} · 输出 {count(edition.aiUsage?.outputTokens)}{" "}
          · 费用 {usd(edition.aiUsage?.costUsd)}
        </p>
        <p>
          生成时间：
          {edition.generatedAt
            ? `${date(edition.generatedAt)} ${time(edition.generatedAt)}`
            : "旧归档，生成时间未知"}{" "}
          · 邮件：{edition.email?.sentAt ? `已发送 ${time(edition.email.sentAt)}` : "没有发送记录"}
        </p>
      </footer>
    </div>
  );
}
