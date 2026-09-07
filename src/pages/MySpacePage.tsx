import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TeamMember, MemberNote, OneToOneRequest, WinPainItem, WinPainType } from '../types';
import { WIN_PAIN_CONFIG, WIN_PAIN_TYPES } from '../types';
import { SentimentGauge } from '../components';
import { computeSentiment } from '../utils/sentiment';
import {
  getMemberByAccessCode,
  fetchNotesByMember,
  addNote,
  deleteNote,
  fetchRequests,
  addRequest,
  cancelRequest
} from '../services/firebase';
import { sendOneToOneRequestNotification } from '../services/email';

export function MySpacePage() {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [member, setMember] = useState<TeamMember | null>(null);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [pendingRequest, setPendingRequest] = useState<OneToOneRequest | null>(null);
  const [acceptedRequest, setAcceptedRequest] = useState<OneToOneRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state for new note
  const [newNoteType, setNewNoteType] = useState<WinPainType>('win');
  const [newNoteText, setNewNoteText] = useState('');

  // Form state for request
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestUrgency, setRequestUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  // Check if member was previously authenticated
  useEffect(() => {
    const storedCode = sessionStorage.getItem('memberAccessCode');
    if (storedCode) {
      handleLogin(storedCode);
    }
  }, []);

  const handleLogin = async (code: string) => {
    setLoading(true);
    setCodeError('');

    try {
      const foundMember = await getMemberByAccessCode(code.toUpperCase());
      if (foundMember) {
        setMember(foundMember);
        sessionStorage.setItem('memberAccessCode', code.toUpperCase());

        // Load member's notes
        const memberNotes = await fetchNotesByMember(foundMember.id);
        setNotes(memberNotes.filter(n => !n.usedInMeetingId));

        // Check for pending or accepted request
        const allRequests = await fetchRequests();
        const pending = allRequests.find(
          r => r.memberId === foundMember.id && !r.resolvedAt
        );
        setPendingRequest(pending || null);

        // Check for recently accepted request (with scheduled date in the future)
        const accepted = allRequests.find(
          r => r.memberId === foundMember.id &&
               r.resolvedAt &&
               r.scheduledAt &&
               new Date(r.scheduledAt) > new Date()
        );
        setAcceptedRequest(accepted || null);
      } else {
        setCodeError('Code invalide. Vérifie auprès de ton lead.');
      }
    } catch (error) {
      setCodeError('Erreur de connexion. Réessaie plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setMember(null);
    setAccessCode('');
    setNotes([]);
    setPendingRequest(null);
    setAcceptedRequest(null);
    sessionStorage.removeItem('memberAccessCode');
    navigate('/');
  };

  const handleAddNote = async () => {
    if (!member || !newNoteText.trim()) return;

    try {
      const note = await addNote({
        memberId: member.id,
        type: newNoteType,
        text: newNoteText.trim(),
      });
      setNotes([note, ...notes]);
      setNewNoteText('');
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleRequestOneToOne = async () => {
    if (!member) return;

    try {
      const request = await addRequest({
        memberId: member.id,
        reason: requestReason.trim() || undefined,
        urgency: requestUrgency,
      });
      setPendingRequest(request);
      setShowRequestForm(false);
      setRequestReason('');
      setRequestUrgency('medium');

      // Envoyer notification email au lead
      sendOneToOneRequestNotification({
        memberName: member.name,
        memberRole: member.role,
        reason: requestReason.trim() || undefined,
        urgency: requestUrgency,
      });
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest) return;

    try {
      await cancelRequest(pendingRequest.id);
      setPendingRequest(null);
    } catch (error) {
      console.error('Error canceling request:', error);
    }
  };

  const urgencyConfig = {
    low: { label: 'Pas urgent', color: 'bg-positive-50 text-positive-700 border border-positive-200' },
    medium: { label: 'Normal', color: 'bg-warn-50 text-warn-800 border border-warn-200' },
    high: { label: 'Urgent', color: 'bg-negative-50 text-negative-700 border border-negative-200' },
  };

  // Aperçu du ressenti que produiraient les notes en attente
  const noteItems: WinPainItem[] = useMemo(
    () => notes.map(note => ({ id: note.id, type: note.type, text: note.text })),
    [notes]
  );
  const sentiment = useMemo(() => computeSentiment(noteItems), [noteItems]);

  // ---------- Écran de connexion ----------
  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lift">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mon espace</h1>
            <p className="mt-1 text-sm text-slate-500">Entre ton code d'accès personnel</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin(accessCode);
            }}
          >
            <div className="mb-4 flex flex-col items-center">
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="input-field w-56 text-center text-2xl font-semibold uppercase tracking-[0.35em]"
                maxLength={6}
                autoFocus
              />
              {codeError && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-negative-600">
                  <AlertCircle className="h-4 w-4" />
                  {codeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={accessCode.length < 6 || loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Connexion…' : 'Accéder à mon espace'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Tu n'as pas de code ? Demande-le à ton lead.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Espace du collaborateur ----------
  return (
    <div className="min-h-screen pb-10">
      <header className="glass-header">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
                Bonjour {member.name} 👋
              </h1>
              <p className="truncate text-xs text-slate-500">{member.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-ghost px-3 py-2 text-xs">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* ---------- Demande de one-to-one ---------- */}
        <div className="card">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Bell className="h-4 w-4 text-slate-400" />
            Demander un one-to-one
          </h2>

          {acceptedRequest ? (
            <div className="flex items-start gap-3 rounded-2xl border border-positive-200 bg-positive-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-positive-600" />
              <div>
                <p className="font-medium text-positive-800">One-to-one planifié !</p>
                <p className="mt-0.5 text-sm text-positive-700">
                  {format(new Date(acceptedRequest.scheduledAt!), "EEEE dd MMMM 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
          ) : pendingRequest ? (
            <div className="flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4">
              <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-primary-900">Demande en attente</p>
                <p className="mt-0.5 text-sm text-primary-700">
                  Créée le {format(new Date(pendingRequest.createdAt), 'dd MMMM à HH:mm', { locale: fr })}
                </p>
                {pendingRequest.reason && (
                  <p className="mt-2 text-sm italic text-primary-800">« {pendingRequest.reason} »</p>
                )}
                <span className={`chip mt-2 ${urgencyConfig[pendingRequest.urgency].color}`}>
                  {urgencyConfig[pendingRequest.urgency].label}
                </span>
              </div>
              <button
                onClick={handleCancelRequest}
                className="btn-icon hover:bg-negative-50 hover:text-negative-600"
                title="Annuler la demande"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ) : showRequestForm ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Raison (optionnel)
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Pourquoi souhaites-tu un one-to-one ?"
                  className="input-field resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Urgence</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setRequestUrgency(level)}
                      className={`rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        requestUrgency === level
                          ? urgencyConfig[level].color + ' shadow-soft'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {urgencyConfig[level].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowRequestForm(false)} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button onClick={handleRequestOneToOne} className="btn-primary flex-1">
                  Envoyer la demande
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRequestForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-3 text-sm text-slate-600
                         transition-all hover:border-primary-400 hover:bg-primary-50/60 hover:text-primary-700"
            >
              <Plus className="h-5 w-5" />
              J'ai besoin d'un one-to-one
            </button>
          )}
        </div>

        {/* ---------- Carnet de bord ---------- */}
        <div className="card">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
            <BookOpen className="h-4 w-4 text-slate-400" />
            Mon carnet de bord
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Note tes réussites, difficultés et idées au fil du temps. Elles seront chargées automatiquement
            dans ton prochain one-to-one.
          </p>

          {/* Aperçu du ressenti que ces notes produiront */}
          {sentiment.hasData && (
            <div className={`mb-4 rounded-2xl border p-4 ${sentiment.tone.bg} ${sentiment.tone.border}`}>
              <SentimentGauge sentiment={sentiment} variant="compact" />
              <p className="mt-3 text-[11px] text-slate-500">
                Aperçu du ressenti calculé sur tes notes — il sera repris comme point de départ de l'échange.
              </p>
            </div>
          )}

          {/* Nouvelle note */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WIN_PAIN_TYPES.map((type) => {
                const config = WIN_PAIN_CONFIG[type];
                const active = newNoteType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setNewNoteType(type)}
                    className={`rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                      active ? config.chipActive : config.chip
                    }`}
                  >
                    {config.emoji} {config.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder={WIN_PAIN_CONFIG[newNoteType].placeholder}
                className="input-field flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newNoteText.trim()) {
                    handleAddNote();
                  }
                }}
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteText.trim()}
                className="btn-primary px-4"
                aria-label="Ajouter la note"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Liste des notes */}
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
              <BookOpen className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-600">Ton carnet est vide</p>
              <p className="mt-0.5 text-sm text-slate-400">Ajoute ta première note ci-dessus !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => {
                const config = WIN_PAIN_CONFIG[note.type];
                return (
                  <div
                    key={note.id}
                    className={`group flex items-start gap-3 rounded-xl border p-3 ${config.surface}`}
                  >
                    <span className="text-lg leading-none">{config.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{note.text}</p>
                      <p className="mt-1 text-[11px] opacity-70">
                        {format(new Date(note.createdAt), 'dd MMM à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rounded-lg p-1 opacity-60 transition-all hover:bg-black/10 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {notes.length > 0 && (
            <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-positive-500" />
              {notes.length} note{notes.length > 1 ? 's' : ''} en attente du prochain one-to-one
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
