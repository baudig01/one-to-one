import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Gauge,
  Hand,
  Lightbulb,
  ListChecks,
  Minus,
  Pencil,
  Play,
  Shield,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { MemberSelector, AdminCodeModal, Sparkline } from '../components';
import type { TeamMember, Meeting, OneToOneRequest } from '../types';
import { WIN_PAIN_CONFIG } from '../types';
import { averageScore, computeSentiment, getScoreTone } from '../utils/sentiment';

interface DashboardPageProps {
  members: TeamMember[];
  meetings: Meeting[];
  requests?: OneToOneRequest[];
  onAddMember?: (member: Omit<TeamMember, 'id' | 'createdAt' | 'accessCode'>) => void;
  onDeleteMember?: (memberId: string) => void;
  onEditMember?: (member: TeamMember) => void;
  onDeleteMeeting?: (meetingId: string) => void;
  onResolveRequest?: (requestId: string, scheduledAt?: Date) => void;
  isAdmin?: boolean;
}

type SortKey = 'name' | 'mood' | 'recency';

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Nom',
  mood: 'Ressenti',
  recency: 'Dernier échange',
};

const AVATAR_GRADIENTS = [
  'from-primary-500 to-primary-700',
  'from-energy-500 to-energy-700',
  'from-positive-500 to-positive-700',
  'from-warn-500 to-orange-600',
  'from-fuchsia-500 to-purple-700',
  'from-negative-500 to-negative-700',
];

const getInitials = (name: string) =>
  name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);

/** Nombre de jours depuis le dernier échange (null si aucun). */
const daysSince = (date?: Date) =>
  date ? differenceInCalendarDays(new Date(), new Date(date)) : null;

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'text-slate-900',
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <p className={`stat-value mt-1 ${tone}`}>{value}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
        </div>
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          {icon}
        </span>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function DashboardPage({
  members,
  meetings,
  requests = [],
  onAddMember,
  onDeleteMember,
  onEditMember,
  onDeleteMeeting,
  onResolveRequest,
  isAdmin = false,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [schedulingRequestId, setSchedulingRequestId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');

  // Meetings groupés par membre, du plus récent au plus ancien
  const meetingsByMember = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const meeting of meetings) {
      const list = map.get(meeting.memberId) ?? [];
      list.push(meeting);
      map.set(meeting.memberId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return map;
  }, [meetings]);

  const getMemberMeetings = (memberId: string) => meetingsByMember.get(memberId) ?? [];
  const getLastMeeting = (memberId: string) => getMemberMeetings(memberId)[0];

  /** Courbe de ressenti d'un membre, dans l'ordre chronologique. */
  const getMoodHistory = (memberId: string) =>
    getMemberMeetings(memberId).slice(0, 6).map(m => m.mood.mood).reverse();

  const getMoodTrend = (memberId: string): 'up' | 'down' | 'stable' | null => {
    const memberMeetings = getMemberMeetings(memberId);
    if (memberMeetings.length < 2) return null;
    const latest = memberMeetings[0].mood.mood;
    const previous = memberMeetings[1].mood.mood;
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'stable';
  };

  // ---------- Indicateurs d'équipe ----------
  const latestMeetings = useMemo(
    () => members.map(m => getLastMeeting(m.id)).filter((m): m is Meeting => !!m),
    [members, meetingsByMember]
  );

  const teamMood = averageScore(latestMeetings.map(m => m.mood.mood));
  const teamTone = getScoreTone(teamMood ?? 5.5);
  const openActions = latestMeetings.reduce(
    (total, meeting) => total + meeting.actions.filter(a => !a.completed).length,
    0
  );
  const teamTrend = useMemo(
    () =>
      [...meetings]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-8)
        .map(m => m.mood.mood),
    [meetings]
  );
  const needsAttention = members.filter(member => {
    const last = getLastMeeting(member.id);
    const days = daysSince(last?.date);
    return days === null || days > 30 || (last ? last.mood.mood <= 4 : false);
  }).length;

  const sortedMembers = useMemo(() => {
    const list = [...members];
    if (sortKey === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    if (sortKey === 'mood') {
      // Les ressentis les plus bas en premier : ce sont eux qui demandent de l'attention
      return list.sort((a, b) => {
        const aMood = getLastMeeting(a.id)?.mood.mood ?? -1;
        const bMood = getLastMeeting(b.id)?.mood.mood ?? -1;
        return aMood - bMood;
      });
    }
    return list.sort((a, b) => {
      const aDate = getLastMeeting(a.id)?.date;
      const bDate = getLastMeeting(b.id)?.date;
      const aTime = aDate ? new Date(aDate).getTime() : 0;
      const bTime = bDate ? new Date(bDate).getTime() : 0;
      return aTime - bTime;
    });
  }, [members, meetingsByMember, sortKey]);

  const cycleSort = () => {
    const order: SortKey[] = ['name', 'mood', 'recency'];
    setSortKey(order[(order.indexOf(sortKey) + 1) % order.length]);
  };

  const startMeeting = () => {
    if (selectedMemberId) navigate(`/meeting/${selectedMemberId}`);
  };

  const handleScheduleRequest = (requestId: string) => {
    if (!scheduledDate || !scheduledTime) return;
    onResolveRequest?.(requestId, new Date(`${scheduledDate}T${scheduledTime}`));
    setSchedulingRequestId(null);
    setScheduledDate('');
    setScheduledTime('');
  };

  const selectedMember = members.find(m => m.id === selectedMemberId);
  const selectedMemberMeetings = selectedMemberId ? getMemberMeetings(selectedMemberId) : [];

  return (
    <div className="min-h-screen pb-10">
      {/* ---------- Header ---------- */}
      <header className="glass-header">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-bold text-white shadow-soft">
                1:1
              </span>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  One to One · Dev Etam
                </h1>
                <p className="text-xs text-slate-500">
                  Rituel 15-20 min · {members.length} membre{members.length > 1 ? 's' : ''} ·{' '}
                  {meetings.length} échange{meetings.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <span className="chip hidden bg-warn-100 text-warn-800 sm:inline-flex">
                    <Shield className="h-3.5 w-3.5" />
                    Mode admin
                  </span>
                  <Link to="/" className="btn-secondary px-3 py-2 text-xs">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Passer en</span> lecture
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/my-space" className="btn-secondary px-3 py-2 text-xs">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mon</span> espace
                  </Link>
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="btn-primary px-3 py-2 text-xs"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mode</span> admin
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* ---------- Indicateurs ---------- */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Équipe"
            value={`${members.length}`}
            hint={`${latestMeetings.length} suivi${latestMeetings.length > 1 ? 's' : ''} en cours`}
          />
          <StatCard
            icon={<Gauge className="h-4 w-4" />}
            label="Ressenti moyen"
            value={teamMood != null ? `${teamMood.toFixed(1)}/10` : '—'}
            hint={teamMood != null ? teamTone.label : 'Aucun échange'}
            tone={teamTone.text}
          >
            {teamTrend.length > 1 && (
              <Sparkline values={teamTrend} stroke={teamTone.hex} width={120} height={26} />
            )}
          </StatCard>
          <StatCard
            icon={<ListChecks className="h-4 w-4" />}
            label="Actions ouvertes"
            value={`${openActions}`}
            hint="Sur les derniers one-to-one"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="À relancer"
            value={`${needsAttention}`}
            hint="Sans échange 30 j ou ressenti ≤ 4"
            tone={needsAttention > 0 ? 'text-warn-600' : 'text-slate-900'}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ---------- Colonne principale ---------- */}
          <div className="space-y-6 lg:col-span-2">
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

            {isAdmin && selectedMemberId && (
              <button onClick={startMeeting} className="btn-primary w-full py-4 text-base">
                <Play className="h-5 w-5" />
                Démarrer le one-to-one avec {selectedMember?.name}
              </button>
            )}

            {/* Historique du membre sélectionné */}
            {selectedMemberId && selectedMemberMeetings.length > 0 && (
              <div className="card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Historique de {selectedMember?.name}
                  </h3>
                  {getMoodHistory(selectedMemberId).length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Tendance ressenti</span>
                      <Sparkline
                        values={getMoodHistory(selectedMemberId)}
                        stroke={getScoreTone(selectedMemberMeetings[0].mood.mood).hex}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {selectedMemberMeetings.slice(0, 5).map((meeting) => {
                    const isExpanded = expandedMeetingId === meeting.id;
                    const sentiment = computeSentiment(meeting.winsPains);
                    const tone = getScoreTone(meeting.mood.mood);
                    const isAutoMood = meeting.mood.source === 'auto';

                    return (
                      <div
                        key={meeting.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <button
                          onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                          className="w-full p-4 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              {format(new Date(meeting.date), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {meeting.duration ? `${meeting.duration} min` : '—'}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                              )}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`chip ${tone.chip}`}>
                              <span>{tone.emoji}</span>
                              <span className="font-bold tabular-nums">{meeting.mood.mood}/10</span>
                              {isAutoMood ? (
                                <Gauge className="h-3 w-3 opacity-60" />
                              ) : (
                                <Hand className="h-3 w-3 opacity-60" />
                              )}
                            </span>
                            <span className="chip bg-energy-50 text-energy-700">
                              ⚡ <span className="tabular-nums">{meeting.mood.energy}/10</span>
                            </span>
                            <span className="chip bg-slate-100 text-slate-600 tabular-nums">
                              <ListChecks className="h-3 w-3" />
                              {meeting.actions.length}
                            </span>

                            {/* Équilibre positif / négatif de l'échange */}
                            {sentiment.hasData && (
                              <span className="flex min-w-[80px] flex-1 items-center gap-2">
                                <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <span
                                    className="bg-positive-500"
                                    style={{ width: `${sentiment.positiveShare}%` }}
                                  />
                                  <span
                                    className="bg-negative-500"
                                    style={{ width: `${sentiment.negativeShare}%` }}
                                  />
                                </span>
                                <span className="text-[11px] tabular-nums text-slate-400">
                                  {sentiment.positiveCount}+ / {sentiment.negativeCount}−
                                </span>
                              </span>
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="space-y-4 border-t border-slate-200 bg-slate-50/60 p-4">
                            {meeting.winsPains.length > 0 && (
                              <div>
                                <h4 className="section-title mb-2">Réussites & difficultés</h4>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {meeting.winsPains.map((item) => {
                                    const config = WIN_PAIN_CONFIG[item.type];
                                    return (
                                      <div
                                        key={item.id}
                                        className={`rounded-xl border p-2.5 text-sm ${config.surface}`}
                                      >
                                        <span className="mr-1.5">{config.emoji}</span>
                                        {item.text}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {meeting.actions.length > 0 && (
                              <div>
                                <h4 className="section-title mb-2">Actions</h4>
                                <ul className="space-y-1.5">
                                  {meeting.actions.map((action) => (
                                    <li
                                      key={action.id}
                                      className={`flex items-center gap-2 text-sm ${
                                        action.completed
                                          ? 'text-slate-400 line-through'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      <span>{action.assignee === 'lead' ? '👤' : '🧑‍💻'}</span>
                                      <span>{action.text}</span>
                                      {action.completed && (
                                        <CheckCircle className="h-3.5 w-3.5 text-positive-500" />
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {meeting.notes && (
                              <div>
                                <h4 className="section-title mb-2">Notes</h4>
                                <p className="whitespace-pre-wrap text-sm text-slate-600">
                                  {meeting.notes}
                                </p>
                              </div>
                            )}

                            {isAdmin && meeting.leadComment && (
                              <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
                                <h4 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-primary-700">
                                  <span className="chip bg-primary-200 text-primary-800">Lead</span>
                                  Commentaire privé
                                </h4>
                                <p className="whitespace-pre-wrap text-sm text-primary-900">
                                  {meeting.leadComment}
                                </p>
                              </div>
                            )}

                            {isAdmin && (
                              <div className="border-t border-slate-200 pt-3">
                                {deletingMeetingId === meeting.id ? (
                                  <div className="rounded-xl border border-negative-200 bg-negative-50 p-3">
                                    <p className="mb-3 text-sm text-negative-800">
                                      Supprimer ce one-to-one du{' '}
                                      {format(new Date(meeting.date), 'dd MMMM yyyy', { locale: fr })} ?
                                    </p>
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingMeetingId(null);
                                        }}
                                        className="btn-ghost px-3 py-1.5 text-xs"
                                      >
                                        Annuler
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteMeeting?.(meeting.id);
                                          setDeletingMeetingId(null);
                                        }}
                                        className="btn-danger px-3 py-1.5 text-xs"
                                      >
                                        Confirmer la suppression
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/meeting/${meeting.memberId}/edit/${meeting.id}`);
                                      }}
                                      className="btn-ghost px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Modifier
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingMeetingId(meeting.id);
                                      }}
                                      className="btn-ghost px-3 py-1.5 text-xs text-negative-600 hover:bg-negative-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Supprimer
                                    </button>
                                  </div>
                                )}
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

          {/* ---------- Colonne latérale ---------- */}
          <div className="space-y-6">
            <div className="card">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-900">Vue d'ensemble</h3>
                {members.length > 1 && (
                  <button
                    onClick={cycleSort}
                    className="chip bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                    title="Changer le tri"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {SORT_LABELS[sortKey]}
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Ajoute des membres pour commencer
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedMembers.map((member) => {
                    const lastMeeting = getLastMeeting(member.id);
                    const trend = getMoodTrend(member.id);
                    const history = getMoodHistory(member.id);
                    const days = daysSince(lastMeeting?.date);
                    const tone = lastMeeting ? getScoreTone(lastMeeting.mood.mood) : null;
                    const overdue = days === null || days > 30;
                    const isSelected = selectedMemberId === member.id;
                    const colorIndex = members.findIndex(m => m.id === member.id);

                    return (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full rounded-2xl border p-3 text-left transition-all ${
                          isSelected
                            ? 'border-primary-400 bg-primary-50/70 shadow-soft'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ${
                              AVATAR_GRADIENTS[colorIndex % AVATAR_GRADIENTS.length]
                            }`}
                          >
                            {getInitials(member.name)}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="truncate text-[11px] text-slate-500">
                              {lastMeeting
                                ? days === 0
                                  ? "Échange aujourd'hui"
                                  : `Il y a ${days} j`
                                : 'Aucun échange'}
                            </p>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-2">
                            {history.length > 1 && tone && (
                              <Sparkline values={history} stroke={tone.hex} width={56} height={22} />
                            )}
                            {lastMeeting && tone && (
                              <span className={`chip ${tone.chip} tabular-nums`}>
                                {tone.emoji} {lastMeeting.mood.mood}
                              </span>
                            )}
                            {trend === 'up' && <TrendingUp className="h-4 w-4 text-positive-500" />}
                            {trend === 'down' && <TrendingDown className="h-4 w-4 text-negative-500" />}
                            {trend === 'stable' && <Minus className="h-4 w-4 text-slate-300" />}
                          </div>
                        </div>

                        {overdue && (
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-warn-700">
                            <AlertTriangle className="h-3 w-3" />
                            {days === null ? 'Jamais rencontré' : `${days} jours sans one-to-one`}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Demandes en attente — admin */}
            {isAdmin && requests.length > 0 && (
              <div className="card border-warn-200 bg-warn-50/60">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-warn-900">
                  <Bell className="h-4 w-4" />
                  Demandes en attente
                  <span className="chip bg-warn-500 text-white tabular-nums">{requests.length}</span>
                </h3>

                <div className="space-y-3">
                  {requests.map((request) => {
                    const member = members.find(m => m.id === request.memberId);
                    const urgencyConfig = {
                      low: { label: 'Pas urgent', color: 'bg-positive-50 text-positive-700', icon: null },
                      medium: { label: 'Normal', color: 'bg-warn-100 text-warn-800', icon: null },
                      high: { label: 'Urgent', color: 'bg-negative-50 text-negative-700', icon: AlertTriangle },
                    };
                    const config = urgencyConfig[request.urgency];
                    const UrgencyIcon = config.icon;
                    const isScheduling = schedulingRequestId === request.id;

                    return (
                      <div key={request.id} className="rounded-2xl border border-warn-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {member?.name || 'Membre inconnu'}
                              </span>
                              <span className={`chip ${config.color}`}>
                                {UrgencyIcon && <UrgencyIcon className="h-3 w-3" />}
                                {config.label}
                              </span>
                            </div>
                            {request.reason && (
                              <p className="mb-2 text-sm italic text-slate-600">« {request.reason} »</p>
                            )}
                            <p className="text-[11px] text-slate-400">
                              {format(new Date(request.createdAt), 'dd MMM à HH:mm', { locale: fr })}
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 gap-1">
                            <button
                              onClick={() => {
                                setSelectedMemberId(request.memberId);
                                navigate(`/meeting/${request.memberId}`);
                              }}
                              className="btn-primary px-2.5 py-1.5 text-xs"
                            >
                              <Play className="h-3 w-3" />
                              Démarrer
                            </button>
                            <button
                              onClick={() => setSchedulingRequestId(isScheduling ? null : request.id)}
                              className="btn-icon hover:bg-positive-50 hover:text-positive-600"
                              title="Planifier le one-to-one"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {isScheduling && (
                          <div className="mt-3 space-y-2 border-t border-warn-100 pt-3">
                            <p className="text-xs font-medium text-slate-600">Planifier le one-to-one :</p>
                            <div className="flex gap-2">
                              <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="input-sm"
                                min={new Date().toISOString().split('T')[0]}
                              />
                              <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="input-sm"
                              />
                            </div>
                            <button
                              onClick={() => handleScheduleRequest(request.id)}
                              disabled={!scheduledDate || !scheduledTime}
                              className="btn-primary w-full py-2 text-xs"
                            >
                              Confirmer
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rappels d'animation */}
            <div className="card border-primary-100 bg-gradient-to-br from-primary-50 to-energy-50">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary-900">
                <Lightbulb className="h-4 w-4" />
                Bonnes pratiques
              </h3>
              <ul className="space-y-2 text-sm text-primary-800">
                <li className="flex gap-2">
                  <span className="text-primary-400">—</span>
                  Laisse le collaborateur parler 70 % du temps
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-400">—</span>
                  Commence par demander une réussite
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-400">—</span>
                  Termine par un engagement mutuel
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-400">—</span>
                  Pas de status report : focus sur le ressenti
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

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
