"use client";

import { AnalystCase } from "@/lib/api";
import { Brain, Tag } from "lucide-react";

interface AISummaryPanelProps {
  caseData: AnalystCase;
}

const REASON_ICON_MAP: Record<string, string> = {
  amount: "💰",
  device: "📱",
  balance: "📉",
  otp: "🔐",
  travel: "✈️",
  account: "🔗",
  login: "🖥️",
  rule: "⚙️",
  model: "🤖",
  repeat: "🔁",
  velocity: "⚡",
  location: "📍",
  ip: "🌐",
  sim: "📲",
  structur: "🧱",
  phishing: "🎣",
  identity: "🪪",
};

function getReasonIcon(reason: string): string {
  const lower = reason.toLowerCase();
  for (const [key, icon] of Object.entries(REASON_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "⚠️";
}

export default function AISummaryPanel({ caseData }: AISummaryPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* AI Narrative Summary */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <Brain style={{ width: "14px", height: "14px", color: "#06b6d4" }} />
          <h4
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            AI-Generated Summary
          </h4>
        </div>

        <div
          style={{
            padding: "1rem 1.25rem",
            background: "rgba(6,182,212,0.07)",
            borderRadius: "10px",
            border: "1px solid rgba(6,182,212,0.2)",
          }}
        >
          {caseData.summary ? (
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                fontStyle: "normal",
              }}
            >
              {caseData.summary}
            </p>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              No AI summary available for this case. Summary will be generated when the case is
              processed by the backend.
            </p>
          )}
          <div
            style={{
              marginTop: "0.75rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid rgba(6,182,212,0.15)",
              fontSize: "0.6875rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Brain style={{ width: "10px", height: "10px" }} />
            AI-generated draft — analyst confirmation required before any external submission
          </div>
        </div>
      </div>

      {/* Reasons for Flagging */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <Tag style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
          <h4
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            Reasons &amp; Indicators
          </h4>
        </div>

        {caseData.reasons && caseData.reasons.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {caseData.reasons.map((reason, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.625rem",
                  padding: "0.625rem 0.875rem",
                  background: "rgba(245,158,11,0.06)",
                  borderRadius: "8px",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}
              >
                <span style={{ fontSize: "0.875rem", flexShrink: 0, marginTop: "1px" }}>
                  {getReasonIcon(reason)}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {reason}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "1rem",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "8px",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
            }}
          >
            No flagging reasons available yet.
          </div>
        )}
      </div>

      {/* Recommended Actions */}
      {(caseData as any).recommended_actions && (
        <div>
          <h4
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Recommended Analyst Actions
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {((caseData as any).recommended_actions as string[]).map((action, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  padding: "0.375rem 0",
                }}
              >
                <span style={{ color: "#06b6d4", fontWeight: 700, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {action}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
