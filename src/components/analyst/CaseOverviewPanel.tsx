"use client";

import { AnalystCase } from "@/lib/api";

interface CaseOverviewPanelProps {
  caseData: AnalystCase;
}

const riskColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  HIGH: {
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.35)",
    text: "#ef4444",
    dot: "#ef4444",
  },
  SUSPICIOUS: {
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.35)",
    text: "#f59e0b",
    dot: "#f59e0b",
  },
  MEDIUM: {
    bg: "rgba(234,179,8,0.1)",
    border: "rgba(234,179,8,0.35)",
    text: "#eab308",
    dot: "#eab308",
  },
  LOW: {
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.35)",
    text: "#10b981",
    dot: "#10b981",
  },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  under_review: { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  escalated: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  closed: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  internal_review: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
};

const authorityColors: Record<string, { bg: string; border: string; text: string }> = {
  DCI: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#f87171" },
  FRC: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#fbbf24" },
  ODPC: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#c084fc" },
  "Internal Review Only": { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", text: "#818cf8" },
};

export default function CaseOverviewPanel({ caseData }: CaseOverviewPanelProps) {
  const riskStyle = riskColors[caseData.risk_level] || riskColors["MEDIUM"];
  const statusKey = caseData.status?.toLowerCase().replace(" ", "_") || "open";
  const statusStyle = statusColors[statusKey] || statusColors["open"];

  const fields = [
    { label: "Case ID", value: caseData.case_id, mono: true },
    { label: "Transaction ID", value: caseData.transaction_id, mono: true },
    { label: "Customer Reference", value: caseData.customer_reference || "N/A", mono: false },
    {
      label: "Risk Score",
      value: (
        <span style={{ color: riskStyle.text, fontWeight: 700 }}>
          {caseData.risk_score.toFixed(1)}%
        </span>
      ),
      mono: false,
    },
    {
      label: "Risk Level",
      value: (
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "5px",
            fontSize: "0.75rem",
            fontWeight: 700,
            background: riskStyle.bg,
            color: riskStyle.text,
            border: `1px solid ${riskStyle.border}`,
            letterSpacing: "0.04em",
          }}
        >
          {caseData.risk_level}
        </span>
      ),
      mono: false,
    },
    {
      label: "Case Type",
      value: caseData.case_type?.replace("_", " ").toUpperCase() || "N/A",
      mono: false,
    },
    {
      label: "Status",
      value: (
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "5px",
            fontSize: "0.75rem",
            fontWeight: 600,
            background: statusStyle.bg,
            color: statusStyle.text,
          }}
        >
          {(caseData.status || "open").replace("_", " ").toUpperCase()}
        </span>
      ),
      mono: false,
    },
    {
      label: "Recommended Authorities",
      value: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {(caseData.recommended_authorities || []).length > 0 ? (
            caseData.recommended_authorities.map((auth) => {
              const style = authorityColors[auth] || authorityColors["Internal Review Only"];
              return (
                <span
                  key={auth}
                  style={{
                    padding: "0.2rem 0.6rem",
                    borderRadius: "5px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: style.bg,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                  }}
                >
                  {auth}
                </span>
              );
            })
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>Internal Review Only</span>
          )}
        </div>
      ),
      mono: false,
    },
    {
      label: "Human Review Required",
      value: (
        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "5px",
            fontSize: "0.75rem",
            fontWeight: 700,
            background: caseData.human_review_required ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
            color: caseData.human_review_required ? "#f59e0b" : "#10b981",
          }}
        >
          {caseData.human_review_required ? "YES — REQUIRED" : "Not Required"}
        </span>
      ),
      mono: false,
    },
    {
      label: "Report Generated",
      value: caseData.audit?.report_timestamp
        ? new Date(caseData.audit.report_timestamp).toLocaleString()
        : "Not yet generated",
      mono: false,
    },
    {
      label: "Last Analyst Action",
      value: caseData.last_action || "None recorded",
      mono: false,
    },
  ];

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {caseData.case_id}
            </h3>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: riskStyle.bg,
                color: riskStyle.text,
                border: `1px solid ${riskStyle.border}`,
                letterSpacing: "0.04em",
              }}
            >
              {caseData.risk_level} RISK
            </span>
            <span
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: statusStyle.bg,
                color: statusStyle.text,
              }}
            >
              {(caseData.status || "OPEN").replace("_", " ").toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            <span>TXN: </span>
            <span style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
              {caseData.transaction_id}
            </span>
            {caseData.customer_reference && (
              <>
                <span style={{ margin: "0 0.5rem" }}>•</span>
                <span>Account: </span>
                <span style={{ color: "var(--text-secondary)" }}>{caseData.customer_reference}</span>
              </>
            )}
          </div>
        </div>

        {/* Risk score ring */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0.75rem 1.25rem",
            background: riskStyle.bg,
            border: `1px solid ${riskStyle.border}`,
            borderRadius: "10px",
            minWidth: "90px",
          }}
        >
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: riskStyle.text, lineHeight: 1 }}>
            {caseData.risk_score.toFixed(0)}
            <span style={{ fontSize: "1rem", fontWeight: 600 }}>%</span>
          </div>
          <div style={{ fontSize: "0.625rem", color: riskStyle.text, fontWeight: 700, letterSpacing: "0.08em", marginTop: "0.25rem" }}>
            RISK SCORE
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem 1.5rem" }}>
        {fields.map((field, i) => (
          <div key={i}>
            <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "0.3rem", textTransform: "uppercase" }}>
              {field.label}
            </div>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                fontFamily: field.mono ? "monospace" : "inherit",
              }}
            >
              {field.value}
            </div>
          </div>
        ))}
      </div>

      {/* Confidence note */}
      {caseData.confidence_note && (
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 1rem",
            background: "rgba(234,179,8,0.08)",
            border: "1px solid rgba(234,179,8,0.2)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.625rem",
          }}
        >
          <span style={{ fontSize: "0.875rem", color: "#eab308", marginTop: "0.05rem" }}>⚠</span>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
            {caseData.confidence_note}
          </p>
        </div>
      )}
    </div>
  );
}
