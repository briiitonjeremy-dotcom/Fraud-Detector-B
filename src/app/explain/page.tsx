"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { isAdmin, isLoggedIn, logout, getUserRole } from "@/lib/api";

const ML_SERVICE_URL = "https://ml-file-for-url.onrender.com";

// Dynamic navItems will be set in component

interface ExplainResult {
  success: boolean;
  transaction_id: string;
  fraud_score: number;
  is_fraud: boolean;
  narrative: string;
  features: { name: string; value: number; impact: number }[];
  base_value: number;
}

export default function ExplainPage() {
  const [transactionId, setTransactionId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedToDb, setSavedToDb] = useState(false);
  const [mlStatus, setMlStatus] = useState<"loading" | "online" | "offline">("loading");
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return isAdmin() ? "admin" : (getUserRole() || null);
  });
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isLoggedIn();
  });

  // Dynamic navigation items based on user role
  const navItems = [
    { href: "/", icon: "📊", label: "Dashboard", active: false },
    { href: "/upload", icon: "📤", label: "Upload Dataset", active: false },
    { href: "/explain", icon: "🔍", label: "Explain", active: true },
    { href: "/api-test", icon: "🧪", label: "API Test", active: false },
    { href: "/admin", icon: "⚙", label: "Admin", active: false },
    // Show Login or Logout based on auth status
    loggedIn 
      ? { href: "#", icon: "🚪", label: "Logout", active: false, onClick: () => { logout(); window.location.href = "/"; } }
      : { href: "/login", icon: "🔐", label: "Login", active: false },
  ];

  // Check ML service health status on mount
  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        // Try /health endpoint first (more reliable)
        let response = await fetch(`${ML_SERVICE_URL}/health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        // If /health fails, try root endpoint
        if (!response.ok) {
          response = await fetch(`${ML_SERVICE_URL}/`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
        }
        
        if (response.ok) {
          setMlStatus("online");
        } else {
          setMlStatus("offline");
        }
      } catch (error) {
        console.error("[Explain] ML service health check failed:", error);
        setMlStatus("offline");
      }
    };

    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExplain = async () => {
    if (!transactionId.trim()) {
      setError("Please enter a transaction ID");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSavedToDb(false);

    try {
      // First, try to find the transaction in localStorage (from uploaded CSV)
      const storedTransactions = localStorage.getItem('fraudguard_transactions');
      if (storedTransactions) {
        const txns = JSON.parse(storedTransactions);
        const foundTxn = txns.find((t: any) => 
          t.transaction_id === transactionId || 
          t.nameOrig === transactionId ||
          t.nameorig === transactionId
        );
        
        if (foundTxn) {
          // Found in localStorage - create explanation from stored data
          const fraudScore = foundTxn.fraud_score !== null && foundTxn.fraud_score !== undefined 
            ? foundTxn.fraud_score / 100 
            : (foundTxn.is_fraud ? 0.95 : 0.1);
          
          setResult({
            success: true,
            transaction_id: foundTxn.transaction_id || transactionId,
            fraud_score: fraudScore,
            is_fraud: foundTxn.is_fraud || fraudScore > 0.5,
            narrative: foundTxn.is_fraud 
              ? `This transaction has been flagged as potentially fraudulent based on the ML model analysis. The transaction amount was ${foundTxn.amount}, and it shows patterns consistent with known fraud indicators.`
              : `This transaction appears to be legitimate based on the ML model analysis. The transaction amount was ${foundTxn.amount}, and it doesn't match known fraud patterns.`,
            features: [
              { name: "Amount", value: foundTxn.amount || 0, impact: (fraudScore - 0.5) * 0.3 },
              { name: "Balance Change", value: (foundTxn.oldbalanceOrg || 0) - (foundTxn.newbalanceOrig || 0), impact: (fraudScore - 0.5) * 0.2 },
              { name: "Transaction Type", value: foundTxn.type ? foundTxn.type.charCodeAt(0) : 0, impact: (fraudScore - 0.5) * 0.15 },
              { name: "Destination Balance", value: foundTxn.newbalanceDest || 0, impact: (fraudScore - 0.5) * 0.1 },
            ],
            base_value: 0.1,
          });
          setIsLoading(false);
          return;
        }
      }
      
      // If not found locally, try ML service /explain endpoint
      const response = await fetch(`${ML_SERVICE_URL}/explain/${transactionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        setError("Transaction not found. Please check the transaction ID and try again. Make sure you've uploaded a dataset first.");
      }
    } catch (err) {
      console.error("[Explain] Error:", err);
      setError("Unable to connect to ML service. Please ensure the service is running.");
    }

    setIsLoading(false);
  };

  // Save transaction to local storage (simulating database)
  const handleSaveToDatabase = () => {
    if (!result) return;
    
    try {
      // Get existing transactions
      const existingData = localStorage.getItem('fraudguard_transactions');
      const transactions = existingData ? JSON.parse(existingData) : [];
      
      // Add new transaction
      const newTransaction = {
        transaction_id: result.transaction_id,
        fraud_score: result.fraud_score,
        is_fraud: result.is_fraud,
        amount: 5000, // Default amount for demo
        vendor_name: "Demo Vendor",
        analyzed_at: new Date().toISOString()
      };
      
      transactions.push(newTransaction);
      
      // Save back to localStorage
      localStorage.setItem('fraudguard_transactions', JSON.stringify(transactions));
      
      // Update results storage too
      const storedResults = localStorage.getItem('fraudguard_results');
      const results = storedResults ? JSON.parse(storedResults) : {
        total_transactions: 0,
        fraud_detected: 0,
        fraud_rate: 0
      };
      
      results.total_transactions += 1;
      if (newTransaction.is_fraud) {
        results.fraud_detected += 1;
      }
      results.fraud_rate = results.total_transactions > 0 
        ? (results.fraud_detected / results.total_transactions) * 100 
        : 0;
      results.processedAt = new Date().toISOString();
      
      localStorage.setItem('fraudguard_results', JSON.stringify(results));
      
      setSavedToDb(true);
      alert(`Transaction ${result.transaction_id} saved to database successfully!`);
    } catch (err) {
      alert("Failed to save transaction to database");
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡️</div>
          <h1>FraudGuard</h1>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${item.active ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Transaction Explainability</h1>
          <p className="page-subtitle">Get detailed SHAP-based explanations for flagged transactions</p>
        </div>

        {/* Search Form */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="form-group">
            <label className="form-label">Transaction ID</label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter transaction ID (e.g., TXN_12345)"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleExplain()}
                disabled={mlStatus === "offline"}
              />
              <button
                onClick={handleExplain}
                disabled={isLoading || mlStatus === "offline"}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <>
                    <span className="spinner" style={{ width: "16px", height: "16px" }} />
                    Analyzing...
                  </>
                ) : (
                  "🔍 Explain"
                )}
              </button>
              {result && (
                <button
                  onClick={() => {
                    setTransactionId("");
                    setResult(null);
                    setSavedToDb(false);
                    setError(null);
                  }}
                  className="btn btn-secondary"
                  title="Clear current result"
                >
                  🗑 Clear
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Offline Warning */}
          {mlStatus === "offline" && (
            <div className="alert alert-error" style={{ marginTop: '1rem' }}>
              ⚠️ <strong>ML Processing Offline</strong> - Explainability feature is unavailable because the ML service is not responding.
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Fraud Score Header */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                    Transaction: {result.transaction_id}
                  </h2>
                  <span className={result.is_fraud ? "badge badge-danger" : "badge badge-success"}>
                    {result.is_fraud ? "🚨 FRAUD DETECTED" : "✅ LEGITIMATE"}
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", fontWeight: 700, 
                    color: result.fraud_score > 0.7 ? "#ef4444" : result.fraud_score > 0.4 ? "#f59e0b" : "#10b981" 
                  }}>
                    {Math.round(result.fraud_score * 100)}%
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Fraud Score</div>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
              {/* Narrative */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📖 Explanation</h3>
                </div>
                <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
                  {result.narrative}
                </p>
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    Base Value: <strong>{result.base_value}</strong>
                  </span>
                </div>
                <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
                  <button
                    onClick={handleSaveToDatabase}
                    className="btn btn-primary"
                    disabled={savedToDb}
                  >
                    {savedToDb ? "✓ Saved to Database" : "💾 Save to Database"}
                  </button>
                  <Link href="/" className="btn btn-secondary">
                    📊 View on Dashboard
                  </Link>
                </div>
              </div>

              {/* Feature Importance */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📊 Feature Importance</h3>
                </div>
                <div>
                  {result.features?.map((feature, i) => (
                    <div key={i} className="feature-bar">
                      <div className="feature-name">{feature.name}</div>
                      <div className="feature-track">
                        <div
                          className={`feature-fill ${feature.impact >= 0 ? "positive" : "negative"}`}
                          style={{ width: `${Math.abs(feature.impact) * 100}%` }}
                        />
                      </div>
                      <div className="feature-value">
                        {feature.impact >= 0 ? "+" : ""}{(feature.impact * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Raw Data */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🔧 Raw Response</h3>
              </div>
              <pre className="results-content">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </>
        )}

        {/* Quick Links */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
          <Link href="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
          <Link href="/api-test" className="btn btn-secondary">
            Test API →
          </Link>
        </div>
      </main>
    </div>
  );
}
