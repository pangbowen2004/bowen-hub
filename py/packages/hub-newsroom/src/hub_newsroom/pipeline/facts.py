"""公告、内部人与财报原文的确定性事实包；不提取或补造财务数字。"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from hub_contracts import (
    EarningsCard,
    EarningsCardInput,
    Filing,
    FilingDigestInput,
    InsiderTrade,
    WatchItem,
)
from hub_newsroom.common.settings import Settings


@dataclass(frozen=True)
class EarningsRelease:
    symbol: str
    url: str
    text: str
    published_at: datetime
    accession: str | None = None
    # 新闻必须由采集层明确标为财报新闻，不能仅凭任意标题猜测。
    source_kind: str = "news"
    confirmed: bool = True


@dataclass(frozen=True)
class EarningsFact:
    id: str
    card: EarningsCard
    prompt: EarningsCardInput
    confirmed: bool


def eligible_filing(filing: Filing, settings: Settings) -> bool:
    rules = settings.newsroom.filings
    form = filing.form.upper()
    base = form.removesuffix("/A")
    return base in {
        rules.eightK,
        rules.sixK,
        *rules.periodic,
        *rules.offerings,
        *rules.ownership,
    } or any(form.startswith(prefix) for prefix in rules.offerings if prefix == "424B")


def filing_label(filing: Filing, settings: Settings) -> str:
    rules = settings.newsroom.filings
    base = filing.form.upper().removesuffix("/A")
    if base == rules.eightK:
        names = [
            rules.items8k[item].name if item in rules.items8k else f"Item {item}"
            for item in filing.items
        ]
        return "、".join(names) or "8-K 已发布"
    return f"{filing.form} 已发布"


def filing_prompt(
    filing: Filing, text: str | None, name: str, settings: Settings
) -> FilingDigestInput | None:
    if (
        filing.form.upper().removesuffix("/A") != settings.newsroom.filings.eightK
        or not any(
            settings.newsroom.filings.items8k[i].digest
            for i in filing.items
            if i in settings.newsroom.filings.items8k
        )
        or not text
    ):
        return None
    return FilingDigestInput(
        symbol=filing.ticker, name=name, form=filing.form, items=filing.items, text=text
    )


def select_insiders(
    trades: Sequence[InsiderTrade], settings: Settings, symbols: set[str]
) -> tuple[InsiderTrade, ...]:
    rules = settings.newsroom.filings.insider
    unique = {
        (t.accession, t.transactionIndex): t
        for t in trades
        if t.ticker in symbols
        and (
            t.code == rules.buyCode
            or (
                t.code == rules.sellCode
                and t.valueUsd is not None
                and t.valueUsd >= settings.newsroom.thresholds.insiderSellMinUsd
            )
        )
    }
    return tuple(
        sorted(unique.values(), key=lambda t: (t.filedAt, t.accession, t.transactionIndex))
    )


def insider_text(trade: InsiderTrade, settings: Settings) -> str:
    action = "买入" if trade.code == settings.newsroom.filings.insider.buyCode else "卖出"

    def number(value: float) -> str:
        # 保留契约数字的十进制值，不擅自把多位均价四舍五入成另一个事实。
        return format(Decimal(str(value)), ",f")

    price = f"均价 ${number(trade.priceUsd)}" if trade.priceUsd is not None else "均价未提供"
    value = f"合计 ${number(trade.valueUsd)}" if trade.valueUsd is not None else "合计金额未提供"
    return f"{trade.insider}（{trade.role}）{action} {number(trade.shares)} 股，{price}，{value}"


def earnings_facts(
    filings: Sequence[Filing],
    exhibit_texts: Mapping[str, str],
    news: Sequence[EarningsRelease],
    watchlist: Sequence[WatchItem],
    settings: Settings,
) -> tuple[EarningsFact, ...]:
    names = {w.symbol: w.name for w in watchlist if w.active}
    allowed = set(names) | set(settings.newsroom.megaCaps)
    releases: list[EarningsRelease] = []
    for filing in filings:
        if filing.ticker not in allowed:
            continue
        form = filing.form.upper().removesuffix("/A")
        if not (
            form == settings.newsroom.filings.sixK
            or (form == settings.newsroom.filings.eightK and "2.02" in filing.items)
        ):
            continue
        for exhibit in filing.exhibits:
            name = exhibit.name.upper()
            suitable = (
                name == "EX-99.1"
                if form == settings.newsroom.filings.eightK
                else name.startswith("EX-99.")
            )
            text = exhibit_texts.get(exhibit.url)
            if suitable and text:
                releases.append(
                    EarningsRelease(
                        filing.ticker,
                        exhibit.url,
                        text,
                        filing.filedAt,
                        filing.accession,
                        "press_release",
                        form != settings.newsroom.filings.sixK,
                    )
                )
                break
    # 同一股票已有原始新闻稿则不用新闻替代；多次SEC发布保留自然键，不凭标题合并。
    official = {r.symbol for r in releases if r.confirmed}
    releases.extend(r for r in news if r.symbol in allowed and r.symbol not in official and r.text)
    result: dict[str, EarningsFact] = {}
    for release in releases:
        if release.source_kind not in {"press_release", "news"}:
            raise ValueError("财报原文类型必须是 press_release 或 news")
        source_kind = "press_release" if release.source_kind == "press_release" else "news"
        key = release.accession or release.url
        card = EarningsCard(
            symbol=release.symbol,
            period="",
            figures=[],
            guidance=None,
            takeaway="",
            sourceUrl=release.url,
            sourceAccession=release.accession,
            publishedAt=release.published_at,
            generatedBy=None,
        )
        prompt = EarningsCardInput(
            symbol=release.symbol,
            name=names.get(release.symbol, release.symbol),
            sourceKind=source_kind,
            sourceUrl=release.url,
            sourceText=release.text,
        )
        result[key] = EarningsFact("earnings:" + key, card, prompt, release.confirmed)
    return tuple(sorted(result.values(), key=lambda f: (f.card.publishedAt, f.id)))
