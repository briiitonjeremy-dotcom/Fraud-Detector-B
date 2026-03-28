"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { isAdmin, isLoggedIn, logout, getUserRole } from "@/lib/api";

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ml-file-for-url.onrender.com";

const navItems = [
  { href: "/", icon: "📊", label: "Dashboard", active: false },
  { href: "/upload", icon: "📤", label: "Upload Dataset", active: true },
  { href: "/explain", icon: "🔍", label: "Explain", active: false },
  { href: "/analyst", icon: "🤖", label: "Analyst AI", active: false },
  { href: "/api-test", icon: "🧪", label: "API Test", active: false },
];

interface UploadResult {
  success: boolean;
  message: string;
  data?: any;
  processingTime?: number;
}

type UploadStatus = "idle" | "processing" | "success" | "error";
type ErrorType = "none" | "offline" | "timeout" | "api_error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mlStatus, setMlStatus] = useState<"loading" | "online" | "offline">("loading");
  const [errorType, setErrorType] = useState<ErrorType>("none");
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return isAdmin() ? "admin" : (getUserRole() || null);
  });
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isLoggedIn();
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic navigation items - Admin always visible
  const navItems = [
    { href: "/", icon: "📊", label: "Dashboard", active: false },
    { href: "/upload", icon: "📤", label: "Upload Dataset", active: true },
    { href: "/explain", icon: "🔍", label: "Explain", active: false },
    { href: "/analyst", icon: "🤖", label: "Analyst AI", active: false },
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
        let response = await fetch(`/api/proxy/health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        // If /health fails, try root endpoint
        if (!response.ok) {
          response = await fetch(`/api/proxy/health`, {
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
        console.error("[Upload] ML service health check failed:", error);
        setMlStatus("offline");
      }
    };

    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
      parseCSV(droppedFile);
    } else {
      setResult({ success: false, message: "Please upload a valid CSV file" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").slice(0, 6).map(line => 
        line.split(",").map(cell => cell.trim())
      );
      setCsvData(lines);
    };
    reader.readAsText(file);
  };

  // Get detected columns from CSV data
  const getDetectedColumns = () => {
    if (csvData.length > 0) {
      return csvData[0].map(col => col.trim());
    }
    return [];
  };

  const handleUpload = async () => {
    if (!file) {
      setResult({ success: false, message: "Please select a CSV file first" });
      return;
    }

    setUploadStatus("processing");
    setErrorType("none");
    setResult(null);
    setUploadProgress("Reading file...");

    const startTime = Date.now();

    try {
      const fileContent = await file.text();

      // ── Parse CSV ────────────────────────────────────────────────────────
      const lines = fileContent.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        setResult({ success: false, message: "CSV file appears empty or has no data rows." });
        setUploadStatus("error");
        return;
      }

      // Normalise header names — handle capitalised/spaced variants
      const COL_ALIASES: Record<string, string> = {
        Step: "step", STEP: "step",
        Amount: "amount", AMOUNT: "amount", transaction_amount: "amount",
        OldbalanceOrg: "oldbalanceOrg", oldbalance_org: "oldbalanceOrg",
        old_balance_org: "oldbalanceOrg", balance_orig: "oldbalanceOrg",
        oldBalanceOrig: "oldbalanceOrg",
        NewbalanceOrig: "newbalanceOrig", newbalance_orig: "newbalanceOrig",
        new_balance_orig: "newbalanceOrig", newBalanceOrig: "newbalanceOrig",
        OldbalanceDest: "oldbalanceDest", oldbalance_dest: "oldbalanceDest",
        old_balance_dest: "oldbalanceDest", oldBalanceDest: "oldbalanceDest",
        NewbalanceDest: "newbalanceDest", newbalance_dest: "newbalanceDest",
        new_balance_dest: "newbalanceDest", newBalanceDest: "newbalanceDest",
        Type: "type", TYPE: "type", transaction_type: "type", txn_type: "type",
      };

      const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const headers = rawHeaders.map(h => COL_ALIASES[h] ?? h);

      const MAX_ROWS = 1000;
      const transactions: any[] = [];
      for (let i = 1; i < Math.min(lines.length, MAX_ROWS + 1); i++) {
        const row = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;
        const txn: any = {};
        headers.forEach((header, idx) => {
          const val = row[idx] ?? '';
          // Numeric columns — parse as float, default 0
          if (['step','amount','oldbalanceOrg','newbalanceOrig','oldbalanceDest','newbalanceDest'].includes(header)) {
            txn[header] = parseFloat(val) || 0;
          } else {
            txn[header] = val;
          }
        });
        transactions.push(txn);
      }

      const count = transactions.length;
      console.log(`[Upload] Parsed ${count} transactions, sending to /predict...`);
      setUploadProgress(`Analyzing ${count} transactions... ML model is processing, please wait...`);

      // ── Send to /predict ──────────────────────────────────────────────────
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const response = await fetch(`/api/proxy/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ transactions }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const processingTime = Date.now() - startTime;
      console.log("[Upload] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        setUploadProgress("Processing results...");

        // /predict returns { success, predictions: [{transaction_id, prediction, fraud_score, risk_level}] }
        const predictions: any[] = data.predictions || [];

        // Merge original CSV row data with ML predictions
        const finalTransactions = transactions.map((txn, index) => {
          const pred = predictions[index] || {};
          const raw = Number(pred.fraud_score ?? 0);
          // Backend returns 0–1; convert to percentage
          const fraudScore = raw <= 1 ? raw * 100 : raw;
          const isFraud = Number(pred.prediction) === 1 || fraudScore >= 50;
          return {
            ...txn,
            transaction_id: pred.transaction_id || txn.transaction_id || txn.nameOrig || `TXN_${index + 1}`,
            fraud_score: fraudScore,
            prediction: pred.prediction ?? 0,
            is_fraud: isFraud,
            risk_level: pred.risk_level || (fraudScore >= 70 ? "HIGH" : fraudScore >= 50 ? "SUSPICIOUS" : fraudScore >= 30 ? "MEDIUM" : "LOW"),
          };
        });

        console.log("[Upload] Predictions sample:", finalTransactions[0]);

        // ── Store in localStorage for dashboard ───────────────────────────
        try {
          const existing = localStorage.getItem('fraudguard_transactions');
          const prev = existing ? JSON.parse(existing) : [];
          localStorage.setItem('fraudguard_transactions', JSON.stringify([...finalTransactions, ...prev]));

          const fraudCount = finalTransactions.filter(t => t.is_fraud).length;
          const avgScore = finalTransactions.length > 0
            ? finalTransactions.reduce((s, t) => s + (Number(t.fraud_score) || 0), 0) / finalTransactions.length
            : 0;
          const emergingCount = finalTransactions.filter(t => {
            const s = Number(t.fraud_score) || 0;
            return s >= 15 && s < 50;
          }).length;
          const highestScore = finalTransactions.length > 0
            ? Math.max(...finalTransactions.map(t => Number(t.fraud_score) || 0))
            : 0;

          localStorage.setItem('fraudguard_results', JSON.stringify({
            total_transactions: finalTransactions.length,
            fraud_detected: fraudCount,
            fraud_rate: finalTransactions.length > 0 ? (fraudCount / finalTransactions.length * 100) : 0,
            average_fraud_score: avgScore,
            emerging_risk_count: emergingCount,
            highest_fraud_score: highestScore,
            predictions: finalTransactions,
            batch_id: data.batch_id || null,
            processedAt: new Date().toISOString(),
          }));

          console.log("[Upload] Summary — total:", finalTransactions.length, "frauds:", fraudCount, "avg score:", avgScore.toFixed(1) + "%");
        } catch (e) {
          console.error("[Upload] localStorage error:", e);
        }

        const fraudDetected = finalTransactions.filter(t => t.is_fraud).length;
        setResult({
          success: true,
          message: `Dataset uploaded and analyzed successfully!`,
          data: {
            total_transactions: finalTransactions.length,
            fraud_detected: fraudDetected,
            fraud_rate: finalTransactions.length > 0 ? (fraudDetected / finalTransactions.length * 100) : 0,
          },
          processingTime,
        });
        setUploadStatus("success");

      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[Upload] ML error response:", errorData);
        setErrorType("api_error");
        const errMsg = errorData.message || errorData.error || `ML processing failed (${response.status})`;
        setResult({ success: false, message: errMsg });
        setUploadStatus("error");
      }
    } catch (error: any) {
      console.error("[Upload] Network error:", error);
      if (error.name === 'AbortError') {
        setErrorType("timeout");
        setResult({ success: false, message: "Processing is taking longer than expected. Try a smaller dataset or try again." });
      } else {
        setErrorType("offline");
        setResult({ success: false, message: error.message || "Unable to connect to the fraud detection service." });
      }
      setUploadStatus("error");
    }
  };

  const removeFile = () => {
    setFile(null);
    setCsvData([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
          <h1 className="page-title">Upload Transaction Dataset</h1>
          <p className="page-subtitle">Upload CSV files containing transaction data for fraud analysis</p>
        </div>

        {/* Instructions - Dynamic based on uploaded file */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem", color: "var(--accent-gold)" }}>📋 CSV Format Requirements</h3>
          {csvData.length > 0 ? (
            <>
              <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Detected columns from your file:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {getDetectedColumns().map((col, idx) => (
                  <span key={idx} className="badge badge-info">{col}</span>
                ))}
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                💡 Detected {getDetectedColumns().length} columns • {csvData.length - 1} sample rows loaded
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Your CSV file should include transaction data columns such as:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {["transaction_id", "amount", "vendor_id", "vendor_name", "region", "timestamp"].map(col => (
                  <span key={col} className="badge badge-info">{col}</span>
                ))}
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                💡 Sample: transaction_id,amount,vendor_id,vendor_name,region,timestamp
              </p>
            </>
          )}
        </div>

        {/* Upload Area */}
        <div className="card">
          <div
            className={`upload-area ${isDragging ? "dragover" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            
            {!file ? (
              <>
                <div className="upload-icon">📁</div>
                <p className="upload-text">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <p className="upload-hint">
                  Maximum file size: 50MB
                </p>
              </>
            ) : (
              <>
                <div className="upload-icon">📄</div>
                <p className="upload-text">{file.name}</p>
                <p className="upload-hint">
                  {(file.size / 1024).toFixed(2)} KB • Click to change file
                </p>
              </>
            )}
          </div>

          {/* File Preview */}
          {csvData.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ color: "var(--text-secondary)" }}>File Preview</h3>
                <button onClick={removeFile} className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }}>
                  Remove
                </button>
              </div>
              
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      {csvData[0]?.map((header, i) => (
                        <th key={i}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 5).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  ... and {csvData.length - 5} more rows
                </p>
              )}
            </div>
          )}

          {/* Upload Button */}
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
            {/* Status Messages */}
          {uploadStatus === "processing" && (
            <div className="alert alert-info" style={{ width: '100%', marginBottom: '1rem' }}>
              <span className="spinner" style={{ width: "14px", height: "14px", marginRight: "8px" }} />
              <strong>{uploadProgress || "Processing..."}</strong>
            </div>
          )}
          
          {/* Error Messages - distinguished by type */}
          {errorType === "offline" && (
            <div className="alert alert-error" style={{ width: '100%', marginBottom: '1rem' }}>
              ⚠️ <strong>ML Processing Offline</strong> - Unable to reach the ML service. Please check your connection and try again.
            </div>
          )}
          {errorType === "timeout" && (
            <div className="alert alert-warning" style={{ width: '100%', marginBottom: '1rem' }}>
              ⏳ <strong>Processing is taking longer than expected.</strong> The ML service is still analyzing your dataset. Please wait or try a smaller dataset.
            </div>
          )}
          {errorType === "api_error" && (
            <div className="alert alert-error" style={{ width: '100%', marginBottom: '1rem' }}>
              ⚠️ <strong>ML Processing Error</strong> - {result?.message || "An error occurred while processing your dataset."}
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!file || uploadStatus === "processing" || mlStatus === "offline"}
            className="btn btn-primary"
          >
            {uploadStatus === "processing" ? (
              <>
                <span className="spinner" style={{ width: "16px", height: "16px" }} />
                Analyzing dataset...
              </>
            ) : (
              "🚀 Upload & Analyze"
            )}
          </button>
            {result && (
              <button
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setCsvData([]);
                  setUploadStatus("idle");
                  setErrorType("none");
                  setUploadProgress("");
                }}
                className="btn btn-secondary"
                title="Clear current result"
              >
                🗑 Clear
              </button>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className={`results-panel ${result.success ? "alert-success" : "alert-error"}`}>
              <div className="results-header">
                <span className="results-title">
                  {result.success ? "✅ Processing Complete" : "❌ Error"}
                </span>
                {result.processingTime && (
                  <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    ⏱️ {result.processingTime}ms
                  </span>
                )}
              </div>
              
              <p style={{ marginBottom: "1rem" }}>{result.message}</p>
              
              {result.data && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  <div style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      Total Transactions
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                      {result.data.total_transactions?.toLocaleString() || "N/A"}
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      Fraud Detected
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--danger)" }}>
                      {result.data.fraud_detected?.toLocaleString() || "N/A"}
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-card)", padding: "1rem", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      Fraud Rate
                    </div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-gold)" }}>
                      {result.data.fraud_rate?.toFixed(2) || "N/A"}%
                    </div>
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: "1rem" }}>
                <pre className="results-content">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
