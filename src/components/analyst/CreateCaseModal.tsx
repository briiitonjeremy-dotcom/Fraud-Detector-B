"use client";

import { useState, useMemo } from "react";
import {
  Bot,
  RefreshCw,
  X,
  Hash,
  Layers,
  Filter,
  Calendar,
  User,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  OverallAnalysisScope,
  OverallAnalysisFilters,
} from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type AnalysisMode = "single_transaction" | "overall_analysis";

interface RawTransaction {
  transaction_id?: string;
  id?: number | string;
  fraud_score?: number | null;
  risk_level?: string;
  is_fraud?: boolean;
  nameOrig?: string;
  nameDest?: string;
  amount?: number;
  type?: string;
  channel?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface CreateCaseModalProps {
  transactions: RawTransaction[];
  isLoading: boolean;
  onCreateSingle: (transactionId: string, txnData: Record<string, unknown>) => void;
  onCreateOverall: (
    scope: OverallAnalysisScope,
    filters: OverallAnalysisFilters,
    selectedTransactions: RawTransaction[]
  ) => void;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCOPE_OPTIONS: { value: OverallAnalysisScope; label: string; description: string }[] = [
  {
    value: "all_flagged",
    label: "All Flagged Transactions",
    description: "Analyze every transaction the model flagged as suspicious",
  },
  {
    value: "high_risk",
    label: "High-Risk Transactions",
    description: "Focus on transactions with HIGH risk level only",
  },
  {
    value: "medium_risk",
    label: "Medium-Risk Transactions",
    description: "Review MEDIUM and SUSPICIOUS risk level transactions",
  },
  {
    value: "date_range",
    label: "Date Range",
    description: "Analyze transactions within a specific time window",
  },
  {
    value: "by_account",
    label: "By Account / Customer",
    description: "Investigate all transactions linked to a specific account",
  },
  {
    value: "by_risk_level",
    label: "Custom Risk Level Filter",
    description: "Filter by a specific risk level and minimum score threshold",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeFraudScore(score: number | null | undefined): number {
  if (typeof score !== "number" || isNaN(score)) return 0;
  return score <= 1 ? score * 100 : score;
}

function getRiskColor(riskLevel?: string): string {
  const map: Record<string, string> = {
    HIGH: "#ef4444",
    SUSPICIOUS: "#f59e0b",
    MEDIUM: "#eab308",
    LOW: "#10b981",
  };
  return map[riskLevel?.toUpperCase() || ""] || "#94a3b8";
}

// ─── Mode Selector ───────────────────────────────────────────────────────────

function ModeSelector({
  mode,
  onChange,
}: {
  mode: AnalysisMode;
  onChange: (m: AnalysisMode) => void;
}) {
  const modes: { key: AnalysisMode; icon: React.ElementType; label: string; sub: string }[] = [
    {
      key: "single_transaction",
      icon: Hash,
      label: "Single Transaction",
      sub: "Create a case from one flagged transaction",
    },
    {
      key: "overall_analysis",
      icon: Layers,
      label: "Overall Transaction Analysis",
      sub: "Analyze a group of transactions or a suspicious pattern",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
      <div
        style={{
          fontSize: "0.6875rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "0.25rem",
        }}
      >
        Analysis Mode
      </div>
      {modes.map((m) => {
        const Icon = m.icon;
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              padding: "0.75rem 1rem",
              background: active ? "rgba(6,182,212,0.1)" : "rgba(0,0,0,0.2)",
              border: `1px solid ${active ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
              transition: "all 0.15s ease",
            }}
          >
            {/* Radio indicator */}
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                border: `2px solid ${active ? "#06b6d4" : "rgba(255,255,255,0.2)"}`,
                background: active ? "#06b6d4" : "transparent",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {active && (
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "white",
                  }}
                />
              )}
            </div>

            <Icon
              style={{
                width: "16px",
                height: "16px",
                color: active ? "#06b6d4" : "#64748b",
                flexShrink: 0,
              }}
            />

            <div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: active ? "#06b6d4" : "var(--text-primary)",
                  marginBottom: "0.125rem",
                }}
              >
                {m.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Single Transaction Form ──────────────────────────────────────────────────

function SingleTransactionForm({
  transactions,
  selectedId,
  onSelect,
}: {
  transactions: RawTransaction[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = transactions.find(
    (t) => t.transaction_id === selectedId || String(t.id) === selectedId
  );

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "0.6875rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.5rem",
        }}
      >
        Select Transaction
      </label>

      <div style={{ position: "relative" }}>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 2.25rem 0.75rem 1rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            outline: "none",
            appearance: "none",
            cursor: "pointer",
          }}
        >
          <option value="">Select a transaction to analyze...</option>
          {transactions.slice(0, 100).map((t) => {
            const txnId = t.transaction_id || String(t.id);
            const score = normalizeFraudScore(t.fraud_score);
            const flagged = t.is_fraud || score >= 50;
            return (
              <option key={txnId} value={txnId}>
                {txnId} — Score: {score.toFixed(1)}%{flagged ? " ⚠ FLAGGED" : ""}
              </option>
            );
          })}
        </select>
        <ChevronDown
          style={{
            position: "absolute",
            right: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            width: "14px",
            height: "14px",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
      </div>

      {transactions.length === 0 && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
          No transactions loaded. Upload a dataset first or check backend connectivity.
        </p>
      )}

      {/* Preview card for selected transaction */}
      {selected && (
        <div
          style={{
            marginTop: "0.875rem",
            padding: "0.75rem 1rem",
            background: "rgba(6,182,212,0.06)",
            border: "1px solid rgba(6,182,212,0.2)",
            borderRadius: "8px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.375rem 1rem",
          }}
        >
          {[
            ["Transaction ID", selected.transaction_id || String(selected.id)],
            [
              "Risk Score",
              `${normalizeFraudScore(selected.fraud_score).toFixed(1)}%`,
            ],
            ["Risk Level", selected.risk_level || "—"],
            ["Type", selected.type || "—"],
            ["Amount", selected.amount != null ? `KES ${Number(selected.amount).toLocaleString()}` : "—"],
            ["Sender", selected.nameOrig || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: "0.625rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color:
                    label === "Risk Score"
                      ? getRiskColor(selected.risk_level)
                      : "var(--text-primary)",
                  fontWeight: label === "Risk Score" ? 700 : 400,
                }}
              >
                {String(value)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overall Analysis Form ────────────────────────────────────────────────────

function OverallAnalysisForm({
  transactions,
  scope,
  filters,
  onScopeChange,
  onFiltersChange,
  matchCount,
}: {
  transactions: RawTransaction[];
  scope: OverallAnalysisScope;
  filters: OverallAnalysisFilters;
  onScopeChange: (s: OverallAnalysisScope) => void;
  onFiltersChange: (f: OverallAnalysisFilters) => void;
  matchCount: number;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "7px",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.6875rem",
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.375rem",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Scope selector */}
      <div>
        <label style={labelStyle}>
          <Filter style={{ display: "inline", width: "10px", height: "10px", marginRight: "0.25rem" }} />
          Analysis Scope
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {SCOPE_OPTIONS.map((opt) => {
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onScopeChange(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.5rem 0.75rem",
                  background: active ? "rgba(168,85,247,0.1)" : "rgba(0,0,0,0.15)",
                  border: `1px solid ${active ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "7px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    border: `2px solid ${active ? "#a855f7" : "rgba(255,255,255,0.2)"}`,
                    background: active ? "#a855f7" : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active && (
                    <div
                      style={{ width: "5px", height: "5px", borderRadius: "50%", background: "white" }}
                    />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: active ? "#c084fc" : "var(--text-primary)",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    {opt.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional filters */}
      {scope === "date_range" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>
              <Calendar
                style={{ display: "inline", width: "10px", height: "10px", marginRight: "0.25rem" }}
              />
              Date From
            </label>
            <input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              <Calendar
                style={{ display: "inline", width: "10px", height: "10px", marginRight: "0.25rem" }}
              />
              Date To
            </label>
            <input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {scope === "by_account" && (
        <div>
          <label style={labelStyle}>
            <User
              style={{ display: "inline", width: "10px", height: "10px", marginRight: "0.25rem" }}
            />
            Account / Customer Reference
          </label>
          <input
            type="text"
            placeholder="Enter account ID or customer reference..."
            value={filters.account || ""}
            onChange={(e) => onFiltersChange({ ...filters, account: e.target.value })}
            style={inputStyle}
          />
        </div>
      )}

      {scope === "by_risk_level" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>
              <TrendingUp
                style={{ display: "inline", width: "10px", height: "10px", marginRight: "0.25rem" }}
              />
              Risk Level
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={filters.risk_level || ""}
                onChange={(e) => onFiltersChange({ ...filters, risk_level: e.target.value })}
                style={{ ...inputStyle, appearance: "none", paddingRight: "2rem" }}
              >
                <option value="">Any risk level</option>
                <option value="HIGH">HIGH</option>
                <option value="SUSPICIOUS">SUSPICIOUS</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <ChevronDown
                style={{
                  position: "absolute",
                  right: "0.625rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "13px",
                  height: "13px",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Min Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 50"
              value={filters.min_score != null ? filters.min_score : ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  min_score: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Transaction match preview */}
      <div
        style={{
          padding: "0.625rem 0.875rem",
          background:
            matchCount > 0 ? "rgba(168,85,247,0.08)" : "rgba(100,116,139,0.08)",
          border: `1px solid ${matchCount > 0 ? "rgba(168,85,247,0.25)" : "rgba(100,116,139,0.2)"}`,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Layers
          style={{
            width: "14px",
            height: "14px",
            color: matchCount > 0 ? "#c084fc" : "#64748b",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "0.8125rem",
            color: matchCount > 0 ? "#c084fc" : "var(--text-muted)",
            fontWeight: 600,
          }}
        >
          {matchCount} transaction{matchCount !== 1 ? "s" : ""} match this scope
        </span>
        {matchCount > 50 && (
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
            First 50 sent to backend
          </span>
        )}
      </div>

      {/* Future feature notice */}
      <div
        style={{
          padding: "0.625rem 0.875rem",
          background: "rgba(6,182,212,0.05)",
          border: "1px solid rgba(6,182,212,0.15)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
        }}
      >
        <Info
          style={{ width: "13px", height: "13px", color: "#06b6d4", flexShrink: 0, marginTop: "2px" }}
        />
        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
          Overall analysis supports broader scope. Future extensions include fraud pattern
          discovery, linked account graphs, transaction clusters, and account takeover timelines.
        </span>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CreateCaseModal({
  transactions,
  isLoading,
  onCreateSingle,
  onCreateOverall,
  onClose,
}: CreateCaseModalProps) {
  const [mode, setMode] = useState<AnalysisMode>("single_transaction");
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [scope, setScope] = useState<OverallAnalysisScope>("all_flagged");
  const [filters, setFilters] = useState<OverallAnalysisFilters>({});

  // Compute which transactions match the current overall analysis scope
  const matchingTransactions = useMemo(() => {
    if (mode !== "overall_analysis") return [];

    return transactions.filter((t) => {
      const score = normalizeFraudScore(t.fraud_score);
      const riskLevel = (t.risk_level || "").toUpperCase();
      const flagged = t.is_fraud || score >= 50;

      if (scope === "all_flagged") return flagged;
      if (scope === "high_risk") return riskLevel === "HIGH" || score >= 70;
      if (scope === "medium_risk") return riskLevel === "MEDIUM" || riskLevel === "SUSPICIOUS";
      if (scope === "by_risk_level") {
        const matchLevel = filters.risk_level ? riskLevel === filters.risk_level.toUpperCase() : true;
        const matchScore = filters.min_score != null ? score >= filters.min_score : true;
        return matchLevel && matchScore && flagged;
      }
      if (scope === "date_range") {
        if (!filters.date_from && !filters.date_to) return flagged;
        const created = t.created_at ? new Date(t.created_at as string) : null;
        if (!created) return flagged;
        const from = filters.date_from ? new Date(filters.date_from) : null;
        const to = filters.date_to ? new Date(filters.date_to + "T23:59:59") : null;
        return (
          flagged &&
          (!from || created >= from) &&
          (!to || created <= to)
        );
      }
      if (scope === "by_account") {
        const acct = (filters.account || "").toLowerCase();
        if (!acct) return flagged;
        return (
          flagged &&
          (
            (t.nameOrig || "").toLowerCase().includes(acct) ||
            (t.nameDest || "").toLowerCase().includes(acct)
          )
        );
      }
      return flagged;
    });
  }, [transactions, mode, scope, filters]);

  const canCreate =
    mode === "single_transaction"
      ? !!selectedTransactionId
      : matchingTransactions.length > 0;

  function handleCreate() {
    if (mode === "single_transaction") {
      const txn = transactions.find(
        (t) => t.transaction_id === selectedTransactionId || String(t.id) === selectedTransactionId
      );
      if (!txn) return;
      onCreateSingle(selectedTransactionId, {
        transaction_id: txn.transaction_id,
        amount: txn.amount,
        fraud_score: normalizeFraudScore(txn.fraud_score),
        type: txn.type,
        channel: txn.channel,
        nameOrig: txn.nameOrig,
        nameDest: txn.nameDest,
        risk_level: txn.risk_level,
      });
    } else {
      onCreateOverall(scope, filters, matchingTransactions);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        backdropFilter: "blur(5px)",
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: "600px",
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <Bot style={{ width: "18px", height: "18px", color: "#06b6d4" }} />
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Create New Analyst Case
              </h3>
              <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
                Choose whether to analyze a single transaction or a broader suspicious activity pattern
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        {/* Modal body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {/* Description */}
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(6,182,212,0.06)",
              border: "1px solid rgba(6,182,212,0.15)",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Choose whether to create an analyst case from a{" "}
            <strong style={{ color: "var(--text-secondary)" }}>single flagged transaction</strong> or
            from an{" "}
            <strong style={{ color: "var(--text-secondary)" }}>overall transaction analysis</strong>.
            The backend AI will generate a case summary, evidence analysis, and reporting
            recommendation based on the selected scope.
          </div>

          {/* Mode selector */}
          <ModeSelector mode={mode} onChange={setMode} />

          {/* Divider */}
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.07)",
              marginBottom: "1.25rem",
            }}
          />

          {/* Mode-specific form */}
          {mode === "single_transaction" ? (
            <SingleTransactionForm
              transactions={transactions}
              selectedId={selectedTransactionId}
              onSelect={setSelectedTransactionId}
            />
          ) : (
            <OverallAnalysisForm
              transactions={transactions}
              scope={scope}
              filters={filters}
              onScopeChange={setScope}
              onFiltersChange={setFilters}
              matchCount={matchingTransactions.length}
            />
          )}

          {/* Compliance note */}
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.625rem 0.875rem",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.18)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle
              style={{ width: "12px", height: "12px", color: "#f59e0b", flexShrink: 0, marginTop: "2px" }}
            />
            <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
              The backend AI will generate a case summary and reporting recommendation as a draft.
              All findings require analyst confirmation before any external submission.
            </span>
          </div>
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {/* Mode badge */}
          <span
            style={{
              fontSize: "0.6875rem",
              color: mode === "single_transaction" ? "#06b6d4" : "#c084fc",
              background:
                mode === "single_transaction"
                  ? "rgba(6,182,212,0.1)"
                  : "rgba(168,85,247,0.1)",
              border: `1px solid ${mode === "single_transaction" ? "rgba(6,182,212,0.25)" : "rgba(168,85,247,0.25)"}`,
              padding: "0.2rem 0.6rem",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            {mode === "single_transaction"
              ? "Single Transaction"
              : `Overall Analysis · ${matchingTransactions.length} txns`}
          </span>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!canCreate || isLoading}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", minWidth: "130px", justifyContent: "center" }}
            >
              {isLoading ? (
                <>
                  <RefreshCw style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />
                  Creating...
                </>
              ) : (
                <>
                  <Bot style={{ width: "13px", height: "13px" }} />
                  Create Case
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
