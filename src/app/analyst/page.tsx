"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  isAdmin,
  isLoggedIn,
  logout,
  getUserRole,
  fetchAnalystCases,
  fetchAnalystCase,
  createAnalystCase,
  askAnalystChat,
  submitCaseReview,
  fetchAdminTransactions,
  AnalystCase,
  AnalystChatMessage,
} from "@/lib/api";

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ml-file-for-url.onrender.com";

function normalizeFraudScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0;
  return score <= 1 ? score * 100 : score;
}

const riskLevelColors: Record<string, string> = {
  HIGH: "#ef4444",
  SUSPICIOUS: "#f59e0b",
  MEDIUM: "#eab308",
  LOW: "#10b981",
};

const authorityLabels: Record<string, string> = {
  DCI: "Directorate of Criminal Investigations",
  FRC: "Financial Reporting Centre",
  ODPC: "Office of Data Protection Commissioner",
  "Internal Review Only": "Internal Review",
};

const suggestedQuestions = [
  "Why was this routed to DCI?",
  "What evidence is strongest?",
  "What evidence is missing?",
  "Does this look like account takeover?",
  "Does this resemble structuring?",
  "Why is the confidence low?",
  "What action should I take next?",
  "What should be preserved before escalation?",
];

export default function AnalystPage() {
  const [cases, setCases] = useState<AnalystCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<AnalystCase | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<AnalystChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "evidence" | "timeline" | "report" | "chat">("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<{ submitting: boolean; message: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return isAdmin() ? "admin" : (getUserRole() || null);
  });
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isLoggedIn();
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCases();
    loadTransactions();
  }, []);

  const loadCases = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnalystCases();
      setCases(data);
    } catch (error) {
      console.error("[Analyst] Error loading cases:", error);
    }
    setIsLoading(false);
  };

  const loadTransactions = async () => {
    try {
      const txns = await fetchAdminTransactions();
      setTransactions(txns);
    } catch (error) {
      console.error("[Analyst] Error loading transactions:", error);
    }
  };

  const handleSelectCase = async (caseId: string) => {
    setIsLoading(true);
    setChatMessages([]);
    try {
      const caseData = await fetchAnalystCase(caseId);
      setSelectedCase(caseData);
    } catch (error) {
      console.error("[Analyst] Error loading case:", error);
    }
    setIsLoading(false);
  };

  const handleCreateCase = async () => {
    if (!selectedTransactionId) return;

    setIsLoading(true);
    const txn = transactions.find(
      (t) => t.transaction_id === selectedTransactionId || String(t.id) === selectedTransactionId
    );

    if (!txn) {
      alert("Transaction not found");
      setIsLoading(false);
      return;
    }

    const result = await createAnalystCase(selectedTransactionId, {
      transaction_id: txn.transaction_id,
      amount: txn.amount,
      fraud_score: normalizeFraudScore(txn.fraud_score || 0),
      type: txn.type,
      channel: txn.channel,
      nameOrig: txn.nameOrig,
      nameDest: txn.nameDest,
    });

    if (result.success && result.case) {
      setCases([...cases, result.case]);
      setSelectedCase(result.case);
      setShowCreateModal(false);
      setSelectedTransactionId("");
    } else {
      alert(result.error || "Failed to create case");
    }
    setIsLoading(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedCase) return;

    const question = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    const result = await askAnalystChat(selectedCase.case_id, question);

    if (result.success && result.response) {
      setChatMessages([
        ...chatMessages,
        {
          case_id: selectedCase.case_id,
          question: question,
          response: result.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      alert(result.error || "Failed to get response");
    }

    setIsChatLoading(false);
  };

  const handleReview = async (decision: string) => {
    if (!selectedCase) return;

    setReviewStatus({ submitting: true, message: "" });

    const result = await submitCaseReview(selectedCase.case_id, decision, reviewNotes);

    if (result.success) {
      setReviewStatus({ submitting: false, message: result.message || "Review submitted" });
      await loadCases();
      if (selectedCase) {
        const updated = await fetchAnalystCase(selectedCase.case_id);
        setSelectedCase(updated);
      }
      setReviewNotes("");
      setTimeout(() => setReviewStatus(null), 3000);
    } else {
      setReviewStatus({ submitting: false, message: result.error || "Failed to submit review" });
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const navItems = [
    { href: "/", icon: "📊", label: "Dashboard", active: false },
    { href: "/upload", icon: "📤", label: "Upload", active: false },
    { href: "/explain", icon: "🔍", label: "Explain", active: false },
    { href: "/analyst", icon: "🤖", label: "Analyst AI", active: true },
    { href: "/admin", icon: "⚙", label: "Admin", active: false },
    loggedIn
      ? { href: "#", icon: "🚪", label: "Logout", active: false, onClick: () => { logout(); window.location.href = "/"; } }
      : { href: "/login", icon: "🔐", label: "Login", active: false },
  ];

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
                key={item.label}
                href={item.href}
                className={`nav-item ${item.active ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Analyst AI Assistant
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            v1.0.0
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h2>🤖 Analyst AI Assistant</h2>
            <span className="header-subtitle">Fraud investigation copilot</span>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              ➕ Create Case
            </button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem", height: "calc(100vh - 140px)" }}>
          {/* Cases List */}
          <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="card-header">
              <h3 className="card-title">Open Cases</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {cases.length} pending
              </span>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "0.5rem" }}>
              {cases.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <p>No open cases</p>
                  <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                    Create a case from a flagged transaction to begin analysis
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {cases.map((c) => (
                    <button
                      key={c.case_id}
                      onClick={() => handleSelectCase(c.case_id)}
                      style={{
                        padding: "0.75rem",
                        background: selectedCase?.case_id === c.case_id ? "rgba(6, 182, 212, 0.15)" : "rgba(0, 0, 0, 0.2)",
                        border: `1px solid ${selectedCase?.case_id === c.case_id ? "rgba(6, 182, 212, 0.4)" : "transparent"}`,
                        borderRadius: "8px",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {c.case_id}
                        </span>
                        <span
                          style={{
                            padding: "0.125rem 0.375rem",
                            borderRadius: "4px",
                            fontSize: "0.625rem",
                            fontWeight: 600,
                            background: `${riskLevelColors[c.risk_level]}20`,
                            color: riskLevelColors[c.risk_level],
                          }}
                        >
                          {c.risk_level}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        TXN: {c.transaction_id}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                        {c.recommended_authorities?.join(", ") || "Internal Review"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden" }}>
            {!selectedCase ? (
              <div className="card" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
                  <p>Select a case from the list to view details</p>
                  <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                    Or create a new case from a flagged transaction
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Case Overview Header */}
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{selectedCase.case_id}</h3>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: `${riskLevelColors[selectedCase.risk_level]}20`,
                            color: riskLevelColors[selectedCase.risk_level],
                          }}
                        >
                          {selectedCase.risk_level} RISK
                        </span>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: "rgba(6, 182, 212, 0.15)",
                            color: "#06b6d4",
                          }}
                        >
                          {selectedCase.status?.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                        Transaction: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{selectedCase.transaction_id}</span>
                        <span style={{ margin: "0 0.5rem" }}>•</span>
                        Customer: <span style={{ color: "var(--text-primary)" }}>{selectedCase.customer_reference}</span>
                        <span style={{ margin: "0 0.5rem" }}>•</span>
                        Score: <span style={{ color: riskLevelColors[selectedCase.risk_level], fontWeight: 600 }}>{selectedCase.risk_score.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {selectedCase.recommended_authorities?.map((auth) => (
                        <span
                          key={auth}
                          style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: "rgba(168, 85, 247, 0.15)",
                            color: "#a855f7",
                          }}
                        >
                          {auth}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  {[
                    { key: "overview", label: "AI Summary" },
                    { key: "evidence", label: "Evidence" },
                    { key: "timeline", label: "Timeline" },
                    { key: "report", label: "Report" },
                    { key: "chat", label: "Copilot Chat" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      style={{
                        padding: "0.75rem 1rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === tab.key ? "2px solid #06b6d4" : "2px solid transparent",
                        color: activeTab === tab.key ? "#06b6d4" : "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="card" style={{ flex: 1, overflow: "auto" }}>
                  {activeTab === "overview" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      {/* AI Summary */}
                      <div>
                        <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          AI Summary
                        </h4>
                        <div style={{ padding: "1rem", background: "rgba(6, 182, 212, 0.1)", borderRadius: "8px", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: "1.6" }}>
                            {selectedCase.summary}
                          </p>
                        </div>

                        <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "1.5rem", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Reasons for Flagging
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {selectedCase.reasons?.map((reason, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "0.5rem 0.75rem",
                                background: "rgba(0, 0, 0, 0.2)",
                                borderRadius: "6px",
                                fontSize: "0.8125rem",
                                color: "var(--text-secondary)",
                              }}
                            >
                              • {reason}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Authority Routing */}
                      <div>
                        <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Recommended Authority Routing
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {selectedCase.recommended_authorities?.map((auth) => (
                            <div
                              key={auth}
                              style={{
                                padding: "1rem",
                                background: "rgba(168, 85, 247, 0.1)",
                                borderRadius: "8px",
                                border: "1px solid rgba(168, 85, 247, 0.3)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                <span style={{ fontWeight: 600, color: "#a855f7" }}>{auth}</span>
                                <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                                  {authorityLabels[auth] || "Investigative Authority"}
                                </span>
                              </div>
                              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                                {auth === "DCI" && "Recommended for cyber-enabled fraud, electronic fraud, phishing, identity theft, account takeover"}
                                {auth === "FRC" && "Recommended for suspicious transaction reports under AML regulations"}
                                {auth === "ODPC" && "Recommended when incident may involve personal data breach"}
                                {auth === "Internal Review Only" && "Evidence not sufficient for external escalation"}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(234, 179, 8, 0.1)", borderRadius: "6px", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontSize: "1rem" }}>⚠️</span>
                            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#eab308" }}>
                              Human Review Required
                            </span>
                          </div>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                            {selectedCase.confidence_note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "evidence" && (
                    <div>
                      <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Evidence Viewer
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                        <div>
                          <h5 style={{ fontSize: "0.8125rem", color: "#06b6d4", marginBottom: "0.5rem" }}>Transaction Evidence</h5>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {selectedCase.evidence?.filter((e) => ["amount", "channel", "transaction_type", "sender", "recipient"].includes(e.type)).map((item, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "6px", fontSize: "0.8125rem" }}>
                                <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h5 style={{ fontSize: "0.8125rem", color: "#06b6d4", marginBottom: "0.5rem" }}>Model Evidence</h5>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {selectedCase.evidence?.filter((e) => e.type === "model_score").map((item, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", background: "rgba(239,68,68,0.1)", borderRadius: "6px", fontSize: "0.8125rem" }}>
                                <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                                <span style={{ color: "#ef4444", fontWeight: 700 }}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "timeline" && (
                    <div>
                      <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Timeline Reconstruction
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                        {selectedCase.timeline?.map((event, i) => (
                          <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ width: "100px", fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#06b6d4", marginTop: "0.25rem", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>
                                {event.event.replace("_", " ")}
                              </div>
                              <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                                {event.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "report" && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Report Preview
                        </h4>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                            onClick={() => navigator.clipboard.writeText(selectedCase.narrative_report || "")}
                          >
                            📋 Copy Narrative
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedCase.structured_report, null, 2))}
                          >
                            📋 Copy JSON
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.8125rem", whiteSpace: "pre-wrap", color: "var(--text-secondary)", maxHeight: "400px", overflow: "auto" }}>
                        {selectedCase.narrative_report}
                      </div>
                    </div>
                  )}

                  {activeTab === "chat" && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                      <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Analyst Copilot Chat
                      </h4>

                      {/* Suggested Questions */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                        {suggestedQuestions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => setChatInput(q)}
                            style={{
                              padding: "0.375rem 0.75rem",
                              background: "rgba(168, 85, 247, 0.1)",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                              borderRadius: "20px",
                              fontSize: "0.75rem",
                              color: "#a855f7",
                              cursor: "pointer",
                            }}
                          >
                            {q}
                          </button>
                        ))}
                      </div>

                      {/* Chat Messages */}
                      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                        {chatMessages.length === 0 ? (
                          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                            <p>Ask questions about this case</p>
                            <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>Example: "What evidence is strongest?"</p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i}>
                              <div style={{ padding: "0.75rem", background: "rgba(6, 182, 212, 0.15)", borderRadius: "8px", marginBottom: "0.5rem" }}>
                                <div style={{ fontSize: "0.75rem", color: "#06b6d4", fontWeight: 600, marginBottom: "0.25rem" }}>You asked:</div>
                                <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>{msg.question}</div>
                              </div>
                              <div style={{ padding: "0.75rem", background: "rgba(168, 85, 247, 0.1)", borderRadius: "8px" }}>
                                <div style={{ fontSize: "0.75rem", color: "#a855f7", fontWeight: 600, marginBottom: "0.25rem" }}>Analyst AI:</div>
                                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{msg.response}</div>
                              </div>
                            </div>
                          ))
                        )}
                        {isChatLoading && (
                          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                            Thinking...
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input */}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                          placeholder="Ask about this case..."
                          style={{
                            flex: 1,
                            padding: "0.75rem",
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "var(--text-primary)",
                            fontSize: "0.875rem",
                          }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={handleSendChat}
                          disabled={isChatLoading}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Human Review Controls */}
                <div className="card">
                  <h4 style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Human Review Decision
                  </h4>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add analyst notes (optional)..."
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                        fontSize: "0.875rem",
                        minHeight: "60px",
                        resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <button
                        className="btn"
                        style={{ background: "#10b981", color: "white", fontSize: "0.8125rem" }}
                        onClick={() => handleReview("approve")}
                        disabled={reviewStatus?.submitting}
                      >
                        ✅ Approve for Escalation
                      </button>
                      <button
                        className="btn"
                        style={{ background: "#ef4444", color: "white", fontSize: "0.8125rem" }}
                        onClick={() => handleReview("reject")}
                        disabled={reviewStatus?.submitting}
                      >
                        ❌ Reject
                      </button>
                      <button
                        className="btn"
                        style={{ background: "#f59e0b", color: "white", fontSize: "0.8125rem" }}
                        onClick={() => handleReview("escalate")}
                        disabled={reviewStatus?.submitting}
                      >
                        📤 Escalate
                      </button>
                      <button
                        className="btn"
                        style={{ background: "#6b7280", color: "white", fontSize: "0.8125rem" }}
                        onClick={() => handleReview("hold_internal")}
                        disabled={reviewStatus?.submitting}
                      >
                        🔒 Internal Only
                      </button>
                    </div>
                  </div>
                  {reviewStatus?.message && (
                    <div style={{ marginTop: "0.75rem", padding: "0.5rem", background: reviewStatus.message.includes("Failed") ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)", borderRadius: "6px", fontSize: "0.8125rem", color: reviewStatus.message.includes("Failed") ? "#ef4444" : "#10b981" }}>
                      {reviewStatus.message}
                    </div>
                  )}
                </div>

                {/* Audit Metadata */}
                <div className="card" style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", gap: "2rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span>Model: {selectedCase.audit?.model_version}</span>
                    <span>Prompt: {selectedCase.audit?.prompt_version}</span>
                    <span>Report: {selectedCase.audit?.report_timestamp ? new Date(selectedCase.audit.report_timestamp).toLocaleString() : "N/A"}</span>
                    {selectedCase.audit?.review_timestamp && (
                      <span>Review: {new Date(selectedCase.audit.review_timestamp).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Create Case Modal */}
        {showCreateModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}>
            <div className="card" style={{ width: "500px", maxWidth: "90vw" }}>
              <h3 style={{ marginBottom: "1rem" }}>Create New Case</h3>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Select Transaction
                </label>
                <select
                  value={selectedTransactionId}
                  onChange={(e) => setSelectedTransactionId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="">Select a transaction...</option>
                  {transactions.slice(0, 50).map((t) => (
                    <option key={t.transaction_id} value={t.transaction_id}>
                      {t.transaction_id} - Score: {normalizeFraudScore(t.fraud_score || 0).toFixed(1)}%
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateCase}
                  disabled={!selectedTransactionId || isLoading}
                >
                  Create Case
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
