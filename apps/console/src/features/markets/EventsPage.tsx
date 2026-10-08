import { privateCalendarListEvents, publicMarketsListEvents } from "@bowen-hub/contracts/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  type CalendarEntry,
  combinedEvents,
  dateKey,
  isOngoing,
  monthStart,
  monthWeeks,
  shiftMonth,
  weekBars,
} from "./calendar";
import "./events.css";

const status = { confirmed: "已确认", pending: "待确认" } as const;
export function EventsPage() {
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [month, setMonth] = useState(() => monthStart(new Date(`${todayKey}T00:00:00Z`)));
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useQuery({
    queryKey: ["market-events"],
    queryFn: ({ signal }) => publicMarketsListEvents({}, { signal }),
  });
  const weeks = monthWeeks(month),
    prefix = dateKey(month).slice(0, 7);
  const end = dateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
  const usQuery = useQuery({
    queryKey: ["news-calendar", dateKey(month), end],
    queryFn: ({ signal }) =>
      privateCalendarListEvents({ from: dateKey(month), to: end }, { signal }),
  });
  const events = combinedEvents(query.data ?? [], usQuery.data ?? []).filter(
    (event) => event.startDate <= end && event.endDate >= dateKey(month),
  );
  const ongoing = events.filter(isOngoing),
    dated = events.filter((event) => !isOngoing(event));
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  return (
    <section className="events-page">
      <header className="events-header">
        <div>
          <p className="eyebrow">EVENT CALENDAR</p>
          <h1>事件日历</h1>
        </div>
        <div className="month-controls">
          <button type="button" aria-label="上个月" onClick={() => setMonth(shiftMonth(month, -1))}>
            ←
          </button>
          <h2 aria-live="polite">
            {month.getUTCFullYear()} 年 {month.getUTCMonth() + 1} 月
          </h2>
          <button type="button" aria-label="下个月" onClick={() => setMonth(shiftMonth(month, 1))}>
            →
          </button>
          <button
            type="button"
            onClick={() => setMonth(monthStart(new Date(`${todayKey}T00:00:00Z`)))}
          >
            本月
          </button>
        </div>
      </header>
      {(query.isPending || usQuery.isPending) && <p role="status">正在加载事件…</p>}
      {(query.error || usQuery.error) && (
        <p role="alert">
          {query.error ? "A 股事件加载失败。" : "美股日程加载失败。"}
          <button
            type="button"
            onClick={() => {
              void query.refetch();
              void usQuery.refetch();
            }}
          >
            重试
          </button>
        </p>
      )}
      <section className="calendar-legend" aria-label="市场颜色">
        <span className="market-a">A 股</span>
        <span className="market-us">美股</span>
        <small>日期按各市场当地时间；美国发布时刻标注美东时间</small>
      </section>
      {ongoing.length > 0 && (
        <section className="calendar-ongoing" aria-label="本月持续事项">
          <h2>本月持续事项</h2>
          <div>
            {ongoing.map((event) => (
              <button
                type="button"
                key={event.id}
                className={`ongoing-item market-${event.market}`}
                onClick={() => setSelected(event)}
              >
                {event.title}
              </button>
            ))}
          </div>
        </section>
      )}
      <div className="calendar-scroll">
        <section
          className="month-grid"
          aria-label={`${month.getUTCFullYear()}年${month.getUTCMonth() + 1}月月历`}
        >
          <div className="calendar-weekdays">
            {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          {weeks.map((days) => (
            <div className="calendar-week" key={dateKey(days[0]!)}>
              <div className="calendar-background" aria-hidden="true">
                {days.map((day) => (
                  <span
                    key={dateKey(day)}
                    className={dateKey(day).startsWith(prefix) ? "" : "outside-month"}
                  />
                ))}
              </div>
              <div className="calendar-dates">
                {days.map((day) => (
                  <time
                    key={dateKey(day)}
                    dateTime={dateKey(day)}
                    className={`${dateKey(day) === todayKey ? "is-today" : ""} ${dateKey(day).startsWith(prefix) ? "" : "outside-month"}`}
                  >
                    {day.getUTCDate()}
                  </time>
                ))}
              </div>
              <div className="calendar-bars">
                {weekBars(days, dated).map((bar) => (
                  <button
                    type="button"
                    key={bar.event.id}
                    className={`calendar-event market-${bar.event.market}`}
                    style={{
                      gridColumn: `${bar.start + 1} / ${bar.end + 2}`,
                      gridRow: bar.lane + 1,
                    }}
                    onClick={() => setSelected(bar.event)}
                    aria-label={`${bar.event.title}，${bar.event.startDate}至${bar.event.endDate}`}
                  >
                    {bar.continuesBefore && <span aria-hidden="true">← </span>}
                    {bar.event.title}
                    {bar.event.timing && <small>{bar.event.timing}</small>}
                    {bar.continuesAfter && <span aria-hidden="true"> →</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
      <section className="events-agenda" aria-label="本月事件列表">
        <header>
          <h2>本月日程</h2>
          <span>{dated.length} 项</span>
        </header>
        {!query.isPending &&
          !usQuery.isPending &&
          !query.error &&
          !usQuery.error &&
          !dated.length && <p className="muted">本月暂无事件。</p>}
        {dated.map((event) => (
          <article key={event.id} className={`market-${event.market}`}>
            <time dateTime={event.startDate}>
              {event.startDate.slice(5).replace("-", "/")}
              {event.endDate !== event.startDate && (
                <> — {event.endDate.slice(5).replace("-", "/")}</>
              )}
            </time>
            <div>
              <h3>
                <button type="button" onClick={() => setSelected(event)}>
                  {event.title}
                </button>
              </h3>
              <p>
                <span className="agenda-market">{event.market === "us" ? "美股" : "A 股"}</span>{" "}
                {event.timing && <span>· {event.timing} </span>}
                {event.sourceLabel} <span>· {status[event.status]}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label={`查看${event.title}`}
              onClick={() => setSelected(event)}
            >
              ↗
            </button>
          </article>
        ))}
      </section>
      <dialog
        ref={dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape") dialog.current?.close();
        }}
        className="event-dialog"
        aria-label="事件详情"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        {selected && (
          <>
            <header>
              <p>{status[selected.status]}</p>
              <button
                type="button"
                aria-label="关闭事件详情"
                onClick={() => dialog.current?.close()}
              >
                ×
              </button>
            </header>
            <h2>{selected.title}</h2>
            <p className="event-date">
              {selected.startDate} — {selected.endDate}
              {selected.timing && <> · {selected.timing}</>}
            </p>
            <p>
              {selected.sourceUrl ? (
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
                  {selected.sourceLabel} ↗
                </a>
              ) : (
                selected.sourceLabel
              )}
            </p>
            <dl>
              <dt>确认条件</dt>
              <dd>{selected.confirmation}</dd>
              <dt>失效条件</dt>
              <dd>{selected.invalidation}</dd>
              {selected.watchItems.length > 0 && (
                <>
                  <dt>观察项</dt>
                  <dd>
                    <ul>
                      {selected.watchItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
              {selected.aShareMappings.length > 0 && (
                <>
                  <dt>A 股映射</dt>
                  <dd>{selected.aShareMappings.join("、")}</dd>
                </>
              )}
            </dl>
          </>
        )}
      </dialog>
    </section>
  );
}
