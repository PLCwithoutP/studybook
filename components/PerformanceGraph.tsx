
import React, { useMemo, useState, useEffect } from 'react';
import { AppSessionLog } from '../types';

interface PerformanceGraphProps {
  data: AppSessionLog[];
}

interface ChartItem {
  dateLabel: string;
  dayLabel: string; // 01/Monday
  dateObj: Date;
  minutes: number;
}

interface GroupedData {
  [monthKey: string]: ChartItem[];
}

export const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const { groupedData, monthKeys, maxY, allTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { groupedData: {}, monthKeys: [], maxY: 0, allTicks: [] };
    }

    // Helper to parse duration
    const parseDurationToMinutes = (dur: string): number => {
      const parts = dur.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
      if (parts.length === 2) return parts[0] + parts[1] / 60;
      return 0;
    };

    // Helper to parse date string. Supports "04 December 2025" and fallback "04Dec25"
    const parseDate = (dateStr: string): Date => {
      // Try new format: "04 December 2025"
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;

      // Fallback for "04Dec25"
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
        return new Date(0);
      }
    };

    // Aggregate by date string first to sum multiple entries for same day
    const dailyAggregates: { [key: string]: { minutes: number, dateObj: Date } } = {};

    data.forEach(log => {
      const mins = parseDurationToMinutes(log.duration);
      if (dailyAggregates[log.date]) {
        dailyAggregates[log.date].minutes += mins;
      } else {
        dailyAggregates[log.date] = { minutes: mins, dateObj: parseDate(log.date) };
      }
    });

    // Group by Month Year
    const groups: GroupedData = {};
    let globalMaxMinutes = 10;

    Object.values(dailyAggregates).forEach(item => {
      if (isNaN(item.dateObj.getTime())) return;

      const monthKey = item.dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // X-Axis Format: 01/Monday
      const dayNum = item.dateObj.getDate().toString().padStart(2, '0');
      const weekDay = item.dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const dayLabel = `${dayNum}/${weekDay}`;

      if (!groups[monthKey]) groups[monthKey] = [];
      
      groups[monthKey].push({
        dateLabel: item.dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        dayLabel: dayLabel,
        dateObj: item.dateObj,
        minutes: item.minutes
      });

      if (item.minutes > globalMaxMinutes) globalMaxMinutes = item.minutes;
    });

    // Sort items within groups by date
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    });

    // Sort Month Keys (Oldest to Newest)
    const sortedMonthKeys = Object.keys(groups).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    // Calculate Ticks for Y-Axis
    let step;
    if (globalMaxMinutes <= 60) step = 10;
    else if (globalMaxMinutes <= 180) step = 30;
    else step = 60;

    const top = Math.ceil(globalMaxMinutes / step) * step;
    const ticks = [];
    for (let i = 0; i <= top; i += step) {
      ticks.push(i);
    }

    return { 
      groupedData: groups, 
      monthKeys: sortedMonthKeys, 
      maxY: top, 
      allTicks: ticks 
    };
  }, [data]);

  // Set default active tab to the latest month if available
  useEffect(() => {
    if (monthKeys.length > 0 && (!activeTab || !monthKeys.includes(activeTab))) {
      setActiveTab(monthKeys[monthKeys.length - 1]);
    }
  }, [monthKeys, activeTab]);

  if (monthKeys.length === 0) {
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

  const chartData = activeTab ? groupedData[activeTab] : [];

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 border-b border-gray-100 scrollbar-thin scrollbar-thumb-gray-200">
        {monthKeys.map(key => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
              ${activeTab === key 
                ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between items-end h-[250px] pb-[80px] text-xs text-gray-400 font-mono w-10 flex-shrink-0 select-none">
          {allTicks.slice().reverse().map((tick) => (
            <div key={tick} className="transform translate-y-2">
              {formatTick(tick)}
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[400px] h-[250px] relative"> 
            
            {/* Grid Lines */}
            <div className="absolute inset-0 h-[170px] pointer-events-none">
              {allTicks.map((tick) => (
                <div 
                  key={tick} 
                  className="absolute w-full border-t border-gray-100"
                  style={{ bottom: `${(tick / maxY) * 100}%` }}
                />
              ))}
            </div>

            {/* Bars */}
            <div className="absolute inset-0 h-[170px] flex items-end justify-around px-2 z-10">
              {chartData.map((item, index) => {
                const height = (item.minutes / maxY) * 100;
                const hours = Math.floor(item.minutes / 60);
                const mins = Math.round(item.minutes % 60);
                const tooltip = `${hours}h ${mins}m`;

                return (
                  <div key={index} className="flex flex-col items-center flex-1 group relative min-w-[40px] mx-1 h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20 pointer-events-none shadow-md">
                      {tooltip}
                      <div className="text-[10px] text-gray-400">{item.dateLabel}</div>
                    </div>
                    
                    {/* Bar */}
                    <div 
                      style={{ height: `${Math.max(height, 1)}%` }} 
                      className="w-full bg-rose-500 rounded-t-sm hover:bg-rose-600 transition-all opacity-80 hover:opacity-100 relative max-w-[30px]"
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="absolute top-[175px] left-0 w-full flex justify-around px-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex-1 text-center min-w-[40px] mx-1 relative h-[60px]">
                  <span className="text-[10px] text-gray-500 font-mono -rotate-45 absolute top-0 left-1/2 -translate-x-1/2 origin-top-left whitespace-nowrap">
                    {item.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-center text-sm text-gray-400">
        Total study time by date
      </div>
    </div>
  );
};
