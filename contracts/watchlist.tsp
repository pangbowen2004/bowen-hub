// 自选股（docs/02 第 3、9 节；初始值 config/us_watchlist.yaml，之后在控制台维护）。
// 接口在 routes/private/watchlist.tsp、routes/internal/watchlist.tsp。
import "./common.tsp";

namespace BowenHub;

/**
 * 自选股类型（docs/02 第 3 节）：stock 有自己的新闻和 SEC 公告；etf 按代码取新闻再加别名匹配；
 * leveraged_etf 并入标的；crypto 用加密新闻和日线（日涨跌幅按 UTC 日计算）
 */
union WatchItemKind {
  "stock",
  "etf",
  "leveraged_etf",
  "crypto",
}

/** 一只自选股（watch_items 表，docs/09 第 3 节） */
model WatchItem {
  /** 代码（主键）；加密资产用 BTC、XRP */
  symbol: string;

  /** 中文名或常用名 */
  name: string;

  kind: WatchItemKind;

  /** 分组（控制台和邮件里按组显示），如 半导体 */
  group: string;

  /** 杠杆 ETF / 现货 ETF 并入的标的（新闻、公告都算在标的名下），如 TSMX → TSM；没有时为 null */
  underlying: string | null;

  /** 判断“与板块同向”时对照的 ETF；为 null 时用 config/newsroom.yaml 的 defaultSectorEtf */
  sectorEtf: string | null;

  /** 在 RSS 标题里匹配这只股票用的名字（英文按词边界匹配，不区分大小写） */
  aliases: string[];

  /** 是否启用 */
  active: boolean;
}
