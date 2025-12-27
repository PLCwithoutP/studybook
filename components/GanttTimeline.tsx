import React, { useMemo, useState } from 'react';
import { Project, AppSettings } from '../types';
import { ChevronRight, ChevronDown, FileSpreadsheet } from 'lucide-react';
import XLSX from 'xlsx-js-style';

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
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
  const dailyTarget = settings.dailyPomodoroTarget || 6;

  const visibleProjects = useMemo(() => projects.filter(p => !p.isDaily), [projects]);

  const toggleProject = (id: string) => {
    const newSet = new Set(expandedProjectIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedProjectIds(newSet);
  };

  const timelineRange = useMemo(() => {
    if (visibleProjects.length === 0) return { start: new Date(), end: new Date(), days: [] };
    
    const startDates = visibleProjects.map(p => new Date(p.createdAt).getTime());
    const minStart = new Date(Math.min(...startDates));
    minStart.setHours(0, 0, 0, 0);

    const endDates = visibleProjects.map(p => {
      const totalPoms = p.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
      const durationDays = Math.ceil(totalPoms / dailyTarget);
      const end = new Date(p.createdAt);
      end.setDate(end.getDate() + durationDays);
      return end.getTime();
    });
    
    const maxEnd = new Date(Math.max(...endDates, Date.now() + 86400000 * 7));
    maxEnd.setHours(0, 0, 0, 0);

    const days = [];
    let current = new Date(minStart);
    let count = 0;
    while (current <= maxEnd && count < 365) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
      count++;
    }

    return { start: minStart, end: maxEnd, days };
  }, [visibleProjects, dailyTarget]);

  const exportToStyledSpreadsheet = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const COLORS = {
      NAVY: "1E293B",
      WHITE: "FFFFFF",
      GREEN: "4ADE80",
      RED: "F87171",
      YELLOW: "FACC15",
      GREY_LIGHT: "F3F4F6",
      GREY_BORDER: "E2E8F0",
      INDIGO: "818CF8",
      ROSE: "FB7185"
    };

    const data: any[] = [];
    
    // 1. LEGEND
    data.push([{ v: "GANTT CHART LEGEND", s: { font: { bold: true, size: 14 } } }]);
    data.push([{ v: "NOW", s: { fill: { fgColor: { rgb: COLORS.NAVY } }, font: { color: { rgb: COLORS.WHITE }, bold: true }, alignment: { horizontal: "center" } } }, { v: "Current Day (Today)" }]);
    data.push([{ v: "OK", s: { fill: { fgColor: { rgb: COLORS.GREEN } }, alignment: { horizontal: "center" } } }, { v: "Completed Work on Schedule" }]);
    data.push([{ v: "!", s: { fill: { fgColor: { rgb: COLORS.RED } }, font: { bold: true }, alignment: { horizontal: "center" } } }, { v: "Incomplete Past Work (Critical)" }]);
    data.push([{ v: "...", s: { fill: { fgColor: { rgb: COLORS.YELLOW } }, alignment: { horizontal: "center" } } }, { v: "Future Scheduled Work" }]);
    data.push([]); // Spacer

    // 2. HEADER
    const headerRow: any[] = [
      { v: "Project / Subtask", s: { font: { bold: true, color: { rgb: COLORS.WHITE } }, fill: { fgColor: { rgb: COLORS.NAVY } } } },
      { v: "Importance", s: { font: { bold: true, color: { rgb: COLORS.WHITE } }, fill: { fgColor: { rgb: COLORS.NAVY } } } },
      { v: "Urgency", s: { font: { bold: true, color: { rgb: COLORS.WHITE } }, fill: { fgColor: { rgb: COLORS.NAVY } } } }
    ];
    
    timelineRange.days.forEach(day => {
      const isToday = day.getTime() === today.getTime();
      headerRow.push({ 
        v: day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        s: { 
          font: { bold: true, color: { rgb: isToday ? COLORS.WHITE : "333333" } },
          fill: { fgColor: { rgb: isToday ? COLORS.NAVY : "E5E7EB" } },
          alignment: { horizontal: "center" }
        }
      });
    });
    data.push(headerRow);

    // 3. ROWS
    visibleProjects.forEach(project => {
      const projectStart = new Date(project.createdAt);
      projectStart.setHours(0, 0, 0, 0);
      const totalTarget = project.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
      const totalDone = project.subtasks.reduce((sum, s) => sum + s.completedSessions, 0);
      const totalDurationDays = Math.ceil(totalTarget / dailyTarget);
      const completedDays = Math.floor(totalDone / dailyTarget);

      const projectRow: any[] = [
        { v: project.name, s: { font: { bold: true, size: 12 }, fill: { fgColor: { rgb: "F8FAFC" } } } },
        { v: "-" },
        { v: "-" }
      ];

      timelineRange.days.forEach(day => {
        const diffDays = Math.floor((day.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
        const isInside = diffDays >= 0 && diffDays < totalDurationDays;

        if (!isInside) {
          projectRow.push({ v: "", s: { fill: { fgColor: { rgb: "FFFFFF" } } } });
        } else {
          let style: any = { alignment: { horizontal: "center" } };
          let val = "";
          if (day.getTime() === today.getTime()) {
            style.fill = { fgColor: { rgb: COLORS.NAVY } };
            style.font = { color: { rgb: COLORS.WHITE }, bold: true };
            val = "NOW";
          } else if (day.getTime() < today.getTime()) {
            const isDone = diffDays < completedDays;
            style.fill = { fgColor: { rgb: isDone ? COLORS.GREEN : COLORS.RED } };
            val = isDone ? "OK" : "!";
          } else {
            style.fill = { fgColor: { rgb: COLORS.YELLOW } };
            val = "...";
          }
          projectRow.push({ v: val, s: style });
        }
      });
      data.push(projectRow);

      let cumulativeTarget = 0;
      project.subtasks.forEach(task => {
        const taskRow: any[] = [
          { v: `  - ${task.name}`, s: { font: { italic: true }, border: { bottom: { style: "thin", color: { rgb: COLORS.GREY_BORDER } } } } },
          { v: task.importance === 'important' ? "Important" : "Normal", s: { font: { color: { rgb: task.importance === 'important' ? COLORS.INDIGO : "666666" } } } },
          { v: task.urgency === 'emergent' ? "Emergent" : "Routine", s: { font: { color: { rgb: task.urgency === 'emergent' ? COLORS.ROSE : "666666" } } } }
        ];
        
        const taskStartOffset = Math.floor(cumulativeTarget / dailyTarget);
        const taskDurationDays = Math.ceil(task.targetSessions / dailyTarget);
        const taskCompletedDays = Math.floor(task.completedSessions / dailyTarget);

        timelineRange.days.forEach(day => {
          const diffDays = Math.floor((day.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
          const isInsideTask = diffDays >= taskStartOffset && diffDays < (taskStartOffset + taskDurationDays);

          if (!isInsideTask) {
            taskRow.push({ v: "" });
          } else {
            let style: any = { alignment: { horizontal: "center" } };
            let val = "";
            const relativeDayInTask = diffDays - taskStartOffset;

            if (day.getTime() === today.getTime()) {
              style.fill = { fgColor: { rgb: COLORS.NAVY } };
              style.font = { color: { rgb: COLORS.WHITE }, bold: true };
              val = "NOW";
            } else if (day.getTime() < today.getTime()) {
              const isDone = relativeDayInTask < taskCompletedDays;
              style.fill = { fgColor: { rgb: isDone ? COLORS.GREEN : COLORS.RED } };
              val = isDone ? "OK" : "!";
            } else {
              style.fill = { fgColor: { rgb: COLORS.YELLOW } };
              val = "...";
            }
            taskRow.push({ v: val, s: style });
          }
        });
        cumulativeTarget += task.targetSessions;
        data.push(taskRow);
      });

      data.push([]);
    });

    try {
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const wscols = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
      for (let i = 0; i < timelineRange.days.length; i++) wscols.push({ wch: 6 });
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Studybook Detailed Gantt");
      XLSX.writeFile(workbook, `Studybook_Enhanced_Gantt_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to generate spreadsheet.");
    }
  };

  if (visibleProjects.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10 rounded-3xl animate-fade-in">
        <p>No standard projects to display in timeline.</p>
        <p className="text-xs opacity-50 mt-1">Daily projects are hidden.</p>
      </div>
    );
  }

  const dayWidth = 44;

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <div className="w-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20">
          <div className="min-w-max">
            <div className="flex bg-black/40 border-b border-white/10 sticky top-0 z-30">
              <div className="w-64 sticky left-0 z-40 bg-gray-900/95 backdrop-blur-md p-4 font-bold border-r border-white/10 shrink-0 select-none text-white">Project & Subtasks</div>
              <div className="flex">
                {timelineRange.days.map((day, idx) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isFirstOfMonth = day.getDate() === 1;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div key={idx} style={{ width: dayWidth }} className={`flex flex-col items-center justify-center py-2 shrink-0 border-r border-white/5 text-[10px] relative ${isToday ? 'bg-white/10' : ''} ${isWeekend ? 'bg-black/10' : ''}`}>
                      <span className="opacity-50 font-mono text-[9px] text-white">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                      <span className={`font-bold ${isToday ? 'text-yellow-400' : 'opacity-80 text-white'}`}>{day.getDate()}</span>
                      {isFirstOfMonth && <div className="absolute top-0 left-1 text-[8px] uppercase tracking-tighter text-blue-300 font-bold mt-0.5">{day.toLocaleDateString('en-US', { month: 'short' })}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div 
                className="absolute top-0 bottom-0 w-px bg-yellow-400/50 z-20 pointer-events-none"
                style={{ 
                  left: `calc(16rem + ${timelineRange.days.findIndex(d => d.toDateString() === new Date().toDateString()) * dayWidth + dayWidth/2}px)` 
                }}
              />

              {visibleProjects.map((project, pIdx) => {
                const startIdx = timelineRange.days.findIndex(d => d.toDateString() === new Date(project.createdAt).toDateString());
                const totalPoms = project.subtasks.reduce((sum, s) => sum + s.targetSessions, 0);
                const durationDays = Math.ceil(totalPoms / dailyTarget);
                const color = PROJECT_COLORS[pIdx % PROJECT_COLORS.length];
                const completedPoms = project.subtasks.reduce((sum, s) => sum + s.completedSessions, 0);
                const progressWidth = totalPoms > 0 ? (completedPoms / totalPoms) * 100 : 0;
                const isExpanded = expandedProjectIds.has(project.id);

                let cumulativeSessions = 0;

                return (
                  <React.Fragment key={project.id}>
                    <div 
                      onClick={() => toggleProject(project.id)}
                      className="flex border-b border-white/5 group hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <div className="w-64 sticky left-0 z-20 bg-gray-900/90 backdrop-blur-md p-3 border-r border-white/10 text-sm font-bold truncate shrink-0 flex items-center gap-2 text-white">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronRight className="w-4 h-4 text-white/40" />}
                        <span className="truncate">{project.name}</span>
                      </div>
                      <div className="flex items-center relative py-4" style={{ width: timelineRange.days.length * dayWidth }}>
                        <div 
                          className="absolute h-7 rounded-md shadow-lg flex items-center overflow-hidden transition-all group-hover:scale-[1.01]"
                          style={{ 
                            left: startIdx * dayWidth + 4, 
                            width: Math.max(dayWidth - 8, durationDays * dayWidth - 8),
                            backgroundColor: `${color}33`,
                            border: `1.5px solid ${color}AA`
                          }}
                        >
                          <div 
                            className="h-full opacity-70 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                            style={{ backgroundColor: color, width: `${progressWidth}%` }}
                          />
                          <div className="absolute left-2 text-[10px] font-bold text-white drop-shadow-md truncate pointer-events-none select-none">
                            {Math.round(progressWidth)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && project.subtasks.map((task) => {
                      const taskStartDays = cumulativeSessions / dailyTarget;
                      const taskDurationDays = task.targetSessions / dailyTarget;
                      const taskProgress = task.targetSessions > 0 ? (task.completedSessions / task.targetSessions) * 100 : 0;
                      
                      const leftOffset = (startIdx + taskStartDays) * dayWidth + 4;
                      const taskWidth = Math.max(8, taskDurationDays * dayWidth - 8);
                      
                      cumulativeSessions += task.targetSessions;

                      return (
                        <div key={task.id} className="flex border-b border-white/5 bg-black/10 group/sub hover:bg-white/5 transition-colors">
                          <div className="w-64 sticky left-0 z-20 bg-gray-900/90 backdrop-blur-md p-3 pl-10 border-r border-white/10 text-xs font-medium italic opacity-70 truncate shrink-0 text-white/80">
                            {task.name}
                          </div>
                          <div className="flex items-center relative py-3" style={{ width: timelineRange.days.length * dayWidth }}>
                            <div 
                              className="absolute h-4 rounded-sm shadow-sm flex items-center overflow-hidden transition-all group-hover/sub:brightness-125"
                              style={{ 
                                left: leftOffset, 
                                width: taskWidth,
                                backgroundColor: `${color}11`,
                                border: `1px dashed ${color}66`
                              }}
                            >
                              <div 
                                className="h-full opacity-40 transition-all duration-1000"
                                style={{ backgroundColor: color, width: `${taskProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 bg-black/30 text-[11px] text-white/50 italic flex flex-col md:flex-row justify-between gap-2 border-t border-white/10">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Today</span>
            <span>Duration = Σ(Target Pomodoros) / {dailyTarget} (Daily Target)</span>
          </div>
          <div className="opacity-60">High contrast legend and labels are included in Excel export.</div>
        </div>
      </div>

      <div className="flex justify-center pb-4">
        <button 
          onClick={exportToStyledSpreadsheet}
          className="flex items-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold shadow-xl transition-all active:scale-95 group"
        >
          <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Export Detailed Gantt with Labels (.xlsx)
        </button>
      </div>
    </div>
  );
};