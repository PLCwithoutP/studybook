import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils';

interface AppSessionTimerProps {
  onUpdate: (duration: string) => void;
}

export const AppSessionTimer: React.FC<AppSessionTimerProps> = ({ onUpdate }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        const newSeconds = prev + 1;
        // Optimization: only update parent every minute or just rely on parent getting it when needed?
        // To be safe for export, we update parent ref or state periodically or on unmount,
        // but simple passing formatted string is fine for display.
        onUpdate(formatTime(newSeconds)); 
        return newSeconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onUpdate]);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg text-sm font-mono opacity-80 hover:opacity-100 transition-opacity z-40">
      App Time: {formatTime(seconds)}
    </div>
  );
};
