"""纯配置校验；YAML读取由调用方的IO边界完成。"""

from typing import Literal

from pydantic import BaseModel


class Source(BaseModel):
    id: str
    name: str
    section: Literal["us", "international"]
    category: str | None = None
    weight: float = 1
    paywall: Literal["none", "metered", "hard"] = "none"
    enabled: bool = True


class EditionRule(BaseModel):
    readingBudgetChars: int
    maxWindowHours: int | None = None
    initialWindowHours: int | None = None
    maxMarketItems: int | None = None
    internationalTop: int | None = None
    minutesBeforeOpen: int | None = None
    guardWindowEt: list[str] | None = None


class ClusterRule(BaseModel):
    titleSimilarity: float
    sameTickerHours: float
    tokenOverlap: float


class RankRule(BaseModel):
    candidates: int
    min: int
    max: int


class Thresholds(BaseModel):
    bigMove: float
    sectorSyncMove: float
    insiderSellMinUsd: float
    usRank: RankRule
    cluster: ClusterRule
    internationalBriefs: int


class RecencyRule(BaseModel):
    withinHours: float
    score: float


class ScoreKeywords(BaseModel):
    high: list[str]
    medium: list[str]
    highScore: float
    mediumScore: float
    maxScore: float


class Scoring(BaseModel):
    recency: list[RecencyRule]
    watchlist: float
    megaCap: float
    paywall: dict[str, float]
    keywords: ScoreKeywords


class SnapshotRules(BaseModel):
    indexEtfs: list[str]
    defaultSectorEtf: str
    treasury10y: bool
    vix: bool


class ItemRule(BaseModel):
    name: str
    digest: bool


class InsiderRules(BaseModel):
    buyCode: str
    sellCode: str


class FilingRules(BaseModel):
    eightK: str
    sixK: str
    periodic: list[str]
    offerings: list[str]
    ownership: list[str]
    insider: InsiderRules
    items8k: dict[str, ItemRule]


class MacroRelease(BaseModel):
    fredName: str
    label: str
    timeEt: str


class FomcMeeting(BaseModel):
    dates: list[str]
    sep: bool


class MacroRules(BaseModel):
    releases: list[MacroRelease]
    fomc: list[FomcMeeting]
    fomcStatementTimeEt: str


class CalendarRules(BaseModel):
    releaseNames: list[str]
    fomcRelease: MacroRelease
    symbolAliases: dict[str, list[str]]


class NewsroomRules(BaseModel):
    timezone: str
    usMarket: dict[str, str]
    editions: dict[str, EditionRule]
    thresholds: Thresholds
    scoring: Scoring
    snapshot: SnapshotRules
    filings: FilingRules
    macro: MacroRules
    megaCaps: list[str]
    calendar: CalendarRules


class LanguageKeywords(BaseModel):
    en: list[str]
    zh: list[str]


class TopicRule(LanguageKeywords):
    topic: str


class InternationalPipeline(BaseModel):
    recentHours: float
    titleSimilarity: float
    perCategory: int
    curateCandidates: int
    topN: int
    ruleMaxPerTopic: int


class InternationalRules(BaseModel):
    categoryScore: dict[str, float]
    paywallPenalty: dict[str, float]
    scoreKeywords: dict[str, LanguageKeywords]
    keywordScores: dict[str, float]
    topicRules: list[TopicRule]
    topicLabels: dict[str, str]
    topicOrder: list[str]
    pipeline: InternationalPipeline


class Settings(BaseModel):
    newsroom: NewsroomRules
    international: InternationalRules
    sources: list[Source]

    def source(self, source_id: str) -> Source:
        for source in self.sources:
            if source.id == source_id:
                return source
        # 来源未知时遵循清单默认权重1，不编造类别或付费墙。
        return Source(id=source_id, name=source_id, section="us")

    def source_order(self, source_id: str) -> int:
        return next(
            (i for i, source in enumerate(self.sources) if source.id == source_id),
            len(self.sources),
        )


class SourceCatalogue(BaseModel):
    defaults: dict[str, object]
    sources: list[dict[str, object]]


def parse_settings(newsroom: object, international: object, sources: object) -> Settings:
    """接收已读取的YAML内容，合并来源默认项；不访问文件或环境变量。"""
    catalogue = SourceCatalogue.model_validate(sources)
    return Settings.model_validate(
        {
            "newsroom": newsroom,
            "international": international,
            "sources": [{**catalogue.defaults, **source} for source in catalogue.sources],
        }
    )
