"""财政部 XML 的 10 年期收益率（百分数），日期必须精确匹配。"""

from datetime import date
from xml.etree import ElementTree as ET

from hub_core.http import HttpClient
from hub_providers.common.base import Provider
from hub_providers.common.parsing import number


class TreasurySource(Provider):
    def __init__(self, http: HttpClient, url: str) -> None:
        super().__init__(http, "treasury-yield")
        self.url = url

    def fetch_yield(self, session: date) -> float | None:
        def fetch() -> float | None:
            root = ET.fromstring(
                self.text(self.url, params={"field_tdr_date_value": str(session.year)})
            )
            found = False
            for node in root.iter():
                if node.tag.rsplit("}", 1)[-1] != "properties":
                    continue
                found = True
                fields = {child.tag.rsplit("}", 1)[-1]: child.text for child in node}
                if (fields.get("NEW_DATE") or "").split("T")[0] == session.isoformat():
                    return number(fields.get("BC_10YEAR"))
            if not found:
                raise ValueError("未找到财政部日线字段")
            return None

        return self.run(fetch)
