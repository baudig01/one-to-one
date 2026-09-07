import { TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react';
import { WIN_PAIN_CONFIG, WIN_PAIN_TYPES } from '../types';
import type { SentimentResult } from '../utils/sentiment';
import { confidenceLabel } from '../utils/sentiment';

interface SentimentGaugeProps {
  sentiment: SentimentResult;
  /** Ressenti déclaré à la main, affiché en repère sur l'arc */
  declaredScore?: number | null;
  /** Score du one-to-one précédent, pour la variation */
  previousScore?: number | null;
  variant?: 'full' | 'compact';
  className?: string;
}

const RADIUS = 90;
const CX = 110;
const CY = 110;

/** Coordonnées d'un point de l'arc pour un score sur 10. */
function pointOnArc(score: number, radius = RADIUS) {
  const fraction = Math.min(1, Math.max(0, score / 10));
  const angle = Math.PI * (1 - fraction);
  return {
    x: CX + radius * Math.cos(angle),
    y: CY - radius * Math.sin(angle),
  };
}

function Arc({ sentiment, declaredScore }: { sentiment: SentimentResult; declaredScore?: number | null }) {
  const arcPath = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`;
  const progress = sentiment.hasData ? (sentiment.score / 10) * 100 : 0;
  const marker = pointOnArc(sentiment.score);
  const declaredMarker =
    declaredScore != null && Math.abs(declaredScore - sentiment.score) >= 0.5
      ? pointOnArc(declaredScore, RADIUS + 16)
      : null;

  return (
    <svg viewBox="0 0 220 132" className="w-full max-w-[260px]" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="sentiment-scale" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="45%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
      </defs>

      {/* Échelle de fond : du rouge au vert */}
      <path
        d={arcPath}
        fill="none"
        stroke="url(#sentiment-scale)"
        strokeWidth={16}
        strokeLinecap="round"
      />

      {/* Arc de valeur */}
      <path
        d={arcPath}
        fill="none"
        stroke={sentiment.hasData ? sentiment.tone.hex : '#cbd5e1'}
        strokeWidth={16}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${progress} 100`}
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1), stroke 400ms ease' }}
      />

      {/* Curseur du score calculé */}
      {sentiment.hasData && (
        <g style={{ transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <circle cx={marker.x} cy={marker.y} r={9} fill="#fff" />
          <circle cx={marker.x} cy={marker.y} r={6} fill={sentiment.tone.hex} />
        </g>
      )}

      {/* Repère du ressenti déclaré */}
      {declaredMarker && (
        <circle
          cx={declaredMarker.x}
          cy={declaredMarker.y}
          r={4}
          fill="#fff"
          stroke="#6366f1"
          strokeWidth={2}
        />
      )}

      {/* Graduations 0 / 5 / 10 */}
      <text x={CX - RADIUS} y={128} textAnchor="middle" className="fill-slate-300" fontSize="10">0</text>
      <text x={CX} y={12} textAnchor="middle" className="fill-slate-300" fontSize="10">5</text>
      <text x={CX + RADIUS} y={128} textAnchor="middle" className="fill-slate-300" fontSize="10">10</text>
    </svg>
  );
}

function BalanceBar({ sentiment }: { sentiment: SentimentResult }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-positive-600">
          {sentiment.positivePoints} pt{sentiment.positivePoints > 1 ? 's' : ''} positif
          {sentiment.positivePoints > 1 ? 's' : ''}
        </span>
        <span className="text-negative-600">
          {sentiment.negativePoints} pt{sentiment.negativePoints > 1 ? 's' : ''} négatif
          {sentiment.negativePoints > 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="bg-positive-500 transition-all duration-500 ease-out"
          style={{ width: `${sentiment.hasData ? sentiment.positiveShare : 0}%` }}
        />
        <div
          className="bg-negative-500 transition-all duration-500 ease-out"
          style={{ width: `${sentiment.hasData ? sentiment.negativeShare : 0}%` }}
        />
      </div>
    </div>
  );
}

function TypeCounts({ sentiment }: { sentiment: SentimentResult }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WIN_PAIN_TYPES.map((type) => {
        const config = WIN_PAIN_CONFIG[type];
        const count = sentiment.counts[type];
        return (
          <span
            key={type}
            className={`chip tabular-nums transition-colors ${
              count > 0 ? config.surface + ' border' : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}
            title={`${config.plural} — poids ${config.weight}`}
          >
            <span>{config.emoji}</span>
            <span className="font-semibold">{count}</span>
          </span>
        );
      })}
    </div>
  );
}

function Delta({ score, previousScore }: { score: number; previousScore: number }) {
  const delta = Math.round((score - previousScore) * 10) / 10;
  if (Math.abs(delta) < 0.2) {
    return (
      <span className="chip bg-slate-100 text-slate-500">
        <Minus className="w-3 h-3" />
        stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span className={`chip ${up ? 'bg-positive-50 text-positive-700' : 'bg-negative-50 text-negative-700'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}
      {delta.toFixed(1)} pt vs précédent
    </span>
  );
}

export function SentimentGauge({
  sentiment,
  declaredScore,
  previousScore,
  variant = 'full',
  className = '',
}: SentimentGaugeProps) {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div
          className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2 border ${sentiment.tone.bg} ${sentiment.tone.border}`}
        >
          <span className="text-lg leading-none">{sentiment.hasData ? sentiment.tone.emoji : '⏳'}</span>
          <span className={`text-lg font-bold leading-tight tabular-nums ${sentiment.tone.text}`}>
            {sentiment.hasData ? sentiment.score.toFixed(1) : '—'}
          </span>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">
              Ressenti calculé{' '}
              <span className={sentiment.tone.text}>· {sentiment.hasData ? sentiment.tone.label : 'en attente'}</span>
            </span>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {sentiment.total} élément{sentiment.total > 1 ? 's' : ''}
            </span>
          </div>
          <BalanceBar sentiment={sentiment} />
          <TypeCounts sentiment={sentiment} />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="relative flex flex-col items-center">
        <Arc sentiment={sentiment} declaredScore={declaredScore} />

        {/* Valeur au centre de l'arc */}
        <div className="pointer-events-none absolute inset-x-0 top-[38%] flex flex-col items-center">
          <span className="text-3xl leading-none">{sentiment.hasData ? sentiment.tone.emoji : '⏳'}</span>
          <div className="mt-1 flex items-baseline gap-0.5">
            <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${sentiment.tone.text}`}>
              {sentiment.hasData ? sentiment.score.toFixed(1) : '—'}
            </span>
            <span className="text-sm font-medium text-slate-400">/10</span>
          </div>
          <span className={`mt-1 chip ${sentiment.tone.chip}`}>
            {sentiment.hasData ? sentiment.tone.label : 'En attente de saisie'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {previousScore != null && sentiment.hasData && (
          <Delta score={sentiment.score} previousScore={previousScore} />
        )}
        {declaredScore != null && (
          <span className="chip bg-primary-50 text-primary-700">
            <span className="badge-dot bg-primary-500" />
            Déclaré {declaredScore}/10
          </span>
        )}
      </div>

      <BalanceBar sentiment={sentiment} />

      <div className="space-y-3">
        <TypeCounts sentiment={sentiment} />

        {/* Indice de confiance : plus il y a d'éléments, plus le score est fiable */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{confidenceLabel(sentiment.confidence)}</span>
            <span className="tabular-nums">{Math.round(sentiment.confidence * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary-400 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(4, sentiment.confidence * 100)}%` }}
            />
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-500" />
          {sentiment.insight}
        </p>
      </div>
    </div>
  );
}
