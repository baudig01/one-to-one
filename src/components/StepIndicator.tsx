import { Check } from 'lucide-react';
import type { MeetingStep } from '../types';

interface StepIndicatorProps {
  currentStep: MeetingStep;
  onStepClick: (step: MeetingStep) => void;
}

const STEPS: { key: MeetingStep; label: string; emoji: string; duration: string }[] = [
  { key: 'pulse', label: 'Pulse', emoji: '💭', duration: '2 min' },
  { key: 'wins-pains', label: 'Réussites & Difficultés', emoji: '🎯', duration: '8 min' },
  { key: 'radar', label: 'Radar', emoji: '📊', duration: '5 min' },
  { key: 'actions', label: 'Actions', emoji: '✅', duration: '3 min' },
  { key: 'summary', label: 'Résumé', emoji: '📝', duration: '2 min' },
];

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step Circle */}
            <button
              onClick={() => onStepClick(step.key)}
              className={`flex flex-col items-center gap-1 group transition-all
                ${isCurrent ? 'scale-110' : 'hover:scale-105'}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-primary-500 text-white ring-4 ring-primary-200'
                      : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.emoji}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block
                  ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-gray-400 hidden sm:block">
                {step.duration}
              </span>
            </button>

            {/* Connector Line */}
            {index < STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-16 h-1 mx-1 rounded transition-colors
                  ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
