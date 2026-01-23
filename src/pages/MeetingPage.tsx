import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Clock } from 'lucide-react';
import {
  MoodSlider,
  WinsPains,
  RadarChart,
  ActionTracker,
  StepIndicator,
} from '../components';
import type {
  Meeting,
  MeetingStep,
  MoodEntry,
  WinPainItem,
  RadarData,
  ActionItem,
  TeamMember,
} from '../types';

interface MeetingPageProps {
  members: TeamMember[];
  meetings: Meeting[];
  onSaveMeeting: (meeting: Meeting) => void;
}

const DEFAULT_MOOD: MoodEntry = { mood: 5, energy: 5 };
const DEFAULT_RADAR: RadarData = {
  codeQuality: 3,
  process: 3,
  teamwork: 3,
  workload: 3,
  growth: 3,
};

const STEPS: MeetingStep[] = ['pulse', 'wins-pains', 'radar', 'actions', 'summary'];

export function MeetingPage({ members, meetings, onSaveMeeting }: MeetingPageProps) {
  const { memberId } = useParams();
  const navigate = useNavigate();

  const member = members.find(m => m.id === memberId);
  const previousMeeting = meetings
    .filter(m => m.memberId === memberId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const [currentStep, setCurrentStep] = useState<MeetingStep>('pulse');
  const [mood, setMood] = useState<MoodEntry>(DEFAULT_MOOD);
  const [winsPains, setWinsPains] = useState<WinPainItem[]>([]);
  const [radar, setRadar] = useState<RadarData>(DEFAULT_RADAR);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [previousActions, setPreviousActions] = useState<ActionItem[]>(
    previousMeeting?.actions || []
  );
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!member) {
      navigate('/');
    }
  }, [member, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  if (!member) return null;

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToNextStep = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    const meeting: Meeting = {
      id: crypto.randomUUID(),
      memberId: member.id,
      date: new Date(),
      mood,
      winsPains,
      radar,
      actions: [...actions, ...previousActions.filter(a => !a.completed)],
      duration: Math.floor(elapsed / 60),
    };
    onSaveMeeting(meeting);
    navigate('/');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'pulse':
        return (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              💭 Pulse Check
            </h2>
            <MoodSlider value={mood} onChange={setMood} />
          </div>
        );

      case 'wins-pains':
        return (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              🎯 Réussites & Difficultés
            </h2>
            <WinsPains items={winsPains} onChange={setWinsPains} />
          </div>
        );

      case 'radar':
        return (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              📊 Radar Satisfaction
            </h2>
            <RadarChart
              data={radar}
              onChange={setRadar}
              previousData={previousMeeting?.radar}
            />
          </div>
        );

      case 'actions':
        return (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              ✅ Actions
            </h2>
            <ActionTracker
              currentActions={actions}
              previousActions={previousActions}
              onChange={setActions}
              onUpdatePrevious={setPreviousActions}
            />
          </div>
        );

      case 'summary':
        return (
          <div className="card space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">
              📝 Résumé du One-to-One
            </h2>

            {/* Quick Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-1">
                  {mood.mood >= 7 ? '😄' : mood.mood >= 5 ? '🙂' : '😔'}
                </div>
                <div className="text-2xl font-bold text-primary-600">{mood.mood}/10</div>
                <div className="text-xs text-gray-500">Mood</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl mb-1">⚡</div>
                <div className="text-2xl font-bold text-indigo-600">{mood.energy}/10</div>
                <div className="text-xs text-gray-500">Énergie</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl mb-1">🎉</div>
                <div className="text-2xl font-bold text-green-600">
                  {winsPains.filter(w => w.type === 'win').length}
                </div>
                <div className="text-xs text-gray-500">Réussites</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl mb-1">😤</div>
                <div className="text-2xl font-bold text-red-600">
                  {winsPains.filter(w => w.type === 'pain').length}
                </div>
                <div className="text-xs text-gray-500">Difficultés</div>
              </div>
            </div>

            {/* Actions Summary */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">
                Actions pour le prochain sprint ({actions.length})
              </h3>
              {actions.length > 0 ? (
                <ul className="space-y-1 text-sm text-blue-700">
                  {actions.map(a => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span>{a.assignee === 'lead' ? '👤' : '🧑‍💻'}</span>
                      <span>{a.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-blue-600">Aucune action définie</p>
              )}
            </div>

            {/* Duration */}
            <div className="text-center text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              Durée : {formatTime(elapsed)}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Retour</span>
            </button>

            <div className="text-center">
              <h1 className="font-semibold text-gray-900">{member.name}</h1>
              <p className="text-sm text-gray-500">{member.role}</p>
            </div>

            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span className={`font-mono ${elapsed > 1200 ? 'text-orange-500' : ''}`}>
                {formatTime(elapsed)}
              </span>
            </div>
          </div>

          <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </button>

          {currentStep === 'summary' ? (
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          ) : (
            <button
              onClick={goToNextStep}
              className="btn-primary flex items-center gap-2"
            >
              Suivant
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
