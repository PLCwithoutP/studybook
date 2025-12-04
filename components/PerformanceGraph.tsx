import React, { useMemo } from 'react';
import { AppSessionLog } from '../types';

interface PerformanceGraphProps {
  data: AppSessionLog[];
}

export const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ data }) => {
  const { chartData, yAxisTicks, maxTick } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], yAxisTicks: [], maxTick: 0 };

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
    const cData = Object.entries(aggregated)
      .map(([date, minutes]) => ({
        dateLabel: date,
        dateObj: parseDateStr(date),
        minutes: minutes
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Calculate Y-Axis Ticks
    const maxVal = Math.max(...cData.map(d => d.minutes), 10); // Minimum 10 mins scale
    
    let step;
    if (maxVal <= 60) step = 10;       // 10 min steps for short durations
    else if (maxVal <= 180) step = 30; // 30 min steps for medium durations
    else step = 60;                    // 1 hour steps for long durations

    const top = Math.ceil(maxVal / step) * step;
    const ticks = [];
    for (let i = 0; i <= top; i += step) {
      ticks.push(i);
    }

    return { chartData: cData, yAxisTicks: ticks, maxTick: top };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        <p>No performance data available.</p>
        <p className="text-sm mt-2">Import a JSON file to see your history.</p>
      </div>
    );
  }

  const formatTick = (mins: number) => {
    if (mins === 0) return '0';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between items-end h-[200px] pb-6 text-xs text-gray-400 font-mono w-10 flex-shrink-0 select-none">
          {yAxisTicks.slice().reverse().map((tick) => (
            <div key={tick} className="transform translate-y-2">
              {formatTick(tick)}
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[300px] h-[224px] relative"> 
            
            {/* Grid Lines */}
            <div className="absolute inset-0 h-[200px] pointer-events-none">
              {yAxisTicks.map((tick) => (
                <div 
                  key={tick} 
                  className="absolute w-full border-t border-gray-100"
                  style={{ bottom: `${(tick / maxTick) * 100}%` }}
                />
              ))}
            </div>

            {/* Bars */}
            <div className="absolute inset-0 h-[200px] flex items-end justify-around px-2 z-10">
              {chartData.map((item, index) => {
                const height = (item.minutes / maxTick) * 100;
                const hours = Math.floor(item.minutes / 60);
                const mins = Math.round(item.minutes % 60);
                const tooltip = `${hours}h ${mins}m`;

                return (
                  <div key={index} className="flex flex-col items-center flex-1 group relative min-w-[30px] mx-1 h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20 pointer-events-none shadow-md">
                      {tooltip}
                      <div className="text-[10px] text-gray-400">{item.dateLabel}</div>
                    </div>
                    
                    {/* Bar */}
                    <div 
                      style={{ height: `${Math.max(height, 1)}%` }} 
                      className="w-full bg-rose-500 rounded-t-sm hover:bg-rose-600 transition-all opacity-80 hover:opacity-100 relative"
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="absolute top-[200px] left-0 w-full flex justify-around px-2 pt-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex-1 text-center min-w-[30px] mx-1">
                  <span className="text-[10px] text-gray-500 font-mono -rotate-45 block origin-top-left translate-x-3 w-full truncate">
                    {item.dateLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-400">
        Total study time per date
      </div>
    </div>
  );
};