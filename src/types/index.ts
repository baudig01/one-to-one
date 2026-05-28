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
  type: 'win' | 'pain' | 'idea' | 'blocker';
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

export interface MoodEntry {
  mood: number; // 1-10
  energy: number; // 1-10
}

export interface WinPainItem {
  id: string;
  type: 'win' | 'pain' | 'idea' | 'blocker';
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

export const WIN_PAIN_CONFIG = {
  win: { label: 'Réussite', emoji: '🎉', color: 'bg-green-100 border-green-400 text-green-800' },
  pain: { label: 'Difficulté', emoji: '😤', color: 'bg-red-100 border-red-400 text-red-800' },
  idea: { label: 'Idée/Suggestion', emoji: '💡', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  blocker: { label: 'Blocage', emoji: '🚧', color: 'bg-orange-100 border-orange-400 text-orange-800' },
};
