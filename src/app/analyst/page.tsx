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
  createOverallAnalysisCase,
  askAnalystChat,
  submitCaseReview,
  fetchAdminTransactions,
  fetchCaseReviews,
  sendCaseForReview,
  AnalystCase,
  AnalystChatMessage,
  CaseReview,
  OverallAnalysisScope,
  OverallAnalysisFilters,
} from "@/lib/api";

import CaseOverviewPanel from "@/components/analyst/CaseOverviewPanel";
import AISummaryPanel from "@/components/analyst/AISummaryPanel";
import EvidenceViewer from "@/components/analyst/EvidenceViewer";
import FraudTimeline from "@/components/analyst/FraudTimeline";
import AuthorityRoutingPanel from "@/components/analyst/AuthorityRoutingPanel";
import ReportPreview from "@/components/analyst/ReportPreview";
import AnalystCopilotChat from "@/components/analyst/AnalystCopilotChat";
import HumanReviewWorkflow from "@/components/analyst/HumanReviewWorkflow";
import AuditMetadataCard from "@/components/analyst/AuditMetadataCard";
import CreateCaseModal from "@/components/analyst/CreateCaseModal";

import {
  LayoutDashboard,
  Upload,
  BrainCircuit,
  Settings,
  LogOut,
  Shield,
  User,
  Activity,
  Bot,
  Plus,
  RefreshCw,
  ChevronRight,
  Zap,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeFraudScore(score: number): number {
  if (typeof score !== "number" || isNaN(score)) return 0;
  return score <= 1 ? score * 100 : score;
}

const RISK_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  SUSPICIOUS: "#f59e0b",
  MEDIUM: "#eab308",
  LOW: "#10b981",
};

type AnalystTab =
  | "overview"
  | "evidence"
  | "timeline"
  | "routing"
  | "report"
  | "chat"
  | "review";

// ─── Sidebar ────────────────────────────────────────────────────────────────

function AnalystSidebar({
  loggedIn,
  userRole,
  onLogout,
}: {
  loggedIn: boolean;
  userRole: string | null;
  onLogout: () => void;
}) {
  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/upload", icon: Upload, label: "Upload Dataset" },
    { href: "/explain", icon: BrainCircuit, label: "Explain" },
    { href: "/api-test", icon: Zap, label: "API Test" },
    { href: "/analyst", icon: Bot, label: "Analyst AI", active: true },
    { href: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #0c1524 100%)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "1.25rem 1.25rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Shield style={{ width: "18px", height: "18px", color: "white" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#f8fafc" }}>
              FraudGuard
            </div>
            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>Fraud Detection</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active || false;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.625rem 0.875rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                background: isActive ? "rgba(6,182,212,0.1)" : "transparent",
                color: isActive ? "#06b6d4" : "#94a3b8",
                border: isActive ? "1px solid rgba(6,182,212,0.25)" : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "0.875rem",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {loggedIn && userRole && (
          <div
            style={{
              padding: "0.625rem 0.75rem",
              background: "rgba(59,130,246,0.08)",
              borderRadius: "8px",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
              <User style={{ width: "12px", height: "12px", color: "#60a5fa" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#60a5fa", textTransform: "capitalize" }}>
                {userRole}
              </span>
            </div>
          </div>
        )}

        <div
          style={{
            padding: "0.5rem 0.75rem",
            background: "rgba(16,185,129,0.07)",
            borderRadius: "8px",
            border: "1px solid rgba(16,185,129,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Activity style={{ width: "11px", height: "11px", color: "#34d399" }} />
            <span style={{ fontSize: "0.6875rem", color: "#64748b" }}>ML Backend</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.25rem" }}>
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>Connected</span>
          </div>
        </div>

        {loggedIn ? (
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: "0.875rem",
              borderRadius: "8px",
              width: "100%",
              textAlign: "left",
            }}
          >
            <LogOut style={{ width: "14px", height: "14px" }} />
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.2)",
              borderRadius: "8px",
              textDecoration: "none",
              color: "#06b6d4",
              fontSize: "0.875rem",
            }}
          >
            <User style={{ width: "14px", height: "14px" }} />
            Login
          </Link>
        )}
      </div>
    </aside>
  );
}

// ─── Cases List Panel ────────────────────────────────────────────────────────

function CasesListPanel({
  cases,
  selectedCaseId,
  onSelect,
  onCreateClick,
  isLoading,
}: {
  cases: AnalystCase[];
  selectedCaseId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      style={{
        width: "280px",
        flexShrink: 0,
        background: "var(--bg-card)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1rem 0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Open Cases
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
            {cases.length} pending review
          </div>
        </div>
        <button
          onClick={onCreateClick}
          style={{
            width: "28px",
            height: "28px",
            background: "rgba(6,182,212,0.12)",
            border: "1px solid rgba(6,182,212,0.3)",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#06b6d4",
          }}
          title="Create new case"
        >
          <Plus style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
        {isLoading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
            }}
          >
            <RefreshCw
              style={{
                width: "20px",
                height: "20px",
                margin: "0 auto 0.5rem",
                animation: "spin 1s linear infinite",
              }}
            />
            Loading cases...
          </div>
        ) : cases.length === 0 ? (
          <div
            style={{
              padding: "2rem 1rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.8125rem",
              lineHeight: 1.6,
            }}
          >
            <Bot
              style={{ width: "28px", height: "28px", margin: "0 auto 0.75rem", opacity: 0.3 }}
            />
            <p>No open cases</p>
            <p style={{ fontSize: "0.75rem", marginTop: "0.375rem", opacity: 0.7 }}>
              Create a case from a flagged transaction to begin analysis
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {cases.map((c) => {
              const riskColor = RISK_COLORS[c.risk_level] || "#94a3b8";
              const isSelected = selectedCaseId === c.case_id;
              const scoreDisplay = c.risk_score > 1 ? c.risk_score.toFixed(0) : (c.risk_score * 100).toFixed(0);

              return (
                <button
                  key={c.case_id}
                  onClick={() => onSelect(c.case_id)}
                  style={{
                    padding: "0.75rem 0.875rem",
                    background: isSelected
                      ? "rgba(6,182,212,0.1)"
                      : "rgba(0,0,0,0.15)",
                    border: `1px solid ${isSelected ? "rgba(6,182,212,0.3)" : "transparent"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: isSelected ? "#06b6d4" : "var(--text-primary)",
                      }}
                    >
                      {c.case_id}
                    </span>
                    <span
                      style={{
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        background: `${riskColor}20`,
                        color: riskColor,
                        flexShrink: 0,
                      }}
                    >
                      {c.risk_level}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                    {c.transaction_id}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                      {(c.recommended_authorities || ["Internal"]).join(", ")}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        color: riskColor,
                      }}
                    >
                      {scoreDisplay}%
                    </span>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        marginTop: "0.375rem",
                      }}
                    >
                      <ChevronRight style={{ width: "12px", height: "12px", color: "#06b6d4" }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

const TABS: { key: AnalystTab; label: string; badge?: string }[] = [
  { key: "overview", label: "AI Summary" },
  { key: "evidence", label: "Evidence" },
  { key: "timeline", label: "Timeline" },
  { key: "routing", label: "Authority Routing" },
  { key: "report", label: "Report Preview" },
  { key: "chat", label: "Copilot Chat" },
  { key: "review", label: "Human Review" },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AnalystPage() {
  const [cases, setCases] = useState<AnalystCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<AnalystCase | null>(null);
  const [reviews, setReviews] = useState<CaseReview[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<AnalystChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<AnalystTab>("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<{ submitting: boolean; message: string }>({
    submitting: false,
    message: "",
  });
  // These must start as null/false on both server and client to avoid
  // React hydration mismatch (error #418). useEffect sets them client-side.
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    // Read localStorage only on client after hydration to prevent error #418.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(isLoggedIn());
    setUserRole(isAdmin() ? "admin" : getUserRole() || null);
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

  useEffect(() => {
    // Data fetching on mount — standard React pattern for initial load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCases();
    loadTransactions();
  }, []); // mount-only

  const handleSelectCase = async (caseId: string) => {
    setIsLoading(true);
    setChatMessages([]);
    setActiveTab("overview");
    try {
      const [caseData, caseReviews] = await Promise.all([
        fetchAnalystCase(caseId),
        fetchCaseReviews(caseId),
      ]);
      setSelectedCase(caseData);
      setReviews(caseReviews);
    } catch (error) {
      console.error("[Analyst] Error loading case:", error);
    }
    setIsLoading(false);
  };

  const handleCreateSingle = async (
    transactionId: string,
    txnData: Record<string, unknown>
  ) => {
    setIsLoading(true);
    const result = await createAnalystCase(transactionId, txnData);
    if (result.success && result.case) {
      setCases((prev) => [result.case!, ...prev]);
      setSelectedCase(result.case!);
      setShowCreateModal(false);
      setActiveTab("overview");
    } else {
      alert(result.error || "Failed to create case");
    }
    setIsLoading(false);
  };

  const handleCreateOverall = async (
    scope: OverallAnalysisScope,
    filters: OverallAnalysisFilters,
    selectedTransactions: any[]
  ) => {
    setIsLoading(true);
    const result = await createOverallAnalysisCase(scope, filters, selectedTransactions);
    if (result.success && result.case) {
      setCases((prev) => [result.case!, ...prev]);
      setSelectedCase(result.case!);
      setShowCreateModal(false);
      setActiveTab("overview");
    } else {
      alert(result.error || "Failed to create overall analysis case");
    }
    setIsLoading(false);
  };

  const handleSendChat = async (question: string) => {
    if (!selectedCase) return;
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
          response: result.error || "Failed to get response from the backend.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setIsChatLoading(false);
  };

  const handleReview = async (decision: string, notes: string) => {
    if (!selectedCase) return;

    setReviewStatus({ submitting: true, message: "" });

    const result = await submitCaseReview(selectedCase.case_id, decision, notes);

    if (result.success) {
      setReviewStatus({ submitting: false, message: result.message || "Review submitted successfully." });
      // Refresh case and reviews
      const [updatedCase, updatedReviews] = await Promise.all([
        fetchAnalystCase(selectedCase.case_id),
        fetchCaseReviews(selectedCase.case_id),
      ]);
      if (updatedCase) setSelectedCase(updatedCase);
      setReviews(updatedReviews);
      await loadCases();
      setTimeout(() => setReviewStatus({ submitting: false, message: "" }), 4000);
    } else {
      setReviewStatus({
        submitting: false,
        message: result.error || "Failed to submit review.",
      });
    }
  };

  const handleApproveEscalation = () => handleReview("approve", "Approved for escalation via report module.");
  const handleMarkInternal = () => handleReview("hold_internal", "Marked as internal review only via report module.");
  const handleSendForReview = async () => {
    if (!selectedCase) return;
    const result = await sendCaseForReview(selectedCase.case_id);
    if (result.success) {
      setReviewStatus({ submitting: false, message: result.message || "Case sent for review." });
      setTimeout(() => setReviewStatus({ submitting: false, message: "" }), 3000);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <AnalystSidebar loggedIn={loggedIn} userRole={userRole} onLogout={handleLogout} />

      {/* Main area (offset for fixed sidebar) */}
      <div style={{ marginLeft: "240px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top header */}
        <header
          style={{
            padding: "0.875rem 1.5rem",
            background: "rgba(15,23,42,0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 40,
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Bot style={{ width: "20px", height: "20px", color: "#06b6d4" }} />
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Analyst AI Assistant
              </h2>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                Fraud investigation copilot — FraudGuard Operations
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={loadCases}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.375rem 0.75rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              <RefreshCw style={{ width: "12px", height: "12px" }} />
              Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ fontSize: "0.8125rem", padding: "0.375rem 0.875rem", display: "flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Plus style={{ width: "13px", height: "13px" }} />
              New Case
            </button>
          </div>
        </header>

        {/* Body: two-column layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Cases list */}
          <CasesListPanel
            cases={cases}
            selectedCaseId={selectedCase?.case_id || null}
            onSelect={handleSelectCase}
            onCreateClick={() => setShowCreateModal(true)}
            isLoading={isLoading && !selectedCase}
          />

          {/* Case detail panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!selectedCase ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  gap: "1rem",
                  padding: "3rem",
                }}
              >
                <Bot style={{ width: "56px", height: "56px", opacity: 0.2 }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                    Select a case to begin investigation
                  </p>
                  <p style={{ fontSize: "0.875rem" }}>
                    Choose an open case from the list, or create a new case from a flagged transaction.
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.75rem",
                    marginTop: "1rem",
                    maxWidth: "500px",
                    width: "100%",
                  }}
                >
                  {[
                    "Review AI-generated case summary",
                    "Inspect evidence by category",
                    "Reconstruct fraud timeline",
                    "See authority routing recommendations",
                    "Preview regulator-ready reports",
                    "Chat with the AI copilot",
                  ].map((feature, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "0.75rem",
                        background: "rgba(6,182,212,0.05)",
                        border: "1px solid rgba(6,182,212,0.1)",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        textAlign: "center",
                      }}
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Case overview header */}
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    flexShrink: 0,
                  }}
                >
                  <CaseOverviewPanel caseData={selectedCase} />
                </div>

                {/* Tab navigation */}
                <div
                  style={{
                    display: "flex",
                    gap: "0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    padding: "0 1.5rem",
                    flexShrink: 0,
                    overflowX: "auto",
                  }}
                >
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        padding: "0.75rem 1rem",
                        background: "none",
                        border: "none",
                        borderBottom:
                          activeTab === tab.key
                            ? "2px solid #06b6d4"
                            : "2px solid transparent",
                        color:
                          activeTab === tab.key ? "#06b6d4" : "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {tab.label}
                      {tab.key === "review" && selectedCase.human_review_required && (
                        <span
                          style={{
                            marginLeft: "0.375rem",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            display: "inline-block",
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content area */}
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "1.5rem",
                  }}
                >
                  {activeTab === "overview" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <AISummaryPanel caseData={selectedCase} />
                      <AuthorityRoutingPanel caseData={selectedCase} />
                    </div>
                  )}

                  {activeTab === "evidence" && (
                    <EvidenceViewer evidence={selectedCase.evidence || []} />
                  )}

                  {activeTab === "timeline" && (
                    <FraudTimeline timeline={selectedCase.timeline || []} />
                  )}

                  {activeTab === "routing" && (
                    <AuthorityRoutingPanel caseData={selectedCase} />
                  )}

                  {activeTab === "report" && (
                    <ReportPreview
                      caseData={selectedCase}
                      onApproveEscalation={handleApproveEscalation}
                      onMarkInternal={handleMarkInternal}
                      onSendForReview={handleSendForReview}
                    />
                  )}

                  {activeTab === "chat" && (
                    <AnalystCopilotChat
                      caseId={selectedCase.case_id}
                      messages={chatMessages}
                      isLoading={isChatLoading}
                      onSend={handleSendChat}
                    />
                  )}

                  {activeTab === "review" && (
                    <HumanReviewWorkflow
                      caseData={selectedCase}
                      reviews={reviews}
                      onReview={handleReview}
                      isSubmitting={reviewStatus.submitting}
                      submitMessage={reviewStatus.message}
                    />
                  )}
                </div>

                {/* Audit footer */}
                <div
                  style={{
                    padding: "0.5rem 1.5rem",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    flexShrink: 0,
                  }}
                >
                  <AuditMetadataCard caseData={selectedCase} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <CreateCaseModal
          transactions={transactions}
          isLoading={isLoading}
          onCreateSingle={handleCreateSingle}
          onCreateOverall={handleCreateOverall}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
