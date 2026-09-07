import type { WinPainItem, WinPainType } from '../types';
import { WIN_PAIN_CONFIG, WIN_PAIN_TYPES } from '../types';

/**
 * Moteur de ressenti dynamique.
 *
 * Le score n'est pas une simple somme : il s'appuie sur le *ratio* entre les
 * points positifs et négatifs saisis pendant l'entretien, pour qu'un entretien
 * très riche (10 éléments) et un entretien léger (2 éléments) restent
 * comparables. Le volume, lui, alimente l'indice de confiance.
 *
 *   points positifs = 2 × réussites + 1 × idées
 *   points négatifs = 2 × difficultés + 3 × blocages
 *   équilibre       = (positifs − négatifs) / (positifs + négatifs)   ∈ [−1, 1]
 *   confiance       = min(1, nombre d'éléments / 5)
 *   score           = 5,5 + équilibre × confiance × 4,5              ∈ [1, 10]
 *
 * L'équilibre est pondéré par la confiance : le score part du neutre et s'écarte
 * au fur et à mesure de la saisie, au lieu de sauter à 10/10 dès le premier
 * élément. À partir de 5 éléments, toute l'amplitude est accessible.
 */

export const NEUTRAL_SCORE = 5.5;
const SCORE_AMPLITUDE = 4.5;
const CONFIDENCE_TARGET = 5;

export type SentimentLevel = 'critical' | 'fragile' | 'neutral' | 'good' | 'excellent';

export interface SentimentTone {
  level: SentimentLevel;
  label: string;
  emoji: string;
  /** Couleur pleine (SVG, dégradés) */
  hex: string;
  /** Couleur claire (fonds SVG) */
  hexSoft: string;
  /** Classes du design system */
  text: string;
  bg: string;
  border: string;
  chip: string;
  bar: string;
}

export interface SentimentResult {
  counts: Record<WinPainType, number>;
  positivePoints: number;
  negativePoints: number;
  positiveCount: number;
  negativeCount: number;
  /** Nombre total d'éléments saisis */
  total: number;
  /** Équilibre brut entre −1 (tout négatif) et 1 (tout positif) */
  balance: number;
  /** Score sur 10, une décimale */
  score: number;
  /** Score arrondi, exploitable comme valeur de ressenti 1-10 */
  score10: number;
  /** 0 → 1, croît avec le nombre d'éléments saisis */
  confidence: number;
  /** Part du positif dans la barre d'équilibre (0-100) */
  positiveShare: number;
  negativeShare: number;
  hasData: boolean;
  tone: SentimentTone;
  insight: string;
}

const TONES: Record<SentimentLevel, SentimentTone> = {
  critical: {
    level: 'critical',
    label: 'Alerte',
    emoji: '😟',
    hex: '#e11d48',
    hexSoft: '#ffe4e6',
    text: 'text-negative-700',
    bg: 'bg-negative-50',
    border: 'border-negative-200',
    chip: 'bg-negative-50 text-negative-700 border border-negative-200',
    bar: 'bg-negative-500',
  },
  fragile: {
    level: 'fragile',
    label: 'Fragile',
    emoji: '😕',
    hex: '#ea580c',
    hexSoft: '#ffedd5',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    chip: 'bg-orange-50 text-orange-700 border border-orange-200',
    bar: 'bg-orange-500',
  },
  neutral: {
    level: 'neutral',
    label: 'Stable',
    emoji: '😐',
    hex: '#f59e0b',
    hexSoft: '#fef3c7',
    text: 'text-warn-700',
    bg: 'bg-warn-50',
    border: 'border-warn-200',
    chip: 'bg-warn-50 text-warn-700 border border-warn-200',
    bar: 'bg-warn-500',
  },
  good: {
    level: 'good',
    label: 'Bon',
    emoji: '🙂',
    hex: '#22c55e',
    hexSoft: '#dcfce7',
    text: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    chip: 'bg-green-50 text-green-700 border border-green-200',
    bar: 'bg-green-500',
  },
  excellent: {
    level: 'excellent',
    label: 'Excellent',
    emoji: '😄',
    hex: '#059669',
    hexSoft: '#d1fae5',
    text: 'text-positive-700',
    bg: 'bg-positive-50',
    border: 'border-positive-200',
    chip: 'bg-positive-50 text-positive-700 border border-positive-200',
    bar: 'bg-positive-500',
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Palier de lecture d'un score sur 10 (calculé ou déclaré à la main). */
export function getScoreLevel(score: number): SentimentLevel {
  if (score < 3.5) return 'critical';
  if (score < 5) return 'fragile';
  if (score < 6.5) return 'neutral';
  if (score < 8) return 'good';
  return 'excellent';
}

export function getScoreTone(score: number): SentimentTone {
  return TONES[getScoreLevel(score)];
}

export function countByType(items: WinPainItem[]): Record<WinPainType, number> {
  const counts = { win: 0, pain: 0, idea: 0, blocker: 0 } as Record<WinPainType, number>;
  for (const item of items) {
    if (counts[item.type] !== undefined) counts[item.type] += 1;
  }
  return counts;
}

function buildInsight(counts: Record<WinPainType, number>, balance: number, total: number): string {
  if (total === 0) return 'Le ressenti se calcule au fil des éléments saisis.';
  if (counts.blocker > 0) {
    return `${counts.blocker} blocage${counts.blocker > 1 ? 's' : ''} à lever en priorité.`;
  }
  if (balance <= -0.5) return 'Beaucoup de friction : creuser les causes avant les actions.';
  if (balance < -0.15) return 'Plus de difficultés que de réussites sur ce sprint.';
  if (balance <= 0.15) return 'Sprint équilibré entre réussites et difficultés.';
  if (balance < 0.5) return 'Dynamique positive, quelques points à surveiller.';
  return 'Très belle dynamique : penser à capitaliser dessus.';
}

export function computeSentiment(items: WinPainItem[]): SentimentResult {
  const counts = countByType(items);
  const total = WIN_PAIN_TYPES.reduce((sum, type) => sum + counts[type], 0);

  let positivePoints = 0;
  let negativePoints = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  for (const type of WIN_PAIN_TYPES) {
    const config = WIN_PAIN_CONFIG[type];
    const points = counts[type] * config.weight;
    if (config.polarity === 'positive') {
      positivePoints += points;
      positiveCount += counts[type];
    } else {
      negativePoints += points;
      negativeCount += counts[type];
    }
  }

  const weightSum = positivePoints + negativePoints;
  const balance = weightSum === 0 ? 0 : (positivePoints - negativePoints) / weightSum;
  const confidence = clamp(total / CONFIDENCE_TARGET, 0, 1);
  // La confiance amortit l'écart au neutre : le ressenti se construit avec la saisie
  const rawScore = clamp(NEUTRAL_SCORE + balance * confidence * SCORE_AMPLITUDE, 1, 10);
  const score = Math.round(rawScore * 10) / 10;

  return {
    counts,
    positivePoints,
    negativePoints,
    positiveCount,
    negativeCount,
    total,
    balance,
    score,
    score10: clamp(Math.round(rawScore), 1, 10),
    confidence,
    positiveShare: weightSum === 0 ? 50 : Math.round((positivePoints / weightSum) * 100),
    negativeShare: weightSum === 0 ? 50 : Math.round((negativePoints / weightSum) * 100),
    hasData: total > 0,
    tone: getScoreTone(rawScore),
    insight: buildInsight(counts, balance, total),
  };
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 1) return 'Confiance élevée';
  if (confidence >= 0.6) return 'Confiance correcte';
  if (confidence > 0) return "Peu d'éléments";
  return 'Aucun élément';
}

/** Écart entre le ressenti déclaré et le score calculé, formulé pour le lead. */
export function describeMoodGap(declared: number, computed: number): string | null {
  const gap = Math.round((declared - computed) * 10) / 10;
  if (Math.abs(gap) < 1.5) return null;
  if (gap > 0) {
    return `Ressenti déclaré ${Math.abs(gap).toFixed(1)} pt plus haut que la saisie : le positif est peut-être sous-documenté.`;
  }
  return `Ressenti déclaré ${Math.abs(gap).toFixed(1)} pt plus bas que la saisie : quelque chose n'est pas encore sur la table.`;
}

/** Moyenne d'une série de scores, une décimale (null si série vide). */
export function averageScore(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / scores.length) * 10) / 10;
}
