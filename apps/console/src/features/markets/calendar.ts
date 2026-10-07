import type { MarketEvent } from "@bowen-hub/contracts";

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
export function chronological(events: MarketEvent[]) {
  return [...events].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.title.localeCompare(b.title, "zh-CN") ||
      a.id.localeCompare(b.id),
  );
}
export function weekBars(days: Date[], events: MarketEvent[]) {
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
