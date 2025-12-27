import React, { useMemo } from 'react';
import { Project, Subtask } from '../types';
import { AlertCircle, Clock, CheckCircle2, Circle } from 'lucide-react';

interface EisenhowerMatrixProps {
  projects: Project[];
  activeProjectId: string | null;
  onProjectSelect: (id: string) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({ projects, activeProjectId, onProjectSelect }) => {
  // Filter available projects: For daily projects, only show if today is within range (roughly) or they are active
  const visibleProjects = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return projects.filter(p => {
      if (p.isDaily && p.recurrenceEndDate) {
        const end = new Date(p.recurrenceEndDate);
        end.setHours(0,0,0,0);
        return today <= end;
      }
      return true;
    });
  }, [projects]);

  const selectedProject = useMemo(() => {
    return visibleProjects.find(p => p.id === activeProjectId) || (visibleProjects.length > 0 ? visibleProjects[0] : null);
  }, [visibleProjects, activeProjectId]);

  const quadrants = useMemo(() => {
    if (!selectedProject) return { q1: [], q2: [], q3: [], q4: [] };
    
    return selectedProject.subtasks.reduce((acc, task) => {
      if (task.importance === 'important' && task.urgency === 'emergent') acc.q1.push(task);
      else if (task.importance === 'important' && task.urgency === 'not-emergent') acc.q2.push(task);
      else if (task.importance === 'not-important' && task.urgency === 'emergent') acc.q3.push(task);
      else acc.q4.push(task);
      return acc;
    }, { q1: [] as Subtask[], q2: [] as Subtask[], q3: [] as Subtask[], q4: [] as Subtask[] });
  }, [selectedProject]);

  if (visibleProjects.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10 rounded-3xl">
        <p>No active projects available for matrix view.</p>
      </div>
    );
  }

  const Quadrant = ({ title, tasks, colorClass, label, description }: { title: string, tasks: Subtask[], colorClass: string, label: string, description: string }) => (
    <div className={`flex flex-col h-full rounded-3xl p-6 border border-white/10 ${colorClass} backdrop-blur-sm transition-all hover:scale-[1.01]`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-xl font-bold flex items-center gap-2">{title}</h4>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-60">{label}</p>
        </div>
        <span className="text-xs bg-black/20 px-2 py-1 rounded-full font-mono">{tasks.length} tasks</span>
      </div>
      <p className="text-xs italic opacity-40 mb-4">{description}</p>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {tasks.length > 0 ? tasks.map(task => (
          <div key={task.id} className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between group">
            <div className="flex items-center gap-3 overflow-hidden">
              {/* For daily tasks, standard completion check logic might need adjustment if using daily progress, but subtasks don't track daily progress individually in this model yet. keeping standard. */}
              {task.completedSessions >= task.targetSessions ? 
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : 
                <Circle className="w-4 h-4 text-white/40 shrink-0" />
              }
              <span className={`text-sm truncate ${task.completedSessions >= task.targetSessions ? 'line-through opacity-40 italic' : ''}`}>
                {task.name}
              </span>
            </div>
            <div className="text-[10px] font-mono opacity-40 group-hover:opacity-100 transition-opacity">
              {task.completedSessions}/{task.targetSessions}
            </div>
          </div>
        )) : (
          <div className="h-full flex items-center justify-center text-white/20 text-xs italic">
            No tasks in this quadrant
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          Eisenhower Decision Matrix
          <span className="text-sm font-normal text-white/40 px-3 py-1 bg-white/5 rounded-full border border-white/5">Visual Priority Tool</span>
        </h3>
        <select 
          value={selectedProject?.id || ''} 
          onChange={(e) => onProjectSelect(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all text-white"
        >
          {visibleProjects.map(p => <option key={p.id} value={p.id} className="bg-gray-800">{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[700px]">
        <Quadrant 
          title="Do It First" 
          label="Urgent & Important"
          description="High impact tasks that need immediate attention."
          tasks={quadrants.q1} 
          colorClass="bg-rose-500/10" 
        />
        <Quadrant 
          title="Schedule It" 
          label="Not Urgent & Important"
          description="Crucial tasks that contribute to long-term goals."
          tasks={quadrants.q2} 
          colorClass="bg-indigo-500/10" 
        />
        <Quadrant 
          title="Delegate It" 
          label="Urgent & Not Important"
          description="Tasks that feel immediate but don't add much value."
          tasks={quadrants.q3} 
          colorClass="bg-orange-500/10" 
        />
        <Quadrant 
          title="Eliminate It" 
          label="Not Urgent & Not Important"
          description="Distractions or low-value activities to avoid."
          tasks={quadrants.q4} 
          colorClass="bg-slate-500/10" 
        />
      </div>

      <div className="flex justify-center gap-12 pt-4">
        <div className="flex items-center gap-2 text-[11px] text-white/40">
           <AlertCircle className="w-3 h-3 text-rose-500" /> Focus on Quadrant 1
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40">
           <Clock className="w-3 h-3 text-indigo-500" /> Invest in Quadrant 2
        </div>
      </div>
    </div>
  );
};