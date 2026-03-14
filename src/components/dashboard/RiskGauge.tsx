"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";

interface RiskGaugeProps {
  score: number | null;
}

export default function RiskGauge({ score }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (score === null || score === 0) {
      return;
    }
    
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  if (score === null) {
    return null;
  }

  const getRiskLevel = (s: number) => {
    if (s >= 70) return { level: "HIGH RISK", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30", icon: AlertTriangle };
    if (s >= 40) return { level: "MEDIUM RISK", color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", icon: Shield };
    return { level: "LOW RISK", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500/30", icon: CheckCircle };
  };

  const risk = getRiskLevel(animatedScore);
  const Icon = risk.icon;
  const rotation = -90 + (animatedScore / 100) * 180;

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">Risk Score</h3>
      </div>

      <div className="relative flex justify-center py-4">
        <div className="relative w-48 h-24 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 200 100">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" strokeLinecap="round" />
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(animatedScore / 100) * 251.2} 251.2`} className="transition-all duration-1000" />
          </svg>

          <div className="absolute bottom-0 left-1/2 w-0.5 h-16 bg-white origin-bottom transition-all duration-1000" style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }} />
          <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-lg" />
        </div>
      </div>

      <div className="text-center -mt-2 mb-4">
        <div className="inline-flex items-baseline gap-1">
          <span className="text-5xl font-bold text-white">{animatedScore}</span>
          <span className="text-lg text-slate-500">/100</span>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${risk.bg} ${risk.border}`}>
          <Icon className={`w-4 h-4 ${risk.color}`} />
          <span className={`text-sm font-semibold ${risk.color}`}>{risk.level}</span>
        </div>
      </div>
    </div>
  );
}
