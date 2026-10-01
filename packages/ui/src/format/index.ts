// 统一显示口径；缺失数值显示破折号，不把缺失当零。
type Value = number | null | undefined;
const missing = (x: Value): x is null | undefined => x == null || !Number.isFinite(x);
export const num = (x: Value, digits = 2): string =>
  missing(x)
    ? "—"
    : new Intl.NumberFormat("zh-CN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(x);
const signed = (x: number, text: string, sign: boolean): string =>
  `${sign && x > 0 ? "+" : ""}${text}`;
export function pct(
  x: Value,
  { sign = true, digits = 2 }: { sign?: boolean; digits?: number } = {},
): string {
  return missing(x) ? "—" : signed(x, `${num(x * 100, digits)}%`, sign);
}
export function pp(x: Value): string {
  return missing(x) ? "—" : signed(x, `${num(x * 100, 1)} 个百分点`, true);
}
export function cny(x: Value): string {
  if (missing(x)) return "—";
  const a = Math.abs(x);
  if (a >= 1e12) return `${num(x / 1e12, 4)} 万亿`;
  if (a >= 1e8) return `${num(x / 1e8, a >= 1e10 ? 1 : 2)} 亿`;
  if (a >= 1e4) return `${num(x / 1e4)} 万`;
  return num(x);
}
export function usd(x: Value): string {
  if (missing(x)) return "—";
  const a = Math.abs(x);
  return `$${a >= 1e9 ? `${num(x / 1e9)}B` : a >= 1e6 ? `${num(x / 1e6)}M` : num(x)}`;
}
export function count(x: Value, unit = ""): string {
  return missing(x) ? "—" : `${num(x, 0)}${unit ? ` ${unit}` : ""}`;
}
export function date(value: string): string {
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return "—";
  return `${value.slice(0, 10)}（${new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "UTC" }).format(d)}）`;
}
export function time(value: string, tz = "Asia/Singapore"): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "—";
  const fmt = (zone: string) =>
    new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: zone,
    }).format(d);
  return tz === "Asia/Singapore"
    ? fmt(tz)
    : `${fmt("Asia/Singapore")}（${tz === "America/New_York" ? "美东" : tz} ${fmt(tz)}）`;
}
