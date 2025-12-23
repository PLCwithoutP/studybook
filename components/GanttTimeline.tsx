import React, { useMemo } from 'react';
import { Project, AppSettings } from '../types';

interface GanttTimelineProps {
  projects: Project[];
  settings: AppSettings;
}

const PROJECT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', 
  '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', 
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', 
  '#f472b6', '#fb7185'
];

export const GanttTimeline: React.FC<GanttTimelineProps> = ({ projects, settings }) => {
  const dailyTarget = settings.dailyPomodoroTarget || 6;

  const timelineRange = useMemo(() => {
    if (projects.length === 0) return { start: new Date(), end: new Date(), days: [] };
    
    const startDates = projects.map(p => new Date(p.createdAt).getTime());
    const minStart = new Date(Math.min(...startDates));
    minStart.setHours(0, 0, 0, 0);

    const endDates = projects.map(p => {
      const totalPoms = p.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
      const durationDays = Math.ceil(totalPoms / dailyTarget);
      const end = new Date(p.createdAt);
      end.setDate(end.getDate() + durationDays);
      return end.getTime();
    });
    
    const maxEnd = new Date(Math.max(...endDates, Date.now() + 86400000 * 7)); // At least 1 week ahead
    maxEnd.setHours(0, 0, 0, 0);

    const days = [];
    let current = new Date(minStart);
    while (current <= maxEnd) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return { start: minStart, end: maxEnd, days };
  }, [projects, dailyTarget]);

  if (projects.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10 rounded-3xl">
        <p>No projects to display in timeline.</p>
      </div>
    );
  }

  const dayWidth = 40; // Pixels per day

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
        <div className="min-w-max">
          {/* Header Axis */}
          <div className="flex bg-black/30 border-b border-white/10">
            <div className="w-48 sticky left-0 z-20 bg-gray-900/90 backdrop-blur-md p-4 font-bold border-r border-white/10 shrink-0">Projects</div>
            <div className="flex">
              {timelineRange.days.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const isFirstOfMonth = day.getDate() === 1;
                return (
                  <div key={idx} style={{ width: dayWidth }} className={`flex flex-col items-center justify-center py-2 shrink-0 border-r border-white/5 text-[10px] ${isToday ? 'bg-white/10' : ''}`}>
                    <span className="opacity-50 font-mono">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                    <span className={`font-bold ${isToday ? 'text-yellow-400' : ''}`}>{day.getDate()}</span>
                    {isFirstOfMonth && <div className="absolute top-0 text-[8px] uppercase tracking-tighter opacity-30 mt-1">{day.toLocaleDateString('en-US', { month: 'short' })}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Rows */}
          <div className="relative">
             {/* Today Line */}
             <div 
               className="absolute top-0 bottom-0 w-px bg-yellow-400/50 z-10 pointer-events-none"
               style={{ 
                 left: `calc(12rem + ${timelineRange.days.findIndex(d => d.toDateString() === new Date().toDateString()) * dayWidth + dayWidth/2}px)` 
               }}
             />

            {projects.map((project, pIdx) => {
              const startIdx = timelineRange.days.findIndex(d => d.toDateString() === new Date(project.createdAt).toDateString());
              const totalPoms = project.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
              const durationDays = Math.ceil(totalPoms / dailyTarget);
              const color = PROJECT_COLORS[pIdx % PROJECT_COLORS.length];
              const completedPoms = project.subtasks.reduce((sum, s) => sum + s.completedSessions, 0);
              const progressWidth = (completedPoms / totalPoms) * 100;

              return (
                <div key={project.id} className="flex border-b border-white/5 group hover:bg-white/5 transition-colors">
                  <div className="w-48 sticky left-0 z-20 bg-gray-900/90 backdrop-blur-md p-3 border-r border-white/10 text-sm font-semibold truncate shrink-0">
                    {project.name}
                  </div>
                  <div className="flex items-center relative py-2" style={{ width: timelineRange.days.length * dayWidth }}>
                    <div 
                      className="absolute h-8 rounded-lg shadow-lg flex items-center overflow-hidden transition-all group-hover:brightness-110"
                      style={{ 
                        left: startIdx * dayWidth + 4, 
                        width: Math.max(dayWidth - 8, durationDays * dayWidth - 8),
                        backgroundColor: `${color}44`,
                        border: `1px solid ${color}88`
                      }}
                    >
                       {/* Progress fill */}
                       <div 
                         className="h-full opacity-60 transition-all duration-1000"
                         style={{ backgroundColor: color, width: `${progressWidth}%` }}
                       />
                       <div className="absolute left-2 text-[9px] font-bold text-white drop-shadow-md truncate pointer-events-none">
                         {Math.round(progressWidth)}% done
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="p-4 bg-black/20 text-[11px] text-white/40 italic flex items-center gap-4">
         <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Current Date</span>
         <span>Duration calculated as Total Pomodoros / Daily Target ({dailyTarget})</span>
      </div>
    </div>
  );
};