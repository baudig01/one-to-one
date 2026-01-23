import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import type { RadarData } from '../types';
import { RADAR_LABELS } from '../types';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

interface RadarChartProps {
  data: RadarData;
  onChange: (data: RadarData) => void;
  previousData?: RadarData;
}

const RADAR_KEYS: (keyof RadarData)[] = ['codeQuality', 'process', 'teamwork', 'workload', 'growth'];

export function RadarChart({ data, onChange, previousData }: RadarChartProps) {
  const chartData = {
    labels: RADAR_KEYS.map(key => RADAR_LABELS[key]),
    datasets: [
      {
        label: 'Aujourd\'hui',
        data: RADAR_KEYS.map(key => data[key]),
        backgroundColor: 'rgba(14, 165, 233, 0.3)',
        borderColor: 'rgba(14, 165, 233, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(14, 165, 233, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(14, 165, 233, 1)',
      },
      ...(previousData ? [{
        label: 'Précédent',
        data: RADAR_KEYS.map(key => previousData[key]),
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderColor: 'rgba(156, 163, 175, 0.5)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointBackgroundColor: 'rgba(156, 163, 175, 0.5)',
        pointRadius: 3,
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 5,
        ticks: {
          stepSize: 1,
          display: false,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 500,
          },
          color: '#374151',
        },
      },
    },
    plugins: {
      tooltip: {
        enabled: true,
      },
    },
  };

  const handleSliderChange = (key: keyof RadarData, value: number) => {
    onChange({ ...data, [key]: value });
  };

  const getValueLabel = (value: number): string => {
    const labels = ['', 'Pas top', 'Bof', 'OK', 'Bien', 'Top !'];
    return labels[value] || '';
  };

  const getDiffIcon = (key: keyof RadarData): string | null => {
    if (!previousData) return null;
    const diff = data[key] - previousData[key];
    if (diff > 0) return '↑';
    if (diff < 0) return '↓';
    return '=';
  };

  const getDiffColor = (key: keyof RadarData): string => {
    if (!previousData) return 'text-gray-400';
    const diff = data[key] - previousData[key];
    if (diff > 0) return 'text-green-500';
    if (diff < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Radar Visual */}
      <div className="max-w-md mx-auto">
        <Radar data={chartData} options={options as any} />
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RADAR_KEYS.map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {RADAR_LABELS[key]}
              </label>
              <div className="flex items-center gap-1">
                {previousData && (
                  <span className={`text-xs ${getDiffColor(key)}`}>
                    {getDiffIcon(key)}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {getValueLabel(data[key])}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="5"
                value={data[key]}
                onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                           [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow"
              />
              <span className="w-8 text-center font-semibold text-primary-600">
                {data[key]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Legend */}
      <div className="flex justify-center gap-4 text-xs text-gray-500">
        <span>1 = Pas top</span>
        <span>3 = OK</span>
        <span>5 = Top !</span>
      </div>
    </div>
  );
}
