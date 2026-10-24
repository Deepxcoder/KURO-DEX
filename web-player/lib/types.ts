export interface WorkoutSet {
  setId: string;
  reps: number;
  weight: number;
  totalReps: number;
  isBW?: boolean;
  addedWeight?: number;
  clusterReps?: number[];
  tags: string[];
  raw: string;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  code?: string;
  completed: boolean;
  targetSets?: number;
  targetReps?: number;
  rawLine: string;
  lineIndex: number;
  sets: WorkoutSet[];
  muscleSplit: string;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  dateStr: string;
  rawDate: string;
  timeStr: string;
  dayOfWeek: string;
  muscleSplit: string;
  stretchingNotes?: string;
  warmupMinutes: number;
  exercises: WorkoutExercise[];
  totalVolumeKg: number;
  totalSets: number;
  completedSets: number;
  completionRate: number;
  weekNumber: number; // 1-4 in 4-week Arnold Split cycle
}

export interface WorkoutApiResponse {
  rawMarkdown: string;
  sessions: WorkoutSession[];
  currentSessionId: string;
  sha?: string;
  source: 'github' | 'local';
  error?: string;
}

export interface SyncPayload {
  action: 'toggle' | 'raw';
  sessionDate?: string;
  exerciseId?: string;
  completed?: boolean;
  rawMarkdown?: string;
  sha?: string;
}
