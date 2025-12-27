import React, { useMemo } from 'react';
import { Project, AppSessionLog } from '../types';
import { Repeat } from 'lucide-react';

interface GanttChartProps {
  projects: Project[];
  history: AppSessionLog[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ projects, history }) => {
  const visibleProjects = projects; // Show all projects including daily ones

  if (visibleProjects.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-white/40 border-2 border-dashed border-white/10 rounded-3xl">
        <p>No projects created yet.</p>
      </div>
    );
  }

  const getProgress = (project: Project) => {
    if (project.isDaily) {
        return { isDaily: true };
    } else {
        return { isDaily: false };
    }
  };

  return (
    <div className="w-full space-y-12">
      {visibleProjects.map(project => {
        const { isDaily } = getProgress(project);
        
        return (
        <div key={project.id} className="bg-white/5 rounded-3xl p-6 border border-white/10">
          <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
            {project.name}
            {isDaily && <div className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Repeat className="w-3 h-3" /> Daily</div>}
            <span className="text-sm font-mono opacity-40 ml-auto font-normal">Created: {new Date(project.createdAt).toLocaleDateString()}</span>
          </h4>
          
          <div className="space-y-4">
            {project.subtasks.map(task => {
              let completed = task.completedSessions;
              
              // For daily tasks, calculate completion based on TODAY's history logs
              if (isDaily) {
                   const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                   completed = history.filter(l => l.subtaskId === task.id && l.date === todayStr).length;
              }

              const progress = task.targetSessions > 0 ? (completed / task.targetSessions) * 100 : 0;
              const isCompleted = progress >= 100;
              
              return (
                <div key={task.id} className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-400' : 'text-white/70'}`}>
                      {task.name}
                    </span>
                    <span className="text-xs font-mono opacity-50">
                      {completed} / {task.targetSessions} {isDaily ? '(Today)' : 'Sessions'}
                    </span>
                  </div>
                  <div className="h-6 bg-black/30 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full transition-all duration-1000 shadow-lg relative
                        ${isCompleted ? 'bg-emerald-500' : 'bg-white/60'}`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    >
                      {progress > 5 && (
                        <div className="absolute inset-0 flex items-center justify-end px-2 text-[10px] font-bold text-black/60">
                          {Math.round(progress)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {isDaily && <div className="mt-4 text-[10px] text-white/40 italic text-right">Showing progress for current day only.</div>}
        </div>
      )})}
      
      <div className="text-center text-white/30 text-sm mt-8 italic">
         Visualizing task completion status relative to target durations.
      </div>
    </div>
  );
};