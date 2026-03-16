"use client";

import { TimelineEvent } from "@/lib/api";

interface FraudTimelineProps {
  timeline: TimelineEvent[];
}

const EVENT_STYLES: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  login_attempt: {
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.4)",
    label: "Login Attempt",
  },
  failed_otp: {
    color: "#f87171",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
    label: "Failed OTP",
  },
  successful_login: {
    color: "#34d399",
    bg: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.4)",
    label: "Successful Login",
  },
  balance_inquiry: {
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.15)",
    border: "rgba(139,92,246,0.4)",
    label: "Balance Inquiry",
  },
  transfer: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.4)",
    label: "Transfer",
  },
  transfer_initiated: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.4)",
    label: "Transfer Initiated",
  },
  transaction_approved: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
    label: "Transaction Approved",
  },
  analyst_review: {
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.15)",
    border: "rgba(6,182,212,0.4)",
    label: "Analyst Review",
  },
  escalation: {
    color: "#c084fc",
    bg: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.4)",
    label: "Escalation",
  },
};

const DEFAULT_STYLE = {
  color: "#94a3b8",
  bg: "rgba(100,116,139,0.1)",
  border: "rgba(100,116,139,0.3)",
  label: "Event",
};

function getEventStyle(eventType: string) {
  const key = eventType?.toLowerCase().replace(/\s+/g, "_");
  return EVENT_STYLES[key] || DEFAULT_STYLE;
}

function formatTimestamp(ts: string) {
  try {
    const d = new Date(ts);
    return {
      date: d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    };
  } catch {
    return { date: "—", time: "—" };
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
          fontSize: "0.875rem",
        }}
      >
        No timeline events available for this case.
      </div>
    );
  }

  return (
    <div>
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: "1.25rem",
          lineHeight: 1.5,
        }}
      >
        Chronological reconstruction of events leading to and surrounding the flagged transaction.
        Events are derived from available system logs and audit records.
      </p>

      <div style={{ position: "relative", paddingLeft: "2rem" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "0.625rem",
            top: "0.75rem",
            bottom: "0.75rem",
            width: "2px",
            background: "linear-gradient(to bottom, rgba(6,182,212,0.5), rgba(100,116,139,0.1))",
          }}
        />

        {timeline.map((event, i) => {
          const style = getEventStyle(event.event);
          const ts = formatTimestamp(event.timestamp);
          const isLast = i === timeline.length - 1;

          return (
            <div
              key={i}
              style={{
                position: "relative",
                paddingBottom: isLast ? 0 : "1.25rem",
              }}
            >
              {/* Dot */}
              <div
                style={{
                  position: "absolute",
                  left: "-1.625rem",
                  top: "0.375rem",
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  background: style.color,
                  border: `2px solid ${style.border}`,
                  boxShadow: `0 0 8px ${style.bg}`,
                }}
              />

              {/* Event card */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "0.375rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        color: style.color,
                      }}
                    >
                      {event.event
                        ? event.event.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                        : style.label}
                    </span>
                    <span
                      style={{
                        padding: "0.1rem 0.45rem",
                        borderRadius: "4px",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`,
                      }}
                    >
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: "0.6875rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <div>{ts.time}</div>
                    <div>{ts.date}</div>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
