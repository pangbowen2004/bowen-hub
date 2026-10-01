"""CBOE 日线 CSV 只取结算日 CLOSE，不以前值代替缺失日。"""

import csv
from datetime import date, datetime
from io import StringIO

from hub_core.http import HttpClient
from hub_providers.common.base import Provider
from hub_providers.common.parsing import number


class CboeSource(Provider):
    def __init__(self, http: HttpClient, url: str) -> None:
        super().__init__(http, "cboe-vix")
        self.url = url

    def fetch_vix(self, session: date) -> float | None:
        def fetch() -> float | None:
            reader = csv.DictReader(StringIO(self.text(self.url)))
            if reader.fieldnames is None or not {"DATE", "CLOSE"}.issubset(reader.fieldnames):
                raise ValueError("缺少 VIX 日线列")
            for row in reader:
                if datetime.strptime(row["DATE"], "%m/%d/%Y").date() == session:
                    return number(row["CLOSE"])
            return None

        return self.run(fetch)
