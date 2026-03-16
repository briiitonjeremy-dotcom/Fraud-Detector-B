"use client";

import { useState } from "react";
import { AnalystCase } from "@/lib/api";

interface ReportPreviewModuleProps {
  caseData: AnalystCase;
  onExport?: (format: string) => void;
  onSendForReview?: () => void;
  onApproveEscalation?: () => void;
  onMarkInternal?: () => void;
}

type ReportTab = "narrative" | "json" | "internal" | "recommendation";

const tabConfig: { key: ReportTab; label: string; icon: string }[] = [
  { key: "narrative", label: "Narrative Report", icon: "📄" },
  { key: "json", label: "Structured JSON", icon: "{ }" },
  { key: "internal", label: "Internal Summary", icon: "🏢" },
  { key: "recommendation", label: "Reporting Recommendation", icon: "📋" },
];

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });
}

function NarrativeTab({ caseData }: { caseData: AnalystCase }) {
  const [copied, setCopied] = useState(false);
  const narrative =
    caseData.narrative_report ||
    `Transaction ${caseData.transaction_id} was flagged by the FraudGuard fraud detection system. The assigned risk score was ${caseData.risk_score.toFixed(1)}% (${caseData.risk_level} risk level). This case is recommended for analyst review and should not be escalated without human compliance approval.`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem", gap: "0.5rem" }}>
        <button
          onClick={() => copyToClipboard(narrative, setCopied)}
          style={{
            padding: "0.375rem 0.875rem",
            background: "rgba(6,182,212,0.12)",
            border: "1px solid rgba(6,182,212,0.25)",
            borderRadius: "7px",
            color: "#06b6d4",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "✓ Copied" : "📋 Copy Narrative"}
        </button>
      </div>
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: "0.9rem",
          lineHeight: "1.8",
          color: "var(--text-secondary)",
          minHeight: "200px",
          whiteSpace: "pre-wrap",
        }}
      >
        {narrative}
      </div>
    </div>
  );
}

function JSONTab({ caseData }: { caseData: AnalystCase }) {
  const [copied, setCopied] = useState(false);
  const jsonStr = JSON.stringify(
    caseData.structured_report || {
      case_id: caseData.case_id,
      transaction_id: caseData.transaction_id,
      risk_score: caseData.risk_score,
      risk_level: caseData.risk_level,
      case_type: caseData.case_type,
      recommended_authorities: caseData.recommended_authorities,
      report_timestamp: caseData.audit?.report_timestamp,
    },
    null,
    2
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem", gap: "0.5rem" }}>
        <button
          onClick={() => copyToClipboard(jsonStr, setCopied)}
          style={{
            padding: "0.375rem 0.875rem",
            background: "rgba(6,182,212,0.12)",
            border: "1px solid rgba(6,182,212,0.25)",
            borderRadius: "7px",
            color: "#06b6d4",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "✓ Copied" : "📋 Copy JSON"}
        </button>
      </div>
      <pre
        style={{
          padding: "1.25rem",
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          fontFamily: "monospace",
          fontSize: "0.8125rem",
          color: "#a5f3fc",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          overflow: "auto",
          maxHeight: "400px",
          lineHeight: "1.6",
        }}
      >
        {jsonStr}
      </pre>
    </div>
  );
}

function InternalSummaryTab({ caseData }: { caseData: AnalystCase }) {
  const reviewerDecision = caseData.audit?.reviewer_decision || "Pending";
  const reviewTimestamp = caseData.audit?.review_timestamp
    ? new Date(caseData.audit.review_timestamp).toLocaleString()
    : "Not yet reviewed";

  const summary = `
FRAUDGUARD INTERNAL CASE SUMMARY
==================================
Case ID:           ${caseData.case_id}
Transaction ID:    ${caseData.transaction_id}
Customer Ref:      ${caseData.customer_reference || "N/A"}
Risk Score:        ${caseData.risk_score.toFixed(1)}%
Risk Level:        ${caseData.risk_level}
Case Type:         ${(caseData.case_type || "N/A").replace("_", " ").toUpperCase()}
Status:            ${(caseData.status || "open").replace("_", " ").toUpperCase()}

RECOMMENDED AUTHORITIES
-----------------------
${(caseData.recommended_authorities || ["Internal Review Only"]).join(", ")}

AI SUMMARY
----------
${caseData.summary || "No summary available."}

FLAGGING REASONS
----------------
${(caseData.reasons || []).map((r, i) => `${i + 1}. ${r}`).join("\n") || "No reasons recorded."}

REVIEW STATUS
-------------
Reviewer Decision:  ${reviewerDecision || "Pending"}
Review Timestamp:   ${reviewTimestamp}
Human Review Req:   ${caseData.human_review_required ? "YES" : "No"}

AUDIT METADATA
--------------
Model Version:      ${caseData.audit?.model_version || "N/A"}
Prompt Version:     ${caseData.audit?.prompt_version || "N/A"}
Report Timestamp:   ${caseData.audit?.report_timestamp ? new Date(caseData.audit.report_timestamp).toLocaleString() : "N/A"}

COMPLIANCE NOTICE
-----------------
This is an AI-assisted draft case summary for internal use only.
External reporting requires analyst and compliance officer approval.
This document must not be shared outside the organisation without
proper authorisation from the compliance department.
  `.trim();

  const [copied, setCopied] = useState(false);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
        <button
          onClick={() => copyToClipboard(summary, setCopied)}
          style={{
            padding: "0.375rem 0.875rem",
            background: "rgba(6,182,212,0.12)",
            border: "1px solid rgba(6,182,212,0.25)",
            borderRadius: "7px",
            color: "#06b6d4",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "✓ Copied" : "📋 Copy Summary"}
        </button>
      </div>
      <pre
        style={{
          padding: "1.25rem",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          fontFamily: "monospace",
          fontSize: "0.8125rem",
          color: "var(--text-secondary)",
          whiteSpace: "pre-wrap",
          overflow: "auto",
          maxHeight: "450px",
          lineHeight: "1.6",
        }}
      >
        {summary}
      </pre>
    </div>
  );
}

function RecommendationTab({ caseData }: { caseData: AnalystCase }) {
  const authorities = caseData.recommended_authorities || [];
  const actions = [
    "Escalate to fraud analyst for human review",
    "Preserve device and login logs before any system changes",
    "Temporarily hold transaction if institution policy allows",
    "Prepare incident report draft for compliance review",
    "Document all evidence references in the case file",
    "Ensure customer notification procedures are followed if required",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Recommended Actions */}
      <div>
        <div style={{ fontSize: "0.75rem", color: "#06b6d4", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
          RECOMMENDED ANALYST ACTIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {(caseData.recommended_authorities || []).length > 0 && actions.map((action, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                padding: "0.5rem 0.75rem",
                background: "rgba(6,182,212,0.06)",
                border: "1px solid rgba(6,182,212,0.12)",
                borderRadius: "7px",
              }}
            >
              <span style={{ color: "#06b6d4", fontWeight: 700, fontSize: "0.8125rem", flexShrink: 0 }}>
                {i + 1}.
              </span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* External Reporting Path */}
      {authorities.length > 0 && (
        <div>
          <div style={{ fontSize: "0.75rem", color: "#a855f7", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
            EXTERNAL REPORTING PATH
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <div style={{ padding: "0.5rem 0.875rem", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "7px", fontSize: "0.8125rem", color: "#06b6d4", fontWeight: 600 }}>
              Analyst Review
            </div>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            <div style={{ padding: "0.5rem 0.875rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "7px", fontSize: "0.8125rem", color: "#a855f7", fontWeight: 600 }}>
              Compliance Approval
            </div>
            <span style={{ color: "var(--text-muted)" }}>→</span>
            {authorities.map((auth, i) => (
              <div
                key={auth}
                style={{
                  padding: "0.5rem 0.875rem",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "7px",
                  fontSize: "0.8125rem",
                  color: "#f87171",
                  fontWeight: 600,
                }}
              >
                {auth}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance gate */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: "rgba(234,179,8,0.08)",
          border: "1px solid rgba(234,179,8,0.2)",
          borderRadius: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "1rem", color: "#eab308" }}>⚠</span>
          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#eab308" }}>
            Compliance Gate — External Reporting
          </span>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
          External reports to regulatory authorities (DCI, FRC, ODPC) should only be submitted after explicit
          approval from a qualified compliance officer. The AI system provides draft recommendations —
          it does not independently trigger external reports. All submissions must comply with applicable
          Kenyan financial crime reporting regulations and data protection requirements.
        </p>
      </div>
    </div>
  );
}

export default function ReportPreviewModule({
  caseData,
  onExport,
  onSendForReview,
  onApproveEscalation,
  onMarkInternal,
}: ReportPreviewModuleProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("narrative");

  return (
    <div>
      {/* Tab navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "1rem",
          overflowX: "auto",
        }}
      >
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.625rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #06b6d4" : "2px solid transparent",
              color: activeTab === tab.key ? "#06b6d4" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: activeTab === tab.key ? 600 : 500,
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
          >
            <span style={{ fontSize: "0.875rem" }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ minHeight: "240px" }}>
        {activeTab === "narrative" && <NarrativeTab caseData={caseData} />}
        {activeTab === "json" && <JSONTab caseData={caseData} />}
        {activeTab === "internal" && <InternalSummaryTab caseData={caseData} />}
        {activeTab === "recommendation" && <RecommendationTab caseData={caseData} />}
      </div>

      {/* Action bar */}
      <div
        style={{
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={() => onExport?.("pdf")}
          style={{
            padding: "0.5rem 0.875rem",
            background: "rgba(6,182,212,0.12)",
            border: "1px solid rgba(6,182,212,0.25)",
            borderRadius: "7px",
            color: "#06b6d4",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          📥 Export Report
        </button>
        <button
          onClick={() => onSendForReview?.()}
          style={{
            padding: "0.5rem 0.875rem",
            background: "rgba(168,85,247,0.12)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: "7px",
            color: "#a855f7",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          📤 Send for Review
        </button>
        <button
          onClick={() => onApproveEscalation?.()}
          style={{
            padding: "0.5rem 0.875rem",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: "7px",
            color: "#10b981",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ✅ Approve for Escalation
        </button>
        <button
          onClick={() => onMarkInternal?.()}
          style={{
            padding: "0.5rem 0.875rem",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "7px",
            color: "#818cf8",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔒 Mark Internal Only
        </button>
      </div>
    </div>
  );
}
