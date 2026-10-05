// 行内 SVG 小折线：不依赖图表库，随文字颜色；每个点都在 <title> 里读得出来。
export function Sparkline({
  values,
  label,
  domain,
  threshold,
  width = 112,
  height = 28,
}: {
  values: number[];
  label: string;
  /** 纵轴范围；评分固定 0–1，这样不同评测之间的起伏可以直接比较 */
  domain?: [number, number];
  /** 最低要求，画成一条虚线 */
  threshold?: number | null;
  width?: number;
  height?: number;
}) {
  if (values.length === 0)
    return (
      <span className="muted" role="img" aria-label={label}>
        —
      </span>
    );
  const pad = 3;
  const low = domain ? domain[0] : Math.min(...values);
  const high = domain ? domain[1] : Math.max(...values);
  const span = high - low || 1;
  const x = (index: number) =>
    values.length === 1 ? width / 2 : pad + (index * (width - 2 * pad)) / (values.length - 1);
  const y = (value: number) =>
    height - pad - (Math.min(Math.max(value, low), high) - low) * ((height - 2 * pad) / span);
  const last = values.length - 1;
  return (
    <svg
      className="ops-spark"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {threshold != null && (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(threshold)}
          y2={y(threshold)}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.45"
        />
      )}
      {values.length > 1 && (
        <polyline
          points={values
            .map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`)
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      )}
      <circle cx={x(last)} cy={y(values[last] ?? low)} r="2.6" fill="currentColor" />
    </svg>
  );
}
