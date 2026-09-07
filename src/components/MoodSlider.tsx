import { Gauge, Hand, Lock, Zap } from 'lucide-react';
import type { MoodEntry, MoodSource } from '../types';
import type { SentimentResult } from '../utils/sentiment';
import { getScoreTone } from '../utils/sentiment';

interface MoodSliderProps {
  value: MoodEntry;
  onChange: (mood: MoodEntry) => void;
  /** Score calculé sur les éléments saisis pendant l'entretien */
  sentiment?: SentimentResult;
  /** Ressenti du one-to-one précédent, affiché comme repère */
  previousMood?: MoodEntry | null;
}

const MOOD_STEPS: { value: number; emoji: string; label: string }[] = [
  { value: 2, emoji: '😫', label: 'Difficile' },
  { value: 4, emoji: '😔', label: 'Bof' },
  { value: 6, emoji: '😐', label: 'Correct' },
  { value: 8, emoji: '🙂', label: 'Bien' },
  { value: 10, emoji: '😄', label: 'Top !' },
];

const ENERGY_STEPS: { value: number; emoji: string; label: string }[] = [
  { value: 2, emoji: '🪫', label: 'À plat' },
  { value: 5, emoji: '😌', label: 'Correct' },
  { value: 8, emoji: '💪', label: 'Motivé' },
  { value: 10, emoji: '🚀', label: 'À fond' },
];

export function getMoodLabel(value: number): string {
  if (value <= 2) return 'Difficile';
  if (value <= 4) return 'Bof';
  if (value <= 6) return 'Correct';
  if (value <= 8) return 'Bien';
  return 'Top !';
}

export function getMoodEmoji(value: number): string {
  if (value <= 2) return '😫';
  if (value <= 4) return '😔';
  if (value <= 6) return '😐';
  if (value <= 8) return '🙂';
  return '😄';
}

export function getMotivationLabel(value: number): string {
  if (value <= 3) return 'À plat';
  if (value <= 5) return 'En demi-teinte';
  if (value <= 7) return 'Motivé';
  return 'Très motivé !';
}

export function MoodSlider({ value, onChange, sentiment, previousMood }: MoodSliderProps) {
  const source: MoodSource = value.source ?? 'manual';
  const isAuto = source === 'auto';
  const tone = getScoreTone(value.mood);
  const autoAvailable = !!sentiment;

  const setSource = (next: MoodSource) => {
    if (next === 'auto' && sentiment?.hasData) {
      onChange({ ...value, source: next, mood: sentiment.score10, computed: sentiment.score });
      return;
    }
    onChange({ ...value, source: next });
  };

  const setMood = (mood: number) => {
    // Toute saisie manuelle reprend la main sur le calcul automatique
    onChange({ ...value, mood, source: 'manual' });
  };

  const setEnergy = (energy: number) => onChange({ ...value, energy });

  return (
    <div className="space-y-8">
      {/* ---------- Ressenti ---------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Ressenti sur le sprint</h3>
            <p className="text-xs text-slate-500">
              {isAuto
                ? 'Calculé en direct depuis les réussites et difficultés saisies.'
                : 'Valeur fixée à la main pendant l\'échange.'}
            </p>
          </div>

          {/* Sélecteur de mode : automatique ou manuel */}
          {autoAvailable && (
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSource('auto')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isAuto ? 'bg-white text-primary-700 shadow-soft' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Gauge className="h-3.5 w-3.5" />
                Auto
              </button>
              <button
                type="button"
                onClick={() => setSource('manual')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  !isAuto ? 'bg-white text-primary-700 shadow-soft' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Hand className="h-3.5 w-3.5" />
                Manuel
              </button>
            </div>
          )}
        </div>

        {/* Valeur courante */}
        <div className={`flex items-center gap-4 rounded-2xl border p-4 ${tone.bg} ${tone.border}`}>
          <span className="text-4xl leading-none">{getMoodEmoji(value.mood)}</span>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold tabular-nums ${tone.text}`}>{value.mood}</span>
              <span className="text-sm font-medium text-slate-400">/10</span>
              <span className={`ml-2 text-sm font-semibold ${tone.text}`}>{getMoodLabel(value.mood)}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              {isAuto ? (
                <span className="chip bg-white/70 text-primary-700">
                  <Lock className="h-3 w-3" />
                  Piloté par la saisie ({sentiment?.total ?? 0} élément{(sentiment?.total ?? 0) > 1 ? 's' : ''})
                </span>
              ) : (
                <span className="chip bg-white/70 text-slate-600">
                  <Hand className="h-3 w-3" />
                  Saisie manuelle
                </span>
              )}
              {previousMood && (
                <span className="chip bg-white/70 text-slate-500">
                  Précédent : {previousMood.mood}/10
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Raccourcis emoji */}
        <div className="grid grid-cols-5 gap-2">
          {MOOD_STEPS.map((step) => {
            const active = !isAuto && value.mood === step.value;
            return (
              <button
                key={step.value}
                type="button"
                onClick={() => setMood(step.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${
                  active
                    ? 'border-primary-400 bg-primary-50 shadow-soft'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl leading-none">{step.emoji}</span>
                <span className="text-[10px] font-medium text-slate-500">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Réglage fin */}
        <div>
          <input
            type="range"
            min="1"
            max="10"
            value={value.mood}
            onChange={(e) => setMood(Number(e.target.value))}
            aria-label="Ressenti sur 10"
            className="range-track bg-gradient-to-r from-negative-200 via-warn-200 to-positive-200
                       [&::-webkit-slider-thumb]:border-primary-600 [&::-moz-range-thumb]:border-primary-600"
          />
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>1 · très difficile</span>
            <span>10 · excellent</span>
          </div>
          {isAuto && (
            <p className="mt-2 text-[11px] text-slate-400">
              Bouger le curseur repasse automatiquement en mode manuel.
            </p>
          )}
        </div>
      </section>

      <div className="divider" />

      {/* ---------- Motivation ---------- */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Niveau d'énergie / motivation</h3>
            <p className="text-xs text-slate-500">Toujours déclaratif : c'est le collaborateur qui donne le chiffre.</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-energy-50 px-3 py-1.5">
            <Zap className="h-4 w-4 text-energy-600" />
            <span className="text-sm font-bold tabular-nums text-energy-700">{value.energy}/10</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ENERGY_STEPS.map((step) => {
            const active = value.energy === step.value;
            return (
              <button
                key={step.value}
                type="button"
                onClick={() => setEnergy(step.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${
                  active
                    ? 'border-energy-400 bg-energy-50 shadow-soft'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl leading-none">{step.emoji}</span>
                <span className="text-[10px] font-medium text-slate-500">{step.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <input
            type="range"
            min="1"
            max="10"
            value={value.energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            aria-label="Motivation sur 10"
            className="range-track bg-gradient-to-r from-slate-200 via-energy-200 to-energy-400
                       [&::-webkit-slider-thumb]:border-energy-500 [&::-moz-range-thumb]:border-energy-500"
          />
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>🪫 Pas motivé</span>
            <span className="font-medium text-energy-600">{getMotivationLabel(value.energy)}</span>
            <span>🚀 À fond</span>
          </div>
        </div>
      </section>
    </div>
  );
}
