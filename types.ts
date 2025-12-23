
export interface Subtask {
  id: string;
  name: string;
  targetSessions: number;
  completedSessions: number;
}

export interface Project {
  id: string;
  name: string;
  subtasks: Subtask[];
  createdAt: string;
}

export interface AppSessionLog {
  date: string;
  duration: string; // Format hh:mm:ss
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
