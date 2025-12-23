import React, { useState, useMemo } from 'react';
import { AppSessionLog, Project, AppSettings } from '../types';
import { ChevronLeft, ChevronRight, X, CheckCircle, Target } from 'lucide-react';

interface MonthlyCalendarProps {
  history: AppSessionLog[];
  projects: Project[];
  settings: AppSettings;
}

const DOT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', 
  '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', 
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', 
  '#f472b6', '#fb7185'
];

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ history, projects, settings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = useMemo(() => new Date(), []);

  const projectColorMap = useMemo(() => {
    const map: { [id: string]: string } = {};
    projects.forEach((p, i) => {
      map[p.id] = DOT_COLORS[i % DOT_COLORS.length];
    });
    return map;
  }, [projects]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  }, [currentDate]);

  const historyMap = useMemo(() => {
    const map: { [key: string]: number } = {};
    history.forEach(log => {
      const parts = log.duration.split(':').map(Number);
      const mins = parts.length === 3 ? parts[0] * 60 + parts[1] : parts[0];
      map[log.date] = (map[log.date] || 0) + mins;
    });
    return map;
  }, [history]);

  const projectsByDay = useMemo(() => {
    const spans: { [date: string]: { id: string, color: string }[] } = {};
    const dailyTarget = settings.dailyPomodoroTarget || 6;

    projects.forEach(p => {
      const start = new Date(p.createdAt);
      start.setHours(0, 0, 0, 0);
      
      let totalPoms = p.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
      if (totalPoms <= 0) totalPoms = 1;

      const durationDays = Math.ceil(totalPoms / dailyTarget);
      
      for (let i = 0; i < durationDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateKey = d.toDateString();
        if (!spans[dateKey]) spans[dateKey] = [];
        spans[dateKey].push({ id: p.id, color: projectColorMap[p.id] });
      }
    });
    return spans;
  }, [projects, settings.dailyPomodoroTarget, projectColorMap]);

  const changeMonth = (offset: number) => {
    setSelectedDay(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Projects starting on selected day and not finished
  const selectedDayDetail = useMemo(() => {
    if (selectedDay === null) return null;
    const selDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    selDate.setHours(0, 0, 0, 0);
    
    return projects.filter(p => {
      const pDate = new Date(p.createdAt);
      pDate.setHours(0, 0, 0, 0);
      
      const isSameDay = pDate.getTime() === selDate.getTime();
      const totalTarget = p.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
      const totalDone = p.subtasks.reduce((sum, s) => sum + s.completedSessions, 0);
      const isNotFinished = totalDone < totalTarget;

      return isSameDay && isNotFinished;
    });
  }, [selectedDay, currentDate, projects]);

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold">{monthName}</h3>
        <div className="flex gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><ChevronLeft /></button>
          <button onClick={() => changeMonth(1)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs font-bold text-white/40 uppercase tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {daysInMonth.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-28" />;
          
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateKey = dateObj.toDateString();
          const isToday = today.toDateString() === dateKey;
          
          const dateStringHistory = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
          const focusMins = historyMap[dateStringHistory] || 0;
          const dots = projectsByDay[dateKey] || [];

          return (
            <div 
              key={day} 
              onClick={() => setSelectedDay(day)}
              className={`h-28 rounded-2xl p-2 relative group cursor-pointer transition-all border
                ${isToday ? 'bg-white/10 border-white ring-2 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
                ${selectedDay === day ? 'ring-2 ring-yellow-400 border-yellow-400' : ''}`}
            >
              <div className="flex justify-between items-start">
                 <span className={`text-lg font-bold ${isToday ? 'text-white' : 'opacity-40'}`}>{day}</span>
                 {isToday && <span className="text-[10px] bg-white text-rose-500 font-bold px-1.5 rounded-full uppercase tracking-tighter">Today</span>}
              </div>
              
              {/* Focus Bar */}
              {focusMins > 0 && (
                <div 
                  className="absolute bottom-6 right-2 left-2 h-1 rounded-full bg-white/40 overflow-hidden"
                >
                  <div className="h-full bg-white shadow-[0_0_8px_white]" style={{ width: `${Math.min(100, (focusMins/480)*100)}%` }} />
                </div>
              )}

              {/* Project Dots */}
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 max-h-4 overflow-hidden">
                {dots.map((dot, dIdx) => (
                  <div 
                    key={`${dot.id}-${dIdx}`} 
                    className="w-1.5 h-1.5 rounded-full shadow-sm"
                    style={{ backgroundColor: dot.color }}
                    title="Project Active"
                  />
                ))}
              </div>

              {/* Hover Stats */}
              {focusMins > 0 && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono bg-black/40 px-1 rounded">
                  {Math.floor(focusMins/60)}h{Math.round(focusMins%60)}m
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Detail Window */}
      {selectedDay !== null && (
        <div className="absolute z-50 top-24 right-0 w-72 animate-fade-in-up">
           <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl text-white">
              <div className="flex justify-between items-center mb-4">
                 <h4 className="font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-yellow-400" /> 
                    {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                 </h4>
                 <button onClick={() => setSelectedDay(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="space-y-4">
                 <div className="text-xs uppercase tracking-widest text-white/40 font-bold">New Projects</div>
                 {selectedDayDetail && selectedDayDetail.length > 0 ? (
                   selectedDayDetail.map(p => (
                     <div key={p.id} className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: projectColorMap[p.id] }} />
                        <div className="flex-1 min-w-0">
                           <div className="text-sm font-bold truncate">{p.name}</div>
                           <div className="text-[10px] opacity-50">{p.subtasks.length} subtasks</div>
                        </div>
                        <CheckCircle className="w-4 h-4 text-white/20" />
                     </div>
                   ))
                 ) : (
                   <div className="text-sm text-white/30 italic py-2">No projects started on this day.</div>
                 )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 text-[10px] text-white/40">
                 Estimated focus sessions for this day: {settings.dailyPomodoroTarget}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};