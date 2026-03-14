"use client";

import { Activity, AlertTriangle, Shield, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: "activity" | "alert" | "shield" | "trending";
  color: "cyan" | "red" | "amber" | "emerald";
}

const iconMap = {
  activity: Activity,
  alert: AlertTriangle,
  shield: Shield,
  trending: TrendingUp,
};

const colorMap = {
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", icon: "text-cyan-400", gradient: "from-cyan-500/20 to-blue-600/10" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", icon: "text-red-400", gradient: "from-red-500/20 to-rose-600/10" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: "text-amber-400", gradient: "from-amber-500/20 to-orange-600/10" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "text-emerald-400", gradient: "from-emerald-500/20 to-teal-600/10" },
};

function KPICard({ title, value, change, changeLabel, icon, color }: KPICardProps) {
  const Icon = iconMap[icon];
  const colorConfig = colorMap[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${colorConfig.bg} ${colorConfig.border} bg-gradient-to-br ${colorConfig.gradient} p-5 hover:border-slate-500/50 transition-all duration-300`}>
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10 transform translate-x-8 -translate-y-8">
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${
          color === "cyan" ? "from-cyan-400" : 
          color === "red" ? "from-red-400" : 
          color === "amber" ? "from-amber-400" : "from-emerald-400"
        } to-transparent blur-2xl`} />
      </div>
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colorConfig.bg} border ${colorConfig.border}`}>
            <Icon className={`w-4 h-4 ${colorConfig.icon}`} />
          </div>
          
          {change !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              isPositive 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          
          {changeLabel && (
            <p className="text-xs text-slate-500 mt-2">{changeLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface KPIGridProps {
  data: {
    totalTransactions: number;
    fraudDetected: number;
    fraudRate: number;
    riskScore: number;
  } | null;
}

export default function KPIGrid({ data }: KPIGridProps) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Total Transactions"
        value={data.totalTransactions.toLocaleString()}
        icon="activity"
        color="cyan"
        changeLabel="Analyzed transactions"
      />
      <KPICard
        title="Fraud Detected"
        value={data.fraudDetected.toLocaleString()}
        icon="alert"
        color="red"
        changeLabel="Flagged transactions"
      />
      <KPICard
        title="Fraud Rate"
        value={`${data.fraudRate.toFixed(2)}%`}
        icon="trending"
        color="amber"
        changeLabel="Fraud percentage"
      />
      <KPICard
        title="Risk Score"
        value={data.riskScore}
        icon="shield"
        color={data.riskScore > 70 ? "red" : data.riskScore > 40 ? "amber" : "emerald"}
        changeLabel={data.riskScore > 70 ? "High risk" : data.riskScore > 40 ? "Medium risk" : "Low risk"}
      />
    </div>
  );
}
