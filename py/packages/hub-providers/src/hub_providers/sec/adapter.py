"""EDGAR 公告、附件原文和 Form 4；请求上限覆盖整个进程。"""

import re
from collections.abc import Callable, Sequence
from datetime import datetime
from threading import Lock
from time import monotonic, sleep
from typing import Any
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

from selectolax.parser import HTMLParser

from hub_contracts import Filing, FilingExhibit, InsiderTrade
from hub_core.http import HttpClient
from hub_providers.common.base import Provider
from hub_providers.common.parsing import instant, number


class SecRateLimiter:
    def __init__(
        self, clock: Callable[[], float] = monotonic, sleeper: Callable[[float], None] = sleep
    ) -> None:
        self.clock = clock
        self.sleeper = sleeper
        self.last: float | None = None
        self.lock = Lock()

    def wait(self) -> None:
        with self.lock:
            if self.last is not None:
                self.sleeper(max(0, 0.1 - (self.clock() - self.last)))
            self.last = self.clock()


_LIMITER = SecRateLimiter()


def form4(
    xml: str, *, accession: str, ticker: str, filed_at: datetime, url: str
) -> list[InsiderTrade]:
    root = ET.fromstring(xml)

    def text(node: ET.Element, path: str) -> str:
        return (node.findtext(path) or "").strip()

    owners = root.findall("reportingOwner")
    insider = "; ".join(text(owner, "reportingOwnerId/rptOwnerName") for owner in owners)
    roles: list[str] = []
    for owner in owners:
        relation = owner.find("reportingOwnerRelationship")
        if relation is not None:
            title = text(relation, "officerTitle")
            roles.extend([title] if title else [])
            roles.extend(
                label
                for field, label in [
                    ("isDirector", "董事"),
                    ("isTenPercentOwner", "10% 股东"),
                    ("isOther", "其他"),
                ]
                if text(relation, field) in {"1", "true"}
            )
    result: list[InsiderTrade] = []
    rows = [
        node
        for node in root.iter()
        if node.tag in {"nonDerivativeTransaction", "derivativeTransaction"}
    ]
    for index, row in enumerate(rows):
        shares = number(text(row, "transactionAmounts/transactionShares/value"))
        if shares is None:
            raise ValueError("交易股数缺失")
        price = number(text(row, "transactionAmounts/transactionPricePerShare/value"))
        result.append(
            InsiderTrade(
                accession=accession,
                transactionIndex=index,
                ticker=ticker,
                insider=insider,
                role="; ".join(dict.fromkeys(roles)),
                code=text(row, "transactionCoding/transactionCode"),
                shares=shares,
                priceUsd=price,
                valueUsd=number(shares * price) if price is not None else None,
                filedAt=filed_at,
                url=url,
            )
        )
    return result


class SecSource(Provider):
    def __init__(
        self,
        http: HttpClient,
        user_agent: str,
        *,
        forms: Sequence[str],
        limiter: SecRateLimiter = _LIMITER,
    ) -> None:
        if not user_agent.strip():
            raise ValueError("SEC_USER_AGENT 未配置")
        super().__init__(
            http,
            "sec-edgar",
            headers={"User-Agent": user_agent, "Accept-Encoding": "gzip, deflate"},
        )
        self.forms = tuple(forms)
        self.limiter = limiter

    def get(self, url: str, *, params: dict[str, str | int] | None = None) -> Any:
        self.limiter.wait()
        return super().get(url, params=params)

    def text(self, url: str, *, params: dict[str, str | int] | None = None) -> str:
        self.limiter.wait()
        return super().text(url, params=params)

    def company_tickers(self) -> dict[str, tuple[str, str]]:
        def fetch() -> dict[str, tuple[str, str]]:
            data = self.get("https://www.sec.gov/files/company_tickers.json")
            return {
                row["ticker"]: (str(row["cik_str"]).zfill(10), row["title"])
                for row in data.values()
            }

        return self.run(fetch)

    def submission_rows(self, cik: str, start: datetime, end: datetime) -> list[dict[str, Any]]:
        data = self.get("https://data.sec.gov/submissions/CIK" + cik + ".json")
        tables = [data["filings"]["recent"]]
        for file in data["filings"].get("files", []):
            if (
                file["filingFrom"] <= end.date().isoformat()
                and file["filingTo"] >= start.date().isoformat()
            ):
                tables.append(self.get("https://data.sec.gov/submissions/" + file["name"]))
        rows: dict[str, dict[str, Any]] = {}
        for table in tables:
            for i, accession in enumerate(table["accessionNumber"]):
                row: dict[str, Any] = {
                    key: values[i] for key, values in table.items() if isinstance(values, list)
                }
                stamp = instant(row["acceptanceDateTime"])
                if start <= stamp < end:
                    rows[accession] = row
        return list(rows.values())

    def documents(self, cik: str, accession: str) -> tuple[str, list[tuple[str, str, str]]]:
        base = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession.replace('-', '')}/"
        index = HTMLParser(self.text(base + accession + "-index.htm"))
        docs: list[tuple[str, str, str]] = []
        for row in index.css("table.tableFile tr"):
            cells = row.css("td")
            if len(cells) < 4:
                continue
            link = cells[2].css_first("a")
            if link is not None and link.attributes.get("href"):
                docs.append(
                    (
                        cells[3].text(strip=True),
                        cells[1].text(strip=True),
                        urljoin(base, link.attributes["href"] or ""),
                    )
                )
        if not docs:
            raise ValueError("未找到公告目录中的文档")
        return base, docs

    def fetch_filings(
        self, start: datetime, end: datetime, symbols: Sequence[str]
    ) -> Sequence[Filing]:
        def fetch() -> list[Filing]:
            mapping = self.company_tickers()
            result: list[Filing] = []
            for symbol in symbols:
                if symbol not in mapping:
                    continue
                cik, _ = mapping[symbol]
                for row in self.submission_rows(cik, start, end):
                    form = row["form"]
                    base_form = form.removesuffix("/A")
                    if not any(
                        base_form == allowed
                        or (allowed == "424B" and base_form.startswith(allowed))
                        for allowed in self.forms
                    ):
                        continue
                    base, documents = self.documents(cik, row["accessionNumber"])
                    exhibits = [
                        FilingExhibit(name=kind, url=url)
                        for kind, _, url in documents
                        if kind == "EX-99.1" or (base_form == "6-K" and kind.startswith("EX-99."))
                    ]
                    items = [
                        value.strip()
                        for value in re.split(r"[,;]", row.get("items", ""))
                        if value.strip()
                    ]
                    primary = base + row["primaryDocument"]
                    if base_form == "8-K" and not items:
                        body = HTMLParser(self.text(primary)).text(separator=" ", strip=True)
                        items = list(
                            dict.fromkeys(
                                re.findall(r"\bItem\s+(\d\.\d{2})\b", body, flags=re.IGNORECASE)
                            )
                        )
                    result.append(
                        Filing(
                            accession=row["accessionNumber"],
                            cik=cik,
                            ticker=symbol,
                            form=form,
                            filedAt=instant(row["acceptanceDateTime"]),
                            items=items,
                            url=primary,
                            exhibits=exhibits,
                        )
                    )
            return result

        return self.run(fetch)

    def fetch_insiders(
        self, start: datetime, end: datetime, symbols: Sequence[str]
    ) -> Sequence[InsiderTrade]:
        def fetch() -> list[InsiderTrade]:
            mapping = self.company_tickers()
            result: list[InsiderTrade] = []
            for symbol in symbols:
                if symbol not in mapping:
                    continue
                cik, _ = mapping[symbol]
                for row in self.submission_rows(cik, start, end):
                    if row["form"].removesuffix("/A") != "4":
                        continue
                    base, documents = self.documents(cik, row["accessionNumber"])
                    # 原始 XML 地址，不取 SEC XSL 展示页。
                    name = row["primaryDocument"].split("/")[-1]
                    xml_url = base + name
                    if not name.endswith(".xml"):
                        xml_url = next(
                            url
                            for kind, _, url in documents
                            if kind in {"4", "4/A"} and url.endswith(".xml")
                        )
                        xml_url = base + xml_url.split("/")[-1]
                    result.extend(
                        form4(
                            self.text(xml_url),
                            accession=row["accessionNumber"],
                            ticker=symbol,
                            filed_at=instant(row["acceptanceDateTime"]),
                            url=xml_url,
                        )
                    )
            return result

        return self.run(fetch)

    def fetch_text(self, url: str) -> str:
        return self.run(lambda: HTMLParser(self.text(url)).text(separator=" ", strip=True))
