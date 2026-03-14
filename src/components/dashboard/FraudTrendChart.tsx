"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface FraudTrendChartProps {
  data: number[] | null;
  title?: string;
}

export default function FraudTrendChart({ data, title = "Fraud Trend" }: FraudTrendChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const avgVal = data.reduce((a, b) => a + b, 0) / data.length;
  const trend = data[data.length - 1] > data[0] ? "up" : "down";
  const changePercent = data.length > 1 
    ? ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(1)
    : "0";

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${trend === "up" ? "bg-red-500" : "bg-emerald-500"}`} />
            <span className="text-xs text-slate-500">Fraud Count</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === "up" 
              ? "bg-red-500/20 text-red-400 border border-red-500/30" 
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{changePercent}%</span>
          </div>
        </div>
      </div>

      <div className="h-48 flex items-end justify-between gap-2">
        {data.map((val, i) => {
          const heightPercent = (val / maxVal) * 100;
          const isHighest = val === maxVal;
          const isLowest = val === minVal;
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full h-40 flex items-end">
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 ${
                    isHighest 
                      ? "bg-gradient-to-t from-red-600 to-red-400 shadow-lg shadow-red-500/30" 
                      : isLowest
                        ? "bg-gradient-to-t from-slate-600 to-slate-400"
                        : "bg-gradient-to-t from-red-500/80 to-red-300/60 hover:from-red-400 hover:to-red-200"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 rounded text-xs text-white whitespace-nowrap z-10">
                    {val}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-500">{i + 1}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
        <div>
          <p className="text-xs text-slate-500">Average</p>
          <p className="text-sm font-semibold text-white">{avgVal.toFixed(0)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Peak</p>
          <p className="text-sm font-semibold text-red-400">{maxVal}</p>
        </div>
      </div>
    </div>
  );
}
