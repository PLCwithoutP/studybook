import React, { useState, useEffect, useRef } from 'react';
import { formatTime } from '../utils';

interface AppSessionTimerProps {
  onUpdate: (duration: string) => void;
}

export const AppSessionTimer: React.FC<AppSessionTimerProps> = ({ onUpdate }) => {
  const [seconds, setSeconds] = useState(0);
  // Store callback in ref to avoid re-triggering effect when callback identity changes
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        const newSeconds = prev + 1;
        onUpdateRef.current(formatTime(newSeconds)); 
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Run only once on mount

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-mono opacity-80 hover:opacity-100 transition-opacity z-40">
      App Time: {formatTime(seconds)}
    </div>
  );
};