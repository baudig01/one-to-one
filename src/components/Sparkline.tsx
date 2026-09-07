interface SparklineProps {
  /** Valeurs dans l'ordre chronologique (la dernière est la plus récente) */
  values: number[];
  min?: number;
  max?: number;
  stroke?: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Courbe de tendance minimaliste (SVG inline, aucune dépendance graphique).
 * Utilisée pour visualiser l'évolution du ressenti d'un membre ou de l'équipe.
 */
export function Sparkline({
  values,
  min = 1,
  max = 10,
  stroke = '#6366f1',
  className = '',
  width = 96,
  height = 28,
}: SparklineProps) {
  if (values.length === 0) return null;

  const padding = 3;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const range = Math.max(0.001, max - min);

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : padding + (index / (values.length - 1)) * usableW;
    const clamped = Math.min(max, Math.max(min, value));
    const y = padding + usableH - ((clamped - min) / range) * usableH;
    return { x, y };
  });

  const line = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;
  const last = points[points.length - 1];
  const gradientId = `spark-${stroke.replace('#', '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {values.length > 1 && <polygon points={area} fill={`url(#${gradientId})`} />}
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={2.6} fill="#fff" stroke={stroke} strokeWidth={1.8} />
    </svg>
  );
}
