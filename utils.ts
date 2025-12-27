
export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const getIstanbulDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const calculateProjectStats = (subtasks: any[]) => {
  let totalSessions = 0;
  let completedSessions = 0;

  subtasks.forEach((t: any) => {
    totalSessions += t.targetSessions;
    completedSessions += t.completedSessions;
  });

  const timeSpentSeconds = completedSessions * 25 * 60;
  const timeRemainingSeconds = Math.max(0, totalSessions - completedSessions) * 25 * 60;

  return {
    totalSessions,
    completedSessions,
    timeSpent: formatTime(timeSpentSeconds),
    timeRemaining: formatTime(timeRemainingSeconds),
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to count sessions from history for a specific project on a specific date string
export const getDailyProjectCompletion = (projectId: string, dateStr: string, history: any[]) => {
  // Filter history for this project and date
  // Note: history date format matches MonthlyCalendar's format (e.g. "01 January 2024")
  const logs = history.filter((log: any) => log.projectId === projectId && log.date === dateStr);
  
  // Estimate sessions from duration or just count logs
  // Assuming 1 log = 1 session for simplicity in this context, or we could parse duration
  // Let's assume 1 log = 1 session completed
  return logs.length;
};
