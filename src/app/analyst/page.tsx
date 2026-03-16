"use client";

import { useState, useEffect } from "react";
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
  fetchCaseReviews,
  fetchAdminTransactions,
  AnalystCase,
  AnalystChatMessage,
  CaseReview,
} from "@/lib/api";

import CaseOverviewPanel from "@/components/analyst/CaseOverviewPanel";
import AISummaryPanel from "@/components/analyst/AISummaryPanel";
import ReasonsIndicators from "@/components/analyst/ReasonsIndicators";
import EvidenceViewer from "@/components/analyst/EvidenceViewer";
import FraudTimeline from "@/components/analyst/FraudTimeline";
import AuthorityRoutingPanel from "@/components/analyst/AuthorityRoutingPanel";
import ReportPreviewModule from "@/components/analyst/ReportPreviewModule";
import AnalystCopilotChat from "@/components/analyst/AnalystCopilotChat";
import HumanReviewWorkflow from "@/components/analyst/HumanReviewWorkflow";
import AuditMetadataPanel from "@/components/analyst/AuditMetadataPanel";

const ML_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ml-file-for-url.onrender.com";

function normalizeFraudScore(score: number): number {
  if (typeof score !== "number" || isNaN(score)) return 0;
  return score <= 1 ? score * 100 : score;
}

const riskLevelColors: Record<string, string> = {
  HIGH: "#ef4444",
  SUSPICIOUS: "#f59e0b",
  MEDIUM: "#eab308",
  LOW: "#10b981",
};

type AnalystTab = "summary" | "evidence" | "timeline" | "routing" | "report" | "chat";

const TABS: { key: AnalystTab; label: string; icon: string }[] = [
  { key: "summary", label: "AI Summary", icon: "🤖" },
  { key: "evidence", label: "Evidence", icon: "🔬" },
  { key: "timeline", label: "Timeline", icon: "🕐" },
  { key: "routing", label: "Authority Routing", icon: "🏛" },
  { key: "report", label: "Report Preview", icon: "📄" },
  { key: "chat", label: "Copilot Chat", icon: "💬" },
];

export default function AnalystPage() {
  const [cases, setCases] = useState<AnalystCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<AnalystCase | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<AnalystChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<AnalystTab>("summary");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<{ submitting: boolean; message: string } | null>(null);
  const [reviewHistory, setReviewHistory] = useState<CaseReview[]>([]);
  const [mlStatus, setMlStatus] = useState<"loading" | "online" | "offline">("loading");
  const [casesFilter, setCasesFilter] = useState<"all" | "open" | "high_risk">("all");
  const [userRole] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return isAdmin() ? "admin" : getUserRole() || null;
  });
  const [loggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return isLoggedIn();
  });

  const checkMlHealth = async () => {
    try {
      const res = await fetch(`${ML_SERVICE_URL}/health`, { method: "GET" });
      setMlStatus(res.ok ? "online" : "offline");
    } catch {
      setMlStatus("offline");
    }
  };

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

  useEffect(() => {
    void (async () => {
      await Promise.all([loadCases(), loadTransactions(), checkMlHealth()]);
    })();
  }, []);

  const handleSelectCase = async (caseId: string) => {
    setIsLoading(true);
    setChatMessages([]);
    setReviewHistory([]);
    setReviewNotes("");
    setReviewStatus(null);
    try {
      const [caseData, reviews] = await Promise.all([
        fetchAnalystCase(caseId),
        fetchCaseReviews(caseId),
      ]);
      setSelectedCase(caseData);
      setReviewHistory(reviews || []);
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
      alert("Transaction not found in loaded transactions.");
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
      setCases((prev) => [...prev, result.case!]);
      setSelectedCase(result.case!);
      setActiveTab("summary");
      setShowCreateModal(false);
      setSelectedTransactionId("");
    } else {
      alert(result.error || "Failed to create case. Please check the backend connection.");
    }
    setIsLoading(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedCase) return;
    const question = chatInput.trim();
    setChatInput("");
    setIsChatLoading(true);

    const result = await askAnalystChat(selectedCase.case_id, question);
    if (result.success && result.response) {
      setChatMessages((prev) => [
        ...prev,
        {
          case_id: selectedCase.case_id,
          question,
          response: result.response!,
          timestamp: new Date().toISOString(),
        },
      ]);
    } else {
      setChatMessages((prev) => [
        ...prev,
        {
          case_id: selectedCase.case_id,
          question,
          response: result.error || "The backend did not return a response. Please check the ML service connection.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setIsChatLoading(false);
  };

  const handleReview = async (decision: string) => {
    if (!selectedCase) return;
    setReviewStatus({ submitting: true, message: "" });

    const result = await submitCaseReview(selectedCase.case_id, decision, reviewNotes);
    if (result.success) {
      setReviewStatus({ submitting: false, message: result.message || "Review submitted successfully." });
      await Promise.all([loadCases()]);
      const updated = await fetchAnalystCase(selectedCase.case_id);
      if (updated) setSelectedCase(updated);
      const reviews = await fetchCaseReviews(selectedCase.case_id);
      setReviewHistory(reviews || []);
      setReviewNotes("");
      setTimeout(() => setReviewStatus(null), 4000);
    } else {
      setReviewStatus({ submitting: false, message: result.error || "Failed to submit review." });
    }
  };

  const filteredCases = cases.filter((c) => {
    if (casesFilter === "open") return !["closed", "rejected"].includes(c.status || "");
    if (casesFilter === "high_risk") return c.risk_level === "HIGH";
    return true;
  });

  const navItems = [
    { href: "/", label: "Dashboard", icon: "📊" },
    { href: "/upload", label: "Upload", icon: "📤" },
    { href: "/explain", label: "Explain", icon: "🔍" },
    { href: "/analyst", label: "Analyst AI", icon: "🤖", active: true },
    { href: "/api-test", label: "API Test", icon: "⚡" },
    { href: "/admin", label: "Admin", icon: "⚙" },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🛡</div>
          <div>
            <h1 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>FraudGuard</h1>
            <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
              FRAUD OPERATIONS
            </div>
          </div>
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
          {loggedIn && (
            <button
              onClick={() => { logout(); window.location.href = "/"; }}
              className="nav-item"
              style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
            >
              <span className="nav-icon">🚪</span>
              <span>Logout</span>
            </button>
          )}
          {!loggedIn && (
            <Link href="/login" className="nav-item">
              <span className="nav-icon">🔐</span>
              <span>Login</span>
            </Link>
          )}
        </nav>

        {/* ML Status */}
        <div
          style={{
            marginTop: "auto",
            padding: "0.875rem",
            background: mlStatus === "online" ? "rgba(16,185,129,0.08)" : mlStatus === "loading" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${mlStatus === "online" ? "rgba(16,185,129,0.2)" : mlStatus === "loading" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)"}`,
            borderRadius: "10px",
          }}
        >
          <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
            ML BACKEND
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: mlStatus === "online" ? "#10b981" : mlStatus === "loading" ? "#f59e0b" : "#ef4444",
                boxShadow: mlStatus === "online" ? "0 0 6px #10b981" : "none",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {mlStatus === "online" ? "Connected" : mlStatus === "loading" ? "Connecting..." : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Role indicator */}
        {loggedIn && userRole && (
          <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.875rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span style={{ textTransform: "uppercase", fontWeight: 600, color: userRole === "admin" ? "#a855f7" : "#06b6d4" }}>
              {userRole}
            </span>
            {" "}session active
          </div>
        )}

        <div style={{ padding: "0.5rem 0.875rem", fontSize: "0.625rem", color: "var(--text-muted)" }}>
          Analyst AI Assistant v2.0
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Page header */}
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Analyst AI Assistant</h2>
              <span
                style={{
                  padding: "0.25rem 0.625rem",
                  background: "rgba(6,182,212,0.12)",
                  border: "1px solid rgba(6,182,212,0.25)",
                  borderRadius: "6px",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: "#06b6d4",
                  letterSpacing: "0.06em",
                }}
              >
                FRAUD OPS COPILOT
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
              Review flagged cases, inspect evidence, understand routing recommendations, and make informed human review decisions.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.125rem",
              background: "rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.35)",
              borderRadius: "9px",
              color: "#06b6d4",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + New Case
          </button>
        </div>

        {/* Layout: cases list + main panel */}
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.25rem", minHeight: "calc(100vh - 160px)" }}>
          {/* Cases List Panel */}
          <div
            className="card"
            style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: "0" }}
          >
            {/* Cases header */}
            <div
              style={{
                padding: "0.875rem 1rem",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Open Cases
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isLoading && (
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(6,182,212,0.3)",
                        borderTop: "2px solid #06b6d4",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  )}
                  <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    {filteredCases.length} case{filteredCases.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Filter tabs */}
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[
                  { key: "all", label: "All" },
                  { key: "open", label: "Open" },
                  { key: "high_risk", label: "High Risk" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setCasesFilter(f.key as any)}
                    style={{
                      flex: 1,
                      padding: "0.3rem 0.25rem",
                      background: casesFilter === f.key ? "rgba(6,182,212,0.2)" : "transparent",
                      border: `1px solid ${casesFilter === f.key ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "6px",
                      color: casesFilter === f.key ? "#06b6d4" : "var(--text-muted)",
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cases list */}
            <div style={{ flex: 1, overflow: "auto", padding: "0.625rem" }}>
              {filteredCases.length === 0 ? (
                <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.625rem", opacity: 0.4 }}>📂</div>
                  <p style={{ fontSize: "0.875rem", marginBottom: "0.375rem" }}>No cases available.</p>
                  <p style={{ fontSize: "0.75rem" }}>
                    Create a case from a flagged transaction to begin investigation.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {filteredCases.map((c) => {
                    const isSelected = selectedCase?.case_id === c.case_id;
                    const riskColor = riskLevelColors[c.risk_level] || "#64748b";
                    return (
                      <button
                        key={c.case_id}
                        onClick={() => handleSelectCase(c.case_id)}
                        style={{
                          padding: "0.75rem 0.875rem",
                          background: isSelected ? "rgba(6,182,212,0.12)" : "rgba(0,0,0,0.15)",
                          border: `1px solid ${isSelected ? "rgba(6,182,212,0.35)" : "rgba(255,255,255,0.05)"}`,
                          borderRadius: "9px",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: isSelected ? "#06b6d4" : "var(--text-primary)", fontFamily: "monospace" }}>
                            {c.case_id}
                          </span>
                          <span
                            style={{
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              background: `${riskColor}20`,
                              color: riskColor,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {c.risk_level}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem", fontFamily: "monospace" }}>
                          {c.transaction_id}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.6875rem", color: "#a855f7" }}>
                            {(c.recommended_authorities || ["Internal"]).join(" · ")}
                          </span>
                          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                            {c.risk_score.toFixed(0)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Investigation Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflow: "hidden" }}>
            {!selectedCase ? (
              <div
                className="card"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "500px" }}
              >
                <div style={{ textAlign: "center", color: "var(--text-muted)", maxWidth: "400px" }}>
                  <div style={{ fontSize: "3.5rem", marginBottom: "1rem", opacity: 0.3 }}>🔍</div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>
                    No Case Selected
                  </h3>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>
                    Select a case from the list on the left to begin investigation, or create a new case from a
                    flagged transaction.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      marginTop: "1.25rem",
                      padding: "0.625rem 1.25rem",
                      background: "rgba(6,182,212,0.15)",
                      border: "1px solid rgba(6,182,212,0.35)",
                      borderRadius: "9px",
                      color: "#06b6d4",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Create New Case
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Case Overview Panel */}
                <CaseOverviewPanel caseData={selectedCase} />

                {/* Navigation Tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.125rem",
                    padding: "0.25rem",
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    overflowX: "auto",
                  }}
                >
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        padding: "0.5rem 0.875rem",
                        background: activeTab === tab.key ? "rgba(6,182,212,0.15)" : "transparent",
                        border: activeTab === tab.key ? "1px solid rgba(6,182,212,0.3)" : "1px solid transparent",
                        borderRadius: "7px",
                        color: activeTab === tab.key ? "#06b6d4" : "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: activeTab === tab.key ? 600 : 500,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s",
                        flex: "1",
                        justifyContent: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.875rem" }}>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="card" style={{ flex: 1, overflow: "auto" }}>
                  {isLoading && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "3px solid rgba(6,182,212,0.3)",
                          borderTop: "3px solid #06b6d4",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          marginRight: "0.75rem",
                        }}
                      />
                      Loading case data...
                    </div>
                  )}

                  {!isLoading && activeTab === "summary" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                      <AISummaryPanel
                        summary={selectedCase.summary}
                        caseType={selectedCase.case_type}
                        riskLevel={selectedCase.risk_level}
                        humanReviewRequired={selectedCase.human_review_required}
                      />
                      <ReasonsIndicators reasons={selectedCase.reasons || []} />
                    </div>
                  )}

                  {!isLoading && activeTab === "evidence" && (
                    <EvidenceViewer evidence={selectedCase.evidence || []} />
                  )}

                  {!isLoading && activeTab === "timeline" && (
                    <FraudTimeline timeline={selectedCase.timeline || []} />
                  )}

                  {!isLoading && activeTab === "routing" && (
                    <AuthorityRoutingPanel
                      authorities={selectedCase.recommended_authorities || []}
                      caseType={selectedCase.case_type}
                    />
                  )}

                  {!isLoading && activeTab === "report" && (
                    <ReportPreviewModule
                      caseData={selectedCase}
                      onExport={(format) => {
                        const content = format === "json"
                          ? JSON.stringify(selectedCase.structured_report, null, 2)
                          : selectedCase.narrative_report || "";
                        const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${selectedCase.case_id}_report.${format === "json" ? "json" : "txt"}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      onSendForReview={() => handleReview("mark_reviewed")}
                      onApproveEscalation={() => handleReview("approve")}
                      onMarkInternal={() => handleReview("hold_internal")}
                    />
                  )}

                  {!isLoading && activeTab === "chat" && (
                    <AnalystCopilotChat
                      caseId={selectedCase.case_id}
                      messages={chatMessages}
                      isLoading={isChatLoading}
                      chatInput={chatInput}
                      onInputChange={setChatInput}
                      onSend={handleSendChat}
                      onSuggestedQuestion={(q) => { setChatInput(q); }}
                    />
                  )}
                </div>

                {/* Human Review Workflow */}
                <div className="card">
                  <div style={{ marginBottom: "1rem" }}>
                    <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
                      Human Review Decision
                    </h4>
                  </div>
                  <HumanReviewWorkflow
                    caseId={selectedCase.case_id}
                    currentDecision={selectedCase.audit?.reviewer_decision}
                    reviewHistory={reviewHistory}
                    reviewerNotes={reviewNotes}
                    onNotesChange={setReviewNotes}
                    onDecision={handleReview}
                    isSubmitting={reviewStatus?.submitting || false}
                    statusMessage={reviewStatus?.message}
                    humanReviewRequired={selectedCase.human_review_required}
                  />
                </div>

                {/* Audit Metadata */}
                <AuditMetadataPanel
                  audit={selectedCase.audit}
                  caseId={selectedCase.case_id}
                  caseStatus={selectedCase.status}
                  createdAt={selectedCase.created_at}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div
            className="card"
            style={{ width: "520px", maxWidth: "92vw", padding: "1.75rem" }}
          >
            <div style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.375rem" }}>
                Create Analyst Case
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Select a flagged transaction to initiate a new analyst investigation case. The backend will generate an
                AI assessment for analyst review.
              </p>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Select Transaction
              </label>
              <select
                value={selectedTransactionId}
                onChange={(e) => setSelectedTransactionId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              >
                <option value="">Choose a transaction...</option>
                {transactions.slice(0, 100).map((t) => (
                  <option key={t.transaction_id || t.id} value={t.transaction_id || String(t.id)}>
                    {t.transaction_id || `TXN-${t.id}`} — Risk: {normalizeFraudScore(t.fraud_score || 0).toFixed(1)}%
                    {t.amount ? ` — KES ${Number(t.amount).toLocaleString()}` : ""}
                  </option>
                ))}
              </select>
              {transactions.length === 0 && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  No transactions loaded. Upload a dataset first or ensure the ML backend is connected.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "0.625rem 1.125rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                disabled={!selectedTransactionId || isLoading}
                style={{
                  padding: "0.625rem 1.25rem",
                  background: !selectedTransactionId || isLoading ? "rgba(6,182,212,0.3)" : "rgba(6,182,212,0.8)",
                  border: "1px solid rgba(6,182,212,0.4)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: !selectedTransactionId || isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Creating..." : "Create Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
