"use client";

import { TimelineEvent } from "@/lib/api";

interface FraudTimelineProps {
  timeline: TimelineEvent[];
}

type Severity = "critical" | "warning" | "info" | "success";

const eventSeverity: Record<string, Severity> = {
  failed_otp: "critical",
  failed_auth: "critical",
  unauthorized_access: "critical",
  transfer: "warning",
  balance_depletion: "warning",
  login_attempt: "info",
  successful_login: "success",
  balance_inquiry: "info",
  transaction_approved: "warning",
  analyst_review_started: "info",
  account_locked: "critical",
  fraud_flagged: "critical",
};

const severityConfig: Record<Severity, { dot: string; line: string; label: string; bg: string; border: string; text: string }> = {
  critical: {
    dot: "#ef4444",
    line: "rgba(239,68,68,0.25)",
    label: "CRITICAL",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    text: "#f87171",
  },
  warning: {
    dot: "#f59e0b",
    line: "rgba(245,158,11,0.25)",
    label: "ALERT",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    text: "#fbbf24",
  },
  info: {
    dot: "#06b6d4",
    line: "rgba(6,182,212,0.2)",
    label: "INFO",
    bg: "rgba(6,182,212,0.06)",
    border: "rgba(6,182,212,0.15)",
    text: "#22d3ee",
  },
  success: {
    dot: "#10b981",
    line: "rgba(16,185,129,0.2)",
    label: "OK",
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.15)",
    text: "#34d399",
  },
};

const eventIcons: Record<string, string> = {
  login_attempt: "🔑",
  successful_login: "✅",
  failed_otp: "❌",
  failed_auth: "🚫",
  balance_inquiry: "💰",
  transfer: "📤",
  transaction_approved: "✔",
  balance_depletion: "📉",
  analyst_review_started: "👁",
  account_locked: "🔒",
  fraud_flagged: "🚨",
};

function getSeverity(event: string): Severity {
  const lower = event.toLowerCase();
  for (const [key, sev] of Object.entries(eventSeverity)) {
    if (lower.includes(key)) return sev;
  }
  if (lower.includes("fail") || lower.includes("error") || lower.includes("fraud") || lower.includes("lock")) return "critical";
  if (lower.includes("transfer") || lower.includes("withdraw") || lower.includes("depletion")) return "warning";
  if (lower.includes("success") || lower.includes("approved") || lower.includes("valid")) return "success";
  return "info";
}

function getIcon(event: string): string {
  const lower = event.toLowerCase();
  for (const [key, icon] of Object.entries(eventIcons)) {
    if (lower.includes(key)) return icon;
  }
  return "•";
}

function formatEventType(event: string): string {
  return event
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTimestamp(ts: string): { date: string; time: string } {
  try {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    };
  } catch {
    return { date: ts, time: "" };
  }
}

export default function FraudTimeline({ timeline }: FraudTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text-muted)",
          background: "rgba(0,0,0,0.1)",
          borderRadius: "10px",
          border: "1px dashed rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🕐</div>
        <p>No timeline events recorded for this case.</p>
      </div>
    );
  }

  const criticalCount = timeline.filter((e) => getSeverity(e.event) === "critical").length;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h4
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            margin: 0,
          }}
        >
          Fraud Event Timeline
        </h4>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              padding: "0.2rem 0.5rem",
              background: "rgba(6,182,212,0.12)",
              color: "#06b6d4",
              borderRadius: "5px",
              fontSize: "0.6875rem",
              fontWeight: 700,
            }}
          >
            {timeline.length} EVENTS
          </span>
          {criticalCount > 0 && (
            <span
              style={{
                padding: "0.2rem 0.5rem",
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                borderRadius: "5px",
                fontSize: "0.6875rem",
                fontWeight: 700,
              }}
            >
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "117px",
            top: 0,
            bottom: 0,
            width: "1px",
            background: "rgba(255,255,255,0.07)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {timeline.map((event, i) => {
            const sev = getSeverity(event.event);
            const config = severityConfig[sev];
            const { date, time } = formatTimestamp(event.timestamp);
            const icon = getIcon(event.event);
            const isLast = i === timeline.length - 1;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0",
                  paddingBottom: isLast ? "0" : "0.875rem",
                  position: "relative",
                }}
              >
                {/* Timestamp */}
                <div
                  style={{
                    width: "110px",
                    flexShrink: 0,
                    paddingRight: "0.75rem",
                    paddingTop: "0.6rem",
                  }}
                >
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", lineHeight: 1.4, textAlign: "right" }}>
                    <div>{date}</div>
                    <div style={{ fontFamily: "monospace", color: config.text, fontWeight: 600 }}>{time}</div>
                  </div>
                </div>

                {/* Dot connector */}
                <div style={{ width: "15px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "13px",
                      height: "13px",
                      borderRadius: "50%",
                      background: config.dot,
                      border: `2px solid var(--bg-card)`,
                      boxShadow: `0 0 8px ${config.dot}80`,
                      flexShrink: 0,
                      marginTop: "0.7rem",
                      zIndex: 1,
                    }}
                  />
                </div>

                {/* Event card */}
                <div style={{ flex: 1, paddingLeft: "0.875rem" }}>
                  <div
                    style={{
                      padding: "0.625rem 0.875rem",
                      background: config.bg,
                      border: `1px solid ${config.border}`,
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.875rem" }}>{icon}</span>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: config.text }}>
                        {formatEventType(event.event)}
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          padding: "0.15rem 0.45rem",
                          background: `${config.dot}20`,
                          color: config.text,
                          borderRadius: "4px",
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
