export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  createdAt: Date;
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

export interface RadarData {
  codeQuality: number; // 1-5
  process: number;
  teamwork: number;
  workload: number;
  growth: number;
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
  radar: RadarData;
  actions: ActionItem[];
  notes?: string;
  duration?: number; // en minutes
}

export type MeetingStep = 'pulse' | 'wins-pains' | 'radar' | 'actions' | 'summary';

export const RADAR_LABELS: Record<keyof RadarData, string> = {
  codeQuality: 'Qualité Code',
  process: 'Process',
  teamwork: 'Équipe',
  workload: 'Charge',
  growth: 'Évolution',
};

export const WIN_PAIN_CONFIG = {
  win: { label: 'Réussite', emoji: '🎉', color: 'bg-green-100 border-green-400 text-green-800' },
  pain: { label: 'Difficulté', emoji: '😤', color: 'bg-red-100 border-red-400 text-red-800' },
  idea: { label: 'Idée', emoji: '💡', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  blocker: { label: 'Blocage', emoji: '🚧', color: 'bg-orange-100 border-orange-400 text-orange-800' },
};
