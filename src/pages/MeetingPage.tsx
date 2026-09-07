import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Gauge,
  Hand,
  Info,
  Save,
  Timer,
} from 'lucide-react';
import {
  MoodSlider,
  WinsPains,
  ActionTracker,
  StepIndicator,
  SentimentGauge,
} from '../components';
import type {
  Meeting,
  MeetingStep,
  MoodEntry,
  WinPainItem,
  ActionItem,
  TeamMember,
} from '../types';
import { WIN_PAIN_CONFIG } from '../types';
import { computeSentiment, describeMoodGap } from '../utils/sentiment';
import { fetchPendingNotes, markNotesAsUsed } from '../services/firebase';

interface MeetingPageProps {
  members: TeamMember[];
  meetings: Meeting[];
  onSaveMeeting: (meeting: Meeting) => void;
  onUpdateMeeting?: (meeting: Meeting) => void;
}

// Les nouveaux one-to-one démarrent en ressenti calculé ; le lead peut reprendre la main.
const DEFAULT_MOOD: MoodEntry = { mood: 5, energy: 5, source: 'auto' };

const STEPS: MeetingStep[] = ['pulse', 'wins-pains', 'actions', 'summary'];

interface MeetingDraft {
  mood: MoodEntry;
  winsPains: WinPainItem[];
  actions: ActionItem[];
  previousActions: ActionItem[];
  leadComment: string;
  currentStep: MeetingStep;
  pendingNoteIds: string[];
  savedAt: string;
}

const reviveActionDates = (actions: any[]): ActionItem[] =>
  (actions || []).map(a => ({
    ...a,
    createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
    completedAt: a.completedAt ? new Date(a.completedAt) : undefined,
  }));

const loadDraft = (key: string): MeetingDraft | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      actions: reviveActionDates(parsed.actions),
      previousActions: reviveActionDates(parsed.previousActions),
    };
  } catch {
    return null;
  }
};

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

export function MeetingPage({ members, meetings, onSaveMeeting, onUpdateMeeting }: MeetingPageProps) {
  const { memberId, meetingId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!meetingId;
  const existingMeeting = isEditMode ? meetings.find(m => m.id === meetingId) : undefined;

  const member = members.find(m => m.id === memberId);
  const previousMeeting = meetings
    .filter(m => m.memberId === memberId && m.id !== meetingId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const draftKey = isEditMode
    ? `meeting-draft-edit-${meetingId}`
    : `meeting-draft-new-${memberId}`;
  const initialDraft = loadDraft(draftKey);

  const [currentStep, setCurrentStep] = useState<MeetingStep>(initialDraft?.currentStep || 'pulse');
  const [mood, setMood] = useState<MoodEntry>(initialDraft?.mood || existingMeeting?.mood || DEFAULT_MOOD);
  const [winsPains, setWinsPains] = useState<WinPainItem[]>(initialDraft?.winsPains || existingMeeting?.winsPains || []);
  const [actions, setActions] = useState<ActionItem[]>(initialDraft?.actions || existingMeeting?.actions || []);
  const [previousActions, setPreviousActions] = useState<ActionItem[]>(
    initialDraft?.previousActions || (isEditMode ? [] : (previousMeeting?.actions || []))
  );
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(existingMeeting?.duration ? existingMeeting.duration * 60 : 0);
  const [pendingNoteIds, setPendingNoteIds] = useState<string[]>(initialDraft?.pendingNoteIds || []);
  const [notesLoaded, setNotesLoaded] = useState(isEditMode || !!initialDraft);
  const [leadComment, setLeadComment] = useState(initialDraft?.leadComment ?? existingMeeting?.leadComment ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(!!initialDraft);
  const [draftSavedAt] = useState<string | null>(initialDraft?.savedAt ?? null);

  // Ressenti calculé en direct sur les éléments saisis
  const sentiment = useMemo(() => computeSentiment(winsPains), [winsPains]);
  const moodSource = mood.source ?? 'manual';
  const isAutoMood = moodSource === 'auto';

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

  // Ressenti dynamique : en mode auto, le score suit la saisie de l'entretien
  useEffect(() => {
    setMood(prev => {
      if ((prev.source ?? 'manual') !== 'auto') return prev;

      // Plus aucun élément : on revient au neutre plutôt que de garder un score orphelin
      if (!sentiment.hasData) {
        if (prev.mood === DEFAULT_MOOD.mood && prev.computed === undefined) return prev;
        return { mood: DEFAULT_MOOD.mood, energy: prev.energy, source: 'auto' };
      }

      if (prev.mood === sentiment.score10 && prev.computed === sentiment.score) return prev;
      return { ...prev, mood: sentiment.score10, computed: sentiment.score };
    });
  }, [sentiment.hasData, sentiment.score10, sentiment.score]);

  // Auto-save draft to localStorage on every change
  useEffect(() => {
    if (!memberId) return;
    try {
      const draft: MeetingDraft = {
        mood,
        winsPains,
        actions,
        previousActions,
        leadComment,
        currentStep,
        pendingNoteIds,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // localStorage indisponible / plein — on ignore silencieusement
    }
  }, [draftKey, memberId, mood, winsPains, actions, previousActions, leadComment, currentStep, pendingNoteIds]);

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch { /* noop */ }
    setMood(existingMeeting?.mood || DEFAULT_MOOD);
    setWinsPains(existingMeeting?.winsPains || []);
    setActions(existingMeeting?.actions || []);
    setPreviousActions(isEditMode ? [] : (previousMeeting?.actions || []));
    setLeadComment(existingMeeting?.leadComment || '');
    setCurrentStep('pulse');
    setPendingNoteIds([]);
    setNotesLoaded(isEditMode);
    setDraftRestored(false);
  };

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
    if (saving) return;
    setSaving(true);
    setSaveError(null);

    const newMeetingId = isEditMode ? meetingId! : crypto.randomUUID();
    // On garde une trace du score calculé, quel que soit le mode retenu.
    // La clé est omise si aucun élément n'a été saisi : Firestore refuse les undefined imbriqués.
    const moodToSave: MoodEntry = {
      mood: mood.mood,
      energy: mood.energy,
      source: moodSource,
      ...(sentiment.hasData ? { computed: sentiment.score } : {}),
    };

    const meeting: Meeting = {
      id: newMeetingId,
      memberId: member.id,
      date: existingMeeting?.date || new Date(),
      mood: moodToSave,
      winsPains,
      actions: isEditMode ? actions : [...actions, ...previousActions.filter(a => !a.completed)],
      leadComment: leadComment.trim() || undefined,
      duration: Math.floor(elapsed / 60),
    };

    try {
      if (isEditMode && onUpdateMeeting) {
        await onUpdateMeeting(meeting);
      } else {
        await onSaveMeeting(meeting);
      }

      // Mark pending notes as used (only after successful save of new meeting)
      if (!isEditMode && pendingNoteIds.length > 0) {
        try {
          await markNotesAsUsed(pendingNoteIds, newMeetingId);
        } catch (error) {
          console.error('Error marking notes as used:', error);
        }
      }

      try { localStorage.removeItem(draftKey); } catch { /* noop */ }
      navigate('/admin');
    } catch (error) {
      console.error('Error saving meeting:', error);
      setSaveError(
        error instanceof Error
          ? `Échec de la sauvegarde : ${error.message}`
          : 'Échec de la sauvegarde. Vos modifications sont conservées, réessayez.'
      );
      setSaving(false);
    }
  };

  const previousScore = previousMeeting?.mood.mood ?? null;
  const moodGap = !isAutoMood && sentiment.hasData ? describeMoodGap(mood.mood, sentiment.score) : null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'pulse':
        return (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <div className="card lg:col-span-3">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">💭 Comment ça va ?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Le ressenti peut être calculé automatiquement à partir de ce qui sera saisi à l'étape suivante,
                  ou fixé à la main.
                </p>
              </div>
              <MoodSlider
                value={mood}
                onChange={setMood}
                sentiment={sentiment}
                previousMood={previousMeeting?.mood ?? null}
              />
            </div>

            <div className="card lg:col-span-2">
              <h3 className="section-title mb-4">Ressenti calculé</h3>
              <SentimentGauge
                sentiment={sentiment}
                declaredScore={isAutoMood ? null : mood.mood}
                previousScore={previousScore}
              />
            </div>
          </div>
        );

      case 'wins-pains':
        return (
          <div className="space-y-5">
            {/* Jauge live : elle bouge à chaque élément ajouté */}
            <div className={`card border-l-4 ${sentiment.tone.border}`}>
              <SentimentGauge sentiment={sentiment} variant="compact" />
              {isAutoMood ? (
                <p className="mt-3 flex items-center gap-2 text-[11px] text-primary-700">
                  <Gauge className="h-3.5 w-3.5" />
                  Le ressenti du one-to-one suit ce score en direct ({mood.mood}/10).
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <Hand className="h-3.5 w-3.5" />
                  Ressenti fixé à la main sur {mood.mood}/10 — ce score reste indicatif.
                </p>
              )}
            </div>

            <div className="card">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">🎯 Réussites & Difficultés</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Chaque élément pèse dans le ressenti : réussite +2, idée +1, difficulté −2, blocage −3.
                    Le score s'écarte du neutre à mesure que la saisie s'étoffe (amplitude complète à 5 éléments).
                  </p>
                </div>
              </div>

              {pendingNoteIds.length > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700">
                  <BookOpen className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {pendingNoteIds.length} note{pendingNoteIds.length > 1 ? 's' : ''} pré-chargée
                    {pendingNoteIds.length > 1 ? 's' : ''} depuis le carnet de {member.name}
                  </span>
                </div>
              )}

              <WinsPains items={winsPains} onChange={setWinsPains} />

              {/* Commentaire privé du lead */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="chip bg-primary-100 text-primary-700">Lead uniquement</span>
                  Commentaire lead
                </label>
                <textarea
                  value={leadComment}
                  onChange={(e) => setLeadComment(e.target.value)}
                  placeholder="Notes personnelles sur cet échange (non visible par le collaborateur)…"
                  className="input-field resize-none bg-primary-50/40"
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 'actions':
        return (
          <div className="card">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">✅ Actions</h2>
              <p className="mt-1 text-sm text-slate-500">
                On revoit d'abord les engagements précédents, puis on en prend de nouveaux.
              </p>
            </div>
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
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
              <div className="card lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="section-title">Ressenti retenu</h3>
                  <span className={`chip ${isAutoMood ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                    {isAutoMood ? <Gauge className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                    {isAutoMood ? 'Calculé' : 'Manuel'}
                  </span>
                </div>
                <SentimentGauge
                  sentiment={sentiment}
                  declaredScore={isAutoMood ? null : mood.mood}
                  previousScore={previousScore}
                />
              </div>

              <div className="card space-y-5 lg:col-span-3">
                <h2 className="text-lg font-semibold text-slate-900">📝 Résumé du One-to-One</h2>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className={`rounded-2xl border p-3 text-center ${sentiment.tone.bg} ${sentiment.tone.border}`}>
                    <div className="text-2xl">{sentiment.tone.emoji}</div>
                    <div className={`stat-value ${sentiment.tone.text}`}>{mood.mood}/10</div>
                    <div className="stat-label">Ressenti</div>
                  </div>
                  <div className="rounded-2xl border border-energy-200 bg-energy-50 p-3 text-center">
                    <div className="text-2xl">⚡</div>
                    <div className="stat-value text-energy-700">{mood.energy}/10</div>
                    <div className="stat-label">Motivation</div>
                  </div>
                  <div className="rounded-2xl border border-positive-200 bg-positive-50 p-3 text-center">
                    <div className="text-2xl">{WIN_PAIN_CONFIG.win.emoji}</div>
                    <div className="stat-value text-positive-700">{sentiment.counts.win}</div>
                    <div className="stat-label">Réussites</div>
                  </div>
                  <div className="rounded-2xl border border-negative-200 bg-negative-50 p-3 text-center">
                    <div className="text-2xl">{WIN_PAIN_CONFIG.pain.emoji}</div>
                    <div className="stat-value text-negative-700">
                      {sentiment.counts.pain + sentiment.counts.blocker}
                    </div>
                    <div className="stat-label">Points de friction</div>
                  </div>
                </div>

                {moodGap && (
                  <p className="flex items-start gap-2 rounded-xl border border-warn-200 bg-warn-50 px-3 py-2 text-xs text-warn-800">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    {moodGap}
                  </p>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    Actions pour le prochain sprint ({actions.length})
                  </h3>
                  {actions.length > 0 ? (
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {actions.map(a => (
                        <li key={a.id} className="flex items-center gap-2">
                          <span>{a.assignee === 'lead' ? '👤' : '🧑‍💻'}</span>
                          <span>{a.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Aucune action définie</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Timer className="h-4 w-4" />
                  Durée de l'échange : {formatTime(elapsed)}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="glass-header">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(isEditMode ? '/admin' : '/')}
              className="btn-ghost px-2 sm:px-3"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Retour</span>
            </button>

            <div className="min-w-0 text-center">
              <h1 className="truncate font-semibold text-slate-900">{member.name}</h1>
              <p className="truncate text-xs text-slate-500">
                {member.role}
                {isEditMode && <span className="ml-1 text-primary-600">· modification</span>}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Ressenti live, visible à toutes les étapes */}
              <span
                className={`chip hidden sm:inline-flex ${sentiment.tone.chip}`}
                title="Ressenti calculé sur les éléments saisis"
              >
                <span>{sentiment.hasData ? sentiment.tone.emoji : '⏳'}</span>
                <span className="font-bold tabular-nums">
                  {sentiment.hasData ? sentiment.score.toFixed(1) : '—'}
                </span>
              </span>
              <span
                className={`chip tabular-nums ${
                  elapsed > 1200 ? 'bg-warn-100 text-warn-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {formatTime(elapsed)}
              </span>
            </div>
          </div>

          <StepIndicator
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            badges={{
              pulse: `${mood.mood}`,
              'wins-pains': sentiment.total > 0 ? `${sentiment.total}` : undefined,
              actions: actions.length > 0 ? `${actions.length}` : undefined,
            }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-5">
        {draftRestored && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-warn-200 bg-warn-50 p-3 text-sm">
            <span className="text-warn-800">
              📝 Brouillon restauré{draftSavedAt ? ` (sauvegardé ${formatRelative(draftSavedAt)})` : ''}.
            </span>
            <button
              onClick={discardDraft}
              className="font-medium text-warn-700 underline underline-offset-2 hover:text-warn-900"
            >
              Repartir de zéro
            </button>
          </div>
        )}

        <div key={currentStep} className="animate-fadeIn">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </button>

          {currentStep === 'summary' ? (
            <div className="flex flex-col items-end gap-2">
              {saveError && (
                <div className="max-w-md rounded-xl border border-negative-200 bg-negative-50 px-3 py-2 text-sm text-negative-700">
                  {saveError}
                </div>
              )}
              <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-3">
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement…' : isEditMode ? 'Enregistrer les modifications' : 'Enregistrer'}
              </button>
            </div>
          ) : (
            <button onClick={goToNextStep} className="btn-primary">
              Suivant
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
