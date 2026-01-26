import { useState } from 'react';
import type { MoodEntry } from '../types';

interface MoodSliderProps {
  value: MoodEntry;
  onChange: (mood: MoodEntry) => void;
}

const MOOD_EMOJIS = ['😫', '😔', '😐', '🙂', '😄'];

function getMoodEmoji(value: number): string {
  const index = Math.floor((value - 1) / 2.5);
  return MOOD_EMOJIS[Math.min(index, 4)];
}

function getMoodLabel(value: number): string {
  if (value <= 2) return 'Difficile';
  if (value <= 4) return 'Bof';
  if (value <= 6) return 'Correct';
  if (value <= 8) return 'Bien';
  return 'Top !';
}

function getMotivationLabel(value: number): string {
  if (value <= 3) return 'Démotivé';
  if (value <= 5) return 'Bof';
  if (value <= 7) return 'Motivé';
  return 'Très motivé !';
}

export function MoodSlider({ value, onChange }: MoodSliderProps) {
  const [isDragging, setIsDragging] = useState<'mood' | 'energy' | null>(null);

  const handleMoodChange = (newMood: number) => {
    onChange({ ...value, mood: newMood });
  };

  const handleEnergyChange = (newEnergy: number) => {
    onChange({ ...value, energy: newEnergy });
  };

  return (
    <div className="space-y-8">
      {/* Mood Slider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Comment te sens-tu sur ce sprint ?
          </label>
          <span className="text-3xl transition-transform duration-200"
                style={{ transform: isDragging === 'mood' ? 'scale(1.2)' : 'scale(1)' }}>
            {getMoodEmoji(value.mood)}
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="1"
            max="10"
            value={value.mood}
            onChange={(e) => handleMoodChange(Number(e.target.value))}
            onMouseDown={() => setIsDragging('mood')}
            onMouseUp={() => setIsDragging(null)}
            onTouchStart={() => setIsDragging('mood')}
            onTouchEnd={() => setIsDragging(null)}
            className="w-full h-3 bg-gradient-to-r from-red-300 via-yellow-300 to-green-300 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-500
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab
                       [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>😫</span>
            <span>😐</span>
            <span>😄</span>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block px-4 py-1 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
            {value.mood}/10 - {getMoodLabel(value.mood)}
          </span>
        </div>
      </div>

      {/* Motivation Slider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Niveau de motivation ?
          </label>
          <span className="text-2xl">
            {value.energy > 5 ? '💪' : '😩'}
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="1"
            max="10"
            value={value.energy}
            onChange={(e) => handleEnergyChange(Number(e.target.value))}
            onMouseDown={() => setIsDragging('energy')}
            onMouseUp={() => setIsDragging(null)}
            onTouchStart={() => setIsDragging('energy')}
            onTouchEnd={() => setIsDragging(null)}
            className="w-full h-3 bg-gradient-to-r from-gray-300 via-blue-300 to-indigo-400 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                       [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
          />
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>😩 Pas motivé</span>
            <span>💪 À fond !</span>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block px-4 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
            {value.energy}/10 - {getMotivationLabel(value.energy)}
          </span>
        </div>
      </div>
    </div>
  );
}
