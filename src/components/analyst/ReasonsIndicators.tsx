"use client";

const indicatorIcons: Record<string, string> = {
  amount: "💰",
  device: "📱",
  otp: "🔐",
  balance: "📉",
  travel: "✈",
  account: "🔗",
  login: "🔑",
  rule: "⚙",
  model: "🤖",
  repeat: "🔄",
  velocity: "⚡",
  default: "🚩",
};

function getIndicatorIcon(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes("amount") || lower.includes("value") || lower.includes("transfer")) return indicatorIcons.amount;
  if (lower.includes("device") || lower.includes("browser") || lower.includes("ip")) return indicatorIcons.device;
  if (lower.includes("otp") || lower.includes("authentication") || lower.includes("password")) return indicatorIcons.otp;
  if (lower.includes("balance") || lower.includes("depletion")) return indicatorIcons.balance;
  if (lower.includes("travel") || lower.includes("location") || lower.includes("geographic")) return indicatorIcons.travel;
  if (lower.includes("account") || lower.includes("linked")) return indicatorIcons.account;
  if (lower.includes("login") || lower.includes("access") || lower.includes("session")) return indicatorIcons.login;
  if (lower.includes("rule") || lower.includes("trigger")) return indicatorIcons.rule;
  if (lower.includes("model") || lower.includes("score") || lower.includes("ml")) return indicatorIcons.model;
  if (lower.includes("repeat") || lower.includes("pattern") || lower.includes("structur")) return indicatorIcons.repeat;
  if (lower.includes("velocity") || lower.includes("rapid") || lower.includes("frequency")) return indicatorIcons.velocity;
  return indicatorIcons.default;
}

function getSeverityStyle(reason: string): { bg: string; border: string; text: string; dot: string } {
  const lower = reason.toLowerCase();
  const isHigh =
    lower.includes("otp") ||
    lower.includes("takeover") ||
    lower.includes("depletion") ||
    lower.includes("impossible") ||
    lower.includes("new device") ||
    lower.includes("rapid");
  const isMed =
    lower.includes("amount") ||
    lower.includes("linked") ||
    lower.includes("repeat") ||
    lower.includes("rule");

  if (isHigh) {
    return { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#f87171", dot: "#ef4444" };
  }
  if (isMed) {
    return { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", text: "#fbbf24", dot: "#f59e0b" };
  }
  return { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", text: "#a5b4fc", dot: "#6366f1" };
}

interface ReasonsIndicatorsProps {
  reasons: string[];
}

export default function ReasonsIndicators({ reasons }: ReasonsIndicatorsProps) {
  if (!reasons || reasons.length === 0) {
    return (
      <div
        style={{
          padding: "1.5rem",
          textAlign: "center",
          color: "var(--text-muted)",
          background: "rgba(0,0,0,0.1)",
          borderRadius: "10px",
          border: "1px dashed rgba(255,255,255,0.08)",
        }}
      >
        No indicators recorded for this case.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.875rem",
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
          Flagging Indicators
        </h4>
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
          {reasons.length} INDICATOR{reasons.length !== 1 ? "S" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {reasons.map((reason, i) => {
          const icon = getIndicatorIcon(reason);
          const style = getSeverityStyle(reason);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: style.dot,
                  marginTop: "0.3rem",
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${style.dot}`,
                }}
              />
              <span style={{ fontSize: "0.9rem", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {reason}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
