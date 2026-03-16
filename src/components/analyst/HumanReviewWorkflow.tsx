"use client";

import { useState } from "react";
import { CaseReview } from "@/lib/api";

interface HumanReviewWorkflowProps {
  caseId: string;
  currentDecision?: string;
  reviewHistory?: CaseReview[];
  reviewerNotes: string;
  onNotesChange: (notes: string) => void;
  onDecision: (decision: string) => void;
  isSubmitting: boolean;
  statusMessage?: string;
  humanReviewRequired?: boolean;
}

const decisionConfig: {
  key: string;
  label: string;
  icon: string;
  description: string;
  bg: string;
  hoverBg: string;
  border: string;
  text: string;
}[] = [
  {
    key: "approve",
    label: "Approve for Escalation",
    icon: "✅",
    description: "Approve this case for escalation to recommended authorities after compliance review.",
    bg: "rgba(16,185,129,0.12)",
    hoverBg: "rgba(16,185,129,0.25)",
    border: "rgba(16,185,129,0.3)",
    text: "#10b981",
  },
  {
    key: "escalate",
    label: "Escalate",
    icon: "📤",
    description: "Immediately escalate this case to the next analyst or compliance level.",
    bg: "rgba(239,68,68,0.12)",
    hoverBg: "rgba(239,68,68,0.25)",
    border: "rgba(239,68,68,0.3)",
    text: "#ef4444",
  },
  {
    key: "request_evidence",
    label: "Request More Evidence",
    icon: "🔍",
    description: "Flag this case for additional evidence collection before a final decision can be made.",
    bg: "rgba(245,158,11,0.12)",
    hoverBg: "rgba(245,158,11,0.25)",
    border: "rgba(245,158,11,0.3)",
    text: "#f59e0b",
  },
  {
    key: "hold_internal",
    label: "Hold — Internal Review Only",
    icon: "🔒",
    description: "Place this case on internal hold. No external escalation. Document and monitor.",
    bg: "rgba(99,102,241,0.12)",
    hoverBg: "rgba(99,102,241,0.25)",
    border: "rgba(99,102,241,0.3)",
    text: "#818cf8",
  },
  {
    key: "reject",
    label: "Reject — Close Case",
    icon: "❌",
    description: "Reject this case as a false positive or insufficient evidence. Document reasoning.",
    bg: "rgba(100,116,139,0.12)",
    hoverBg: "rgba(100,116,139,0.25)",
    border: "rgba(100,116,139,0.3)",
    text: "#94a3b8",
  },
  {
    key: "mark_reviewed",
    label: "Mark as Reviewed",
    icon: "👁",
    description: "Record that this case has been reviewed without requiring immediate action.",
    bg: "rgba(6,182,212,0.12)",
    hoverBg: "rgba(6,182,212,0.25)",
    border: "rgba(6,182,212,0.3)",
    text: "#06b6d4",
  },
];

function formatDecision(d: string): string {
  return d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HumanReviewWorkflow({
  caseId,
  currentDecision,
  reviewHistory = [],
  reviewerNotes,
  onNotesChange,
  onDecision,
  isSubmitting,
  statusMessage,
  humanReviewRequired,
}: HumanReviewWorkflowProps) {
  const [hoveredDecision, setHoveredDecision] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleDecisionClick = (key: string) => {
    if (confirming === key) {
      onDecision(key);
      setConfirming(null);
    } else {
      setConfirming(key);
    }
  };

  return (
    <div>
      {/* Mandatory review banner */}
      {humanReviewRequired && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "0.875rem 1rem",
            background: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.3)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.25rem", color: "#eab308", flexShrink: 0 }}>⚠</span>
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#eab308", marginBottom: "0.25rem" }}>
              Human Review Required — AI Output is Draft Assistance Only
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
              The Analyst AI has generated a draft assessment for case <strong style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{caseId}</strong>.
              This output must be reviewed by a qualified analyst before any escalation, external reporting, or
              case closure action is taken. The system does not automatically trigger external notifications.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Left: Notes + status */}
        <div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            ANALYST NOTES
          </div>
          <textarea
            value={reviewerNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Enter your review notes, observations, or justification for the decision. These notes will be recorded in the audit trail."
            rows={5}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "0.8125rem",
              lineHeight: "1.6",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Current decision status */}
          {currentDecision && (
            <div
              style={{
                marginTop: "0.875rem",
                padding: "0.75rem 1rem",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: "8px",
              }}
            >
              <div style={{ fontSize: "0.6875rem", color: "#10b981", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                CURRENT DECISION
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: 600 }}>
                {formatDecision(currentDecision)}
              </div>
            </div>
          )}

          {/* Status message */}
          {statusMessage && (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: statusMessage.toLowerCase().includes("fail") || statusMessage.toLowerCase().includes("error")
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(16,185,129,0.12)",
                border: `1px solid ${statusMessage.toLowerCase().includes("fail") || statusMessage.toLowerCase().includes("error") ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
                borderRadius: "7px",
                fontSize: "0.8125rem",
                color: statusMessage.toLowerCase().includes("fail") || statusMessage.toLowerCase().includes("error") ? "#ef4444" : "#10b981",
              }}
            >
              {statusMessage}
            </div>
          )}
        </div>

        {/* Right: Decision buttons */}
        <div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
            DECISION ACTION
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {decisionConfig.map((d) => {
              const isConfirming = confirming === d.key;
              const isHovered = hoveredDecision === d.key;

              return (
                <button
                  key={d.key}
                  onClick={() => handleDecisionClick(d.key)}
                  onMouseEnter={() => setHoveredDecision(d.key)}
                  onMouseLeave={() => setHoveredDecision(null)}
                  disabled={isSubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.625rem 0.875rem",
                    background: isConfirming ? d.hoverBg : isHovered ? d.hoverBg : d.bg,
                    border: `1px solid ${isConfirming ? d.text : d.border}`,
                    borderRadius: "8px",
                    color: d.text,
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.6 : 1,
                    transition: "all 0.15s",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div>{isConfirming ? `Confirm: ${d.label}` : d.label}</div>
                    {isConfirming && (
                      <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 400, marginTop: "0.125rem" }}>
                        Click again to confirm. Click elsewhere to cancel.
                      </div>
                    )}
                  </div>
                  {isSubmitting && confirming === d.key && (
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        border: `2px solid ${d.text}40`,
                        borderTop: `2px solid ${d.text}`,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review history */}
      {reviewHistory.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
            REVIEW HISTORY
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {reviewHistory.map((review, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "0.625rem 0.875rem",
                  background: "rgba(0,0,0,0.15)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "7px",
                  fontSize: "0.8125rem",
                }}
              >
                <div style={{ minWidth: "140px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  {review.review_timestamp ? new Date(review.review_timestamp).toLocaleString() : "N/A"}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {formatDecision(review.decision)}
                  </span>
                  {review.reviewer_notes && (
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.75rem" }}>
                      — {review.reviewer_notes}
                    </span>
                  )}
                </div>
                {review.reviewer_name && (
                  <div style={{ color: "#06b6d4", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                    {review.reviewer_name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
