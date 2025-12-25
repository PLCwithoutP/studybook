import React, { useState } from 'react';
import { Project, AppSessionLog, AppSettings } from '../types';
import { MonthlyCalendar } from './MonthlyCalendar';
import { GanttChart } from './GanttChart';
import { GanttTimeline } from './GanttTimeline';
import { EisenhowerMatrix } from './EisenhowerMatrix';
import { LayoutGrid, BarChart, ListTodo, Grid3X3 } from 'lucide-react';

interface CalendarViewProps {
  history: AppSessionLog[];
  projects: Project[];
  settings: AppSettings;
  activeProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onActivateProject: (id: string) => void;
  dayNotes: Record<string, string>;
  onUpdateDayNote: (date: string, note: string) => void;
  dayAgendas: Record<string, Record<string, string>>;
  onUpdateDayAgenda: (date: string, hour: string, text: string) => void;
}

type Tab = 'agenda' | 'progress' | 'gantt' | 'matrix';

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  history, 
  projects, 
  settings, 
  activeProjectId, 
  onProjectSelect, 
  onActivateProject,
  dayNotes, 
  onUpdateDayNote,
  dayAgendas,
  onUpdateDayAgenda
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('agenda');

  return (
    <div className="w-full text-white">
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-2 px-5 py-3 text-base md:text-lg font-medium rounded-t-xl transition-all whitespace-nowrap
            ${activeTab === 'agenda' ? 'bg-white/20 text-white border-b-4 border-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <LayoutGrid className="w-5 h-5" /> Agenda
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-5 py-3 text-base md:text-lg font-medium rounded-t-xl transition-all whitespace-nowrap
            ${activeTab === 'matrix' ? 'bg-white/20 text-white border-b-4 border-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <Grid3X3 className="w-5 h-5" /> Matrix
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-5 py-3 text-base md:text-lg font-medium rounded-t-xl transition-all whitespace-nowrap
            ${activeTab === 'progress' ? 'bg-white/20 text-white border-b-4 border-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <ListTodo className="w-5 h-5" /> Progress
        </button>
        <button
          onClick={() => setActiveTab('gantt')}
          className={`flex items-center gap-2 px-5 py-3 text-base md:text-lg font-medium rounded-t-xl transition-all whitespace-nowrap
            ${activeTab === 'gantt' ? 'bg-white/20 text-white border-b-4 border-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <BarChart className="w-5 h-5" /> Gantt Chart
        </button>
      </div>

      <div className="animate-fade-in min-h-[400px]">
        {activeTab === 'agenda' && (
          <MonthlyCalendar 
            history={history} 
            projects={projects} 
            settings={settings} 
            dayNotes={dayNotes}
            onUpdateDayNote={onUpdateDayNote}
            dayAgendas={dayAgendas}
            onUpdateDayAgenda={onUpdateDayAgenda}
            onActivateProject={onActivateProject}
          />
        )}
        {activeTab === 'matrix' && <EisenhowerMatrix projects={projects} activeProjectId={activeProjectId} onProjectSelect={onProjectSelect} />}
        {activeTab === 'progress' && <GanttChart projects={projects} />}
        {activeTab === 'gantt' && <GanttTimeline projects={projects} settings={settings} />}
      </div>
    </div>
  );
};