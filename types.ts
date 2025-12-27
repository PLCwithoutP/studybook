
export type Importance = 'important' | 'not-important';
export type Urgency = 'emergent' | 'not-emergent';

export interface Subtask {
  id: string;
  name: string;
  description?: string;
  targetSessions: number;
  completedSessions: number;
  importance: Importance;
  urgency: Urgency;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  subtasks: Subtask[];
  createdAt: string;
  isDaily?: boolean;
  recurrenceEndDate?: string;
}

export interface AppSessionLog {
  date: string;
  duration: string; // Format hh:mm:ss
  projectId?: string;
  subtaskId?: string;
}

export interface AppSettings {
  durations: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
  };
  colors: {
    pomodoro: string;
    shortBreak: string;
    longBreak: string;
  };
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  dailyPomodoroTarget: number;
}

export interface AppData {
  projects: Project[];
  appHistory: AppSessionLog[];
  dayNotes?: Record<string, string>; // date string -> general description
  dayAgendas?: Record<string, Record<string, string>>; // date string -> { "08:00": "text", ... }
  settings?: AppSettings;
}

export enum TimerMode {
  POMODORO = 'pomodoro',
  SHORT_BREAK = 'short_break',
  LONG_BREAK = 'long_break',
}

export interface TimerState {
  mode: TimerMode;
  timeLeft: number; // in seconds
  isActive: boolean;
  sessionsCompletedSinceStart: number;
}