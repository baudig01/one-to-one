import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Clock, BookOpen } from 'lucide-react';
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
import { fetchPendingNotes, markNotesAsUsed } from '../services/firebase';

interface MeetingPageProps {
  members: TeamMember[];
  meetings: Meeting[];
  onSaveMeeting: (meeting: Meeting) => void;
  onUpdateMeeting?: (meeting: Meeting) => void;
}

const DEFAULT_MOOD: MoodEntry = { mood: 5, energy: 5 };
const DEFAULT_RADAR: RadarData = {
  process: 3,
  ambiance: 3,
  work: 3,
};

const STEPS: MeetingStep[] = ['pulse', 'wins-pains', 'radar', 'actions', 'summary'];

export function MeetingPage({ members, meetings, onSaveMeeting, onUpdateMeeting }: MeetingPageProps) {
  const { memberId, meetingId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!meetingId;
  const existingMeeting = isEditMode ? meetings.find(m => m.id === meetingId) : undefined;

  const member = members.find(m => m.id === memberId);
  const previousMeeting = meetings
    .filter(m => m.memberId === memberId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const [currentStep, setCurrentStep] = useState<MeetingStep>('pulse');
  const [mood, setMood] = useState<MoodEntry>(existingMeeting?.mood || DEFAULT_MOOD);
  const [winsPains, setWinsPains] = useState<WinPainItem[]>(existingMeeting?.winsPains || []);
  const [radar, setRadar] = useState<RadarData>(existingMeeting?.radar || DEFAULT_RADAR);
  const [actions, setActions] = useState<ActionItem[]>(existingMeeting?.actions || []);
  const [previousActions, setPreviousActions] = useState<ActionItem[]>(
    isEditMode ? [] : (previousMeeting?.actions || [])
  );
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(existingMeeting?.duration ? existingMeeting.duration * 60 : 0);
  const [pendingNoteIds, setPendingNoteIds] = useState<string[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(isEditMode);
  const [leadComment, setLeadComment] = useState(existingMeeting?.leadComment || '');

  useEffect(() => {
    if (!member) {
      navigate('/');
    }
  }, [member, navigate]);

  // Load pending notes from member's notebook
  useEffect(() => {
    const loadPendingNotes = async () => {
      if (!memberId || notesLoaded) return;

      try {
        const notes = await fetchPendingNotes(memberId);
        if (notes.length > 0) {
          // Convert notes to WinPainItems
          const noteItems: WinPainItem[] = notes.map(note => ({
            id: note.id,
            type: note.type,
            text: note.text,
          }));
          setWinsPains(noteItems);
          setPendingNoteIds(notes.map(n => n.id));
        }
        setNotesLoaded(true);
      } catch (error) {
        console.error('Error loading pending notes:', error);
        setNotesLoaded(true);
      }
    };

    loadPendingNotes();
  }, [memberId, notesLoaded]);

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

  const handleSave = async () => {
    const newMeetingId = isEditMode ? meetingId! : crypto.randomUUID();
    const meeting: Meeting = {
      id: newMeetingId,
      memberId: member.id,
      date: existingMeeting?.date || new Date(),
      mood,
      winsPains,
      radar,
      actions: isEditMode ? actions : [...actions, ...previousActions.filter(a => !a.completed)],
      leadComment: leadComment.trim() || undefined,
      duration: Math.floor(elapsed / 60),
    };

    // Mark pending notes as used (only for new meetings)
    if (!isEditMode && pendingNoteIds.length > 0) {
      try {
        await markNotesAsUsed(pendingNoteIds, newMeetingId);
      } catch (error) {
        console.error('Error marking notes as used:', error);
      }
    }

    if (isEditMode && onUpdateMeeting) {
      onUpdateMeeting(meeting);
    } else {
      onSaveMeeting(meeting);
    }
    navigate('/admin');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'pulse':
        return (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              💭 Comment ça va ?
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
            {pendingNoteIds.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
                <BookOpen className="w-4 h-4" />
                <span>
                  {pendingNoteIds.length} note{pendingNoteIds.length > 1 ? 's' : ''} pré-chargée{pendingNoteIds.length > 1 ? 's' : ''} depuis le carnet de {member.name}
                </span>
              </div>
            )}
            <WinsPains items={winsPains} onChange={setWinsPains} />

            {/* Commentaire privé du lead */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">Lead uniquement</span>
                Commentaire lead
              </label>
              <textarea
                value={leadComment}
                onChange={(e) => setLeadComment(e.target.value)}
                placeholder="Notes personnelles sur cet échange (non visible par le collaborateur)..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-purple-50/50"
                rows={3}
              />
            </div>
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
                <div className="text-xs text-gray-500">Motivation</div>
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
