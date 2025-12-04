import React, { useState, useEffect, useRef } from 'react';
import { AppData, Project, TimerMode, AppSessionLog } from './types';
import { getIstanbulDate, generateId, calculateProjectStats, formatTime } from './utils';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { AppSessionTimer } from './components/AppSessionTimer';
import { Trash2, Plus, Play, Pause, SkipForward, Menu, Download, Upload, Clock, CheckCircle, MoreVertical, Settings, Target } from 'lucide-react';

// --- Constants ---
const POMODORO_TIME = 25 * 60;
const SHORT_BREAK_TIME = 5 * 60;
const LONG_BREAK_TIME = 15 * 60;

// --- Main Component ---
const App: React.FC = () => {
  // --- Global State ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [appHistory, setAppHistory] = useState<AppSessionLog[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);

  // --- Timer State ---
  const [timerMode, setTimerMode] = useState<TimerMode>(TimerMode.POMODORO);
  const [timeLeft, setTimeLeft] = useState(POMODORO_TIME);
  const [isActive, setIsActive] = useState(false);
  const [pomoCount, setPomoCount] = useState(0); 
  
  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  
  // Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newSubtasks, setNewSubtasks] = useState<{name: string, target: number}[]>([{name: '', target: 1}]);
  
  // --- App Session Tracker ---
  const currentSessionDuration = useRef<string>("00:00:00");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    // Simple beep sound
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  }, []);

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
    // Correctly typing interval for browser environment to avoid "Cannot find namespace 'NodeJS'" error
    let interval: ReturnType<typeof setInterval>;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
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
      if (nextPomoCount % 4 === 0) {
        setTimerMode(TimerMode.LONG_BREAK);
        setTimeLeft(LONG_BREAK_TIME);
        sendNotification("Time for a break!", "Great job! Take a long 15 minute rest.");
      } else {
        setTimerMode(TimerMode.SHORT_BREAK);
        setTimeLeft(SHORT_BREAK_TIME);
        sendNotification("Time for a break!", "Take 5 minutes to stretch.");
      }
    } else {
      // Break is over
      setTimerMode(TimerMode.POMODORO);
      setTimeLeft(POMODORO_TIME);
      sendNotification("Time to focus!", "Break is over. Let's get back to work.");
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

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this project?")) {
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProjectId === id) setSelectedProjectId(null);
    }
  };

  const updateSessionTarget = (projectId: string, subtaskId: string, increment: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        subtasks: p.subtasks.map(t => {
          if (t.id !== subtaskId) return t;
          const newTarget = Math.max(0, t.targetSessions + increment);
          return { ...t, targetSessions: newTarget };
        })
      };
    }));
  };

  // --- Import / Export ---
  const handleExport = () => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '');
    const currentSessionLog: AppSessionLog = {
      date: todayStr,
      duration: currentSessionDuration.current
    };

    const dataToExport: AppData = {
      projects,
      appHistory: [...appHistory, currentSessionLog]
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
        if (json.projects) setProjects(json.projects);
        if (json.appHistory) setAppHistory(json.appHistory);
        alert('Data imported successfully!');
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // --- Styling Helpers ---
  const getThemeColors = () => {
    switch (timerMode) {
      case TimerMode.POMODORO:
        return 'bg-rose-500';
      case TimerMode.SHORT_BREAK:
        return 'bg-teal-500'; // Turquoise-ish
      case TimerMode.LONG_BREAK:
        return 'bg-blue-500';
      default:
        return 'bg-rose-500';
    }
  };
  
  const getButtonTextClass = () => {
     switch(timerMode) {
      case TimerMode.POMODORO: return 'text-rose-500';
      case TimerMode.SHORT_BREAK: return 'text-teal-500';
      case TimerMode.LONG_BREAK: return 'text-blue-500';
      default: return 'text-rose-500';
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedProjectStats = selectedProject ? calculateProjectStats(selectedProject.subtasks) : null;
  const activeSubtask = selectedProject?.subtasks.find(t => t.id === activeSubtaskId);

  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out ${getThemeColors()} font-sans flex flex-col md:flex-row text-white overflow-hidden`}>
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-80 bg-black/20 backdrop-blur-md border-r border-white/10 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-bold flex items-center gap-2 select-none">
                <CheckCircle className="w-6 h-6" /> Pomofocus
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
          <div className="text-center mb-8 animate-fade-in mt-12 md:mt-0">
            <h2 className="text-3xl font-bold mb-2">Welcome Back, Furkan</h2>
            <p className="text-white/80 text-lg opacity-90">{getIstanbulDate()}</p>
          </div>

          {/* Timer Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 w-full max-w-[480px] shadow-2xl mb-8 transform transition-all duration-300">
            <div className="flex justify-center gap-2 mb-8 bg-black/20 p-1 rounded-full self-center mx-auto w-fit">
               {[TimerMode.POMODORO, TimerMode.SHORT_BREAK, TimerMode.LONG_BREAK].map(mode => (
                 <button
                   key={mode}
                   onClick={() => { setIsActive(false); setTimerMode(mode); setTimeLeft(mode === TimerMode.POMODORO ? POMODORO_TIME : mode === TimerMode.SHORT_BREAK ? SHORT_BREAK_TIME : LONG_BREAK_TIME); }}
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
                  className={`h-16 px-8 bg-white rounded-2xl text-2xl font-bold uppercase tracking-widest transition-transform active:scale-95 shadow-lg ${getButtonTextClass()}`}
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
                        relative p-4 rounded-xl border-l-8 cursor-pointer transition-all hover:bg-white/5
                        ${isCompleted ? 'bg-emerald-500/20 border-emerald-400' : 'bg-white/10 border-rose-300'}
                        ${isActiveTask ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent transform scale-[1.02]' : ''}
                      `}
                    >
                       <div className="flex justify-between items-center">
                          <div className="flex-1">
                             <span className={`font-medium text-lg ${isCompleted ? 'line-through opacity-70' : ''}`}>
                               {task.name}
                             </span>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="font-mono text-lg font-bold">
                               {task.completedSessions} <span className="opacity-50 text-sm">/ {task.targetSessions}</span>
                             </div>
                             <button 
                               onClick={(e) => { e.stopPropagation(); updateSessionTarget(selectedProject.id, task.id, 1); }}
                               className="p-1 hover:bg-white/20 rounded transition-colors"
                               title="Add Session"
                             >
                               <Plus className="w-5 h-5" />
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
            </div>
          )}
        </div>
      </div>

      {/* Global App Timer */}
      <AppSessionTimer onUpdate={(time) => currentSessionDuration.current = time} />

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
             <Button onClick={handleAddProject} className="bg-gray-800 text-white hover:bg-gray-900">Save Project</Button>
           </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;