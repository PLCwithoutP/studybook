import React, { useState } from 'react';
import { Project, AppSessionLog, AppSettings } from '../types';
import { MonthlyCalendar } from './MonthlyCalendar';
import { GanttChart } from './GanttChart';
import { GanttTimeline } from './GanttTimeline';
import { LayoutGrid, BarChart, ListTodo } from 'lucide-react';

interface CalendarViewProps {
  history: AppSessionLog[];
  projects: Project[];
  settings: AppSettings;
}

type Tab = 'monthly' | 'progress' | 'gantt';

export const CalendarView: React.FC<CalendarViewProps> = ({ history, projects, settings }) => {
  const [activeTab, setActiveTab] = useState<Tab>('monthly');

  return (
    <div className="w-full text-white">
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-5 py-3 text-base md:text-lg font-medium rounded-t-xl transition-all whitespace-nowrap
            ${activeTab === 'monthly' ? 'bg-white/20 text-white border-b-4 border-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <LayoutGrid className="w-5 h-5" /> Monthly Look
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
        {activeTab === 'monthly' && <MonthlyCalendar history={history} projects={projects} settings={settings} />}
        {activeTab === 'progress' && <GanttChart projects={projects} />}
        {activeTab === 'gantt' && <GanttTimeline projects={projects} settings={settings} />}
      </div>
    </div>
  );
};