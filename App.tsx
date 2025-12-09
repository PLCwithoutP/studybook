
import React, { useState, useEffect, useRef } from 'react';
import { AppData, Project, TimerMode, AppSessionLog, AppSettings } from './types';
import { getIstanbulDate, generateId, calculateProjectStats, formatTime, hexToRgba } from './utils';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { AppSessionTimer } from './components/AppSessionTimer';
import { PerformanceGraph } from './components/PerformanceGraph';
import { Trash2, Plus, Minus, SkipForward, Menu, Download, Upload, CheckCircle, Settings, Target, BarChart3 } from 'lucide-react';

// --- Default Constants ---
const DEFAULT_SETTINGS: AppSettings = {
  durations: {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15
  },
  colors: {
    pomodoro: '#f43f5e', // rose-500
    shortBreak: '#14b8a6', // teal-500
    longBreak: '#3b82f6'  // blue-500
  },
  autoStartBreaks: false,
  autoStartPomodoros: false
};

// --- Main Component ---
const App: React.FC = () => {
  // --- Global State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [appHistory, setAppHistory] = useState<AppSessionLog[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  
  // --- Settings State ---
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // --- Timer State ---
  const [timerMode, setTimerMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.durations.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [pomoCount, setPomoCount] = useState(0); 
  
  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  
  // Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<{name: string, target: number}[]>([{name: '', target: 1}]);
  
  // Add Subtask Form State
  const [subtaskToAddName, setSubtaskToAddName] = useState('');
  const [subtaskToAddTarget, setSubtaskToAddTarget] = useState(1);
  
  // --- App Session Tracker ---
  const currentSessionDuration = useRef<string>("00:00:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    // Simple beep sound
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }, []);

  // Update timeLeft when settings duration changes (and timer is not active)
  useEffect(() => {
    if (!isActive) {
      if (timerMode === TimerMode.POMODORO) setTimeLeft(settings.durations.pomodoro * 60);
      else if (timerMode === TimerMode.SHORT_BREAK) setTimeLeft(settings.durations.shortBreak * 60);
      else if (timerMode === TimerMode.LONG_BREAK) setTimeLeft(settings.durations.longBreak * 60);
    }
  }, [settings.durations, timerMode, isActive]);

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
  };

  // --- Timer Logic ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, timeLeft]);

  // Update document title with timer
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ${timerMode === TimerMode.POMODORO ? 'Focus' : 'Break'}`;
  }, [timeLeft, timerMode]);

  const handleTimerComplete = () => {
    setIsActive(false);

    if (timerMode === TimerMode.POMODORO) {
      const nextPomoCount = pomoCount + 1;
      setPomoCount(nextPomoCount);

      // Update active subtask if one exists
      if (activeSubtaskId && selectedProjectId) {
         updateSubtaskProgress(selectedProjectId, activeSubtaskId);
      }

      // Determine next break
      let nextMode = TimerMode.SHORT_BREAK;
      let nextTime = settings.durations.shortBreak * 60;
      let title = "Time for a break!";
      let body = "Take 5 minutes to stretch.";

      if (nextPomoCount % 4 === 0) {
        nextMode = TimerMode.LONG_BREAK;
        nextTime = settings.durations.longBreak * 60;
        body = "Great job! Take a long 15 minute rest.";
      }

      setTimerMode(nextMode);
      setTimeLeft(nextTime);
      sendNotification(title, body);

      if (settings.autoStartBreaks) {
        setIsActive(true);
      }

    } else {
      // Break is over
      setTimerMode(TimerMode.POMODORO);
      setTimeLeft(settings.durations.pomodoro * 60);
      sendNotification("Time to focus!", "Break is over. Let's get back to work.");

      if (settings.autoStartPomodoros) {
        setIsActive(true);
      }
    }
  };

  const updateSubtaskProgress = (projectId: string, subtaskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        subtasks: p.subtasks.map(t => {
          if (t.id !== subtaskId) return t;
          return { ...t, completedSessions: t.completedSessions + 1 };
        })
      };
    }));
  };

  const toggleTimer = () => {
    requestNotificationPermission();
    setIsActive(!isActive);
  };

  const skipTimer = () => {
    setIsActive(false);
    handleTimerComplete();
  };

  // --- Project Management ---
  const handleAddProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: generateId(),
      name: newProjectName,
      createdAt: new Date().toISOString(),
      subtasks: newSubtasks
        .filter(st => st.name.trim() !== '')
        .map(st => ({
          id: generateId(),
          name: st.name,
          targetSessions: st.target,
          completedSessions: 0
        }))
    };

    setProjects([...projects, newProject]);
    setNewProjectName('');
    setNewSubtasks([{name: '', target: 1}]);
    setIsAddProjectModalOpen(false);
  };

  const handleAddSubtask = () => {
    if (!selectedProjectId || !subtaskToAddName.trim()) return;

    const newSubtask = {
      id: generateId(),
      name: subtaskToAddName,
      targetSessions: subtaskToAddTarget,
      completedSessions: 0
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        subtasks: [...p.subtasks, newSubtask]
      };
    }));

    setSubtaskToAddName('');
    setSubtaskToAddTarget(1);
    setIsAddSubtaskModalOpen(false);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProjectId === id) setSelectedProjectId(null);
    }
  };

  const deleteSubtask = (projectId: string, subtaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this subtask?")) {
      setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          subtasks: p.subtasks.filter(t => t.id !== subtaskId)
        };
      }));
      
      if (activeSubtaskId === subtaskId) {
        setActiveSubtaskId(null);
      }
    }
  };

  const updateSessionTarget = (projectId: string, subtaskId: string, increment: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        subtasks: p.subtasks.map(t => {
          if (t.id !== subtaskId) return t;
          
          let newTarget = t.targetSessions + increment;
          // Ensure target doesn't drop below completed sessions
          if (newTarget < t.completedSessions) newTarget = t.completedSessions;
          // Ensure target is at least 1 (unless it's 0 completed, but usually we want at least 1)
          if (newTarget < 1) newTarget = 1;
          
          return { ...t, targetSessions: newTarget };
        })
      };
    }));
  };

  // --- Import / Export ---
  const handleExport = () => {
    // Format: 04 December 2025
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const currentSessionLog: AppSessionLog = {
      date: todayStr,
      duration: currentSessionDuration.current
    };

    const dataToExport: AppData = {
      projects,
      appHistory: [...appHistory, currentSessionLog],
      settings
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pomodoro_backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as AppData;
        
        if (json.projects) {
          setProjects(json.projects);
          if (selectedProjectId && !json.projects.find(p => p.id === selectedProjectId)) {
            setSelectedProjectId(null);
            setActiveSubtaskId(null);
          }
        }
        
        if (json.appHistory) setAppHistory(json.appHistory);
        if (json.settings) setSettings(json.settings);
        
        console.log("Data imported successfully");
      } catch (err) {
        alert('Failed to parse JSON file.');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  // Helper to safely get the active theme color
  const getThemeColor = (mode: TimerMode) => {
    switch (mode) {
      case TimerMode.SHORT_BREAK: return settings.colors.shortBreak;
      case TimerMode.LONG_BREAK: return settings.colors.longBreak;
      case TimerMode.POMODORO:
      default: return settings.colors.pomodoro;
    }
  };

  const activeColor = getThemeColor(timerMode);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectStats = selectedProject ? calculateProjectStats(selectedProject.subtasks) : null;
  const activeSubtask = selectedProject?.subtasks.find(t => t.id === activeSubtaskId);

  // Calculate Progress for the visual bar
  const getTotalDurationForMode = () => {
    switch (timerMode) {
      case TimerMode.SHORT_BREAK: return settings.durations.shortBreak * 60;
      case TimerMode.LONG_BREAK: return settings.durations.longBreak * 60;
      case TimerMode.POMODORO:
      default: return settings.durations.pomodoro * 60;
    }
  };
  
  const totalDuration = getTotalDurationForMode();
  const progressPercentage = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  return (
    <div 
      className="min-h-screen transition-colors duration-500 ease-in-out font-sans flex flex-col md:flex-row text-white overflow-hidden"
      style={{ backgroundColor: activeColor }}
    >
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-80 bg-black/20 backdrop-blur-md border-r border-white/10 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-bold flex items-center gap-2 select-none">
                <CheckCircle className="w-6 h-6" /> Studybook
             </h1>
             <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
               <Menu className="w-6 h-6" />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/30">
            {projects.map(project => {
              const stats = calculateProjectStats(project.subtasks);
              return (
                <div 
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`
                    p-4 rounded-lg cursor-pointer transition-all border
                    ${selectedProjectId === project.id ? 'bg-white/20 border-white/40 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold truncate pr-2">{project.name}</h3>
                    <button onClick={(e) => deleteProject(project.id, e)} className="text-white/50 hover:text-white p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-white/80 font-mono mb-2 flex justify-between">
                     <span>{formatTime(stats.completedSessions * 25 * 60)}</span>
                     <span>Total: {formatTime(stats.totalSessions * 25 * 60)}</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-white h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${stats.totalSessions > 0 ? (stats.completedSessions / stats.totalSessions) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <button 
              onClick={() => setIsAddProjectModalOpen(true)}
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-lg hover:bg-white/10 hover:border-white/40 flex items-center justify-center gap-2 transition-all font-medium text-white/80"
            >
              <Plus className="w-5 h-5" /> Add Project
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
             <button onClick={() => setIsSettingsModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm">
                <Settings className="w-4 h-4" /> Settings
             </button>
             <button onClick={() => setIsPerformanceModalOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm">
                <BarChart3 className="w-4 h-4" /> Performance
             </button>
             <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm">
                <Download className="w-4 h-4" /> Export Data
             </button>
             <label className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-white/10 transition-colors text-sm cursor-pointer">
                <Upload className="w-4 h-4" /> Import Data
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
             </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-transparent">
        {/* Mobile Header Toggle */}
        <div className="md:hidden p-4 absolute top-0 left-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/20 rounded-md backdrop-blur-sm">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col items-center">
          
          {/* Header Info */}
          <div className="text-center mb-8 animate-fade-in mt-12 md:mt-0 w-full max-w-md">
            <h2 className="text-3xl font-bold mb-2">Welcome Back, Furkan</h2>
            <p className="text-white/80 text-lg opacity-90 mb-4">{getIstanbulDate()}</p>
            
            {/* Session Progress Bar */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-white transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Timer Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-[480px] shadow-2xl mb-8 transform transition-all duration-300">
            <div className="flex justify-center gap-2 mb-8 bg-black/20 p-1 rounded-full self-center mx-auto w-fit">
               {[TimerMode.POMODORO, TimerMode.SHORT_BREAK, TimerMode.LONG_BREAK].map(mode => (
                 <button
                   key={mode}
                   onClick={() => { 
                     setIsActive(false); 
                     setTimerMode(mode); 
                     if (mode === TimerMode.POMODORO) setTimeLeft(settings.durations.pomodoro * 60);
                     else if (mode === TimerMode.SHORT_BREAK) setTimeLeft(settings.durations.shortBreak * 60);
                     else setTimeLeft(settings.durations.longBreak * 60);
                   }}
                   className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${timerMode === mode ? 'bg-white/20 font-bold shadow-sm' : 'hover:bg-white/10 text-white/70'}`}
                 >
                   {mode === TimerMode.POMODORO ? 'Pomodoro' : mode === TimerMode.SHORT_BREAK ? 'Short Break' : 'Long Break'}
                 </button>
               ))}
            </div>

            <div className="text-9xl font-bold text-center font-mono tracking-tight mb-8 drop-shadow-lg select-none">
              {formatTime(timeLeft)}
            </div>

            <div className="flex items-center justify-center gap-6">
               <button 
                  onClick={toggleTimer}
                  className="h-16 px-8 bg-white rounded-2xl text-2xl font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-lg"
                  style={{ color: activeColor }}
               >
                 {isActive ? 'Pause' : 'Start'}
               </button>
               
               {isActive && (
                 <button onClick={skipTimer} className="p-4 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors">
                   <SkipForward className="w-8 h-8" />
                 </button>
               )}
            </div>
          </div>

          {/* Current Task Indicator */}
          <div className="mb-8 text-center h-8">
             {activeSubtask ? (
               <div className="text-lg font-medium opacity-90">
                 Working on: <span className="font-bold underline decoration-2 underline-offset-4">{activeSubtask.name}</span>
               </div>
             ) : (
               <div className="text-white/60 italic">No task selected</div>
             )}
          </div>

          {/* Selected Project Details */}
          {selectedProject && selectedProjectStats && (
            <div className="w-full max-w-[480px] animate-fade-in-up">
              <div className="flex justify-between items-end mb-4 border-b border-white/30 pb-2">
                 <div>
                   <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                   <div className="text-sm opacity-80 mt-1">
                      Time Spent: {selectedProjectStats.timeSpent} <span className="mx-2">|</span> 
                      Est. Remaining: {selectedProjectStats.timeRemaining}
                   </div>
                 </div>
                 <div className="text-right">
                    <div className="text-3xl font-mono">{selectedProjectStats.completedSessions} <span className="text-base opacity-60">/ {selectedProjectStats.totalSessions}</span></div>
                 </div>
              </div>

              <div className="space-y-3">
                {selectedProject.subtasks.map(task => {
                  const isCompleted = task.completedSessions >= task.targetSessions;
                  const isActiveTask = activeSubtaskId === task.id;
                  
                  return (
                    <div 
                      key={task.id}
                      onClick={() => setActiveSubtaskId(task.id)}
                      className={`
                        relative p-4 rounded-xl border-l-8 cursor-pointer transition-all hover:brightness-110
                        ${isCompleted 
                          ? 'bg-emerald-500/20 border-emerald-400' 
                          : 'bg-rose-500/10 border-rose-300' 
                        }
                        ${isActiveTask ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent transform scale-[1.02] shadow-xl' : ''}
                      `}
                    >
                       <div className="flex justify-between items-center">
                          <div className="flex-1">
                             <span className={`font-medium text-lg ${isCompleted ? 'line-through text-white/50 italic' : 'text-white'}`}>
                               {task.name}
                             </span>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="font-mono text-lg font-bold">
                               {task.completedSessions} <span className="opacity-50 text-sm">/ {task.targetSessions}</span>
                             </div>
                             
                             <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); updateSessionTarget(selectedProject.id, task.id, -1); }}
                                 className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white disabled:opacity-30"
                                 title="Remove Session"
                                 disabled={task.targetSessions <= task.completedSessions || task.targetSessions <= 1}
                               >
                                 <Minus className="w-4 h-4" />
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); updateSessionTarget(selectedProject.id, task.id, 1); }}
                                 className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white"
                                 title="Add Session"
                               >
                                 <Plus className="w-4 h-4" />
                               </button>
                             </div>

                             <button
                               onClick={(e) => deleteSubtask(selectedProject.id, task.id, e)}
                               className="p-1 hover:bg-white/20 hover:text-red-300 rounded transition-colors text-white/70"
                               title="Delete Subtask"
                             >
                               <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                       </div>
                       
                       {isActiveTask && (
                         <div className="absolute -right-2 -top-2 bg-white text-gray-900 rounded-full p-1 shadow-sm">
                           <Target className="w-4 h-4" />
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>

              {/* Add Subtask Button */}
              <button
                onClick={() => setIsAddSubtaskModalOpen(true)}
                className="w-full py-3 mt-4 border-2 border-dashed border-white/20 rounded-xl hover:bg-white/10 text-white/70 flex items-center justify-center gap-2 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" /> Add Subtask
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global App Timer */}
      <AppSessionTimer onUpdate={(time) => currentSessionDuration.current = time} />

      {/* Settings Modal */}
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Settings">
        <div className="space-y-6 text-gray-800">
           
           {/* Timer Settings */}
           <div>
             <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-3">Timer (minutes)</h3>
             <div className="grid grid-cols-3 gap-4">
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Pomodoro</label>
                 <input 
                   type="number" 
                   value={settings.durations.pomodoro}
                   onChange={(e) => setSettings({...settings, durations: {...settings.durations, pomodoro: parseInt(e.target.value) || 25}})}
                   className="w-full bg-gray-100 border-none rounded px-3 py-2 text-gray-800"
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Short Break</label>
                 <input 
                   type="number" 
                   value={settings.durations.shortBreak}
                   onChange={(e) => setSettings({...settings, durations: {...settings.durations, shortBreak: parseInt(e.target.value) || 5}})}
                   className="w-full bg-gray-100 border-none rounded px-3 py-2 text-gray-800"
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Long Break</label>
                 <input 
                   type="number" 
                   value={settings.durations.longBreak}
                   onChange={(e) => setSettings({...settings, durations: {...settings.durations, longBreak: parseInt(e.target.value) || 15}})}
                   className="w-full bg-gray-100 border-none rounded px-3 py-2 text-gray-800"
                 />
               </div>
             </div>
           </div>

           {/* Theme Settings */}
           <div>
             <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-3">Theme Colors</h3>
             <div className="grid grid-cols-3 gap-4">
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Pomodoro</label>
                 <input 
                   type="color" 
                   value={settings.colors.pomodoro}
                   onChange={(e) => setSettings({...settings, colors: {...settings.colors, pomodoro: e.target.value}})}
                   className="w-full h-10 rounded cursor-pointer border border-gray-200 p-1"
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Short Break</label>
                 <input 
                   type="color" 
                   value={settings.colors.shortBreak}
                   onChange={(e) => setSettings({...settings, colors: {...settings.colors, shortBreak: e.target.value}})}
                   className="w-full h-10 rounded cursor-pointer border border-gray-200 p-1"
                 />
               </div>
               <div>
                 <label className="block text-sm text-gray-500 mb-1">Long Break</label>
                 <input 
                   type="color" 
                   value={settings.colors.longBreak}
                   onChange={(e) => setSettings({...settings, colors: {...settings.colors, longBreak: e.target.value}})}
                   className="w-full h-10 rounded cursor-pointer border border-gray-200 p-1"
                 />
               </div>
             </div>
           </div>

           {/* Toggles */}
           <div>
              <h3 className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-3">Preferences</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-gray-700">Auto-start Breaks</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.autoStartBreaks} onChange={(e) => setSettings({...settings, autoStartBreaks: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-gray-700">Auto-start Pomodoros</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.autoStartPomodoros} onChange={(e) => setSettings({...settings, autoStartPomodoros: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                 </div>
              </div>
           </div>

           <div className="flex justify-end pt-4 border-t">
             <Button onClick={() => setIsSettingsModalOpen(false)}>OK</Button>
           </div>
        </div>
      </Modal>

      {/* Add Project Modal */}
      <Modal isOpen={isAddProjectModalOpen} onClose={() => setIsAddProjectModalOpen(false)} title="Create New Project">
        <div className="space-y-4 text-gray-800">
           <div>
             <label className="block text-sm font-medium mb-1">Project Name</label>
             <input 
               type="text"
               value={newProjectName}
               onChange={(e) => setNewProjectName(e.target.value)}
               placeholder="e.g. Learn React"
               className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium mb-1">Subtasks</label>
             <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
               {newSubtasks.map((st, idx) => (
                 <div key={idx} className="flex gap-2">
                   <input 
                     type="text"
                     value={st.name}
                     onChange={(e) => {
                       const copy = [...newSubtasks];
                       copy[idx].name = e.target.value;
                       setNewSubtasks(copy);
                     }}
                     placeholder="Task name"
                     className="flex-1 border rounded px-3 py-2 text-sm"
                   />
                   <input 
                     type="number"
                     min="1"
                     value={st.target}
                     onChange={(e) => {
                       const copy = [...newSubtasks];
                       copy[idx].target = parseInt(e.target.value) || 1;
                       setNewSubtasks(copy);
                     }}
                     className="w-16 border rounded px-2 py-2 text-sm text-center"
                   />
                   {newSubtasks.length > 1 && (
                     <button
                       onClick={() => {
                         setNewSubtasks(newSubtasks.filter((_, i) => i !== idx));
                       }}
                       className="p-2 text-gray-400 hover:text-red-500"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                 </div>
               ))}
             </div>
             <button 
               onClick={() => setNewSubtasks([...newSubtasks, {name: '', target: 1}])}
               className="text-sm text-rose-500 hover:text-rose-700 font-medium mt-2 flex items-center gap-1"
             >
               <Plus className="w-4 h-4" /> Add Subtask
             </button>
           </div>

           <div className="flex justify-end pt-4">
             <Button variant="secondary" onClick={() => setIsAddProjectModalOpen(false)} className="mr-2">Cancel</Button>
             <Button onClick={handleAddProject} className="bg-white text-black border border-gray-200 hover:bg-gray-50 shadow-sm">Save Project</Button>
           </div>
        </div>
      </Modal>

      {/* Add Subtask Modal */}
      <Modal isOpen={isAddSubtaskModalOpen} onClose={() => setIsAddSubtaskModalOpen(false)} title="Add Subtask">
        <div className="space-y-4 text-gray-800">
           <div>
             <label className="block text-sm font-medium mb-1">Subtask Name</label>
             <input 
               type="text"
               value={subtaskToAddName}
               onChange={(e) => setSubtaskToAddName(e.target.value)}
               placeholder="e.g. Review Documentation"
               className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium mb-1">Target Sessions</label>
             <input 
               type="number"
               min="1"
               value={subtaskToAddTarget}
               onChange={(e) => setSubtaskToAddTarget(parseInt(e.target.value) || 1)}
               className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-rose-500 focus:outline-none"
             />
           </div>

           <div className="flex justify-end pt-4">
             <Button variant="secondary" onClick={() => setIsAddSubtaskModalOpen(false)} className="mr-2">Cancel</Button>
             <Button onClick={handleAddSubtask} className="bg-white text-black border border-gray-200 hover:bg-gray-50 shadow-sm">Add Subtask</Button>
           </div>
        </div>
      </Modal>

      {/* Performance Graph Modal */}
      <Modal isOpen={isPerformanceModalOpen} onClose={() => setIsPerformanceModalOpen(false)} title="Performance History">
        <div className="text-gray-800">
          <p className="text-sm text-gray-500 mb-4">Daily app usage based on imported history.</p>
          <PerformanceGraph data={appHistory} />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setIsPerformanceModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;
