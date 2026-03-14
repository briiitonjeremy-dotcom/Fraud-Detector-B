"use client";

import { Activity, AlertTriangle, TrendingUp, Database, UserCheck, Shield, Clock, ArrowRight } from "lucide-react";

interface ActivityItem {
  id: string;
  time: string;
  action: string;
  source: string;
  status: "success" | "warning" | "error" | "info";
  details?: string;
}

const statusConfig = {
  success: { icon: Shield, bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-500", text: "text-emerald-400" },
  warning: { icon: AlertTriangle, bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-500", text: "text-amber-400" },
  error: { icon: Activity, bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-500", text: "text-red-400" },
  info: { icon: Clock, bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-500", text: "text-cyan-400" },
};

const actionIconMap: Record<string, typeof Activity> = {
  "Transaction Analyzed": Activity,
  "Fraud Detected": AlertTriangle,
  "Threshold Exceeded": TrendingUp,
  "Dataset Processed": Database,
  "User Login": UserCheck,
};

interface ActivityFeedProps {
  activities: ActivityItem[] | null;
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-white">Activity Feed</h3>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-xs text-slate-500">{activities.length} events</span>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {activities.map((item, index) => {
          const config = statusConfig[item.status];
          const ActionIcon = actionIconMap[item.action] || Activity;

          return (
            <div key={item.id} className="relative pl-6 pr-4 py-3 hover:bg-slate-800/20">
              {index < activities.length - 1 && <div className="absolute left-[11px] top-10 bottom-0 w-px bg-slate-800/50" />}
              <div className={`absolute left-2 top-3.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 z-10 ${config.dot} ${item.status === "warning" || item.status === "error" ? "animate-pulse" : ""}`} />
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-lg mt-0.5 ${config.bg} border ${config.border}`}>
                  <ActionIcon className={`w-3 h-3 ${config.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{item.action}</p>
                    <span className="text-[10px] text-slate-500">{item.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{item.source}</span>
                    {item.details && (
                      <>
                        <span className="text-slate-700">•</span>
                        <span className="text-xs text-slate-400 truncate">{item.details}</span>
                      </>
                    )}
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700/50">
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
