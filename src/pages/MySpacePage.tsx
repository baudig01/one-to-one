import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  KeyRound,
  BookOpen,
  Plus,
  Trash2,
  Bell,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import type { TeamMember, MemberNote, OneToOneRequest } from '../types';
import { WIN_PAIN_CONFIG } from '../types';
import {
  getMemberByAccessCode,
  fetchNotesByMember,
  addNote,
  deleteNote,
  fetchRequests,
  addRequest
} from '../services/firebase';

type NoteType = 'win' | 'pain' | 'idea' | 'blocker';

export function MySpacePage() {
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [member, setMember] = useState<TeamMember | null>(null);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [pendingRequest, setPendingRequest] = useState<OneToOneRequest | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state for new note
  const [newNoteType, setNewNoteType] = useState<NoteType>('win');
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

        // Check for pending request
        const allRequests = await fetchRequests();
        const pending = allRequests.find(
          r => r.memberId === foundMember.id && !r.resolvedAt
        );
        setPendingRequest(pending || null);
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
    sessionStorage.removeItem('memberAccessCode');
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
    } catch (error) {
      console.error('Error creating request:', error);
    }
  };

  const urgencyConfig = {
    low: { label: 'Pas urgent', color: 'bg-green-100 text-green-700' },
    medium: { label: 'Normal', color: 'bg-yellow-100 text-yellow-700' },
    high: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  };

  // Login screen
  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mon Espace</h1>
            <p className="text-gray-500 mt-1">
              Entre ton code d'accès personnel
            </p>
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
                className="input-field text-center text-2xl tracking-widest uppercase w-48"
                maxLength={6}
                autoFocus
              />
              {codeError && (
                <p className="text-red-500 text-sm mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {codeError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={accessCode.length < 6 || loading}
              className="w-full btn-primary py-3"
            >
              {loading ? 'Connexion...' : 'Accéder à mon espace'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-6">
            Tu n'as pas de code ? Demande-le à ton lead.
          </p>
        </div>
      </div>
    );
  }

  // Member dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Bonjour {member.name} !
              </h1>
              <p className="text-sm text-gray-500">{member.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Request One-to-One Section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Demander un One-to-One
            </h2>
          </div>

          {pendingRequest ? (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <p className="font-medium text-primary-800">
                    Demande en attente
                  </p>
                  <p className="text-sm text-primary-600 mt-1">
                    Créée le {format(new Date(pendingRequest.createdAt), 'dd MMMM à HH:mm', { locale: fr })}
                  </p>
                  {pendingRequest.reason && (
                    <p className="text-sm text-primary-700 mt-2">
                      "{pendingRequest.reason}"
                    </p>
                  )}
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${urgencyConfig[pendingRequest.urgency].color}`}>
                    {urgencyConfig[pendingRequest.urgency].label}
                  </span>
                </div>
              </div>
            </div>
          ) : showRequestForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison (optionnel)
                </label>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Pourquoi souhaites-tu un one-to-one ?"
                  className="input-field"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgence
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setRequestUrgency(level)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                        ${requestUrgency === level
                          ? urgencyConfig[level].color + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {urgencyConfig[level].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRequestOneToOne}
                  className="flex-1 btn-primary"
                >
                  Envoyer la demande
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRequestForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              J'ai besoin d'un one-to-one
            </button>
          )}
        </div>

        {/* Notebook Section */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Mon Carnet de Bord
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Note tes réussites, difficultés et idées au fil du temps.
            Elles seront abordées lors du prochain one-to-one.
          </p>

          {/* Add new note form */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex gap-2 mb-3 flex-wrap">
              {(Object.keys(WIN_PAIN_CONFIG) as NoteType[]).map((type) => {
                const config = WIN_PAIN_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => setNewNoteType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${newNoteType === type
                        ? config.color
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
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
                placeholder={`Ajouter une ${WIN_PAIN_CONFIG[newNoteType].label.toLowerCase()}...`}
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
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notes list */}
          {notes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Ton carnet est vide.</p>
              <p className="text-sm">Ajoute ta première note ci-dessus !</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => {
                const config = WIN_PAIN_CONFIG[note.type];
                return (
                  <div
                    key={note.id}
                    className={`flex items-start gap-3 p-3 rounded-lg ${config.color}`}
                  >
                    <span className="text-lg">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{note.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(note.createdAt), 'dd MMM à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 hover:bg-black/10 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {notes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>
                  {notes.length} note{notes.length > 1 ? 's' : ''} en attente du prochain one-to-one
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
