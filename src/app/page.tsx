"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdmin, logout } from "@/lib/api";

const ML_SERVICE_URL = "https://ml-file-for-url.onrender.com";

interface RawTransaction {
  step?: number;
  type?: string;
  amount?: number;
  nameOrig?: string;
  nameorig?: string;
  oldbalanceOrg?: number;
  newbalanceOrig?: number;
  nameDest?: string;
  namedest?: string;
  oldbalanceDest?: number;
  newbalanceDest?: number;
  timestamp?: string;
  channel?: string;
  region?: string;
  device_id?: string;
  recipient_name?: string;
  fraud_score?: number | null;
  prediction?: number | null;
  is_fraud?: boolean;
  [key: string]: any;
}

interface ProcessedResults {
  total_transactions: number;
  fraud_detected: number;
  fraud_rate: number;
  processedAt?: string;
}

interface NormalizedTransaction {
  id: string;
  step: number;
  type: string;
  amount: number;
  sender: string;
  senderAccount: string;
  recipient: string;
  recipientAccount: string;
  oldBalanceOrig: number;
  newBalanceOrig: number;
  oldBalanceDest: number;
  newBalanceDest: number;
  timestamp: string;
  channel: string;
  region: string;
  deviceId: string;
  fraudScore: number;
  isFraud: boolean;
  status: "SUSPICIOUS" | "LEGITIMATE";
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
}

const defaultStats = {
  totalTransactions: 0,
  fraudDetected: 0,
  fraudRate: 0,
  riskScore: 0,
};

function normalizeTransaction(raw: RawTransaction): NormalizedTransaction {
  const rawAny = raw as any;
  
  const step = rawAny.step ?? rawAny.Step ?? 0;
  const amount = rawAny.amount ?? rawAny.Amount ?? rawAny.AMOUNT ?? 0;
  const type = rawAny.type ?? rawAny.Type ?? rawAny.transaction_type ?? "";
  const nameOrig = rawAny.nameOrig ?? rawAny.nameorig ?? rawAny.sender ?? rawAny.sender_name ?? "";
  const nameDest = rawAny.nameDest ?? rawAny.namedest ?? rawAny.recipient ?? rawAny.recipient_name ?? rawAny.dest ?? "";
  const recipientName = rawAny.recipient_name ?? rawAny.RecipientName ?? rawAny.recipient ?? "";
  const channel = rawAny.channel ?? rawAny.Channel ?? rawAny.transaction_channel ?? "";
  const region = rawAny.region ?? rawAny.Region ?? rawAny.location ?? "";
  const timestamp = rawAny.timestamp ?? rawAny.Timestamp ?? rawAny.date ?? rawAny.datetime ?? "";
  const oldbalanceOrg = rawAny.oldbalanceOrg ?? rawAny.old_balance_orig ?? rawAny.sender_old_balance ?? 0;
  const newbalanceOrig = rawAny.newbalanceOrig ?? rawAny.new_balance_orig ?? rawAny.sender_new_balance ?? 0;
  const oldbalanceDest = rawAny.oldbalanceDest ?? rawAny.old_balance_dest ?? rawAny.recipient_old_balance ?? 0;
  const newbalanceDest = rawAny.newbalanceDest ?? rawAny.new_balance_dest ?? rawAny.recipient_new_balance ?? 0;
  const deviceId = rawAny.device_id ?? rawAny.DeviceId ?? rawAny.device ?? "";
  const fraudScoreRaw = rawAny.fraud_score ?? rawAny.fraudScore ?? rawAny.Fraud_Score ?? rawAny.prediction ?? rawAny.Prediction ?? rawAny.score ?? 0;
  const isFraud = rawAny.is_fraud ?? rawAny.isFraud ?? rawAny.Is_Fraud ?? rawAny.is_fraudulent ?? (fraudScoreRaw >= 50);
  const fraudScore = typeof fraudScoreRaw === 'number' ? fraudScoreRaw : (fraudScoreRaw ? fraudScoreRaw * 100 : 0);
  
  return {
    id: step > 0 ? `TXN-${step}` : (nameOrig ? `TXN-${nameOrig.substring(0, 8)}` : `TXN-${Date.now()}`),
    step: step,
    type: type,
    amount: amount,
    sender: nameOrig || recipientName || nameDest || "",
    senderAccount: nameOrig || "",
    recipient: recipientName || nameDest || "",
    recipientAccount: nameDest || "",
    oldBalanceOrig: oldbalanceOrg,
    newBalanceOrig: newbalanceOrig,
    oldBalanceDest: oldbalanceDest,
    newBalanceDest: newbalanceDest,
    timestamp: timestamp,
    channel: channel,
    region: region,
    deviceId: deviceId,
    fraudScore: fraudScore,
    isFraud: isFraud,
    status: isFraud || fraudScore >= 50 ? "SUSPICIOUS" : "LEGITIMATE",
    riskLevel: fraudScore >= 70 ? "HIGH" : fraudScore >= 40 ? "MEDIUM" : "LOW",
  };
}

export default function Dashboard() {
  const [mlStatus, setMlStatus] = useState<"loading" | "online" | "offline">("loading");
  const [hasRealData, setHasRealData] = useState(false);
  const [processedAt, setProcessedAt] = useState<string>("");
  const [stats, setStats] = useState(defaultStats);
  const [alerts, setAlerts] = useState<{time: string, severity: string, message: string}[]>([]);
  const [rawTransactions, setRawTransactions] = useState<RawTransaction[]>([]);
  const [savedFraudCases, setSavedFraudCases] = useState<any[]>([]);
  const [saveStatus, setSaveStatus] = useState<{saving: boolean, message: string}>({saving: false, message: ""});
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return isAdmin() ? "admin" : (localStorage.getItem("userRole") || null);
  });
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem("session_token");
  });

  const transactions: NormalizedTransaction[] = useMemo(() => {
    return rawTransactions.map(normalizeTransaction);
  }, [rawTransactions]);

  const suspiciousTransactions = useMemo(() => {
    return transactions.filter(t => t.isFraud || t.fraudScore >= 50);
  }, [transactions]);

  const navItems = [
    { href: "/", icon: "⬡", label: "Dashboard", active: true },
    { href: "/upload", icon: "⇪", label: "Upload Dataset", active: false },
    { href: "/explain", icon: "�ichter", label: "Explain", active: false },
    { href: "/api-test", icon: "⚡", label: "API Test", active: false },
    { href: "/admin", icon: "⚙", label: "Admin", active: false },
    loggedIn 
      ? { href: "#", icon: "🚪", label: "Logout", active: false, onClick: () => { logout(); window.location.href = "/"; } }
      : { href: "/login", icon: "🔐", label: "Login", active: false },
  ];

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all stored data? This will remove all processed datasets and transaction history.")) {
      localStorage.removeItem('fraudguard_results');
      localStorage.removeItem('fraudguard_transactions');
      localStorage.removeItem('fraudguard_fraud_cases');
      setStats(defaultStats);
      setAlerts([]);
      setHasRealData(false);
      setProcessedAt("");
      setRawTransactions([]);
      setSavedFraudCases([]);
    }
  };

  const handleSaveToDatabase = async () => {
    if (suspiciousTransactions.length === 0) {
      setSaveStatus({saving: false, message: "No suspicious transactions to save"});
      return;
    }
    
    setSaveStatus({saving: true, message: ""});
    
    try {
      const existingCases = localStorage.getItem('fraudguard_fraud_cases');
      const existingCasesArray = existingCases ? JSON.parse(existingCases) : [];
      
      const newFraudCases = suspiciousTransactions.map(txn => ({
        transaction_id: txn.id,
        step: txn.step,
        type: txn.type,
        amount: txn.amount,
        fraud_score: txn.fraudScore,
        savedAt: new Date().toISOString(),
        nameorig: txn.sender,
        nameDest: txn.recipient,
        channel: txn.channel,
        region: txn.region,
      }));
      
      const existingIds = new Set(existingCasesArray.map((c: any) => c.transaction_id));
      const uniqueNewCases = newFraudCases.filter((c: any) => !existingIds.has(c.transaction_id));
      const allCases = [...existingCasesArray, ...uniqueNewCases];
      
      localStorage.setItem('fraudguard_fraud_cases', JSON.stringify(allCases));
      setSavedFraudCases(allCases);
      
      setSaveStatus({saving: false, message: `Successfully saved ${uniqueNewCases.length} suspicious transaction(s) to database!`});
    } catch (error) {
      setSaveStatus({saving: false, message: "Error saving transactions to database"});
    }
  };

  const checkMlServiceHealth = async () => {
    try {
      let response = await fetch(`${ML_SERVICE_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        response = await fetch(`${ML_SERVICE_URL}/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return response.ok;
    } catch (error) {
      console.error("[Dashboard] ML service health check failed:", error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        const storedData = localStorage.getItem('fraudguard_results');
        if (storedData && mounted) {
          const parsed: ProcessedResults = JSON.parse(storedData);
          setStats({
            totalTransactions: parsed.total_transactions || 0,
            fraudDetected: parsed.fraud_detected || 0,
            fraudRate: parsed.fraud_rate || 0,
            riskScore: Math.round((parsed.fraud_rate || 0) * 10),
          });
          setProcessedAt(parsed.processedAt || "");
          setHasRealData(true);

          if (parsed.fraud_rate > 10) {
            setAlerts([{
              time: "Just now",
              severity: "high",
              message: `Fraud rate is ${parsed.fraud_rate.toFixed(2)}%, significantly above normal thresholds.`
            }]);
          } else if (parsed.fraud_rate > 5) {
            setAlerts([{
              time: "Just now",
              severity: "high",
              message: `Fraud rate is ${parsed.fraud_rate.toFixed(2)}%, exceeding the 5% threshold.`
            }]);
          } else if (parsed.fraud_rate > 2) {
            setAlerts([{
              time: "Just now",
              severity: "medium",
              message: `Fraud rate is ${parsed.fraud_rate.toFixed(2)}%, slightly above normal levels.`
            }]);
          }
        }
        
        const storedTransactions = localStorage.getItem('fraudguard_transactions');
        if (storedTransactions && mounted) {
          const txns: RawTransaction[] = JSON.parse(storedTransactions);
          console.log("[Dashboard] Raw transactions from localStorage:", txns[0]);
          if (txns.length > 0) {
            setRawTransactions(txns);
            setHasRealData(true);
          }
        }
        
        const savedFraudCasesData = localStorage.getItem('fraudguard_fraud_cases');
        if (savedFraudCasesData && mounted) {
          const cases = JSON.parse(savedFraudCasesData);
          setSavedFraudCases(cases);
        }
      } catch (e) {
        console.error("[Dashboard] Error reading localStorage:", e);
      }
      
      const isMlOnline = await checkMlServiceHealth();
      if (mounted) {
        setMlStatus(isMlOnline ? "online" : "offline");
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡</div>
          <h1>FraudGuard</h1>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            item.onClick ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`nav-item ${item.active ? "active" : ""}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${item.active ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          ))}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
          {loggedIn && (
            <div style={{ 
              padding: "1rem", 
              marginBottom: "1rem",
              background: userRole === "admin" ? "rgba(168, 85, 247, 0.1)" : userRole === "analyst" ? "rgba(59, 130, 246, 0.1)" : "rgba(34, 197, 94, 0.1)", 
              borderRadius: "12px", 
              border: `1px solid ${userRole === "admin" ? "rgba(168, 85, 247, 0.3)" : userRole === "analyst" ? "rgba(59, 130, 246, 0.3)" : "rgba(34, 197, 94, 0.3)"}`
            }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>LOGGED IN AS</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ 
                  fontSize: "0.875rem", 
                  fontWeight: "bold",
                  color: userRole === "admin" ? "#a855f7" : userRole === "analyst" ? "#3b82f6" : "#22c55e",
                  textTransform: "capitalize"
                }}>
                  {userRole}
                </span>
                <span style={{ 
                  fontSize: "0.625rem", 
                  padding: "2px 6px", 
                  borderRadius: "4px", 
                  background: localStorage.getItem("isActive") !== "false" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  color: localStorage.getItem("isActive") !== "false" ? "#22c55e" : "#ef4444"
                }}>
                  {localStorage.getItem("isActive") !== "false" ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                {localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}").email : ""}
              </div>
            </div>
          )}
          <div style={{ 
            padding: "1rem", 
            background: "rgba(59, 130, 246, 0.1)", 
            borderRadius: "12px", 
            border: "1px solid rgba(59, 130, 246, 0.2)"
          }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>ML BACKEND</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ 
                width: "8px", 
                height: "8px", 
                borderRadius: "50%", 
                background: mlStatus === "online" ? "var(--success)" : mlStatus === "loading" ? "var(--warning)" : "var(--danger)",
                boxShadow: mlStatus === "online" ? "0 0 8px var(--success)" : "none"
              }} />
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {mlStatus === "online" ? "Connected" : mlStatus === "loading" ? "Connecting..." : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          {mlStatus === "offline" && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '1rem', 
              background: 'rgba(239, 68, 68, 0.15)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--danger)' }}>ML Processing Offline</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Fraud detection is unavailable. Please ensure the ML service is running at {ML_SERVICE_URL}
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h1 className="page-title">Fraud Detection Dashboard</h1>
              <p className="page-subtitle">Real-time monitoring and analytics for financial transactions</p>
            </div>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem",
              padding: "0.5rem 1rem",
              background: "rgba(39, 39, 42, 0.6)",
              backdropFilter: "blur(10px)",
              borderRadius: "12px",
              border: "1px solid rgba(63, 63, 70, 0.5)"
            }}>
              <span style={{ fontSize: "1.25rem" }}>◷</span>
              <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
            {hasRealData && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={handleSaveToDatabase}
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                  disabled={saveStatus.saving}
                  title="Save suspicious transactions to database"
                >
                  {saveStatus.saving ? '⏳ Saving...' : '💾 Save Suspicious'}
                </button>
                <button 
                  onClick={handleClearData}
                  className="btn btn-secondary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                  title="Clear all displayed data"
                >
                  🗑 Clear Displayed Data
                </button>
              </div>
            )}
          </div>
        </div>
        
        {saveStatus.message && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem 1rem', 
            background: saveStatus.message.includes('Successfully') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${saveStatus.message.includes('Successfully') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            borderRadius: '8px',
            color: saveStatus.message.includes('Successfully') ? 'var(--success)' : 'var(--warning)',
            fontSize: '0.875rem'
          }}>
            {saveStatus.message}
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">⬡</div>
            <div className="stat-label">Total Transactions</div>
            {hasRealData ? (
              <>
                <div className="stat-value">{stats.totalTransactions.toLocaleString()}</div>
                <div className="stat-change positive" style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--success-light)" }}>
                  ▲ Processed from dataset
                </div>
              </>
            ) : (
              <>
                <div className="stat-value" style={{ opacity: 0.5 }}>—</div>
                <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Upload a dataset to see results
                </div>
              </>
            )}
          </div>
          
          <div className="stat-card">
            <div className="stat-icon red">⚠</div>
            <div className="stat-label">Fraud Detected</div>
            {hasRealData ? (
              <>
                <div className="stat-value">{stats.fraudDetected.toLocaleString()}</div>
                <div className="stat-change negative" style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--danger-light)" }}>
                  Flagged transactions
                </div>
              </>
            ) : (
              <>
                <div className="stat-value" style={{ opacity: 0.5 }}>—</div>
                <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  No fraud detected yet
                </div>
              </>
            )}
          </div>
          
          <div className="stat-card">
            <div className="stat-icon gold">◧</div>
            <div className="stat-label">Fraud Rate</div>
            {hasRealData ? (
              <>
                <div className="stat-value">{stats.fraudRate.toFixed(2)}%</div>
                <div className="stat-change negative" style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--warning-light)" }}>
                  Based on processed data
                </div>
              </>
            ) : (
              <>
                <div className="stat-value" style={{ opacity: 0.5 }}>—</div>
                <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Awaiting dataset
                </div>
              </>
            )}
          </div>
          
          <div className="stat-card">
            <div className="stat-icon green">◎</div>
            <div className="stat-label">Risk Score</div>
            {hasRealData ? (
              <>
                <div className="stat-value">{stats.riskScore}</div>
                <div style={{ marginTop: "0.75rem" }}>
                  <span className={stats.riskScore > 70 ? "badge badge-danger" : stats.riskScore > 40 ? "badge badge-warning" : "badge badge-success"}>
                    {stats.riskScore > 70 ? "HIGH RISK" : stats.riskScore > 40 ? "MEDIUM RISK" : "LOW RISK"}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="stat-value" style={{ opacity: 0.5 }}>—</div>
                <div style={{ marginTop: "0.75rem" }}>
                  <span className="badge badge-info">NO DATA</span>
                </div>
              </>
            )}
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
              <h3 className="card-title">Recent Transactions</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {transactions.length} transactions from dataset
              </span>
            </div>
            <div className="table-container" style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Amount (KES)</th>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Channel</th>
                    <th>Region</th>
                    <th>Fraud Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((txn, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{txn.id}</td>
                      <td>{txn.type}</td>
                      <td style={{ fontWeight: 600 }}>{txn.amount.toLocaleString()}</td>
                      <td>{txn.sender}</td>
                      <td>{txn.recipient}</td>
                      <td>{txn.channel}</td>
                      <td>{txn.region}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '60px', 
                            height: '6px', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${txn.fraudScore}%`, 
                              height: '100%', 
                              background: txn.fraudScore > 70 ? 'var(--danger)' : txn.fraudScore > 40 ? 'var(--warning)' : 'var(--success)',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: txn.fraudScore > 70 ? 'var(--danger)' : txn.fraudScore > 40 ? 'var(--warning)' : 'var(--success)' }}>
                            {txn.fraudScore.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={txn.isFraud ? "badge badge-danger" : "badge badge-success"}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {savedFraudCases.length > 0 && (
          <div className="card" style={{ marginBottom: "1.5rem", border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: 'var(--danger)' }}>🚫 Saved Fraud Cases (Database)</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {savedFraudCases.length} suspicious transaction(s) stored
              </span>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Type</th>
                    <th>Amount (KES)</th>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Fraud Score</th>
                    <th>Saved At</th>
                  </tr>
                </thead>
                <tbody>
                  {savedFraudCases.slice(0, 20).map((txn, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{txn.transaction_id}</td>
                      <td>{txn.type || ""}</td>
                      <td>{(txn.amount ?? 0).toLocaleString()}</td>
                      <td>{txn.nameorig || '-'}</td>
                      <td>{txn.nameDest || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '60px', 
                            height: '6px', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{ 
                              width: `${txn.fraud_score || 0}%`, 
                              height: '100%', 
                              background: 'var(--danger)',
                              borderRadius: '3px'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{(txn.fraud_score || 0).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(txn.savedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Real-Time Risk Score</h3>
              {hasRealData && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Live</span>}
            </div>
            {hasRealData ? (
              <>
                <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
                  <div className="risk-gauge">
                    <div className="gauge-bg" />
                    <div className="gauge-cover" />
                    <div className="gauge-value" style={{ 
                      color: stats.riskScore > 70 ? "#ef4444" : stats.riskScore > 40 ? "#f59e0b" : "#10b981"
                    }}>
                      {stats.riskScore}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                  <span className={stats.riskScore > 70 ? "badge badge-danger" : stats.riskScore > 40 ? "badge badge-warning" : "badge badge-success"}>
                    {stats.riskScore > 70 ? "HIGH RISK" : stats.riskScore > 40 ? "MEDIUM RISK" : "LOW RISK"}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center", 
                justifyContent: "center", 
                padding: "3rem 1rem" 
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>📊</div>
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                  Upload a dataset to see your risk analysis
                </p>
                <Link href="/upload" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  Upload Dataset
                </Link>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Fraud Trend</h3>
              {hasRealData && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "var(--danger)" }} />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Fraud Count</span>
                </div>
              )}
            </div>
            {hasRealData ? (
              <div className="chart-container">
                <div style={{ 
                  display: "flex", 
                  alignItems: "flex-end", 
                  justifyContent: "space-around", 
                  height: "100%",
                  padding: "1rem"
                }}>
                  {[65, 45, 78, 52, 90, 68, 42, 55, 73, 48, 82, 61, 38, 70].map((val, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ 
                        width: "20px", 
                        height: `${val * 2.5}px`, 
                        background: `linear-gradient(180deg, #ef4444 0%, #f87171 100%)`,
                        borderRadius: "4px 4px 0 0",
                        boxShadow: "0 -4px 12px rgba(239, 68, 68, 0.3)"
                      }} />
                      <span style={{ fontSize: "0.625rem", color: "var(--text-muted)" }}>{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center", 
                justifyContent: "center", 
                padding: "3rem 1rem" 
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>📈</div>
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                  Fraud trend data will appear here after processing
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Security Alerts</h3>
              {alerts.length > 0 && <span className="badge badge-danger">{alerts.length} new</span>}
            </div>
            {alerts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {alerts.map((alert, i) => (
                  <div key={i} style={{ 
                    padding: "1rem", 
                    background: "rgba(0, 0, 0, 0.2)", 
                    borderRadius: "8px",
                    borderLeft: `3px solid ${alert.severity === "high" ? "#ef4444" : alert.severity === "medium" ? "#f59e0b" : "#3b82f6"}`,
                    transition: "all 0.2s ease"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span className={alert.severity === "high" ? "badge badge-danger" : alert.severity === "medium" ? "badge badge-warning" : "badge badge-info"}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{alert.time}</span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{alert.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center", 
                justifyContent: "center", 
                padding: "3rem 1rem" 
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>🔔</div>
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                  Security alerts will appear here after processing
                </p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Suspicious Transactions</h3>
              {suspiciousTransactions.length > 0 && (
                <span className="badge badge-danger">{suspiciousTransactions.length} flagged</span>
              )}
            </div>
            {suspiciousTransactions.length > 0 ? (
              <div className="table-container" style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Amount (KES)</th>
                      <th>Recipient</th>
                      <th>Fraud Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suspiciousTransactions.slice(0, 10).map((txn, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{txn.id}</td>
                        <td>{txn.amount.toLocaleString()}</td>
                        <td>{txn.recipient}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ 
                              width: '60px', 
                              height: '6px', 
                              background: 'rgba(255,255,255,0.1)', 
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                width: `${txn.fraudScore}%`, 
                                height: '100%', 
                                background: 'var(--danger)',
                                borderRadius: '3px'
                              }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>{txn.fraudScore.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-danger">{txn.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                alignItems: "center", 
                justifyContent: "center", 
                padding: "3rem 1rem" 
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>✅</div>
                <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                  No suspicious transactions found
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>Quick Actions</h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Link href="/upload" className="btn btn-primary">
              ⇪ Upload Dataset
            </Link>
            <Link href="/explain" className="btn btn-secondary">
              ⟁ Explain Transaction
            </Link>
            <Link href="/api-test" className="btn btn-secondary">
              ⚡ Test API
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
