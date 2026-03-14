"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { isAdmin, isLoggedIn, logout, getUserRole } from "@/lib/api";

const DEFAULT_ML_SERVICE_URL = "https://ml-file-for-url.onrender.com";

interface EndpointTest {
  name: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  requestBody?: object;
}

const endpoints: EndpointTest[] = [
  {
    name: "Health Check",
    method: "GET",
    path: "/health",
    description: "Check if the ML service is running and healthy",
  },
  {
    name: "Fraud Prediction",
    method: "POST",
    path: "/predict",
    description: "Predict fraud for raw transaction data (CSV format)",
    requestBody: {
      transactions: [
        { step: 1, type: "TRANSFER", amount: 4953893.08, nameOrig: "C728984460", oldbalanceOrg: 4953893.08, newbalanceOrig: 0, nameDest: "C639921569", oldbalanceDest: 0, newbalanceDest: 4953893.08 },
        { step: 1, type: "PAYMENT", amount: 2000, nameOrig: "C123456789", oldbalanceOrg: 10000, newbalanceOrig: 8000, nameDest: "C987654321", oldbalanceDest: 5000, newbalanceDest: 7000 }
      ]
    },
  },
  {
    name: "Process Dataset",
    method: "POST",
    path: "/process-dataset",
    description: "Process a CSV dataset for batch fraud detection",
    requestBody: {
      csv_content: "step,type,amount,nameOrig,oldbalanceOrg,newbalanceOrig,nameDest,oldbalanceDest,newbalanceDest\n1,TRANSFER,4953893.08,C728984460,4953893.08,0,C639921569,0,4953893.08\n1,PAYMENT,2000,C123456789,10000,8000,C987654321,5000,7000",
      file_name: "transactions.csv",
    },
  },
  {
    name: "Explain Transaction",
    method: "GET",
    path: "/explain/TXN_1_1",
    description: "Get SHAP-based explanation for a transaction by ID",
  },
];

interface TestResult {
  endpoint: string;
  status: number;
  duration: number;
  success: boolean;
  response: any;
}

export default function ApiTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<{ [key: string]: boolean }>({});
  // Initialize URL from localStorage - runs once at mount
  const [mlServiceUrl, setMlServiceUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fraudguard_api_url');
      return saved || DEFAULT_ML_SERVICE_URL;
    }
    return DEFAULT_ML_SERVICE_URL;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking");
  const [lastChecked, setLastChecked] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return isAdmin() ? "admin" : (getUserRole() || null);
  });
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isLoggedIn();
  });

  // Dynamic navigation items - Admin always visible
  const navItems = [
    { href: "/", icon: "⬡", label: "Dashboard", active: false },
    { href: "/upload", icon: "⇪", label: "Upload Dataset", active: false },
    { href: "/explain", icon: "⟁", label: "Explain", active: false },
    { href: "/api-test", icon: "⚡", label: "API Test", active: true },
    { href: "/admin", icon: "⚙", label: "Admin", active: false },
    // Show Login or Logout based on auth status
    loggedIn 
      ? { href: "#", icon: "🚪", label: "Logout", active: false, onClick: () => { logout(); window.location.href = "/"; } }
      : { href: "/login", icon: "🔐", label: "Login", active: false },
  ];

  // Check ML service status on mount and periodically
  const checkServiceStatus = useCallback(async (silent = false) => {
    if (!silent) setServiceStatus("checking");
    
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try /health endpoint first (more reliable)
      let response = await fetch(`${mlServiceUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal
      });
      
      // If /health fails, try root endpoint
      if (!response.ok) {
        response = await fetch(`${mlServiceUrl}/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal
        });
      }
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        setServiceStatus("online");
        setLastChecked(new Date().toLocaleTimeString());
        return { online: true, duration };
      } else {
        setServiceStatus("offline");
        return { online: false, duration };
      }
    } catch (error: any) {
      setServiceStatus("offline");
      return { online: false, duration: Date.now() - startTime };
    }
  }, [mlServiceUrl]);

  // Check status on mount
  useEffect(() => {
    const checkAndUpdate = async () => {
      await checkServiceStatus();
    };
    checkAndUpdate();
    
    // Check every 30 seconds
    const interval = setInterval(() => {
      checkServiceStatus(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [checkServiceStatus]);

  const runTest = async (endpoint: EndpointTest) => {
    setIsRunning((prev) => ({ ...prev, [endpoint.name]: true }));

    const startTime = Date.now();

    try {
      let url = `${mlServiceUrl}${endpoint.path}`;
      let options: RequestInit = {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
        // Add timeout
        signal: AbortSignal.timeout(10000)
      };

      if (endpoint.method === "POST" && endpoint.requestBody) {
        options.body = JSON.stringify(endpoint.requestBody);
      }

      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      let responseData;

      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      const result: TestResult = {
        endpoint: endpoint.name,
        status: response.status,
        duration,
        success: response.ok,
        response: responseData,
      };

      setResults((prev) => {
        const filtered = prev.filter((r) => r.endpoint !== endpoint.name);
        return [...filtered, result];
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        endpoint: endpoint.name,
        status: 0,
        duration,
        success: false,
        response: { 
          error: error.name === "AbortError" ? "Request timeout" : (error.message || "Network error"),
          hint: "ML service is offline. Please try again later."
        },
      };

      setResults((prev) => {
        const filtered = prev.filter((r) => r.endpoint !== endpoint.name);
        return [...filtered, result];
      });
    }

    setIsRunning((prev) => ({ ...prev, [endpoint.name]: false }));
  };

  const runAllTests = async () => {
    for (const endpoint of endpoints) {
      await runTest(endpoint);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getResult = (endpointName: string) => results.find((r) => r.endpoint === endpointName);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMlServiceUrl(e.target.value);
  };

  const saveUrl = () => {
    localStorage.setItem('fraudguard_api_url', mlServiceUrl);
    checkServiceStatus();
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
          <h1 className="page-title">ML API Test Console</h1>
          <p className="page-subtitle">Test the fraud detection ML service endpoints directly</p>
        </div>

        {/* Service Status Banner */}
        <div className={`status-banner status-${serviceStatus}`}>
          <div className="status-info">
            <span className="status-indicator">
              {serviceStatus === "checking" && "⏳"}
              {serviceStatus === "online" && "✅"}
              {serviceStatus === "offline" && "❌"}
            </span>
            <span className="status-text">
              {serviceStatus === "checking" && "Checking ML service status..."}
              {serviceStatus === "online" && "ML Service Connected"}
              {serviceStatus === "offline" && "ML Service Offline"}
            </span>
            {lastChecked && (
              <span className="status-time">Last checked: {lastChecked}</span>
            )}
          </div>
          <div className="status-actions">
            <button onClick={() => checkServiceStatus()} className="btn btn-small">
              🔄 Recheck
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="btn btn-small">
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Offline Warning Banner */}
        {serviceStatus === "offline" && (
          <div className="demo-banner" style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="demo-info">
              <span className="demo-icon">⚠️</span>
              <span className="demo-text">
                <strong>ML Service Offline</strong> - Unable to connect to fraud detection service
              </span>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="settings-panel card">
            <h3>⚙️ API Settings</h3>
            <div className="settings-form">
              <div className="form-group">
                <label>ML Service URL:</label>
                <input
                  type="text"
                  value={mlServiceUrl}
                  onChange={handleUrlChange}
                  placeholder="https://your-ml-service.onrender.com"
                  className="form-input"
                />
              </div>
              <div className="settings-actions">
                <button onClick={saveUrl} className="btn btn-primary">
                  💾 Save URL
                </button>
                <button onClick={() => {
                  setMlServiceUrl(DEFAULT_ML_SERVICE_URL);
                  localStorage.setItem('fraudguard_api_url', DEFAULT_ML_SERVICE_URL);
                }} className="btn btn-secondary">
                  Reset to Default
                </button>
              </div>
            </div>
            <div className="settings-info">
              <p><strong>Tip:</strong> If the ML service is running on Render, use the URL like: <code>https://your-app-name.onrender.com</code></p>
            </div>
          </div>
        )}

        {/* Service Info */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ marginBottom: "0.5rem" }}>🔌 ML Service Endpoint</h3>
              <code style={{ 
                background: "var(--bg-secondary)", 
                padding: "0.5rem 1rem", 
                borderRadius: "4px",
                fontSize: "0.875rem"
              }}>
                {mlServiceUrl}
              </code>
            </div>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <button onClick={() => runAllTests()} className="btn btn-primary" disabled={serviceStatus === "offline"}>
                🚀 Run All Tests
              </button>
              <button onClick={clearResults} className="btn btn-secondary">
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        {endpoints.map((endpoint) => {
          const result = getResult(endpoint.name);
          
          return (
            <div key={endpoint.name} className="endpoint-card">
              <div className="endpoint-header">
                <span className={`method-badge method-${endpoint.method.toLowerCase()}`}>
                  {endpoint.method}
                </span>
                <div>
                  <h3 style={{ fontWeight: 600 }}>{endpoint.name}</h3>
                  <code className="endpoint-path">{endpoint.path}</code>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                  <button
                    onClick={() => runTest(endpoint)}
                    disabled={isRunning[endpoint.name] || serviceStatus === "offline"}
                    className="btn btn-primary"
                  >
                    {isRunning[endpoint.name] ? (
                      <>
                        <span className="spinner" style={{ width: "14px", height: "14px" }} />
                        Running...
                      </>
                    ) : (
                      "▶️ Test"
                    )}
                  </button>
                </div>
              </div>

              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {endpoint.description}
              </p>

              {endpoint.requestBody && (
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    REQUEST BODY:
                  </div>
                  <pre style={{ 
                    background: "var(--bg-secondary)", 
                    padding: "1rem", 
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    overflow: "auto",
                    maxHeight: "200px"
                  }}>
                    {JSON.stringify(endpoint.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {result && (
                <div style={{ 
                  marginTop: "1rem",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: result.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: `1px solid ${result.success ? "#10b981" : "#ef4444"}`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span style={{ 
                      color: result.success ? "#10b981" : "#ef4444",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      {result.success ? "✅ Success" : "❌ Failed"}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      Status: <strong>{result.status || "N/A"}</strong> • 
                      Latency: <strong style={{ color: result.duration < 1000 ? "#10b981" : "#f59e0b" }}>{result.duration}ms</strong>
                    </span>
                  </div>
                  <pre style={{ 
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    overflow: "auto",
                    maxHeight: "200px"
                  }}>
                    {typeof result.response === "object" 
                      ? JSON.stringify(result.response, null, 2) 
                      : result.response}
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {/* Quick Links */}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </main>

      <style jsx>{`
        .status-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .status-checking {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
        }
        .status-online {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid #10b981;
        }
        .status-offline {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
        }
        .status-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .status-indicator {
          font-size: 1.25rem;
        }
        .status-text {
          font-weight: 600;
        }
        .status-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .status-actions {
          display: flex;
          gap: 0.5rem;
        }
        .demo-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
          border: 1px solid #8b5cf6;
          border-radius: 8px;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .demo-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .demo-icon {
          font-size: 1.5rem;
        }
        .demo-text {
          color: var(--text-primary);
        }
        .settings-panel {
          margin-bottom: 1.5rem;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-weight: 600;
          font-size: 0.875rem;
        }
        .form-input {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
        }
        .settings-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .settings-info {
          margin-top: 1rem;
          padding: 0.75rem;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .settings-info code {
          background: var(--bg-primary);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        .btn-small {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
        }
        .btn-demo {
          background: linear-gradient(135deg, #8b5cf6, #6366f1);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-demo:hover {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          transform: translateY(-1px);
        }
        .demo-badge {
          background: #8b5cf6;
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

const navItems = [
  { href: "/", icon: "⬡", label: "Dashboard", active: false },
  { href: "/upload", icon: "⇪", label: "Upload Dataset", active: false },
  { href: "/explain", icon: "⟁", label: "Explain", active: false },
  { href: "/api-test", icon: "⚡", label: "API Test", active: true },
];
