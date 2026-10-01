// 新闻契约；规则降级及 legacy 的出处为空，不伪造模型信息。
import "./common.tsp";
namespace BowenHub;
union EditionKind { "morning", "premarket", "weekly", "legacy" }
union NewsPaywall { "none", "metered", "hard" }
union NewsTopic { "us_china", "war_geopolitics", "markets_macro", "ai_tech", "big_tech", "us_politics", "china_business", "other" }
union UsNewsTopic { "macro_fed", "earnings", "ai_semis", "big_tech", "crypto", "policy_geo", "other" }
model Article {
  id: string; sourceId: string; kind: "news" | "filing" | "press_release" | "macro";
  title: string; url: string; publishedAt: DateTime; summary: string | null;
  lang: string; tickers: string[]; topics: string[]; paywall: NewsPaywall; clusterId: string | null;
}
model FilingExhibit { name: string; url: string; }
model Filing {
  accession: string; cik: string; ticker: string; form: string; filedAt: DateTime;
  items: string[]; url: string; exhibits: FilingExhibit[];
}
model InsiderTrade {
  accession: string; transactionIndex: int32; ticker: string; insider: string; role: string;
  code: string; shares: float64; priceUsd: float64 | null; valueUsd: float64 | null;
  filedAt: DateTime; url: string;
}
model CalendarEvent {
  kind: "macro" | "earnings" | "fomc"; date: Date; fredReleaseId: int32 | null;
  at: DateTime | null; title: string; tickers: string[]; timing: string | null; importance: string;
}
model TickerDigestPoint { @maxChars(60) text: string; /** 0–3 个来源，由能力运行时按提示词检查。 */ sourceIds: string[]; }
model TickerDigest {
  symbol: string; change: float64 | null; withSector: boolean | null;
  @maxChars(80) whatHappened: string; @maxChars(60) whyItMatters: string | null;
  /** 0–3 个来源，由能力运行时按提示词检查。 */ sourceIds: string[]; points: TickerDigestPoint[]; generatedBy: GeneratedBy | null;
}
model EarningsFigure {
  name: string; value: string; yoy: string | null; basis: "gaap" | "adjusted" | "other";
  @sourceQuote quote: string;
}
model EarningsGuidance { text: string; @sourceQuote quote: string; }
model EarningsCard {
  symbol: string; period: string; figures: EarningsFigure[]; guidance: EarningsGuidance | null;
  @maxChars(60) takeaway: string; sourceUrl: string; sourceAccession: string | null;
  publishedAt: DateTime; generatedBy: GeneratedBy | null;
}
model NewsSourceHealth { id: string; checkedAt: DateTime; status: "ok" | "failed"; error: string | null; }
model NewsArticleDigest {
  article: Article; summary: string | null; whyItMatters: string | null;
  topic: string | null; generatedBy: GeneratedBy | null;
}
model NewsFilingDigest { filing: Filing; @maxChars(120) digest: string | null; generatedBy: GeneratedBy | null; }
model NewsPriceChange { symbol: string; change: float64; }
model NewsCloseSnapshot {
  indices: NewsPriceChange[]; watchlist: NewsPriceChange[];
  treasury10Year: float64 | null; vix: float64 | null;
}
model NewsInternational {
  @maxChars(150) overview: string; top5: NewsNewsArticleDigestItem[]; briefs: NewsNewsArticleDigestItem[];
  generatedBy: GeneratedBy | null;
}
model NewsUnchangedTickers { symbols: string[]; }
model NewsSectionItem<T> { id: string; data: T; ruleScore?: float64; clusterId?: string | null; }
model NewsSnapshotSection { kind: "close_snapshot" | "weekly_performance"; title: string; items: NewsNewsCloseSnapshotItem[]; }
model NewsTickerSection { kind: "ticker_digests" | "ticker_weekly"; title: string; items: NewsTickerDigestItem[]; }
model NewsQuietSection { kind: "unchanged_tickers"; title: string; items: NewsNewsUnchangedTickersItem[]; }
model NewsArticlesSection { kind: "us_news" | "new_messages" | "international_weekly"; title: string; items: NewsNewsArticleDigestItem[]; }
model NewsEarningsSection { kind: "earnings" | "premarket_earnings" | "earnings_review"; title: string; items: NewsEarningsCardItem[]; }
model NewsFilingsSection { kind: "filings" | "important_filings"; title: string; items: NewsNewsFilingDigestItem[]; }
model NewsInsidersSection { kind: "insider_trades"; title: string; items: NewsInsiderTradeItem[]; }
model NewsCalendarSection { kind: "calendar" | "next_week_calendar"; title: string; items: NewsCalendarEventItem[]; }
model NewsInternationalSection { kind: "international" | "legacy_headlines"; title: string; items: NewsNewsInternationalItem[]; }
union NewsSection {
  NewsSnapshotSection, NewsTickerSection, NewsQuietSection, NewsArticlesSection,
  NewsEarningsSection, NewsFilingsSection, NewsInsidersSection, NewsCalendarSection, NewsInternationalSection
}
model EditionWindow { fromAt: DateTime | null; toAt: DateTime | null; }
model EditionLede { @maxChars(350) lines: string[]; generatedBy: GeneratedBy | null; }
model EditionAiUsage { inputTokens: int32; outputTokens: int32; costUsd: float64; }
model EditionEmail { sentAt: DateTime | null; }
model Edition {
  id: string; kind: EditionKind; date: Date; window: EditionWindow; generatedAt: DateTime | null;
  lede: EditionLede | null; sections: NewsSection[]; sources: NewsSourceHealth[];
  aiUsage: EditionAiUsage | null; email: EditionEmail | null;
}
model EditionSummary { id: string; kind: EditionKind; date: Date; generatedAt: DateTime | null; }
model EditionPage is CursorPage<EditionSummary>;
model EditionFeedbackRequest { @minValue(1) @maxValue(5) score: int32; }
model ItemFeedbackRequest { editionId: string; itemId: string; reason: "useless" | "incorrect"; }
model EditionFeedback { kind: "edition"; id: string; createdAt: DateTime; editionId: string; @minValue(1) @maxValue(5) score: int32; }
model ItemFeedback { kind: "item"; id: string; createdAt: DateTime; editionId: string; itemId: string; reason: "useless" | "incorrect"; }
union Feedback { EditionFeedback, ItemFeedback }
model ArticleTimelineItem { kind: "article"; at: DateTime; article: Article; }
model FilingTimelineItem { kind: "filing"; at: DateTime; filing: Filing; }
model EarningsTimelineItem { kind: "earnings"; at: DateTime; earnings: EarningsCard; }
union NewsTimelineItem { ArticleTimelineItem, FilingTimelineItem, EarningsTimelineItem }

model NewsCalendarEventItem is NewsSectionItem<CalendarEvent>;
model NewsEarningsCardItem is NewsSectionItem<EarningsCard>;
model NewsInsiderTradeItem is NewsSectionItem<InsiderTrade>;
model NewsNewsArticleDigestItem is NewsSectionItem<NewsArticleDigest>;
model NewsNewsCloseSnapshotItem is NewsSectionItem<NewsCloseSnapshot>;
model NewsNewsFilingDigestItem is NewsSectionItem<NewsFilingDigest>;
model NewsNewsInternationalItem is NewsSectionItem<NewsInternational>;
model NewsNewsUnchangedTickersItem is NewsSectionItem<NewsUnchangedTickers>;
model NewsTickerDigestItem is NewsSectionItem<TickerDigest>;
