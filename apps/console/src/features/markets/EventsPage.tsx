import type { MarketEvent } from "@bowen-hub/contracts";
import { publicMarketsListEvents } from "@bowen-hub/contracts/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { chronological, dateKey, monthStart, monthWeeks, shiftMonth, weekBars } from "./calendar";
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
  const [selected, setSelected] = useState<MarketEvent | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const query = useQuery({
    queryKey: ["market-events"],
    queryFn: ({ signal }) => publicMarketsListEvents({}, { signal }),
  });
  const weeks = monthWeeks(month),
    prefix = dateKey(month).slice(0, 7);
  const end = dateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)));
  const events = chronological(query.data ?? []).filter(
    (event) => event.startDate <= end && event.endDate >= dateKey(month),
  );
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
      {query.isPending && <p role="status">正在加载事件…</p>}
      {query.error && (
        <p role="alert">
          事件加载失败。
          <button type="button" onClick={() => void query.refetch()}>
            重试
          </button>
        </p>
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
                {weekBars(days, events).map((bar) => (
                  <button
                    type="button"
                    key={bar.event.id}
                    className={`calendar-event ${bar.event.status}`}
                    style={{
                      gridColumn: `${bar.start + 1} / ${bar.end + 2}`,
                      gridRow: bar.lane + 1,
                    }}
                    onClick={() => setSelected(bar.event)}
                    aria-label={`${bar.event.title}，${bar.event.startDate}至${bar.event.endDate}`}
                  >
                    {bar.continuesBefore && <span aria-hidden="true">← </span>}
                    {bar.event.title}
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
          <span>{events.length} 项</span>
        </header>
        {!query.isPending && !query.error && !events.length && (
          <p className="muted">本月暂无事件。</p>
        )}
        {events.map((event) => (
          <article key={event.id}>
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
