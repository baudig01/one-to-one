import { Check } from 'lucide-react';
import type { MeetingStep } from '../types';

interface StepIndicatorProps {
  currentStep: MeetingStep;
  onStepClick: (step: MeetingStep) => void;
  /** Pastille facultative par étape (nombre d'éléments, score…) */
  badges?: Partial<Record<MeetingStep, string>>;
}

const STEPS: { key: MeetingStep; label: string; short: string; emoji: string; duration: string }[] = [
  { key: 'pulse', label: 'Ressenti', short: 'Ressenti', emoji: '💭', duration: '2 min' },
  { key: 'wins-pains', label: 'Réussites & Difficultés', short: 'Retours', emoji: '🎯', duration: '8 min' },
  { key: 'actions', label: 'Actions', short: 'Actions', emoji: '✅', duration: '3 min' },
  { key: 'summary', label: 'Résumé', short: 'Résumé', emoji: '📝', duration: '2 min' },
];

export function StepIndicator({ currentStep, onStepClick, badges }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progress = (currentIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Rail de progression */}
      <div className="absolute left-[12%] right-[12%] top-5 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
      <div
        className="absolute left-[12%] top-5 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ease-out"
        style={{ width: `calc(${progress} * 0.76%)` }}
      />

      <ol className="relative flex items-start justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const badge = badges?.[step.key];

          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => onStepClick(step.key)}
                aria-current={isCurrent ? 'step' : undefined}
                className="group flex w-full flex-col items-center gap-1.5 focus:outline-none"
              >
                <span className="relative">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-base transition-all duration-300 ${
                      isCompleted
                        ? 'bg-positive-500 text-white shadow-soft'
                        : isCurrent
                          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-glow scale-110'
                          : 'bg-white text-slate-400 ring-1 ring-slate-200 group-hover:ring-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : step.emoji}
                  </span>

                  {badge && (
                    <span className="absolute -right-1.5 -top-1 min-w-[18px] rounded-full bg-slate-900 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                      {badge}
                    </span>
                  )}
                </span>

                <span
                  className={`max-w-full truncate text-[11px] font-medium transition-colors ${
                    isCurrent ? 'text-primary-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.short}</span>
                </span>
                <span className="hidden text-[10px] text-slate-400 sm:block">{step.duration}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
