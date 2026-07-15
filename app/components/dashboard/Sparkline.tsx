type SparklineProps = {
  values: number[];
  className?: string;
};

export function Sparkline({ values, className }: SparklineProps) {
  const width = 120;
  const height = 40;
  const padding = 2;

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x =
      padding +
      (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y =
      height -
      padding -
      ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c6ecb" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2c6ecb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <path
        d={linePath}
        fill="none"
        stroke="#2c6ecb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function buildSparklineFromCount(count: number, points = 8): number[] {
  if (count <= 0) {
    return Array.from({ length: points }, () => 0);
  }

  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    return Math.max(0, Math.round(count * (0.35 + progress * 0.65)));
  });
}

export function buildSparklineFromRevenue(revenue: number, points = 8): number[] {
  if (revenue <= 0) {
    return Array.from({ length: points }, () => 0);
  }

  return Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const wave = 0.85 + Math.sin(progress * Math.PI) * 0.15;
    return Math.round(revenue * progress * wave);
  });
}
