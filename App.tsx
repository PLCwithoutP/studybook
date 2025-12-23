import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppData, Project, TimerMode, AppSessionLog, AppSettings } from './types';
import { getIstanbulDate, generateId, calculateProjectStats, formatTime } from './utils';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { AppSessionTimer } from './components/AppSessionTimer';
import { PerformanceGraph } from './components/PerformanceGraph';
import { CalendarView } from './components/CalendarView';
import { Trash2, Plus, Minus, SkipForward, Menu, Download, Upload, Book, Settings, Target, BarChart3, ArrowLeft, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  durations: {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15
  },
  colors: {
    pomodoro: '#f43f5e',
    shortBreak: '#14b8a6',
    longBreak: '#3b82f6'
  },
  autoStartBreaks: false,
  autoStartPomodoros: false,
  dailyPomodoroTarget: 6
};

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [appHistory, setAppHistory] = useState<AppSessionLog[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [timerMode, setTimerMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.durations.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [pomoCount, setPomoCount] = useState(0); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState(false);
  const [isPerformanceViewOpen, setIsPerformanceViewOpen] = useState(false);
  const [isCalendarViewOpen, setIsCalendarViewOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<{name: string, target: number}[]>([{name: '', target: 1}]);
  const [subtaskToAddName, setSubtaskToAddName] = useState('');
  const [subtaskToAddTarget, setSubtaskToAddTarget] = useState(1);
  const currentSessionDuration = useRef<string>("00:00:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAppTimerUpdate = useCallback((time: string) => {
    currentSessionDuration.current = time;
  }, []);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }, []);

  useEffect(() => {
    const durationKey = timerMode === TimerMode.POMODORO ? 'pomodoro' : (timerMode === TimerMode.SHORT_BREAK ? 'shortBreak' : 'longBreak');
    setTimeLeft(settings.durations[durationKey] * 60);
  }, [settings.durations, timerMode]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ${timerMode === TimerMode.POMODORO ? 'Focus' : 'Break'}`;
  }, [timeLeft, timerMode]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (timerMode === TimerMode.POMODORO) {
      const nextPomoCount = pomoCount + 1;
      setPomoCount(nextPomoCount);
      if (activeSubtaskId && selectedProjectId) updateSubtaskProgress(selectedProjectId, activeSubtaskId);
      let nextMode = nextPomoCount % 4 === 0 ? TimerMode.LONG_BREAK : TimerMode.SHORT_BREAK;
      let nextTime = nextMode === TimerMode.LONG_BREAK ? settings.durations.longBreak * 60 : settings.durations.shortBreak * 60;
      setTimerMode(nextMode);
      setTimeLeft(nextTime);
      if (settings.autoStartBreaks) setIsActive(true);
    } else {
      setTimerMode(TimerMode.POMODORO);
      setTimeLeft(settings.durations.pomodoro * 60);
      if (settings.autoStartPomodoros) setIsActive(true);
    }
  };

  const updateSubtaskProgress = (projectId: string, subtaskId: string) => {
    setProjects(prev => prev.map(p => p.id !== projectId ? p : {
      ...p,
      subtasks: p.subtasks.map(t => t.id !== subtaskId ? t : { ...t, completedSessions: t.completedSessions + 1 })
    }));
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const skipTimer = () => { 
    setIsActive(false); 
    handleTimerComplete(); 
  };

  const resetTimer = () => {
    setIsActive(false);
    const durationKey = timerMode === TimerMode.POMODORO ? 'pomodoro' : (timerMode === TimerMode.SHORT_BREAK ? 'shortBreak' : 'longBreak');
    setTimeLeft(settings.durations[durationKey] * 60);
  };

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
      id: generateId(),
      name: newProjectName,
      createdAt: new Date().toISOString(),
      subtasks: newSubtasks.filter(st => st.name.trim() !== '').map(st => ({
        id: generateId(), name: st.name, targetSessions: st.target, completedSessions: 0
      }))
    };
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setNewSubtasks([{name: '', target: 1}]);
    setIsAddProjectModalOpen(false);
  };

  const handleAddSubtask = () => {
    if (!selectedProjectId || !subtaskToAddName.trim()) return;
    const newSubtask = { id: generateId(), name: subtaskToAddName, targetSessions: subtaskToAddTarget, completedSessions: 0 };
    setProjects(prev => prev.map(p => p.id !== selectedProjectId ? p : { ...p, subtasks: [...p.subtasks, newSubtask] }));
    setSubtaskToAddName('');
    setSubtaskToAddTarget(1);
    setIsAddSubtaskModalOpen(false);
  };

  const updateSessionTarget = (projectId: string, subtaskId: string, increment: number) => {
    setProjects(prev => prev.map(p => p.id !== projectId ? p : {
      ...p,
      subtasks: p.subtasks.map(t => {
        if (t.id !== subtaskId) return t;
        let newTarget = t.targetSessions + increment;
        if (newTarget < t.completedSessions) newTarget = t.completedSessions;
        if (newTarget < 1) newTarget = 1;
        return { ...t, targetSessions: newTarget };
      })
    }));
  };

  const handleExport = () => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const dataToExport: AppData = { projects, appHistory: [...appHistory, { date: todayStr, duration: currentSessionDuration.current }], settings };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studybook_backup_${Date.now()}.json`;
    link.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as AppData;
        if (json.projects) setProjects(json.projects);
        if (json.appHistory) setAppHistory(json.appHistory);
        if (json.settings) setSettings(json.settings);
      } catch (err) { alert('Failed to parse JSON file.'); }
    };
    reader.readAsText(file);
  };

  const activeColor = timerMode === TimerMode.POMODORO ? settings.colors.pomodoro : (timerMode === TimerMode.SHORT_BREAK ? settings.colors.shortBreak : settings.colors.longBreak);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectStats = selectedProject ? calculateProjectStats(selectedProject.subtasks) : null;
  const activeSubtask = selectedProject?.subtasks.find(t => t.id === activeSubtaskId);
  const totalDuration = timerMode === TimerMode.POMODORO ? settings.durations.pomodoro * 60 : (timerMode === TimerMode.SHORT_BREAK ? settings.durations.shortBreak * 60 : settings.durations.longBreak * 60);
  const progressPercentage = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  const projectBarSegments = useMemo(() => {
    if (!selectedProject) return [];
    const segments: string[] = [];
    selectedProject.subtasks.forEach(task => {
      const isTaskActive = task.id === activeSubtaskId;
      for (let i = 0; i < task.targetSessions; i++) {
        if (i < task.completedSessions) segments.push('bg-teal-800'); 
        else if (isTaskActive) segments.push('bg-yellow-400'); 
        else segments.push('bg-red-900'); 
      }
    });
    return segments;
  }, [selectedProject, activeSubtaskId]);

  return (
    <div className="min-h-screen transition-colors duration-500 ease-in-out font-sans flex flex-col md:flex-row text-white overflow-hidden relative" style={{ backgroundColor: activeColor }}>
      
      {selectedProject && (
        <div className="fixed right-0 top-0 bottom-0 w-3 flex flex-col z-40 bg-black/10">
          {projectBarSegments.map((colorClass, idx) => (
            <div key={idx} className={`w-full flex-1 transition-all duration-300 ${colorClass} border-b border-white/5`} />
          ))}
        </div>
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-80 bg-black/20 backdrop-blur-md border-r border-white/10 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-bold flex items-center gap-2 select-none"><Book className="w-6 h-6" /> Studybook</h1>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden"><Menu className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/30">
            {projects.map(project => {
              const stats = calculateProjectStats(project.subtasks);
              return (
                <div key={project.id} onClick={() => { setSelectedProjectId(project.id); setIsPerformanceViewOpen(false); setIsCalendarViewOpen(false); }} className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedProjectId === project.id ? 'bg-white/20 border-white/40 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold truncate pr-2">{project.name}</h3>
                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete project?")) setProjects(projects.filter(p => p.id !== project.id)); }} className="text-white/50 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-white h-1.5 rounded-full transition-all duration-500" style={{ width: `${stats.totalSessions > 0 ? (stats.completedSessions / stats.totalSessions) * 100 : 0}%` }} />
                  </div>
                </div>
              );
            })}
            <button onClick={() => setIsAddProjectModalOpen(true)} className="w-full py-4 border-2 border-dashed border-white/20 rounded-lg hover:bg-white/10 hover:border-white/40 flex items-center justify-center gap-2 transition-all font-medium text-white/80"><Plus className="w-5 h-5" /> Add Project</button>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
             <button onClick={() => setIsSettingsModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm"><Settings className="w-4 h-4" /> Settings</button>
             <button onClick={() => { setIsPerformanceViewOpen(true); setIsCalendarViewOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded transition-colors text-sm ${isPerformanceViewOpen ? 'bg-white/30' : 'hover:bg-white/10'}`}><BarChart3 className="w-4 h-4" /> Performance</button>
             <button onClick={() => { setIsCalendarViewOpen(true); setIsPerformanceViewOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2 rounded transition-colors text-sm ${isCalendarViewOpen ? 'bg-white/30' : 'hover:bg-white/10'}`}><CalendarIcon className="w-4 h-4" /> Calendar</button>
             <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm"><Download className="w-4 h-4" /> Export Data</button>
             <label className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm cursor-pointer"><Upload className="w-4 h-4" /> Import Data<input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" /></label>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-transparent pr-4">
        <div className="md:hidden p-4 absolute top-0 left-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/20 rounded-md backdrop-blur-sm"><Menu className="w-6 h-6" /></button>
        </div>

        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col items-center">
          
          {isPerformanceViewOpen ? (
            <div className="w-full max-w-5xl animate-fade-in-up mt-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3"><BarChart3 className="w-8 h-8" /> Performance Analytics</h2>
                <button onClick={() => setIsPerformanceViewOpen(false)} className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Timer</button>
              </div>
              <PerformanceGraph data={appHistory} isMainView={true} />
            </div>
          ) : isCalendarViewOpen ? (
            <div className="w-full max-w-5xl animate-fade-in-up mt-8 bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3"><CalendarIcon className="w-8 h-8" /> Calendar & Timelines</h2>
                <button onClick={() => setIsCalendarViewOpen(false)} className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to Timer</button>
              </div>
              <CalendarView history={appHistory} projects={projects} settings={settings} />
            </div>
          ) : (
            <>
              <div className="text-center mb-8 animate-fade-in mt-12 md:mt-0 w-full max-w-md">
                <h2 className="text-3xl font-bold mb-2">Welcome Back, Furkan</h2>
                <p className="text-white/80 text-lg opacity-90 mb-4">{getIstanbulDate()}</p>
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                  <div className="h-full bg-white transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-[480px] shadow-2xl mb-8 transform transition-all duration-300">
                <div className="flex justify-center gap-2 mb-8 bg-black/20 p-1 rounded-full self-center mx-auto w-fit">
                   {[TimerMode.POMODORO, TimerMode.SHORT_BREAK, TimerMode.LONG_BREAK].map(mode => (
                     <button key={mode} onClick={() => { setIsActive(false); setTimerMode(mode); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${timerMode === mode ? 'bg-white/20 font-bold shadow-sm' : 'hover:bg-white/10 text-white/70'}`}>{mode === TimerMode.POMODORO ? 'Pomodoro' : mode === TimerMode.SHORT_BREAK ? 'Short Break' : 'Long Break'}</button>
                   ))}
                </div>
                <div className="text-9xl font-bold text-center font-mono tracking-tight mb-8 drop-shadow-lg select-none">{formatTime(timeLeft)}</div>
                <div className="flex items-center justify-center gap-6">
                   <button onClick={resetTimer} className="p-4 bg-white/20 rounded-2xl hover:bg-white/30 transition-all active:scale-95 group" title="Reset Timer">
                      <RotateCcw className="w-8 h-8 group-hover:rotate-[-45deg] transition-transform" />
                   </button>
                   <button onClick={toggleTimer} className="h-16 px-10 bg-white rounded-2xl text-2xl font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-lg" style={{ color: activeColor }}>
                     {isActive ? 'Pause' : 'Start'}
                   </button>
                   <button onClick={skipTimer} className="p-4 bg-white/20 rounded-2xl hover:bg-white/30 transition-all active:scale-95" title="Skip Session">
                      <SkipForward className="w-8 h-8" />
                   </button>
                </div>
              </div>

              <div className="mb-8 text-center h-8">
                {activeSubtask ? <div className="text-lg font-medium opacity-90">Working on: <span className="font-bold underline decoration-2 underline-offset-4">{activeSubtask.name}</span></div> : <div className="text-white/60 italic">No task selected</div>}
              </div>

              {selectedProject && selectedProjectStats && (
                <div className="w-full max-w-[480px] animate-fade-in-up">
                  <div className="flex justify-between items-end mb-4 border-b border-white/30 pb-2">
                     <div>
                       <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                       <div className="text-sm opacity-80 mt-1">Time Spent: {selectedProjectStats.timeSpent} <span className="mx-2">|</span> Est. Remaining: {selectedProjectStats.timeRemaining}</div>
                     </div>
                     <div className="text-right"><div className="text-3xl font-mono">{selectedProjectStats.completedSessions} <span className="text-base opacity-60">/ {selectedProjectStats.totalSessions}</span></div></div>
                  </div>
                  <div className="space-y-3">
                    {selectedProject.subtasks.map(task => (
                      <div key={task.id} onClick={() => setActiveSubtaskId(task.id)} className={`relative p-4 rounded-xl border-l-8 cursor-pointer transition-all hover:brightness-110 ${task.completedSessions >= task.targetSessions ? 'bg-emerald-500/20 border-emerald-400' : 'bg-rose-500/10 border-rose-300' } ${activeSubtaskId === task.id ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent transform scale-[1.02] shadow-xl' : ''}`}>
                         <div className="flex justify-between items-center">
                            <span className={`font-medium text-lg ${task.completedSessions >= task.targetSessions ? 'line-through text-white/50 italic' : 'text-white'}`}>{task.name}</span>
                            <div className="flex items-center gap-4">
                               <div className="font-mono text-lg font-bold">{task.completedSessions} <span className="opacity-50 text-sm">/ {task.targetSessions}</span></div>
                               <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                                 <button onClick={(e) => { e.stopPropagation(); updateSessionTarget(selectedProject.id, task.id, -1); }} className="p-1 hover:bg-white/20 rounded transition-colors" disabled={task.targetSessions <= task.completedSessions || task.targetSessions <= 1}><Minus className="w-4 h-4" /></button>
                                 <button onClick={(e) => { e.stopPropagation(); updateSessionTarget(selectedProject.id, task.id, 1); }} className="p-1 hover:bg-white/20 rounded transition-colors"><Plus className="w-4 h-4" /></button>
                               </div>
                               <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete subtask?")) setProjects(prev => prev.map(p => p.id !== selectedProject.id ? p : { ...p, subtasks: p.subtasks.filter(t => t.id !== task.id) })); }} className="p-1 hover:bg-white/20 text-white/70"><Trash2 className="w-5 h-5" /></button>
                            </div>
                         </div>
                         {activeSubtaskId === task.id && <div className="absolute -right-2 -top-2 bg-white text-gray-900 rounded-full p-1 shadow-sm"><Target className="w-4 h-4" /></div>}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setIsAddSubtaskModalOpen(true)} className="w-full py-3 mt-4 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/10 text-white/70 flex items-center justify-center gap-2 transition-colors font-medium"><Plus className="w-5 h-5" /> Add Subtask</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AppSessionTimer onUpdate={handleAppTimerUpdate} />

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Settings">
        <div className="space-y-6 text-gray-800">
           <div>
             <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-3">Timer (minutes)</h3>
             <div className="grid grid-cols-3 gap-4">
               {Object.keys(settings.durations).map((key) => (
                 <div key={key}>
                   <label className="block text-sm text-gray-500 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                   <input type="number" value={settings.durations[key as keyof typeof settings.durations]} onChange={(e) => setSettings({...settings, durations: {...settings.durations, [key]: parseInt(e.target.value) || 1}})} className="w-full bg-gray-100 border-none rounded px-3 py-2 text-gray-800" />
                 </div>
               ))}
             </div>
           </div>
           <div>
             <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-3">Targeting</h3>
             <div className="grid grid-cols-1 gap-4">
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Daily Pomodoro Target</label>
                 <input type="number" min="1" value={settings.dailyPomodoroTarget} onChange={(e) => setSettings({...settings, dailyPomodoroTarget: parseInt(e.target.value) || 1})} className="w-full bg-gray-100 border-none rounded px-3 py-2 text-gray-800" />
                 <p className="text-[10px] text-gray-400 mt-1 italic">Used for estimating project spans on the calendar.</p>
               </div>
             </div>
           </div>
           <div>
             <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-3">Theme Colors</h3>
             <div className="grid grid-cols-3 gap-4">
               {Object.keys(settings.colors).map((key) => (
                 <div key={key}>
                   <label className="block text-sm text-gray-500 mb-1 capitalize">{key}</label>
                   <input type="color" value={settings.colors[key as keyof typeof settings.colors]} onChange={(e) => setSettings({...settings, colors: {...settings.colors, [key]: e.target.value}})} className="w-full h-10 rounded cursor-pointer border border-gray-200 p-1" />
                 </div>
               ))}
             </div>
           </div>
           <div className="flex justify-end pt-4 border-t"><Button onClick={() => setIsSettingsModalOpen(false)}>OK</Button></div>
        </div>
      </Modal>

      <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="New Project">
        <div className="space-y-4 text-gray-800">
           <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project Name" className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none" />
           <div className="space-y-2 max-h-40 overflow-y-auto">
             {newSubtasks.map((st, idx) => (
               <div key={idx} className="flex gap-2">
                 <input type="text" value={st.name} onChange={(e) => { const copy = [...newSubtasks]; copy[idx].name = e.target.value; setNewSubtasks(copy); }} placeholder="Subtask" className="flex-1 border rounded px-2 py-1 text-sm" />
                 <input type="number" value={st.target} onChange={(e) => { const copy = [...newSubtasks]; copy[idx].target = parseInt(e.target.value) || 1; setNewSubtasks(copy); }} className="w-12 border rounded px-1 text-sm text-center" />
               </div>
             ))}
           </div>
           <button onClick={() => setNewSubtasks([...newSubtasks, {name: '', target: 1}])} className="text-rose-500 text-sm font-medium">+ Add Subtask</button>
           <div className="flex justify-end pt-4"><Button onClick={handleAddProject}>Save</Button></div>
        </div>
      </Modal>

      <Modal isOpen={isAddSubtaskModalOpen} onClose={() => setIsAddSubtaskModalOpen(false)} title="Add Subtask">
        <div className="space-y-4 text-gray-800">
           <input type="text" value={subtaskToAddName} onChange={(e) => setSubtaskToAddName(e.target.value)} placeholder="Subtask Name" className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none" />
           <input type="number" min="1" value={subtaskToAddTarget} onChange={(e) => setSubtaskToAddTarget(parseInt(e.target.value) || 1)} className="w-full border rounded px-3 py-2" />
           <div className="flex justify-end pt-4"><Button onClick={handleAddSubtask}>Add</Button></div>
        </div>
      </Modal>
    </div>
  );
};

export default App;