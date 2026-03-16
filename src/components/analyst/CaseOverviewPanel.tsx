"use client";

import { AnalystCase } from "@/lib/api";
import {
  AlertTriangle,
  Clock,
  FileText,
  Hash,
  Shield,
  User,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

interface CaseOverviewPanelProps {
  caseData: AnalystCase;
}

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.35)" },
  SUSPICIOUS: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.35)" },
  MEDIUM: { bg: "rgba(234,179,8,0.12)", text: "#eab308", border: "rgba(234,179,8,0.35)" },
  LOW: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.35)" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  under_review: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  escalated: { bg: "rgba(168,85,247,0.15)", text: "#c084fc" },
  closed: { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  internal_review: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  rejected: { bg: "rgba(239,68,68,0.15)", text: "#f87171" },
};

function MetaItem({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        padding: "0.75rem 1rem",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.6875rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: valueColor || "var(--text-primary)",
          wordBreak: "break-all",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export default function CaseOverviewPanel({ caseData }: CaseOverviewPanelProps) {
  const risk = RISK_COLORS[caseData.risk_level] || RISK_COLORS.MEDIUM;
  const statusKey = (caseData.status || "open").toLowerCase().replace(" ", "_");
  const statusStyle = STATUS_COLORS[statusKey] || STATUS_COLORS.open;

  const scorePercent =
    typeof caseData.risk_score === "number"
      ? caseData.risk_score > 1
        ? caseData.risk_score.toFixed(1)
        : (caseData.risk_score * 100).toFixed(1)
      : "—";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${risk.border}`,
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        boxShadow: `0 0 24px ${risk.bg}`,
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "0.375rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {caseData.case_id}
            </h3>
            {/* Risk level badge */}
            <span
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                background: risk.bg,
                color: risk.text,
                border: `1px solid ${risk.border}`,
              }}
            >
              {caseData.risk_level} RISK
            </span>
            {/* Status badge */}
            <span
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "6px",
                fontSize: "0.6875rem",
                fontWeight: 600,
                background: statusStyle.bg,
                color: statusStyle.text,
              }}
            >
              {(caseData.status || "OPEN").replace(/_/g, " ").toUpperCase()}
            </span>
            {caseData.human_review_required && (
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  background: "rgba(245,158,11,0.12)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245,158,11,0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <AlertTriangle style={{ width: "10px", height: "10px" }} />
                REVIEW REQUIRED
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            {caseData.case_type
              ? caseData.case_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "Fraud Case"}
          </p>
        </div>

        {/* Authority pills */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {caseData.recommended_authorities?.map((auth) => (
            <span
              key={auth}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "rgba(168,85,247,0.12)",
                color: "#c084fc",
                border: "1px solid rgba(168,85,247,0.3)",
              }}
            >
              {auth}
            </span>
          ))}
        </div>
      </div>

      {/* Meta grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "0.625rem",
        }}
      >
        <MetaItem
          icon={<Hash style={{ width: "10px", height: "10px" }} />}
          label="Transaction ID"
          value={caseData.transaction_id}
        />
        <MetaItem
          icon={<User style={{ width: "10px", height: "10px" }} />}
          label="Customer Ref"
          value={caseData.customer_reference || "N/A"}
        />
        <MetaItem
          icon={<TrendingUp style={{ width: "10px", height: "10px" }} />}
          label="Risk Score"
          value={`${scorePercent}%`}
          valueColor={risk.text}
        />
        <MetaItem
          icon={<FileText style={{ width: "10px", height: "10px" }} />}
          label="Case Type"
          value={
            caseData.case_type
              ? caseData.case_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "—"
          }
        />
        <MetaItem
          icon={<Clock style={{ width: "10px", height: "10px" }} />}
          label="Report Generated"
          value={
            caseData.audit?.report_timestamp
              ? new Date(caseData.audit.report_timestamp).toLocaleString()
              : caseData.created_at
              ? new Date(caseData.created_at).toLocaleString()
              : "—"
          }
        />
        <MetaItem
          icon={<Shield style={{ width: "10px", height: "10px" }} />}
          label="Last Action"
          value={caseData.last_action || "Pending review"}
        />
        <MetaItem
          icon={<CheckCircle style={{ width: "10px", height: "10px" }} />}
          label="Reviewer Decision"
          value={
            caseData.audit?.reviewer_decision
              ? caseData.audit.reviewer_decision.replace(/_/g, " ").toUpperCase()
              : "Awaiting"
          }
        />
      </div>

      {/* Confidence note */}
      {caseData.confidence_note && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.625rem 0.875rem",
            background: "rgba(245,158,11,0.08)",
            borderRadius: "8px",
            border: "1px solid rgba(245,158,11,0.2)",
            fontSize: "0.75rem",
            color: "#fbbf24",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle
            style={{ width: "14px", height: "14px", flexShrink: 0, marginTop: "1px" }}
          />
          <span>{caseData.confidence_note}</span>
        </div>
      )}
    </div>
  );
}
