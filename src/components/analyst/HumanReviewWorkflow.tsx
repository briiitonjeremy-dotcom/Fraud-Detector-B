"use client";

import { useState } from "react";
import { AnalystCase, CaseReview } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpCircle,
  Lock,
  ClipboardCheck,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface HumanReviewWorkflowProps {
  caseData: AnalystCase;
  reviews: CaseReview[];
  onReview: (decision: string, notes: string) => void;
  isSubmitting: boolean;
  submitMessage: string;
}

const DECISIONS = [
  {
    key: "approve",
    label: "Approve for Escalation",
    icon: CheckCircle2,
    bg: "#10b981",
    hoverBg: "#059669",
    description: "Approve the AI recommendation and proceed with escalation",
  },
  {
    key: "reject",
    label: "Reject",
    icon: XCircle,
    bg: "#ef4444",
    hoverBg: "#dc2626",
    description: "Reject — insufficient evidence or false positive",
  },
  {
    key: "request_evidence",
    label: "Request More Evidence",
    icon: AlertCircle,
    bg: "#f59e0b",
    hoverBg: "#d97706",
    description: "Hold case pending additional evidence collection",
  },
  {
    key: "escalate",
    label: "Escalate",
    icon: ArrowUpCircle,
    bg: "#a855f7",
    hoverBg: "#9333ea",
    description: "Escalate immediately to recommended authorities",
  },
  {
    key: "hold_internal",
    label: "Hold for Internal Review",
    icon: Lock,
    bg: "#64748b",
    hoverBg: "#475569",
    description: "Mark for internal review — no external reporting",
  },
  {
    key: "mark_reviewed",
    label: "Mark as Reviewed",
    icon: ClipboardCheck,
    bg: "#0ea5e9",
    hoverBg: "#0284c7",
    description: "Mark the analyst review as complete",
  },
];

export default function HumanReviewWorkflow({
  caseData,
  reviews,
  onReview,
  isSubmitting,
  submitMessage,
}: HumanReviewWorkflowProps) {
  const [notes, setNotes] = useState("");

  const currentDecision = caseData.audit?.reviewer_decision;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Mandatory review notice */}
      <div
        style={{
          padding: "0.875rem 1rem",
          background: "rgba(239,68,68,0.07)",
          borderRadius: "10px",
          border: "1px solid rgba(239,68,68,0.25)",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.625rem",
        }}
      >
        <ShieldAlert
          style={{ width: "16px", height: "16px", color: "#ef4444", flexShrink: 0, marginTop: "1px" }}
        />
        <div>
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#f87171", marginBottom: "0.25rem" }}>
            Human Review Required
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            AI output is draft assistance only. External reporting or escalation cannot occur
            without explicit analyst approval. Review the case thoroughly before recording a
            decision.
          </p>
        </div>
      </div>

      {/* Current status */}
      {currentDecision && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(16,185,129,0.08)",
            borderRadius: "8px",
            border: "1px solid rgba(16,185,129,0.25)",
            fontSize: "0.8125rem",
            color: "#34d399",
          }}
        >
          <strong>Current Decision:</strong>{" "}
          {currentDecision.replace(/_/g, " ").toUpperCase()}
          {caseData.audit?.review_timestamp && (
            <span style={{ marginLeft: "0.75rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
              at {new Date(caseData.audit.review_timestamp).toLocaleString()}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1rem" }}>
        {/* Reviewer notes */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Analyst Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Document your review reasoning, observations, or instructions for escalation. Notes are recorded in the audit trail."
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              minHeight: "130px",
              resize: "vertical",
              lineHeight: 1.6,
              outline: "none",
            }}
          />
          {submitMessage && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: submitMessage.toLowerCase().includes("fail") || submitMessage.toLowerCase().includes("error")
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(16,185,129,0.12)",
                borderRadius: "6px",
                fontSize: "0.8125rem",
                color:
                  submitMessage.toLowerCase().includes("fail") || submitMessage.toLowerCase().includes("error")
                    ? "#f87171"
                    : "#34d399",
              }}
            >
              {submitMessage}
            </div>
          )}
        </div>

        {/* Decision buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.125rem",
            }}
          >
            Record Decision
          </div>
          {DECISIONS.map((d) => {
            const Icon = d.icon;
            return (
              <button
                key={d.key}
                className="btn"
                title={d.description}
                onClick={() => onReview(d.key, notes)}
                disabled={isSubmitting}
                style={{
                  background: d.bg,
                  color: "white",
                  fontSize: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = d.hoverBg;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = d.bg;
                }}
              >
                {isSubmitting ? (
                  <Loader2 style={{ width: "13px", height: "13px", animation: "spin 1s linear infinite" }} />
                ) : (
                  <Icon style={{ width: "13px", height: "13px" }} />
                )}
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Review history */}
      {reviews && reviews.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.625rem",
            }}
          >
            Review History ({reviews.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {reviews.map((review, i) => (
              <div
                key={i}
                style={{
                  padding: "0.625rem 0.875rem",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#06b6d4" }}>
                      {review.decision?.replace(/_/g, " ").toUpperCase() || "Review"}
                    </span>
                    {review.reviewer_name && (
                      <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        by {review.reviewer_name}
                      </span>
                    )}
                  </div>
                  {review.reviewer_notes && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {review.reviewer_notes}
                    </p>
                  )}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", flexShrink: 0, textAlign: "right" }}>
                  {review.review_timestamp
                    ? new Date(review.review_timestamp).toLocaleString()
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
