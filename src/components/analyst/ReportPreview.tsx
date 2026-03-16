"use client";

import { useState } from "react";
import { AnalystCase } from "@/lib/api";
import {
  Copy,
  CheckCheck,
  Download,
  Send,
  FileText,
  Code2,
  BookOpen,
  Compass,
} from "lucide-react";

interface ReportPreviewProps {
  caseData: AnalystCase;
  onApproveEscalation: () => void;
  onMarkInternal: () => void;
  onSendForReview: () => void;
}

type ReportTab = "narrative" | "json" | "summary" | "recommendation";

export default function ReportPreview({
  caseData,
  onApproveEscalation,
  onMarkInternal,
  onSendForReview,
}: ReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("narrative");
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback silently
    }
  }

  function handleExport() {
    const content =
      activeTab === "json"
        ? JSON.stringify(caseData.structured_report || caseData, null, 2)
        : caseData.narrative_report || "";

    const blob = new Blob([content], {
      type: activeTab === "json" ? "application/json" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${caseData.case_id}-${activeTab}.${activeTab === "json" ? "json" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: "narrative", label: "Narrative Report", icon: BookOpen },
    { key: "json", label: "Structured JSON", icon: Code2 },
    { key: "summary", label: "Internal Summary", icon: FileText },
    { key: "recommendation", label: "Reporting Recommendation", icon: Compass },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.625rem 0.875rem",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #06b6d4"
                    : "2px solid transparent",
                color: activeTab === tab.key ? "#06b6d4" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: 500,
                transition: "all 0.15s ease",
              }}
            >
              <Icon style={{ width: "13px", height: "13px" }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
            onClick={() =>
              handleCopy(
                activeTab === "json"
                  ? JSON.stringify(caseData.structured_report || {}, null, 2)
                  : caseData.narrative_report || "",
                "content"
              )
            }
          >
            {copied === "content" ? (
              <CheckCheck style={{ width: "13px", height: "13px" }} />
            ) : (
              <Copy style={{ width: "13px", height: "13px" }} />
            )}
            {copied === "content" ? "Copied" : "Copy"}
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
            onClick={handleExport}
          >
            <Download style={{ width: "13px", height: "13px" }} />
            Export
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
            onClick={onSendForReview}
          >
            <Send style={{ width: "13px", height: "13px" }} />
            Send for Review
          </button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className="btn"
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", background: "#10b981", color: "white" }}
            onClick={onApproveEscalation}
          >
            Approve Escalation
          </button>
          <button
            className="btn"
            style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", background: "#64748b", color: "white" }}
            onClick={onMarkInternal}
          >
            Internal Review Only
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "narrative" && (
        <div
          style={{
            padding: "1.25rem",
            background: "rgba(0,0,0,0.25)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: "0.875rem",
            lineHeight: 1.75,
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            maxHeight: "420px",
            overflowY: "auto",
            fontFamily: "inherit",
          }}
        >
          {caseData.narrative_report || (
            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
              No narrative report generated yet. The backend will generate a narrative when this
              case is processed.
            </span>
          )}
        </div>
      )}

      {activeTab === "json" && (
        <div
          style={{
            padding: "1.25rem",
            background: "rgba(0,0,0,0.35)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: "0.8125rem",
            lineHeight: 1.6,
            color: "#34d399",
            whiteSpace: "pre-wrap",
            maxHeight: "420px",
            overflowY: "auto",
            fontFamily: "monospace",
          }}
        >
          {caseData.structured_report
            ? JSON.stringify(caseData.structured_report, null, 2)
            : JSON.stringify(
                {
                  case_id: caseData.case_id,
                  transaction_id: caseData.transaction_id,
                  risk_score: caseData.risk_score,
                  risk_level: caseData.risk_level,
                  case_type: caseData.case_type,
                  recommended_authorities: caseData.recommended_authorities,
                  status: caseData.status,
                  note: "Structured report not yet available from backend",
                },
                null,
                2
              )}
        </div>
      )}

      {activeTab === "summary" && (
        <div
          style={{
            padding: "1.25rem",
            background: "rgba(0,0,0,0.25)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: "0.875rem",
            lineHeight: 1.75,
            color: "var(--text-secondary)",
          }}
        >
          <h5
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "#06b6d4",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Internal Case Summary
          </h5>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {[
              ["Case ID", caseData.case_id],
              ["Transaction ID", caseData.transaction_id],
              ["Customer Ref", caseData.customer_reference || "N/A"],
              ["Risk Level", caseData.risk_level],
              [
                "Risk Score",
                `${(caseData.risk_score > 1 ? caseData.risk_score : caseData.risk_score * 100).toFixed(1)}%`,
              ],
              ["Case Type", caseData.case_type?.replace(/_/g, " ") || "—"],
              ["Status", caseData.status?.replace(/_/g, " ") || "open"],
              ["Routing", (caseData.recommended_authorities || []).join(", ") || "Internal"],
              [
                "Review Decision",
                caseData.audit?.reviewer_decision?.replace(/_/g, " ") || "Awaiting",
              ],
              [
                "Report Timestamp",
                caseData.audit?.report_timestamp
                  ? new Date(caseData.audit.report_timestamp).toLocaleString()
                  : "—",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "0.5rem 0.75rem",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "6px",
                }}
              >
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  {label}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>{value}</div>
              </div>
            ))}
          </div>
          {caseData.summary && (
            <>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                AI Summary
              </div>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>{caseData.summary}</p>
            </>
          )}
        </div>
      )}

      {activeTab === "recommendation" && (
        <div
          style={{
            padding: "1.25rem",
            background: "rgba(0,0,0,0.25)",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.07)",
            fontSize: "0.875rem",
            lineHeight: 1.75,
            color: "var(--text-secondary)",
          }}
        >
          <h5
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "#a855f7",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Reporting Recommendation
          </h5>

          <div
            style={{
              padding: "0.875rem",
              background: "rgba(168,85,247,0.08)",
              borderRadius: "8px",
              border: "1px solid rgba(168,85,247,0.2)",
              marginBottom: "1rem",
            }}
          >
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Based on available evidence, this case is recommended for escalation to:{" "}
              <strong style={{ color: "#c084fc" }}>
                {(caseData.recommended_authorities || ["Internal Review Only"]).join(", ")}
              </strong>
              .
            </p>
          </div>

          {(caseData as any).recommended_actions && (
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Recommended Actions
              </div>
              <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {((caseData as any).recommended_actions as string[]).map((a, i) => (
                  <li key={i} style={{ fontSize: "0.875rem" }}>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: "rgba(245,158,11,0.08)",
              borderRadius: "8px",
              border: "1px solid rgba(245,158,11,0.2)",
              fontSize: "0.75rem",
              color: "#fbbf24",
              lineHeight: 1.5,
            }}
          >
            External reporting should only occur after analyst and compliance approval. This
            recommendation is AI-generated and must be validated by a qualified analyst before any
            action is taken.
          </div>
        </div>
      )}
    </div>
  );
}
