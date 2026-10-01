"""根注入TUSHARE_TOKEN后执行只读验收和原始录制。"""

import argparse
from datetime import date
from pathlib import Path

from hub_core.config import load_config
from hub_core.settings import Settings

from .adapter import TushareSource
from .collection import collect


def main() -> int:
    parser = argparse.ArgumentParser(description="TuShare原始数据验收与Parquet录制（不写API）")
    parser.add_argument("--dates", nargs="+", required=True)
    parser.add_argument("--config-dir", type=Path, default=Path("config"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--current-only", action="store_true", help="只验收目标日，不录制回看窗口")
    args = parser.parse_args()
    settings = Settings()
    if settings.tushare_token is None:
        print("缺少 TUSHARE_TOKEN")
        return 1
    config = load_config(args.config_dir / "market.yaml")
    source = TushareSource(
        settings.tushare_token.get_secret_value(),
        cache_dir=Path(config["cacheDir"]),
        concurrency=config["run"]["concurrency"],
        retries=config["run"]["retries"],
    )
    failed = False
    try:
        for value in args.dates:
            day = date.fromisoformat(value)
            result = collect(source, args.config_dir, day, history=not args.current_only)
            result.record(args.output / value)
            print(f"{value} 核心就绪={result.core_ready}")
            for key, frame in sorted(result.tables.items()):
                print(f"{key}：{frame.height}行（原始单位）")
            for key, reason in sorted(result.missing.items()):
                print(f"{key}：failed（{reason}）")
            failed |= bool(result.missing)
    finally:
        source.close()
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
