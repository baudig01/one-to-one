export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  accessCode: string; // Code personnel pour accéder à l'espace membre
  createdAt: Date;
}

// Notes du collaborateur (carnet de bord)
export interface MemberNote {
  id: string;
  memberId: string;
  type: WinPainType;
  text: string;
  createdAt: Date;
  usedInMeetingId?: string; // Rempli quand la note a été utilisée dans un meeting
}

// Demande de one-to-one par le collaborateur
export interface OneToOneRequest {
  id: string;
  memberId: string;
  reason?: string;
  urgency: 'low' | 'medium' | 'high';
  createdAt: Date;
  resolvedAt?: Date;
  scheduledAt?: Date; // Date/heure planifiée par le lead
}

// 'auto'   : le ressenti suit le score calculé sur les éléments saisis
// 'manual' : le lead / collaborateur fixe la valeur à la main
export type MoodSource = 'auto' | 'manual';

export interface MoodEntry {
  mood: number; // 1-10
  energy: number; // 1-10
  source?: MoodSource; // absent = historique saisi manuellement
  computed?: number; // score calculé au moment de l'enregistrement (traçabilité)
}

export type WinPainType = 'win' | 'pain' | 'idea' | 'blocker';

export interface WinPainItem {
  id: string;
  type: WinPainType;
  text: string;
}

export interface ActionItem {
  id: string;
  text: string;
  assignee: 'member' | 'lead';
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface Meeting {
  id: string;
  memberId: string;
  date: Date;
  mood: MoodEntry;
  winsPains: WinPainItem[];
  actions: ActionItem[];
  notes?: string;
  leadComment?: string; // Commentaire privé du lead (non visible par le collaborateur)
  duration?: number; // en minutes
}

export type MeetingStep = 'pulse' | 'wins-pains' | 'actions' | 'summary';

export interface WinPainTypeConfig {
  label: string;
  plural: string;
  emoji: string;
  /** Conservé pour la compatibilité : pastille pleine utilisée dans les listes */
  color: string;
  polarity: 'positive' | 'negative';
  /** Poids dans le calcul du ressenti dynamique */
  weight: number;
  /** Classes utilitaires du design system */
  chip: string;
  chipActive: string;
  surface: string;
  accentText: string;
  hex: string;
  placeholder: string;
}

export const WIN_PAIN_CONFIG: Record<WinPainType, WinPainTypeConfig> = {
  win: {
    label: 'Réussite',
    plural: 'Réussites',
    emoji: '🎉',
    color: 'bg-positive-50 border-positive-200 text-positive-700',
    polarity: 'positive',
    weight: 2,
    chip: 'bg-white border border-slate-200 text-slate-600 hover:border-positive-300 hover:text-positive-700',
    chipActive: 'bg-positive-500 border border-positive-500 text-white shadow-soft',
    surface: 'bg-positive-50 border-positive-200 text-positive-800',
    accentText: 'text-positive-600',
    hex: '#10b981',
    placeholder: 'Ce qui a bien marché sur le sprint…',
  },
  pain: {
    label: 'Difficulté',
    plural: 'Difficultés',
    emoji: '😤',
    color: 'bg-negative-50 border-negative-200 text-negative-700',
    polarity: 'negative',
    weight: 2,
    chip: 'bg-white border border-slate-200 text-slate-600 hover:border-negative-300 hover:text-negative-700',
    chipActive: 'bg-negative-500 border border-negative-500 text-white shadow-soft',
    surface: 'bg-negative-50 border-negative-200 text-negative-800',
    accentText: 'text-negative-600',
    hex: '#f43f5e',
    placeholder: 'Ce qui a frotté, ce qui a pesé…',
  },
  idea: {
    label: 'Idée',
    plural: 'Idées',
    emoji: '💡',
    color: 'bg-warn-50 border-warn-200 text-warn-700',
    polarity: 'positive',
    weight: 1,
    chip: 'bg-white border border-slate-200 text-slate-600 hover:border-warn-300 hover:text-warn-700',
    chipActive: 'bg-warn-500 border border-warn-500 text-white shadow-soft',
    surface: 'bg-warn-50 border-warn-200 text-warn-800',
    accentText: 'text-warn-600',
    hex: '#f59e0b',
    placeholder: 'Une suggestion, une envie, une piste…',
  },
  blocker: {
    label: 'Blocage',
    plural: 'Blocages',
    emoji: '🚧',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    polarity: 'negative',
    weight: 3,
    chip: 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-700',
    chipActive: 'bg-orange-500 border border-orange-500 text-white shadow-soft',
    surface: 'bg-orange-50 border-orange-200 text-orange-800',
    accentText: 'text-orange-600',
    hex: '#ea580c',
    placeholder: 'Ce qui empêche d\'avancer aujourd\'hui…',
  },
};

export const WIN_PAIN_TYPES = Object.keys(WIN_PAIN_CONFIG) as WinPainType[];
