"use client";

interface AuthorityRoutingPanelProps {
  authorities: string[];
  caseType?: string;
}

const authorityInfo: Record<
  string,
  {
    fullName: string;
    mandate: string;
    routeType: string;
    triggerConditions: string;
    color: string;
    bg: string;
    border: string;
    icon: string;
  }
> = {
  DCI: {
    fullName: "Directorate of Criminal Investigations",
    mandate:
      "Kenya's primary criminal investigative authority responsible for investigating cyber-enabled financial crimes, electronic fraud, identity theft, phishing, account takeover, and digital payment abuse.",
    routeType: "Criminal Investigation Referral",
    triggerConditions:
      "Recommended when the case pattern indicates possible cyber-enabled fraud, unauthorized account access, electronic funds transfer fraud, phishing, or identity theft. Requires analyst/compliance approval before formal submission.",
    color: "#f87171",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    icon: "🔴",
  },
  FRC: {
    fullName: "Financial Reporting Centre",
    mandate:
      "Kenya's financial intelligence unit responsible for receiving Suspicious Transaction Reports (STRs) and Cash Transaction Reports (CTRs) under the Proceeds of Crime and Anti-Money Laundering Act (POCAMLA).",
    routeType: "Suspicious Transaction Report (STR)",
    triggerConditions:
      "Recommended for cases involving unusual transaction patterns, structuring behaviour, suspicious fund movements, or indicators consistent with money laundering. STR submission requires compliance officer approval.",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    icon: "🟡",
  },
  ODPC: {
    fullName: "Office of the Data Protection Commissioner",
    mandate:
      "Kenya's data protection regulator responsible for enforcing the Data Protection Act 2019. Handles personal data breach notifications and investigations involving unauthorised access to personal information.",
    routeType: "Personal Data Breach Notification",
    triggerConditions:
      "Recommended when the fraud incident may also involve a personal data breach — for example, where customer PII was accessed, exfiltrated, or exposed as part of the fraud event. Notification timeline requirements apply under the DPA.",
    color: "#c084fc",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    icon: "🟣",
  },
  "Internal Review Only": {
    fullName: "Internal Compliance and Risk Review",
    mandate:
      "Cases that do not meet the threshold for external reporting but require internal investigation, documentation, and risk management action by the institution's compliance or fraud operations team.",
    routeType: "Internal Case Management",
    triggerConditions:
      "Recommended when available evidence is not sufficient for external authority escalation, or where the transaction was proactively blocked and no customer harm occurred. Internal documentation and monitoring required.",
    color: "#818cf8",
    bg: "rgba(99,102,241,0.08)",
    border: "rgba(99,102,241,0.25)",
    icon: "🔵",
  },
};

function AuthorityCard({ authority }: { authority: string }) {
  const info = authorityInfo[authority] || {
    fullName: authority,
    mandate: "Investigative or regulatory authority.",
    routeType: "Referral",
    triggerConditions: "As recommended by the fraud detection system.",
    color: "#64748b",
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.25)",
    icon: "⚪",
  };

  return (
    <div
      style={{
        background: info.bg,
        border: `1px solid ${info.border}`,
        borderRadius: "12px",
        padding: "1.25rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: `linear-gradient(90deg, ${info.color}, transparent)`,
          borderRadius: "12px 12px 0 0",
        }}
      />

      {/* Authority header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.875rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.3rem" }}>
            <span style={{ fontSize: "1.25rem" }}>{info.icon}</span>
            <h5 style={{ fontSize: "1.1rem", fontWeight: 800, color: info.color, margin: 0 }}>
              {authority}
            </h5>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>{info.fullName}</p>
        </div>
        <span
          style={{
            padding: "0.25rem 0.625rem",
            background: `${info.color}20`,
            color: info.color,
            border: `1px solid ${info.border}`,
            borderRadius: "6px",
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
          }}
        >
          {info.routeType.toUpperCase()}
        </span>
      </div>

      {/* Mandate */}
      <div style={{ marginBottom: "0.875rem" }}>
        <div style={{ fontSize: "0.6875rem", color: info.color, fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
          MANDATE
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          {info.mandate}
        </p>
      </div>

      {/* Why recommended */}
      <div
        style={{
          padding: "0.75rem 0.875rem",
          background: "rgba(0,0,0,0.15)",
          borderRadius: "8px",
          borderLeft: `3px solid ${info.color}`,
        }}
      >
        <div style={{ fontSize: "0.6875rem", color: info.color, fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
          WHY RECOMMENDED
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {info.triggerConditions}
        </p>
      </div>

      {/* Approval notice */}
      <div
        style={{
          marginTop: "0.875rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          background: "rgba(234,179,8,0.08)",
          border: "1px solid rgba(234,179,8,0.15)",
          borderRadius: "7px",
        }}
      >
        <span style={{ fontSize: "0.875rem", color: "#eab308" }}>⚠</span>
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", margin: 0 }}>
          External reporting to {authority} requires analyst and compliance officer approval. Submission should only occur after human review.
        </p>
      </div>
    </div>
  );
}

export default function AuthorityRoutingPanel({ authorities, caseType }: AuthorityRoutingPanelProps) {
  if (!authorities || authorities.length === 0) {
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
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏛</div>
        <p>No authority routing recommendation available yet.</p>
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
          marginBottom: "1rem",
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
          Recommended Authority Routing
        </h4>
        <span
          style={{
            padding: "0.2rem 0.5rem",
            background: "rgba(168,85,247,0.12)",
            color: "#a855f7",
            borderRadius: "5px",
            fontSize: "0.6875rem",
            fontWeight: 700,
          }}
        >
          {authorities.length} DESTINATION{authorities.length !== 1 ? "S" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {authorities.map((auth) => (
          <AuthorityCard key={auth} authority={auth} />
        ))}
      </div>

      {/* Routing disclaimer */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.875rem 1rem",
          background: "rgba(6,182,212,0.06)",
          border: "1px solid rgba(6,182,212,0.15)",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "0.6875rem", color: "#06b6d4", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
          IMPORTANT — ROUTING COMPLIANCE NOTE
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          The authority routing recommendation above is generated by the FraudGuard system based on detected case
          indicators. It is a draft recommendation only. The system does not make final legal determinations.
          Submission to any external authority must be reviewed and approved by a qualified compliance officer before
          any action is taken.
        </p>
      </div>
    </div>
  );
}
