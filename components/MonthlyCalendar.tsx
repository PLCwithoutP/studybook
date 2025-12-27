import React, { useState, useMemo } from 'react';
import { AppSessionLog, Project, AppSettings } from '../types';
import { ChevronLeft, ChevronRight, X, CheckCircle, Target, FileText, Clock, Edit3, Check, Repeat, XCircle } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getDailyProjectCompletion } from '../utils';

interface MonthlyCalendarProps {
  history: AppSessionLog[];
  projects: Project[];
  settings: AppSettings;
  dayNotes: Record<string, string>;
  onUpdateDayNote: (date: string, note: string) => void;
  dayAgendas: Record<string, Record<string, string>>;
  onUpdateDayAgenda: (date: string, hour: string, text: string) => void;
  onActivateProject: (id: string) => void;
}

const DOT_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', 
  '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', 
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', 
  '#f472b6', '#fb7185'
];

const HOURS = Array.from({ length: 16 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

// Helper component for rendering Markdown securely
const Markdown: React.FC<{ content: string, className?: string }> = ({ content, className = "" }) => {
  const html = useMemo(() => {
    const rawHtml = marked.parse(content || '', { breaks: true }) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [content]);

  return (
    <div 
      className={`prose max-w-none prose-invert ${className}`} 
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
};

interface CalendarDot {
  id: string;
  name: string;
  color: string;
  isDaily: boolean;
  status?: 'success' | 'failed' | 'pending';
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({ 
  history, 
  projects, 
  settings, 
  dayNotes, 
  onUpdateDayNote,
  dayAgendas,
  onUpdateDayAgenda,
  onActivateProject
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }, []);

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
    const spans: { [date: string]: CalendarDot[] } = {};
    const dailyTarget = settings.dailyPomodoroTarget || 6;

    projects.forEach(p => {
      const start = new Date(p.createdAt);
      start.setHours(0, 0, 0, 0);

      if (p.isDaily && p.recurrenceEndDate) {
        // Daily Recurring Logic
        const end = new Date(p.recurrenceEndDate);
        end.setHours(0,0,0,0);
        
        let loopDate = new Date(start);
        while (loopDate <= end) {
          const dateKey = loopDate.toDateString();
          if (!spans[dateKey]) spans[dateKey] = [];
          
          // Determine status for past/today
          let status: 'success' | 'failed' | 'pending' = 'pending';
          // Check if this date is in the past or today
          if (loopDate <= today) {
             const dateStr = loopDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
             const done = getDailyProjectCompletion(p.id, dateStr, history);
             const target = p.subtasks.reduce((sum, t) => sum + t.targetSessions, 0);
             if (done >= target) status = 'success';
             else if (loopDate.getTime() < today.getTime()) status = 'failed';
          }

          spans[dateKey].push({ 
            id: p.id, 
            name: p.name, 
            color: projectColorMap[p.id],
            isDaily: true,
            status
          });
          loopDate.setDate(loopDate.getDate() + 1);
        }

      } else {
        // Standard Estimate Logic
        let totalPoms = p.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
        if (totalPoms <= 0) totalPoms = 1;
        const durationDays = Math.ceil(totalPoms / dailyTarget);
        
        for (let i = 0; i < durationDays; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const dateKey = d.toDateString();
          if (!spans[dateKey]) spans[dateKey] = [];
          spans[dateKey].push({ 
            id: p.id, 
            name: p.name, 
            color: projectColorMap[p.id],
            isDaily: false 
          });
        }
      }
    });
    return spans;
  }, [projects, settings.dailyPomodoroTarget, projectColorMap, history, today]);

  const changeMonth = (offset: number) => {
    setSelectedDay(null);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const selectedDayKey = useMemo(() => {
    if (selectedDay === null) return null;
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toDateString();
  }, [selectedDay, currentDate]);

  const agendaForSelectedDay = useMemo(() => {
    if (!selectedDayKey) return {};
    return dayAgendas[selectedDayKey] || {};
  }, [selectedDayKey, dayAgendas]);

  const hasAnyAgendaEntries = useMemo(() => {
    return Object.values(agendaForSelectedDay).some((v) => (v as string).trim() !== '');
  }, [agendaForSelectedDay]);

  const projectsOnSelectedDay = useMemo(() => {
    if (!selectedDayKey) return [];
    return projectsByDay[selectedDayKey] || [];
  }, [selectedDayKey, projectsByDay]);

  const toggleDay = (day: number) => {
    setSelectedDay(day);
    setIsEditing(false); // Default to rendered view
  };

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
          
          const hasAgenda = dayAgendas[dateKey] && Object.values(dayAgendas[dateKey]).some((v) => (v as string).trim() !== '');
          const hasNote = !!dayNotes[dateKey]?.trim();
          const showsIcon = hasAgenda || hasNote;

          return (
            <div 
              key={day} 
              onClick={() => toggleDay(day)}
              className={`h-28 rounded-2xl p-2 relative group cursor-pointer transition-all border
                ${isToday ? 'bg-white/10 border-white ring-2 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}
                ${selectedDay === day ? 'ring-2 ring-yellow-400 border-yellow-400' : ''}`}
            >
              <div className="flex justify-between items-start">
                 <span className={`text-lg font-bold ${isToday ? 'text-white' : 'opacity-40'}`}>{day}</span>
                 <div className="flex gap-1">
                    {showsIcon && <FileText className="w-3 h-3 text-blue-300 opacity-60" />}
                    {isToday && <span className="text-[10px] bg-white text-rose-500 font-bold px-1.5 rounded-full uppercase tracking-tighter">Today</span>}
                 </div>
              </div>
              
              {/* Focus Bar */}
              {focusMins > 0 && (
                <div className="absolute bottom-6 right-2 left-2 h-1 rounded-full bg-white/40 overflow-hidden">
                  <div className="h-full bg-white shadow-[0_0_8px_white]" style={{ width: `${Math.min(100, (focusMins/480)*100)}%` }} />
                </div>
              )}

              {/* Project Dots */}
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 max-h-4 overflow-hidden">
                {dots.map((dot, dIdx) => (
                  <div 
                    key={`${dot.id}-${dIdx}`} 
                    className={`w-1.5 h-1.5 rounded-full shadow-sm ${dot.status === 'failed' ? 'bg-red-500 rounded-none w-2 h-2' : ''}`}
                    style={{ backgroundColor: dot.status === 'failed' ? undefined : dot.color }}
                  >
                     {/* Failed Indicator Visual */}
                     {dot.status === 'failed' && (
                       <div className="w-full h-full bg-red-500 rotate-45" /> 
                     )}
                  </div>
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

      {/* Expanded Day Detail Window */}
      {selectedDay !== null && selectedDayKey && (
        <div className="absolute z-50 top-16 right-0 w-[420px] animate-fade-in-up">
           <div className={`backdrop-blur-3xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl text-white transition-all duration-300 ${isEditing ? 'bg-gray-900/95' : 'bg-white/10 bg-opacity-40'}`}>
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h4 className="text-2xl font-bold flex items-center gap-3">
                       <Target className="w-6 h-6 text-yellow-400" /> 
                       {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </h4>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mt-1">Daily Summary & Agenda</p>
                 </div>
                 <div className="flex gap-2">
                    <button 
                       onClick={() => setIsEditing(!isEditing)}
                       className={`p-2.5 rounded-xl transition-all ${isEditing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/20 text-white/70'}`}
                       title={isEditing ? "Save & View" : "Edit Day Details"}
                    >
                       {isEditing ? <Check className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setSelectedDay(null)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/70"><X className="w-5 h-5" /></button>
                 </div>
              </div>
              
              <div className="space-y-8">
                 {/* Hourly Agenda Section */}
                 <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-4">
                      <Clock className="w-3.5 h-3.5" /> Hourly List
                    </div>
                    
                    {isEditing ? (
                       <div className="max-h-60 overflow-y-auto pr-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
                          {HOURS.map(hour => (
                            <div key={hour} className="flex items-center gap-3 group/hour">
                               <span className="text-[10px] font-mono opacity-40 w-10 shrink-0">{hour}</span>
                               <input 
                                 type="text"
                                 value={agendaForSelectedDay[hour] || ''}
                                 onChange={(e) => onUpdateDayAgenda(selectedDayKey, hour, e.target.value)}
                                 placeholder="Enter task..."
                                 className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all placeholder:text-white/10"
                               />
                            </div>
                          ))}
                       </div>
                    ) : (
                       <div className="space-y-4">
                          {hasAnyAgendaEntries ? (
                             <div className="space-y-3">
                                {HOURS.filter(h => agendaForSelectedDay[h]?.trim()).map(hour => (
                                   <div key={hour} className="flex items-start gap-5 animate-fade-in group">
                                      <span className="text-[11px] font-mono opacity-40 w-10 shrink-0 mt-1">{hour}</span>
                                      <div className="flex-1 text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                                         {agendaForSelectedDay[hour]}
                                      </div>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             <div className="text-xs italic text-white/20 py-2">No agenda items for this day.</div>
                          )}
                       </div>
                    )}
                 </div>

                 {/* General Notes Section */}
                 <div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-4">
                      <FileText className="w-3.5 h-3.5" /> General Description
                    </div>
                    
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={dayNotes[selectedDayKey] || ''}
                        onChange={(e) => onUpdateDayNote(selectedDayKey, e.target.value)}
                        placeholder="Supports Markdown... - Lists, *Bold*, etc."
                        className="w-full bg-white/5 border border-white/10 rounded-3xl p-5 text-sm min-h-[160px] outline-none focus:ring-1 focus:ring-white/30 transition-all placeholder:text-white/10 leading-relaxed resize-none scrollbar-thin"
                      />
                    ) : (
                      <div className="w-full">
                        {dayNotes[selectedDayKey]?.trim() ? (
                          <Markdown content={dayNotes[selectedDayKey]} className="text-sm opacity-60 leading-relaxed" />
                        ) : (
                          <div className="text-xs italic text-white/20">No description provided.</div>
                        )}
                      </div>
                    )}
                 </div>

                 {/* Active Projects Check */}
                 {!isEditing && projectsOnSelectedDay.length > 0 && (
                    <div className="pt-6 border-t border-white/10 animate-fade-in">
                       <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-4">Active Projects</div>
                       <div className="grid grid-cols-1 gap-2">
                         {projectsOnSelectedDay.map(p => (
                           <div 
                             key={p.id} 
                             onClick={() => onActivateProject(p.id)}
                             className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center gap-3 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
                           >
                               <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: p.status === 'failed' ? '#ef4444' : p.color }} />
                               <div className="flex-1 overflow-hidden">
                                  <div className={`text-xs font-bold truncate group-hover:text-white ${p.status === 'failed' ? 'text-red-400' : 'text-white/80'}`}>{p.name}</div>
                                  {p.isDaily && <div className="text-[9px] uppercase tracking-wider opacity-50 flex items-center gap-1"><Repeat className="w-2 h-2" /> Daily</div>}
                               </div>
                               {p.status === 'failed' ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />}
                           </div>
                         ))}
                       </div>
                    </div>
                 )}
              </div>

              <div className="mt-8 pt-5 border-t border-white/5 text-[10px] text-white/20 flex justify-between items-center italic">
                 <span>{isEditing ? "Editing mode (auto-saves)" : "Rendered view"}</span>
                 <span>Target: {settings.dailyPomodoroTarget} Sessions</span>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};