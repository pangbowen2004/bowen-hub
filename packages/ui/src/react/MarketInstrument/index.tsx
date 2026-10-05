import type { MarketDay } from "@bowen-hub/contracts";
import { useId, useState } from "react";
import { cny, num, pct, pp } from "../../format";
import { useAnimatedNumber, useReducedMotion } from "../../hooks/motion";
import "./instrument.css";

const cx = 320;
const cy = 312;
const point = (radius: number, angle: number) => [
  cx + radius * Math.sin((angle * Math.PI) / 180),
  cy - radius * Math.cos((angle * Math.PI) / 180),
];
const arc = (radius: number, from: number, to: number) =>
  `M${point(radius, from)} A${radius},${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${point(radius, to)}`;
const color = (value: number) => (value > 0 ? "#d78f8c" : value < 0 ? "#7cb49c" : "#98a6ad");

export function MarketInstrument({
  day,
  initialIndex,
  detailOnly = false,
}: {
  day: MarketDay;
  initialIndex?: number;
  detailOnly?: boolean;
}) {
  const items = day.directions?.items ?? [];
  const [selected, setSelected] = useState(
    () =>
      initialIndex ??
      items.reduce(
        (best, row, index) =>
          row.relativeVsAllA > (items[best]?.relativeVsAllA ?? -Infinity) ? index : best,
        0,
      ),
  );
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const temperature = useAnimatedNumber(day.temperature.value, reduced, 1200);
  const row = items[selected];
  const hovered = items[hover ?? selected];
  const relative = useAnimatedNumber(row?.relativeVsAllA ?? 0, reduced);
  const breadth = useAnimatedNumber(row?.advanceShare ?? 0, reduced);
  const amount = useAnimatedNumber(row?.amountShare ?? 0, reduced);
  const filter = `market-glow-${useId().replaceAll(":", "")}`;
  const step = 360 / Math.max(1, items.length);
  const leaders = row?.leaders.filter((member) => member.return1d > 0).slice(0, 3) ?? [];
  const laggards = row?.laggards.filter((member) => member.return1d < 0).slice(0, 3) ?? [];
  const detail = row ? (
    <aside className="instrument-side" aria-live="polite">
      <p className="eyebrow">方向焦点 / DIRECTION</p>
      <h2>{row.name}</h2>
      <p className="stage-muted">
        {row.state} · 当日涨跌{" "}
        <span style={{ color: color(row.return1d) }}>{pct(row.return1d)}</span>
      </p>
      <dl className="direction-metrics">
        <div>
          <dt>相对全 A</dt>
          <dd
            data-metric="relative"
            data-value={row.relativeVsAllA}
            style={{ color: color(row.relativeVsAllA) }}
          >
            {pp(relative)}
          </dd>
        </div>
        <div>
          <dt>上涨宽度</dt>
          <dd data-metric="share" data-value={row.advanceShare}>
            {pct(breadth, { sign: false, digits: 1 })}
          </dd>
        </div>
        <div>
          <dt>成交占比</dt>
          <dd data-metric="share" data-value={row.amountShare}>
            {pct(amount, { sign: false, digits: 1 })}
          </dd>
        </div>
      </dl>
      {(leaders.length > 0 || laggards.length > 0) && (
        <svg
          className="member-distribution"
          viewBox="0 0 330 70"
          aria-label="领涨与领跌成员当日涨跌分布"
        >
          <title>领涨与领跌成员当日涨跌分布</title>
          <path d="M12 36H318" stroke="#98a6ad44" />
          <path d="M165 20V45" stroke="#98a6ad66" />
          {[...leaders, ...laggards].map((s, i) => (
            <circle
              key={s.code}
              cx={165 + Math.max(-12, Math.min(12, s.return1d * 100)) * 12}
              cy={30 + (i % 3) * 7}
              r="4"
              fill={color(s.return1d)}
            >
              <title>{`${s.name} ${pct(s.return1d)}`}</title>
            </circle>
          ))}
          <text x="12" y="64" fill="#98a6ad" fontSize="10">
            -12%
          </text>
          <text x="165" y="64" textAnchor="middle" fill="#98a6ad" fontSize="10">
            0
          </text>
          <text x="318" y="64" textAnchor="end" fill="#98a6ad" fontSize="10">
            +12%
          </text>
        </svg>
      )}
      {leaders.length > 0 && (
        <section>
          <h3>领涨成员</h3>
          {leaders.map((s) => (
            <div className="member-row" key={s.code}>
              <span>{s.name}</span>
              <span className="up">{pct(s.return1d)}</span>
            </div>
          ))}
        </section>
      )}
      {laggards.length > 0 && (
        <section>
          <h3>领跌成员</h3>
          {laggards.map((s) => (
            <div className="member-row" key={s.code}>
              <span>{s.name}</span>
              <span className="down">{pct(s.return1d)}</span>
            </div>
          ))}
        </section>
      )}
      <div className="direction-history">
        {row.return20d != null && (
          <p>
            20 日涨跌 <span style={{ color: color(row.return20d) }}>{pct(row.return20d)}</span>
          </p>
        )}
        <p>成交额 {cny(row.amountCny)}元</p>
      </div>
    </aside>
  ) : null;
  if (detailOnly) return detail;
  return (
    <section
      data-temperature={day.temperature.value}
      className="data-stage market-instrument"
      aria-label="收盘驾驶舱"
    >
      <header className="instrument-heading">
        <div>
          <p className="eyebrow">收盘观测 / MARKET INSTRUMENT</p>
          <h1>{day.summary.headline}</h1>
          <p className="stage-muted">{day.date} 收盘</p>
        </div>
        <dl className="instrument-stats">
          <div>
            <dt>
              成交额 <small>TURNOVER</small>
            </dt>
            <dd>
              {cny(day.market.turnoverCny)}
              <small>
                环比{" "}
                <span style={{ color: color(day.market.turnoverChange ?? 0) }}>
                  {pct(day.market.turnoverChange)}
                </span>
              </small>
            </dd>
          </div>
          <div>
            <dt>
              涨停 / 跌停 <small>LIMIT UP / DOWN</small>
            </dt>
            <dd>
              <span className="up">{day.limitEcology.limitUpCount}</span>
              <span className="stage-muted"> / </span>
              <span className="down">{day.limitEcology.limitDownCount}</span>
            </dd>
          </div>
          <div>
            <dt>
              封板率 <small>SEALED</small>
            </dt>
            <dd>{pct(day.limitEcology.sealRate, { sign: false, digits: 0 })}</dd>
          </div>
          <div>
            <dt>
              最高板 <small>STREAK</small>
            </dt>
            <dd>
              {day.limitEcology.maxBoardHeight}
              <small>连板</small>
            </dd>
          </div>
        </dl>
      </header>
      <div className="instrument-layout">
        <div>
          <svg
            className="market-dial"
            viewBox="-100 0 930 640"
            aria-label="方向表盘：标签为当日涨跌，指针为相对全A"
          >
            <title>{`市场温度 ${num(day.temperature.value, 1)}，${items.length} 个方向`}</title>
            <defs>
              <filter id={filter} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g className="dial-skeleton">
              {[120, 142, 194, 232, 262, 283].map((r) => (
                <circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke="#8ba6b72c"
                  strokeWidth=".7"
                />
              ))}
              {Array.from({ length: 128 }, (_, i) => i).map((i) => (
                <path
                  key={`刻度-${i * 2.6}`}
                  d={`M${point(i % 8 === 0 ? 271 : 277, (i * 360) / 128)}L${point(283, (i * 360) / 128)}`}
                  stroke={i % 8 === 0 ? "#b6c9d177" : "#b6c9d132"}
                />
              ))}
            </g>
            <g className="dial-data">
              {items.map((x, index) => {
                const a = index * step + 2,
                  b = (index + 1) * step - 2,
                  mid = (a + b) / 2;
                const end = point(Math.max(148, Math.min(218, 163 + x.relativeVsAllA * 880)), mid);
                const label = point(295, mid);
                const anchor = Math.sin((mid * Math.PI) / 180);
                return (
                  // biome-ignore lint/a11y/useSemanticElements: SVG扇区不能替换成HTML按钮；提供键盘、焦点和选中语义。
                  <g
                    key={x.name}
                    data-direction-index={index}
                    data-readout={JSON.stringify([
                      x.name,
                      pp(x.relativeVsAllA),
                      pct(x.advanceShare, { sign: false, digits: 1 }),
                      pct(x.amountShare, { sign: false, digits: 1 }),
                    ])}
                    role="button"
                    tabIndex={0}
                    aria-label={`${x.name}，当日涨跌 ${pct(x.return1d)}`}
                    aria-pressed={index === selected}
                    className={`dial-sector ${index === selected ? "selected" : ""}`}
                    onClick={() => setSelected(index)}
                    onMouseEnter={() => setHover(index)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(index)}
                    onBlur={() => setHover(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(index);
                      }
                      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                        event.preventDefault();
                        const next =
                          (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
                          items.length;
                        setSelected(next);
                        (
                          event.currentTarget.parentElement?.children[next] as
                            | SVGElement
                            | undefined
                        )?.focus();
                      }
                    }}
                  >
                    <path
                      className="sector-hit"
                      d={`M${point(128, a)}L${point(267, a)}A267,267 0 0 1 ${point(267, b)}L${point(128, b)}A128,128 0 0 0 ${point(128, a)}`}
                    />
                    <path d={arc(142, a, b)} stroke="#829ca530" strokeWidth="5" fill="none" />
                    <path
                      d={arc(142, a, a + (b - a) * x.advanceShare)}
                      stroke={color(x.return1d)}
                      strokeWidth="5"
                      fill="none"
                    />
                    <path d={arc(232, a, b)} stroke="#bac4bb20" strokeWidth="3" fill="none" />
                    <path
                      d={arc(232, a, a + (b - a) * Math.min(1, x.amountShare / 0.2))}
                      stroke="#c8c1a4"
                      strokeWidth="3"
                      fill="none"
                    />
                    <path
                      d={`M${point(163, mid)}L${end}`}
                      stroke={color(x.relativeVsAllA)}
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={end[0]}
                      cy={end[1]}
                      r="3"
                      fill={color(x.relativeVsAllA)}
                      filter={index === selected ? `url(#${filter})` : undefined}
                    />
                    <text
                      className="sector-label"
                      x={label[0]}
                      y={(label[1] ?? 0) + 4}
                      textAnchor={anchor > 0.2 ? "start" : anchor < -0.2 ? "end" : "middle"}
                    >
                      {x.name}
                      <tspan x={label[0]} dy="17" fill={color(x.return1d)}>
                        {pct(x.return1d)}
                      </tspan>
                    </text>
                  </g>
                );
              })}
            </g>
            <g className="temperature-band">
              {Array.from({ length: 100 }, (_, i) => i).map((i) => (
                <path
                  data-temperature-segment={i}
                  key={`刻度-${i * 2.6}`}
                  d={arc(108, -130 + i * 2.6, -130 + i * 2.6 + 2.1)}
                  stroke={
                    i < 50
                      ? `hsl(${160 - i * 2.4} 24% ${50 + i * 0.13}%)`
                      : `hsl(${40 - (i - 50) * 0.7} 45% 60%)`
                  }
                  strokeWidth={i % 10 === 0 ? 8 : 4}
                  fill="none"
                  opacity={i < temperature ? 0.9 : 0.28}
                />
              ))}
              {[0, 25, 50, 75, 100].map((v) => (
                <text
                  key={v}
                  x={point(122, -130 + v * 2.6)[0]}
                  y={(point(122, -130 + v * 2.6)[1] ?? 0) + 3}
                  textAnchor="middle"
                  fill="#ceb993"
                  fontSize="9"
                >
                  {v}
                </text>
              ))}
              <g
                className="temperature-needle"
                transform={`rotate(${-130 + temperature * 2.6} ${cx} ${cy})`}
                filter={`url(#${filter})`}
              >
                <path
                  d={`M${cx},${cy - 104}L${cx - 3},${cy - 89}L${cx + 3},${cy - 89}Z`}
                  fill="#ffe3b5"
                />
              </g>
              <circle className="dial-breath" cx={cx} cy={cy} r="92" fill="#f2c98908" />
              <text x={cx} y={cy - 42} textAnchor="middle" className="temperature-label">
                市场温度
              </text>
              <text x={cx} y={cy + 26} textAnchor="middle" className="temperature-number">
                {num(temperature, 1)}
              </text>
              <text x={cx} y={cy + 56} textAnchor="middle" className="temperature-caption">
                COOL — WARM / 100
              </text>
            </g>
            {row && (
              <g
                className="direction-needle"
                style={{
                  transform: `rotate(${selected * step + step / 2}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                }}
                filter={`url(#${filter})`}
              >
                <path
                  d={`M${cx},${cy - 247}L${cx - 4},${cy - 258}L${cx + 4},${cy - 258}Z`}
                  fill="#efd5ae"
                />
              </g>
            )}
            {hovered && (
              <g className="dial-readout" transform="translate(700 230)">
                <rect width="120" height="148" fill="#192731ed" stroke="#bcd3df32" />
                <text x="14" y="24" fill="#eee3d0">
                  {hovered.name}
                </text>
                {[
                  [
                    "相对全 A",
                    `${hovered.relativeVsAllA > 0 ? "+" : ""}${num(hovered.relativeVsAllA * 100, 2)}pp`,
                  ],
                  ["上涨宽度", pct(hovered.advanceShare, { sign: false, digits: 1 })],
                  ["成交占比", pct(hovered.amountShare, { sign: false, digits: 1 })],
                ].map(([label, value], i) => (
                  <g key={label}>
                    <text x="14" y={54 + i * 34} fill="#98a6ad" fontSize="11">
                      {label}
                    </text>
                    <text x="110" y={70 + i * 34} fill="#d8d9cf" fontSize="12" textAnchor="end">
                      {value}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </svg>
          <p className="instrument-legend">
            标签：当日涨跌 · 指针：相对全 A · 内弧：上涨宽度 · 外弧：成交占比
          </p>
        </div>
        {detail}
      </div>
    </section>
  );
}
