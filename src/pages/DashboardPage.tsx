import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Play, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, ChevronDown, ChevronUp, Eye, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MemberSelector, AdminCodeModal } from '../components';
import type { TeamMember, Meeting } from '../types';
import { RADAR_LABELS, WIN_PAIN_CONFIG } from '../types';

interface DashboardPageProps {
  members: TeamMember[];
  meetings: Meeting[];
  onAddMember?: (member: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  onDeleteMember?: (memberId: string) => void;
  onEditMember?: (member: TeamMember) => void;
  isAdmin?: boolean;
}

export function DashboardPage({
  members,
  meetings,
  onAddMember,
  onDeleteMember,
  onEditMember,
  isAdmin = false,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const getMemberMeetings = (memberId: string) => {
    return meetings
      .filter(m => m.memberId === memberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getLastMeeting = (memberId: string) => {
    const memberMeetings = getMemberMeetings(memberId);
    return memberMeetings[0];
  };

  const getMoodTrend = (memberId: string): 'up' | 'down' | 'stable' | null => {
    const memberMeetings = getMemberMeetings(memberId);
    if (memberMeetings.length < 2) return null;

    const latest = memberMeetings[0].mood.mood;
    const previous = memberMeetings[1].mood.mood;

    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  const startMeeting = () => {
    if (selectedMemberId) {
      navigate(`/meeting/${selectedMemberId}`);
    }
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const selectedMemberMeetings = selectedMemberId ? getMemberMeetings(selectedMemberId) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">One-to-One</h1>
              <p className="text-gray-500">Format 15-20 min</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm text-gray-500">
                <p>{members.length} membre(s)</p>
                <p>{meetings.length} meeting(s)</p>
              </div>
              {isAdmin ? (
                <Link
                  to="/"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Passer en mode Lecture
                </Link>
              ) : (
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Passer en mode Admin
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Member Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <MemberSelector
                members={members}
                selectedMemberId={selectedMemberId}
                onSelect={setSelectedMemberId}
                onAddMember={onAddMember}
                onDeleteMember={onDeleteMember}
                onEditMember={onEditMember}
                isAdmin={isAdmin}
              />
            </div>

            {/* Start Meeting Button - Admin only */}
            {isAdmin && selectedMemberId && (
              <button
                onClick={startMeeting}
                className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6" />
                Démarrer le One-to-One avec {selectedMember?.name}
              </button>
            )}

            {/* Meeting History for Selected Member */}
            {selectedMemberId && selectedMemberMeetings.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Historique de {selectedMember?.name}
                </h3>

                <div className="space-y-3">
                  {selectedMemberMeetings.slice(0, 5).map((meeting) => {
                    const isExpanded = expandedMeetingId === meeting.id;
                    return (
                      <div
                        key={meeting.id}
                        className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden"
                      >
                        {/* Header cliquable */}
                        <button
                          onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                          className="w-full p-4 text-left hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(meeting.date), 'dd MMMM yyyy', { locale: fr })}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                {meeting.duration ? `${meeting.duration} min` : '-'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-lg">
                                {meeting.mood.mood >= 7 ? '😄' : meeting.mood.mood >= 5 ? '🙂' : '😔'}
                              </span>
                              <span className="font-semibold">{meeting.mood.mood}/10</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <span className="text-green-600">
                                {meeting.winsPains.filter(w => w.type === 'win').length} réussites
                              </span>
                              <span>/</span>
                              <span className="text-red-600">
                                {meeting.winsPains.filter(w => w.type === 'pain').length} difficultés
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {meeting.actions.length} action(s)
                            </div>
                          </div>
                        </button>

                        {/* Panel de détails */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 p-4 space-y-4 bg-white">
                            {/* Réussites & Difficultés */}
                            {meeting.winsPains.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  🎯 Réussites & Difficultés
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {meeting.winsPains.map((item) => {
                                    const config = WIN_PAIN_CONFIG[item.type];
                                    return (
                                      <div
                                        key={item.id}
                                        className={`p-2 rounded-lg text-sm ${config.color}`}
                                      >
                                        <span className="mr-1">{config.emoji}</span>
                                        {item.text}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            {meeting.actions.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  ✅ Actions
                                </h4>
                                <ul className="space-y-1">
                                  {meeting.actions.map((action) => (
                                    <li
                                      key={action.id}
                                      className={`flex items-center gap-2 text-sm ${
                                        action.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                                      }`}
                                    >
                                      <span>{action.assignee === 'lead' ? '👤' : '🧑‍💻'}</span>
                                      <span>{action.text}</span>
                                      {action.completed && <span className="text-green-500">✓</span>}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Radar */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                📊 Radar
                              </h4>
                              <div className="flex gap-2 flex-wrap">
                                {(Object.keys(meeting.radar) as (keyof typeof meeting.radar)[]).map(key => (
                                  <span
                                    key={key}
                                    className={`text-xs px-2 py-1 rounded-full
                                      ${meeting.radar[key] >= 4
                                        ? 'bg-green-100 text-green-700'
                                        : meeting.radar[key] >= 3
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-red-100 text-red-700'}`}
                                  >
                                    {RADAR_LABELS[key]}: {meeting.radar[key]}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Notes */}
                            {meeting.notes && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  📝 Notes
                                </h4>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                  {meeting.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Team Overview */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Vue d'ensemble</h3>

              {members.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Ajoute des membres pour commencer
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => {
                    const lastMeeting = getLastMeeting(member.id);
                    const trend = getMoodTrend(member.id);

                    return (
                      <div
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all
                          ${selectedMemberId === member.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">
                              {lastMeeting
                                ? `Dernier: ${format(new Date(lastMeeting.date), 'dd/MM')}`
                                : 'Aucun meeting'}
                            </p>
                          </div>

                          {lastMeeting && (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {lastMeeting.mood.mood >= 7
                                  ? '😄'
                                  : lastMeeting.mood.mood >= 5
                                    ? '🙂'
                                    : '😔'}
                              </span>
                              {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                              {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                              {trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="card bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100">
              <h3 className="font-semibold text-primary-800 mb-2">💡 Tips</h3>
              <ul className="text-sm text-primary-700 space-y-2">
                <li>• Laisse le collaborateur parler 70% du temps</li>
                <li>• Commence par demander une réussite</li>
                <li>• Termine par un engagement mutuel</li>
                <li>• Pas de status report - focus sur le ressenti</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal code admin */}
      <AdminCodeModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          setShowAdminModal(false);
          navigate('/admin');
        }}
      />
    </div>
  );
}
