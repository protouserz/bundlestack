import styles from "./dashboard.module.css";

type OfferPoint = {
  createdAt: string;
  revenueGenerated: number;
};

type RevenueChartProps = {
  offers: OfferPoint[];
};

function buildSeries(offers: OfferPoint[]) {
  const days = 30;
  const now = new Date();
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - 1 - index));
    date.setHours(0, 0, 0, 0);
    return { date, revenue: 0 };
  });

  for (const offer of offers) {
    if (offer.revenueGenerated <= 0) continue;

    const offerDate = new Date(offer.createdAt);
    offerDate.setHours(0, 0, 0, 0);

    const bucket = buckets.find(
      (entry) => entry.date.getTime() === offerDate.getTime(),
    );
    if (bucket) {
      bucket.revenue += offer.revenueGenerated;
    } else {
      buckets[buckets.length - 1].revenue += offer.revenueGenerated;
    }
  }

  let cumulative = 0;
  return buckets.map((bucket) => {
    cumulative += bucket.revenue;
    return {
      label: bucket.date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: cumulative,
    };
  });
}

export function RevenueChart({ offers }: RevenueChartProps) {
  const series = buildSeries(offers);
  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const hasRevenue = series.some((point) => point.value > 0);

  const width = 640;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = series.map((point, index) => {
    const x = padX + (index / Math.max(series.length - 1, 1)) * chartW;
    const y = padY + chartH - (point.value / maxValue) * chartH;
    return { x, y, ...point };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padX} ${padY + chartH} L ${points[0]?.x ?? padX} ${padY + chartH} Z`;

  const yTicks = [0, 0.5, 1].map((ratio) => ({
    value: maxValue * ratio,
    y: padY + chartH - ratio * chartH,
  }));

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Revenue over time</h2>
      {!hasRevenue ? (
        <div className={styles.chartEmpty}>
          Revenue will appear here as bundle offers generate sales.
        </div>
      ) : (
        <div className={styles.chartWrap}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={padX}
                  y1={tick.y}
                  x2={width - padX}
                  y2={tick.y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#94a3b8"
                >
                  ${tick.value >= 1000 ? `${(tick.value / 1000).toFixed(1)}K` : tick.value.toFixed(0)}
                </text>
              </g>
            ))}

            <path d={areaPath} fill="url(#revenueFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.filter((_, index) => index % 5 === 0 || index === points.length - 1).map((point) => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r="4" fill="#ffffff" stroke="#22c55e" strokeWidth="2" />
                <text
                  x={point.x}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
