"""离线检查辅助策略的边界、原策略保留和官方生成元信息。"""

import importlib.util
import json
import unittest
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace

import jsonschema_rs
import schemathesis
from hypothesis import find, given, seed, settings
from hypothesis import strategies as st
from schemathesis.generation import GenerationMode

ROOT = Path(__file__).resolve().parents[3]
module_spec = importlib.util.spec_from_file_location(
    "contract_market_day", Path(__file__).with_name("contract-market-day.py")
)
module = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(module)
PAYLOADS = [
    {
        kind: json.loads((ROOT / f"fixtures/samples/markets/{model}.{date}.json").read_text())
        for kind, model in (("day", "MarketDay"), ("summary", "MarketDaySummary"))
    }
    for date in ("2026-08-27", "2026-08-28")
]
SEED = 181429371103572170478833750935110002696


class MarketStrategyTests(unittest.TestCase):
    def setUp(self):
        self.schema = schemathesis.openapi.from_path(str(ROOT / "contracts/generated/openapi.yaml"))
        self.operation = self.schema["/v1/internal/markets/days/{date}"]["put"]
        self.hook = module.market_day_strategy(PAYLOADS)

    def test_samples_satisfy_formal_schema_and_invalid_window_is_rejected(self):
        validator = jsonschema_rs.Draft202012Validator(
            {
                "$ref": "#/components/schemas/MarketDayWrite",
                "components": self.schema.raw_schema["components"],
            },
            validate_formats=True,
        )
        for payload in PAYLOADS:
            assert validator.is_valid(payload)
            invalid = deepcopy(payload)
            invalid["day"]["evolution"]["rows"].pop()
            assert not validator.is_valid(invalid)

    def test_other_operations_keep_same_strategy(self):
        original = st.just(object())
        for method, path in (
            ("get", self.operation.path),
            ("put", "/v1/internal/papers/{id}"),
        ):
            context = SimpleNamespace(operation=SimpleNamespace(method=method, path=path))
            assert self.hook(context, original) is original

    def test_original_case_and_negative_metadata_are_unchanged(self):
        original = find(
            self.operation.as_strategy(generation_mode=GenerationMode.NEGATIVE),
            lambda case: True,
            settings=settings(database=None, deadline=None),
        )
        metadata = original.meta
        combined = self.hook(SimpleNamespace(operation=self.operation), st.just(original))
        found = find(combined, lambda case: case is original, settings=settings(database=None))
        assert found is original
        assert found.meta is metadata
        assert found.meta.generation.mode == GenerationMode.NEGATIVE

    def test_assisted_cases_match_path_date_and_have_positive_metadata(self):
        combined = self.hook(SimpleNamespace(operation=self.operation), st.nothing())

        @seed(SEED)
        @settings(max_examples=20, database=None, deadline=None)
        @given(combined)
        def check(case):
            assert case.path_parameters["date"] == case.body["day"]["date"]
            assert case.body["summary"]["date"] == case.path_parameters["date"]
            assert case.meta.generation.mode == GenerationMode.POSITIVE
            assert case.body in PAYLOADS

        check()

    def test_full_random_strategy_remains_and_same_seed_generates_both_modes(self):
        self.schema.hook("before_generate_case")(self.hook)
        seen = set()
        random_bodies = []
        combined = st.one_of(
            self.operation.as_strategy(generation_mode=mode)
            for mode in (GenerationMode.POSITIVE, GenerationMode.NEGATIVE)
        )

        @seed(SEED)
        @settings(max_examples=20, database=None, deadline=None)
        @given(combined)
        def check(case):
            seen.add(case.meta.generation.mode)
            if case.body not in PAYLOADS:
                random_bodies.append(case.body)

        check()
        assert seen == {GenerationMode.POSITIVE, GenerationMode.NEGATIVE}
        assert random_bodies


if __name__ == "__main__":
    unittest.main()
