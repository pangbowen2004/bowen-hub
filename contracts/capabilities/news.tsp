// 提示词字段及能力输出；运行时可在校验后盖章 generatedBy。
import "../common.tsp";
import "../news.tsp";
namespace BowenHub;
model NewsPromptItem { id: string; title: string; summary: string | null; }
model NewsCandidate extends NewsPromptItem {
  topic: string | null; source: string; publishedAt: DateTime; tickers: string[];
  ruleScore: float64; paywall: NewsPaywall;
}
model BriefInput { items: NewsPromptItem[]; }
model NewsBrief { id: string; @maxChars(120) brief: string; }
model BriefOutput { briefs: NewsBrief[]; generatedBy?: GeneratedBy; }
model ClassifyInput { items: NewsPromptItem[]; }
model NewsClassification { id: string; topic: NewsTopic; }
model ClassifyOutput { classifications: NewsClassification[]; generatedBy?: GeneratedBy; }
model CurateInput { candidates: NewsCandidate[]; }
model NewsCuratedItem { id: string; summary: string; whyItMatters: string; }
model CurateOutput { @maxChars(150) overview: string; top5: NewsCuratedItem[]; generatedBy?: GeneratedBy; }
model EarningsCardInput { symbol: string; name: string; sourceKind: "press_release" | "news"; sourceUrl: string; sourceText: string; }
model EarningsCardOutput {
  period: string; figures: EarningsFigure[]; guidance: EarningsGuidance | null;
  @maxChars(60) takeaway: string; generatedBy?: GeneratedBy;
}
/** 已整理的事实文本，数字用显示口径字符串，避免向提示词传浮点收益率。 */
model EditionLedeFact { id: string; text: string; }
model EditionLedeInput { mode: "morning" | "premarket" | "weekly"; date: Date; facts: EditionLedeFact[]; }
model EditionLedeOutput { @maxChars(350) lines: string[]; generatedBy?: GeneratedBy; }
model FilingDigestInput { symbol: string; name: string; form: string; items: string[]; text: string; }
model FilingDigestOutput { @maxChars(120) digest: string; generatedBy?: GeneratedBy; }
model NewsTickerArticle extends NewsPromptItem { source: string; publishedAt: DateTime; }
model NewsTickerFiling { id: string; form: string; items: string[]; digest: string | null; }
/** 财报来源具有稳定条目 id，供 source_ids_exist 校验。 */
model NewsTickerEarnings extends EarningsCard { id: string; }
model TickerDigestInput {
  mode: "daily" | "weekly"; symbol: string; name: string; changeText: string | null;
  withSector: boolean | null; sectorEtf: string | null; articles: NewsTickerArticle[];
  filings: NewsTickerFiling[]; earnings: NewsTickerEarnings[] | null;
}
model TickerDigestOutput {
  @maxChars(80) whatHappened: string; @maxChars(60) whyItMatters: string | null;
  /** 0–3 个来源，由能力运行时按提示词检查。 */ sourceIds: string[]; points: TickerDigestPoint[]; generatedBy?: GeneratedBy;
}
model UsRankInput { candidates: NewsCandidate[]; minItems: int32; maxItems: int32; }
model NewsRankedItem extends NewsCuratedItem { topic: UsNewsTopic; }
model UsRankOutput { items: NewsRankedItem[]; generatedBy?: GeneratedBy; }
