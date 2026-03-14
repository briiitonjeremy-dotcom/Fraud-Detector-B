"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { isAdmin, logout, fetchAdminTransactions } from "@/lib/api";

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ml-file-for-url.onrender.com";

interface RawTransaction {
  transaction_id?: string;
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
  created_at?: string;
  [key: string]: any;
}

interface ProcessedResults {
  total_transactions: number;
  fraud_detected: number;
  fraud_rate: number;
  average_fraud_score?: number;
  emerging_risk_count?: number;
  highest_fraud_score?: number;
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
  
  const step = Number(rawAny.step) || 0;
  const amount = Number(rawAny.amount) || 0;
  const type = rawAny.type || rawAny.Type || "";
  const nameOrig = rawAny.nameOrig || rawAny.nameorig || "";
  const nameDest = rawAny.nameDest || rawAny.namedest || rawAny.dest || "";
  const recipientName = rawAny.recipient_name || rawAny.RecipientName || rawAny.recipient || "";
  const channel = rawAny.channel || rawAny.Channel || "";
  const region = rawAny.region || rawAny.Region || "";
  const timestamp = rawAny.timestamp || rawAny.Timestamp || "";
  const oldbalanceOrg = Number(rawAny.oldbalanceOrg) || 0;
  const newbalanceOrig = Number(rawAny.newbalanceOrig) || 0;
  const oldbalanceDest = Number(rawAny.oldbalanceDest) || 0;
  const newbalanceDest = Number(rawAny.newbalanceDest) || 0;
  const deviceId = rawAny.device_id || rawAny.DeviceId || "";
  
  const fraudScoreRaw = rawAny.fraud_score;
  const predictionRaw = rawAny.prediction;
  const riskLevelRaw = rawAny.risk_level || rawAny.riskLevel || "";
  
  let fraudScore = 0;
  if (typeof fraudScoreRaw === 'number' && !isNaN(fraudScoreRaw)) {
    fraudScore = fraudScoreRaw;
  } else if (typeof fraudScoreRaw === 'string' && fraudScoreRaw) {
    fraudScore = parseFloat(fraudScoreRaw);
  } else if (typeof predictionRaw === 'number' && !isNaN(predictionRaw)) {
    fraudScore = predictionRaw * 100;
  } else if (typeof predictionRaw === 'string' && predictionRaw) {
    fraudScore = parseFloat(predictionRaw) * 100;
  }
  
  if (isNaN(fraudScore)) fraudScore = 0;
  
  const isFraud = rawAny.is_fraud === true || rawAny.isFraud === true || 
    (typeof fraudScore === 'number' && fraudScore >= 50);
  
  const finalRiskLevel = riskLevelRaw || 
    (fraudScore >= 70 ? "HIGH" : fraudScore >= 50 ? "SUSPICIOUS" : fraudScore >= 30 ? "MEDIUM" : "LOW");
  
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
    riskLevel: finalRiskLevel as "HIGH" | "MEDIUM" | "LOW",
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
    const normalized = rawTransactions.map(normalizeTransaction);
    console.log("[Dashboard] Normalized transactions count:", normalized.length);
    if (normalized.length > 0) {
      console.log("[Dashboard] === DEBUG: First 3 normalized transactions ===");
      console.log("[Dashboard] TXN 0:", JSON.stringify(normalized[0], null, 2));
      console.log("[Dashboard] TXN 1:", JSON.stringify(normalized[1], null, 2));
      console.log("[Dashboard] TXN 2:", JSON.stringify(normalized[2], null, 2));
      console.log("[Dashboard] fraudScore values:", normalized.slice(0,5).map(t => t.fraudScore));
    }
    return normalized;
  }, [rawTransactions]);

  const suspiciousTransactions = useMemo(() => {
    return transactions.filter(t => t.isFraud || t.fraudScore >= 50);
  }, [transactions]);

  const advancedAnalysis = useMemo(() => {
    if (transactions.length === 0) return null;

    const riskDistribution = {
      critical: transactions.filter(t => t.fraudScore >= 75).length,
      suspicious: transactions.filter(t => t.fraudScore >= 50 && t.fraudScore < 75).length,
      watchlist: transactions.filter(t => t.fraudScore >= 30 && t.fraudScore < 50).length,
      mildConcern: transactions.filter(t => t.fraudScore >= 15 && t.fraudScore < 30).length,
      low: transactions.filter(t => t.fraudScore < 15).length,
    };

    const emergingRiskTransactions = transactions.filter(t => t.fraudScore >= 15 && t.fraudScore < 50);
    const criticalTransactions = transactions.filter(t => t.fraudScore >= 50);

    const emergingByChannel = emergingRiskTransactions.reduce((acc, t) => {
      const channel = t.channel || '';
      if (channel) {
        acc[channel] = (acc[channel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const emergingTopChannel = Object.entries(emergingByChannel)
      .sort((a, b) => b[1] - a[1])[0] || null;

    const emergingByRegion = emergingRiskTransactions.reduce((acc, t) => {
      const region = t.region || '';
      if (region) {
        acc[region] = (acc[region] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const emergingTopRegion = Object.entries(emergingByRegion)
      .sort((a, b) => b[1] - a[1])[0] || null;

    const emergingByRecipient = emergingRiskTransactions.reduce((acc, t) => {
      const recipient = t.recipient || t.recipientAccount || '';
      if (recipient) {
        acc[recipient] = (acc[recipient] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const emergingTopRecipient = Object.entries(emergingByRecipient)
      .sort((a, b) => b[1] - a[1])[0] || null;

    const emergingByType = emergingRiskTransactions.reduce((acc, t) => {
      const type = t.type || '';
      if (type) {
        acc[type] = (acc[type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const emergingTopType = Object.entries(emergingByType)
      .sort((a, b) => b[1] - a[1])[0] || null;

    const allRiskTransactions = transactions.filter(t => t.fraudScore >= 15);

    const channelConcentration = allRiskTransactions.reduce((acc, t) => {
      const channel = t.channel || '';
      if (channel) {
        acc[channel] = (acc[channel] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topChannels = Object.entries(channelConcentration)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel, count]) => ({ channel, count, pct: (count / allRiskTransactions.length * 100).toFixed(1) }));

    const regionConcentration = allRiskTransactions.reduce((acc, t) => {
      const region = t.region || '';
      if (region) {
        acc[region] = (acc[region] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topRegions = Object.entries(regionConcentration)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([region, count]) => ({ region, count, pct: (count / allRiskTransactions.length * 100).toFixed(1) }));

    const recipientRepeated = allRiskTransactions.reduce((acc, t) => {
      const recipient = t.recipient || t.recipientAccount || '';
      if (recipient) {
        acc[recipient] = (acc[recipient] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const repeatedRecipients = Object.entries(recipientRepeated)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([recipient, count]) => ({ recipient, count }));

    const senderRepeated = allRiskTransactions.reduce((acc, t) => {
      const sender = t.sender || t.senderAccount || '';
      if (sender) {
        acc[sender] = (acc[sender] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const repeatedSenders = Object.entries(senderRepeated)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sender, count]) => ({ sender, count }));

    const senderRecipientPairs = allRiskTransactions.reduce((acc, t) => {
      const key = `${t.sender || 'UNKNOWN'}->${t.recipient || t.recipientAccount || 'UNKNOWN'}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repeatedPairs = Object.entries(senderRecipientPairs)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pair, count]) => ({ pair, count }));

    const amountClusters = allRiskTransactions.reduce((acc, t) => {
      const bucket = Math.floor(t.amount / 10000) * 10000;
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const topAmountClusters = Object.entries(amountClusters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bucket, count]) => ({ 
        range: `KES ${Number(bucket).toLocaleString()}-${Number(bucket + 9999).toLocaleString()}`,
        count 
      }));

    const deviceRepeated = allRiskTransactions.reduce((acc, t) => {
      const device = t.deviceId || '';
      if (device) {
        acc[device] = (acc[device] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const repeatedDevices = Object.entries(deviceRepeated)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([device, count]) => ({ device, count }));

    const avgFraudScore = transactions.length > 0
      ? transactions.reduce((sum, t) => sum + t.fraudScore, 0) / transactions.length
      : 0;

    const hasChannelData = Object.keys(channelConcentration).length > 0;
    const hasRegionData = Object.keys(regionConcentration).length > 0;
    const hasRecipientData = Object.keys(recipientRepeated).length > 0;
    const hasDeviceData = Object.keys(deviceRepeated).length > 0;

    let summary = "";
    const criticalCount = riskDistribution.critical + riskDistribution.suspicious;
    const watchlistCount = riskDistribution.watchlist + riskDistribution.mildConcern;

    if (criticalCount > 0) {
      const topType = criticalTransactions.reduce((acc, t) => {
        acc[t.type || 'UNKNOWN'] = (acc[t.type || 'UNKNOWN'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topTypeStr = Object.entries(topType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      summary = `CRITICAL: ${criticalCount} high-risk transaction(s) identified (${((criticalCount / transactions.length) * 100).toFixed(1)}% of batch). `;
      summary += `Primary threat vector: ${topTypeStr} transactions`;
      
      if (hasChannelData && topChannels[0]) {
        summary += ` via ${topChannels[0].channel} channel (${topChannels[0].pct}% of risk transactions)`;
      }
      if (hasRegionData && topRegions[0]) {
        summary += ` in ${topRegions[0].region}`;
      }
      summary += `. Average batch score: ${avgFraudScore.toFixed(1)}%.`;
      
      if (repeatedRecipients.length > 0) {
        summary += ` ${repeatedRecipients.length} recipient(s) show repeated targeting patterns.`;
      }
      if (repeatedPairs.length > 0) {
        summary += ` Detected ${repeatedPairs.length} sender-recipient pair(s) with multiple suspicious transactions.`;
      }
    } else if (watchlistCount > 0) {
      summary = `EMERGING RISK: ${watchlistCount} transaction(s) (${((watchlistCount / transactions.length) * 100).toFixed(1)}% of batch) flagged at 15%+ risk threshold. `;
      
      if (emergingTopType) {
        summary += `Primary emerging pattern: ${emergingTopType[0]} transactions`;
      }
      if (hasChannelData && emergingTopChannel) {
        summary += ` via ${emergingTopChannel[0]} (${emergingTopChannel[1]} txns)`;
      }
      if (hasRegionData && emergingTopRegion) {
        summary += ` concentrated in ${emergingTopRegion[0]}`;
      }
      summary += `. Recommendation: Place on watchlist for continued monitoring.`;
      
      if (repeatedRecipients.length > 0) {
        summary += ` ${repeatedRecipients.length} recipient(s) receiving multiple elevated-score transactions.`;
      }
    } else {
      summary = `BATCH CLEAR: ${riskDistribution.low} low-risk transaction(s) identified. `;
      summary += `Average fraud score: ${avgFraudScore.toFixed(1)}%. `;
      summary += `No critical or emerging fraud patterns detected in current processed dataset.`;
    }

    const watchlistPreview = emergingRiskTransactions
      .sort((a, b) => b.fraudScore - a.fraudScore)
      .slice(0, 10);

    return {
      riskDistribution,
      criticalCount,
      watchlistCount,
      emergingRiskCount: emergingRiskTransactions.length,
      topChannels,
      topRegions,
      repeatedRecipients,
      repeatedSenders,
      repeatedPairs,
      topAmountClusters,
      repeatedDevices,
      avgFraudScore,
      summary,
      totalAnalyzed: transactions.length,
      suspiciousCount: criticalTransactions.length,
      watchlistPreview,
      hasChannelData,
      hasRegionData,
      hasRecipientData,
      hasDeviceData,
      emergingTopChannel,
      emergingTopRegion,
      emergingTopRecipient,
      emergingTopType,
    };
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
          console.log("[Dashboard] Results from localStorage:", parsed);
          console.log("[Dashboard] avg_fraud_score:", parsed.average_fraud_score);
          console.log("[Dashboard] emerging_risk_count:", parsed.emerging_risk_count);
          console.log("[Dashboard] highest_fraud_score:", parsed.highest_fraud_score);
          setStats({
            totalTransactions: parsed.total_transactions || 0,
            fraudDetected: parsed.fraud_detected || 0,
            fraudRate: parsed.fraud_rate || parsed.average_fraud_score || 0,
            riskScore: Math.round(parsed.highest_fraud_score || parsed.average_fraud_score || parsed.fraud_rate || 0),
          });
          setProcessedAt(parsed.processedAt || "");
          setHasRealData(true);

          if ((parsed.emerging_risk_count || 0) > 0) {
            setAlerts([{
              time: "Just now",
              severity: "medium",
              message: `${parsed.emerging_risk_count} transaction(s) flagged at 15%+ risk. Average batch score: ${(parsed.average_fraud_score || 0).toFixed(1)}%. Highest: ${(parsed.highest_fraud_score || 0).toFixed(1)}%.`
            }]);
          } else if (parsed.fraud_rate > 10) {
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
        
        // Try to fetch from API first (same source as admin)
        try {
          const apiTransactions = await fetchAdminTransactions();
          console.log("[Dashboard] === DEBUG: First 3 transactions from API ===");
          console.log("[Dashboard] TXN 0:", JSON.stringify(apiTransactions[0], null, 2));
          console.log("[Dashboard] TXN 1:", JSON.stringify(apiTransactions[1], null, 2));
          console.log("[Dashboard] TXN 2:", JSON.stringify(apiTransactions[2], null, 2));
          console.log("[Dashboard] fraud_score from API:", apiTransactions.slice(0,5).map(t => t.fraud_score));
          
          if (apiTransactions.length > 0 && mounted) {
            // Convert API format to dashboard format
            const convertedTxns: RawTransaction[] = apiTransactions.map((t: any) => ({
              transaction_id: t.transaction_id,
              step: parseInt(t.transaction_id?.replace('TXN-', '') || t.id || '0'),
              type: t.type || '',
              amount: t.amount || 0,
              nameOrig: t.nameOrig || '',
              nameDest: t.nameDest || '',
              recipient_name: '',
              channel: t.channel || '',
              region: t.region || '',
              device_id: '',
              timestamp: t.created_at || '',
              fraud_score: t.fraud_score || 0,
              is_fraud: t.is_fraud || false,
            }));
            setRawTransactions(convertedTxns);
            setHasRealData(true);
            
            // Update stats from API data
            const fraudDetected = apiTransactions.filter((t: any) => t.is_fraud).length;
            const avgScore = apiTransactions.length > 0 
              ? apiTransactions.reduce((sum: number, t: any) => sum + (t.fraud_score || 0), 0) / apiTransactions.length 
              : 0;
            const highestScore = apiTransactions.length > 0 
              ? Math.max(...apiTransactions.map((t: any) => t.fraud_score || 0))
              : 0;
            const emergingCount = apiTransactions.filter((t: any) => (t.fraud_score || 0) >= 15 && (t.fraud_score || 0) < 50).length;
              
            setStats({
              totalTransactions: apiTransactions.length,
              fraudDetected: fraudDetected,
              fraudRate: avgScore,
              riskScore: Math.round(highestScore),
            });
            
            if (emergingCount > 0) {
              setAlerts([{
                time: "Just now",
                severity: "medium",
                message: `${emergingCount} transaction(s) flagged at 15%+ risk. Average batch score: ${avgScore.toFixed(1)}%. Highest: ${highestScore.toFixed(1)}%.`
              }]);
            }
            
            console.log("[Dashboard] Set rawTransactions from API, hasRealData=true");
          }
        } catch (apiError) {
          console.log("[Dashboard] API fetch failed, falling back to localStorage:", apiError);
          // Fallback to localStorage
          const storedTransactions = localStorage.getItem('fraudguard_transactions');
          console.log("[Dashboard] localStorage fraudguard_transactions:", storedTransactions ? "exists" : "NOT FOUND");
          if (storedTransactions && mounted) {
            const txns: RawTransaction[] = JSON.parse(storedTransactions);
            console.log("[Dashboard] === DEBUG: First 3 transactions from localStorage ===");
            console.log("[Dashboard] TXN 0:", JSON.stringify(txns[0], null, 2));
            console.log("[Dashboard] TXN 1:", JSON.stringify(txns[1], null, 2));
            console.log("[Dashboard] TXN 2:", JSON.stringify(txns[2], null, 2));
            console.log("[Dashboard] fraud_score field values:", txns.slice(0,5).map(t => t.fraud_score));
            if (txns.length > 0) {
              setRawTransactions(txns);
              setHasRealData(true);
              console.log("[Dashboard] Set rawTransactions and hasRealData=true");
            }
          } else {
            console.log("[Dashboard] No transactions in localStorage");
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

        {advancedAnalysis ? (
          <div className="card" style={{ marginBottom: "1.5rem", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "#a855f7" }}>
                🔬 Advanced Fraud Intelligence
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {advancedAnalysis.totalAnalyzed} transactions analyzed
              </span>
            </div>

            <div style={{ 
              padding: "1rem", 
              background: advancedAnalysis.criticalCount > 0 ? "rgba(239, 68, 68, 0.1)" : advancedAnalysis.watchlistCount > 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(16, 185, 129, 0.1)", 
              borderRadius: "8px", 
              marginBottom: "1.5rem",
              border: `1px solid ${advancedAnalysis.criticalCount > 0 ? "rgba(239, 68, 68, 0.3)" : advancedAnalysis.watchlistCount > 0 ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
            }}>
              <div style={{ fontSize: "0.75rem", color: advancedAnalysis.criticalCount > 0 ? "#ef4444" : advancedAnalysis.watchlistCount > 0 ? "#f59e0b" : "#10b981", marginBottom: "0.5rem", fontWeight: 600, textTransform: "uppercase" }}>
                {advancedAnalysis.criticalCount > 0 ? "⚠️ Critical Risk Detected" : advancedAnalysis.watchlistCount > 0 ? "👁️ Emerging Risk Signals" : "✓ Batch Clear"}
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: "1.6", margin: 0 }}>
                {advancedAnalysis.summary}
              </p>
            </div>

            <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
              <div>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Risk Distribution (5 Bands)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {[
                    { label: "Critical (75-100%)", count: advancedAnalysis.riskDistribution.critical, color: "#dc2626", bg: "rgba(220, 38, 38, 0.2)" },
                    { label: "Suspicious (50-74%)", count: advancedAnalysis.riskDistribution.suspicious, color: "#ef4444", bg: "rgba(239, 68, 68, 0.2)" },
                    { label: "Watchlist (30-49%)", count: advancedAnalysis.riskDistribution.watchlist, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.2)" },
                    { label: "Mild Concern (15-29%)", count: advancedAnalysis.riskDistribution.mildConcern, color: "#eab308", bg: "rgba(234, 179, 8, 0.2)" },
                    { label: "Low (0-14%)", count: advancedAnalysis.riskDistribution.low, color: "#10b981", bg: "rgba(16, 185, 129, 0.2)" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ 
                        width: "130px", 
                        fontSize: "0.75rem", 
                        color: "var(--text-secondary)",
                        flexShrink: 0
                      }}>
                        {item.label}
                      </div>
                      <div style={{ flex: 1, height: "20px", background: item.bg, borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ 
                          width: `${(item.count / advancedAnalysis.totalAnalyzed) * 100}%`, 
                          height: "100%", 
                          background: item.color,
                          borderRadius: "4px",
                          transition: "width 0.5s ease"
                        }} />
                      </div>
                      <div style={{ width: "45px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: item.color }}>
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Emerging Risk Signals (15%+)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ padding: "0.75rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f59e0b" }}>{advancedAnalysis.emergingRiskCount}</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase" }}>At-Risk Transactions</div>
                    <div style={{ fontSize: "0.6875rem", color: "#f59e0b", marginTop: "0.25rem" }}>
                      {((advancedAnalysis.emergingRiskCount / advancedAnalysis.totalAnalyzed) * 100).toFixed(1)}% of batch
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#ef4444" }}>{advancedAnalysis.criticalCount}</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Critical/Suspicious</div>
                    <div style={{ fontSize: "0.6875rem", color: "#ef4444", marginTop: "0.25rem" }}>
                      Requires immediate action
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "rgba(168, 85, 247, 0.1)", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#a855f7" }}>{advancedAnalysis.repeatedRecipients.length}</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Repeated Targets</div>
                    <div style={{ fontSize: "0.6875rem", color: "#a855f7", marginTop: "0.25rem" }}>
                      Recipients hit multiple times
                    </div>
                  </div>
                  <div style={{ padding: "0.75rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3b82f6" }}>{advancedAnalysis.avgFraudScore.toFixed(1)}%</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Fraud Score</div>
                    <div style={{ fontSize: "0.6875rem", color: "#3b82f6", marginTop: "0.25rem" }}>
                      Batch average
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
              <div>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Channel Concentration (15%+)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {advancedAnalysis.topChannels.length > 0 ? advancedAnalysis.topChannels.map((item: any, i: number) => (
                    <div key={i} style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "6px",
                      fontSize: "0.8125rem"
                    }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.channel}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.75rem" }}>{item.pct}%</span>
                        <span style={{ 
                          padding: "0.125rem 0.5rem", 
                          borderRadius: "4px", 
                          background: "rgba(245, 158, 11, 0.15)", 
                          color: "#f59e0b",
                          fontWeight: 600,
                          fontSize: "0.75rem"
                        }}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic", padding: "0.75rem" }}>
                      Channel analysis unavailable for this processed batch
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Region Concentration (15%+)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {advancedAnalysis.topRegions.length > 0 ? advancedAnalysis.topRegions.map((item: any, i: number) => (
                    <div key={i} style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "6px",
                      fontSize: "0.8125rem"
                    }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.region}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: "0.75rem" }}>{item.pct}%</span>
                        <span style={{ 
                          padding: "0.125rem 0.5rem", 
                          borderRadius: "4px", 
                          background: "rgba(245, 158, 11, 0.15)", 
                          color: "#f59e0b",
                          fontWeight: 600,
                          fontSize: "0.75rem"
                        }}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic", padding: "0.75rem" }}>
                      Region signals not present in current dataset
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
              <div>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Repeated Patterns Detected
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {advancedAnalysis.repeatedRecipients.length > 0 ? advancedAnalysis.repeatedRecipients.map((item: any, i: number) => (
                    <div key={i} style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(168, 85, 247, 0.1)",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      border: "1px solid rgba(168, 85, 247, 0.2)"
                    }}>
                      <span style={{ color: "var(--text-secondary)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.recipient}
                      </span>
                      <span style={{ 
                        padding: "0.125rem 0.5rem", 
                        borderRadius: "4px", 
                        background: "rgba(168, 85, 247, 0.2)", 
                        color: "#a855f7",
                        fontWeight: 600,
                        fontSize: "0.75rem"
                      }}>
                        {item.count}x targeted
                      </span>
                    </div>
                  )) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic", padding: "0.75rem" }}>
                      No repeated recipients detected in current processed transactions
                    </div>
                  )}
                  {advancedAnalysis.repeatedPairs.length > 0 && (
                    <>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", textTransform: "uppercase" }}>Sender-Recipient Pairs</div>
                      {advancedAnalysis.repeatedPairs.slice(0, 3).map((item: any, i: number) => (
                        <div key={`pair-${i}`} style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          padding: "0.5rem 0.75rem",
                          background: "rgba(239, 68, 68, 0.1)",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          border: "1px solid rgba(239, 68, 68, 0.2)"
                        }}>
                          <span style={{ color: "var(--text-secondary)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.pair}
                          </span>
                          <span style={{ color: "#ef4444", fontWeight: 600 }}>{item.count}x</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Amount Clusters (15%+)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {advancedAnalysis.topAmountClusters.length > 0 ? advancedAnalysis.topAmountClusters.map((item: any, i: number) => (
                    <div key={i} style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(245, 158, 11, 0.1)",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      border: "1px solid rgba(245, 158, 11, 0.2)"
                    }}>
                      <span style={{ color: "var(--text-secondary)" }}>{item.range}</span>
                      <span style={{ 
                        padding: "0.125rem 0.5rem", 
                        borderRadius: "4px", 
                        background: "rgba(245, 158, 11, 0.2)", 
                        color: "#f59e0b",
                        fontWeight: 600,
                        fontSize: "0.75rem"
                      }}>
                        {item.count} txns
                      </span>
                    </div>
                  )) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic", padding: "0.75rem" }}>
                      No significant amount clustering detected
                    </div>
                  )}
                </div>
              </div>
            </div>

            {advancedAnalysis.watchlistPreview.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  👁️ Watchlist Preview (15-49% Risk)
                </h4>
                <div className="table-container" style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Recipient</th>
                        <th>Channel</th>
                        <th>Risk Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advancedAnalysis.watchlistPreview.map((txn: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{txn.id}</td>
                          <td style={{ fontSize: "0.8125rem" }}>{txn.type || '-'}</td>
                          <td style={{ fontSize: "0.8125rem" }}>{txn.amount?.toLocaleString() || '-'}</td>
                          <td style={{ fontSize: "0.8125rem", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>{txn.recipient || '-'}</td>
                          <td style={{ fontSize: "0.8125rem" }}>{txn.channel || '-'}</td>
                          <td>
                            <span style={{ 
                              padding: "0.25rem 0.5rem",
                              borderRadius: "4px",
                              background: txn.fraudScore >= 30 ? "rgba(245, 158, 11, 0.2)" : "rgba(234, 179, 8, 0.2)",
                              color: txn.fraudScore >= 30 ? "#f59e0b" : "#eab308",
                              fontWeight: 600,
                              fontSize: "0.75rem"
                            }}>
                              {txn.fraudScore.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ marginBottom: "1.5rem", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
            <div className="card-header">
              <h3 className="card-title" style={{ color: "#a855f7" }}>
                🔬 Advanced Fraud Intelligence
              </h3>
            </div>
            <div style={{ 
              display: "flex", 
              flexDirection: "column",
              alignItems: "center", 
              justifyContent: "center", 
              padding: "3rem 1rem" 
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>🔬</div>
              <p style={{ color: "var(--text-muted)", textAlign: "center", maxWidth: "400px" }}>
                Upload and process a dataset to view advanced fraud analysis and intelligence breakdown
              </p>
            </div>
          </div>
        )}

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
