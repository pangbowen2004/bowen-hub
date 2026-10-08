import type { CalendarEvent, MarketEvent } from "@bowen-hub/contracts";

export type CalendarEntry = MarketEvent & {
  market: "a" | "us";
  timing?: string;
  sortTime?: string;
};

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
export function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
export function shiftMonth(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}
export function monthWeeks(month: Date) {
  const start = monthStart(month);
  const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  const first = new Date(start);
  first.setUTCDate(1 - ((start.getUTCDay() + 6) % 7));
  const count = Math.ceil(((last.getTime() - first.getTime()) / 86400000 + 1) / 7);
  return Array.from({ length: count }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => new Date(first.getTime() + (week * 7 + day) * 86400000)),
  );
}
export function chronological<T extends MarketEvent & { sortTime?: string }>(events: readonly T[]) {
  return [...events].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      (a.sortTime ?? "").localeCompare(b.sortTime ?? "") ||
      a.endDate.localeCompare(b.endDate) ||
      a.title.localeCompare(b.title, "zh-CN") ||
      a.id.localeCompare(b.id),
  );
}
export function isOngoing(event: MarketEvent) {
  const days = (Date.parse(event.endDate) - Date.parse(event.startDate)) / 86400000 + 1;
  // 月份精度来自来源文字，不把“10月8日”或具体日期误判为整月事项。
  const monthOnly =
    /(?:预计|计划(?:于)?|拟(?:于)?|目标(?:为)?|定于)\s*(?:\d{4}\s*年\s*)?\d{1,2}\s*(?:月\s*[—–－-]\s*\d{1,2}\s*)?月(?!\s*\d{1,2}\s*[日号])/u;
  const shortRange = /(?:预计|计划(?:于)?)\s*(?:\d{4}\s*年\s*)?\d{1,2}\s*[—–－-]\s*\d{1,2}\s*月/u;
  return days > 14 || monthOnly.test(event.title) || shortRange.test(event.title);
}

export function combinedEvents(markets: MarketEvent[], news: CalendarEvent[]): CalendarEntry[] {
  const result: CalendarEntry[] = markets.map((event) => ({
    ...event,
    title: event.title
      .replace(/Federal Reserve/gi, "美联储")
      .replace(/Beige Book/g, "经济褐皮书")
      .replace(/SEMICON West Standards Meetings/g, "美国西部半导体展标准会议")
      .replace(/SEMICON West/g, "美国西部半导体展")
      .replace(/SEMI Test Vision Symposium/g, "半导体测试技术研讨会")
      .replace(/NVIDIA/g, "英伟达")
      .replace(/GTC Berlin/g, "柏林 GTC"),
    market: /美国|美联储|FOMC|Federal Reserve/i.test(`${event.title} ${event.sourceLabel}`)
      ? "us"
      : "a",
  }));
  for (const event of news) {
    const clock = event.at
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "America/New_York",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(event.at))
      : null;
    const timing = clock
      ? `美东 ${clock}`
      : event.timing === "bmo"
        ? "美股盘前"
        : event.timing === "amc"
          ? "美股盘后"
          : undefined;
    const meeting =
      event.kind === "fomc"
        ? result.find(
            (row) =>
              /FOMC|美联储.*会议/u.test(row.title) &&
              row.startDate <= event.date &&
              row.endDate === event.date,
          )
        : undefined;
    if (meeting) {
      meeting.timing =
        meeting.startDate === event.date
          ? timing
          : `${event.date.slice(5).replace("-", "/")} ${timing ?? ""}`;
      meeting.sortTime = clock ?? undefined;
      meeting.market = "us";
      continue;
    }
    result.push({
      id: `us-${event.kind}-${event.date}-${event.fredReleaseId ?? event.tickers.join("-")}`,
      title:
        event.kind === "earnings"
          ? `${event.tickers.join("、")} 财报`
          : event.kind === "macro" && !event.title.startsWith("美国")
            ? `美国${/^[A-Za-z]/u.test(event.title) ? " " : ""}${event.title}`
            : event.title,
      startDate: event.date,
      endDate: event.date,
      market: "us",
      timing,
      sortTime:
        clock ?? (event.timing === "bmo" ? "00:00" : event.timing === "amc" ? "23:59" : undefined),
      sourceLabel:
        event.kind === "earnings" ? "Finnhub" : event.kind === "fomc" ? "FRED · 美联储" : "FRED",
      sourceUrl:
        event.kind === "earnings"
          ? "https://finnhub.io/"
          : event.kind === "fomc"
            ? "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
            : `https://fred.stlouisfed.org/release?rid=${event.fredReleaseId}`,
      status: event.kind === "earnings" ? "pending" : "confirmed",
      confirmation: event.kind === "earnings" ? "财报日期以公司最新公告为准。" : "官方发布日程。",
      invalidation: "来源调整日期后，以最新日程为准。",
      watchItems: event.tickers,
      aShareMappings: [],
    });
  }
  return chronological(result);
}

export function weekBars<T extends MarketEvent & { sortTime?: string }>(days: Date[], events: T[]) {
  const dates = days.map(dateKey),
    occupied: number[] = [];
  return chronological(events)
    .filter((event) => event.startDate <= dates[6]! && event.endDate >= dates[0]!)
    .map((event) => {
      const start = Math.max(
        0,
        dates.findIndex((date) => date >= event.startDate),
      );
      const end = dates.findLastIndex((date) => date <= event.endDate);
      let lane = occupied.findIndex((last) => last < start);
      if (lane < 0) lane = occupied.length;
      occupied[lane] = end;
      return {
        event,
        start,
        end,
        lane,
        continuesBefore: event.startDate < dates[0]!,
        continuesAfter: event.endDate > dates[6]!,
      };
    });
}
