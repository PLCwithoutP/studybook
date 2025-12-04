import React, { useMemo } from 'react';
import { AppSessionLog } from '../types';

interface PerformanceGraphProps {
  data: AppSessionLog[];
}

export const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Helper to parse duration string (hh:mm:ss or mm:ss) into minutes
    const parseDurationToMinutes = (dur: string): number => {
      const parts = dur.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 60 + parts[1] + parts[2] / 60;
      }
      if (parts.length === 2) {
        return parts[0] + parts[1] / 60;
      }
      return 0;
    };

    // Helper to parse custom date format "03Dec25"
    const parseDateStr = (dateStr: string): Date => {
      try {
        const day = parseInt(dateStr.slice(0, 2));
        const monthStr = dateStr.slice(2, 5);
        const year = 2000 + parseInt(dateStr.slice(5));
        const months: { [key: string]: number } = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };
        return new Date(year, months[monthStr] ?? 0, day);
      } catch (e) {
        return new Date(0); // Invalid date fallback
      }
    };

    // Aggregate data by date
    const aggregated: { [key: string]: number } = {};
    
    data.forEach(log => {
      const mins = parseDurationToMinutes(log.duration);
      if (aggregated[log.date]) {
        aggregated[log.date] += mins;
      } else {
        aggregated[log.date] = mins;
      }
    });

    // Convert to array and sort by date
    return Object.entries(aggregated)
      .map(([date, minutes]) => ({
        dateLabel: date,
        dateObj: parseDateStr(date),
        minutes: minutes
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        <p>No performance data available.</p>
        <p className="text-sm mt-2">Import a JSON file to see your history.</p>
      </div>
    );
  }

  const maxMinutes = Math.max(...chartData.map(d => d.minutes), 1);
  const chartHeight = 200;

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[300px] p-4">
        <div className="flex items-end justify-between gap-4 h-[200px] border-b border-gray-300 pb-2">
          {chartData.map((item, index) => {
            const height = (item.minutes / maxMinutes) * chartHeight;
            const hours = Math.floor(item.minutes / 60);
            const mins = Math.round(item.minutes % 60);
            const tooltip = `${hours}h ${mins}m`;

            return (
              <div key={index} className="flex flex-col items-center flex-1 group relative min-w-[40px]">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10 pointer-events-none">
                  {tooltip}
                </div>
                
                {/* Bar */}
                <div 
                  style={{ height: `${Math.max(height, 2)}px` }} 
                  className="w-full bg-rose-500 rounded-t-sm hover:bg-rose-600 transition-all opacity-80 hover:opacity-100"
                ></div>
              </div>
            );
          })}
        </div>
        {/* Labels */}
        <div className="flex justify-between gap-4 mt-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex-1 text-center min-w-[40px]">
              <span className="text-xs text-gray-500 font-mono -rotate-45 block origin-left translate-y-2 translate-x-2">
                {item.dateLabel}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          Total study time per date (Hours:Minutes)
        </div>
      </div>
    </div>
  );
};