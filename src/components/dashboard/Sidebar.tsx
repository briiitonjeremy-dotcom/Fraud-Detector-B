"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Upload, 
  BrainCircuit, 
  Zap, 
  Settings, 
  LogOut, 
  Shield,
  User,
  Activity
} from "lucide-react";

interface SidebarProps {
  mlStatus: "loading" | "online" | "offline";
  loggedIn: boolean;
  userRole: string | null;
  onLogout?: () => void;
}

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/upload", icon: Upload, label: "Upload Dataset" },
  { href: "/explain", icon: BrainCircuit, label: "Explain" },
  { href: "/api-test", icon: Zap, label: "API Test" },
  { href: "/admin", icon: Settings, label: "Admin" },
];

export default function Sidebar({ mlStatus, loggedIn, userRole, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const roleColors = {
    admin: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
    analyst: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" },
    default: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  };

  const roleStyle = userRole === "admin" ? roleColors.admin : userRole === "analyst" ? roleColors.analyst : roleColors.default;

  return (
    <aside className="w-64 min-h-screen bg-slate-900/95 border-r border-slate-800/60 flex flex-col">
      <div className="p-5 border-b border-slate-800/50">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FraudGuard</h1>
            <p className="text-xs text-slate-500">Fraud Detection</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3 border-t border-slate-800/50">
        {loggedIn && userRole && (
          <div className={`p-3 rounded-xl border ${roleStyle.bg} ${roleStyle.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <User className={`w-4 h-4 ${roleStyle.text}`} />
              <span className={`text-sm font-semibold capitalize ${roleStyle.text}`}>{userRole}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${localStorage.getItem("isActive") !== "false" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {localStorage.getItem("isActive") !== "false" ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              {localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}").email : ""}
            </p>
          </div>
        )}

        <div className={`p-3 rounded-xl border ${mlStatus === "online" ? "bg-emerald-500/10 border-emerald-500/30" : mlStatus === "loading" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className={`w-4 h-4 ${mlStatus === "online" ? "text-emerald-400" : mlStatus === "loading" ? "text-amber-400" : "text-red-400"}`} />
            <span className="text-xs font-medium text-slate-400">ML Backend</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              mlStatus === "online" ? "bg-emerald-500 animate-pulse" : mlStatus === "loading" ? "bg-amber-500 animate-pulse" : "bg-red-500"
            }`} />
            <span className="text-xs text-slate-500">
              {mlStatus === "online" ? "Connected" : mlStatus === "loading" ? "Connecting..." : "Disconnected"}
            </span>
          </div>
        </div>

        {loggedIn ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all duration-200"
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Login</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
