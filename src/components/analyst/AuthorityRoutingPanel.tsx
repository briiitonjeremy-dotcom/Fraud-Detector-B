"use client";

import { AnalystCase } from "@/lib/api";
import { AlertTriangle, ExternalLink } from "lucide-react";

interface AuthorityRoutingPanelProps {
  caseData: AnalystCase;
}

const AUTHORITY_INFO: Record<
  string,
  {
    fullName: string;
    description: string;
    scope: string;
    color: string;
    bg: string;
    border: string;
    routeType: string;
  }
> = {
  DCI: {
    fullName: "Directorate of Criminal Investigations",
    description:
      "Recommended for cases involving cyber-enabled fraud, electronic fraud, phishing, identity theft, unauthorized account access, account takeover, or digital payment abuse.",
    scope: "Criminal Investigation",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    routeType: "External — Law Enforcement",
  },
  FRC: {
    fullName: "Financial Reporting Centre",
    description:
      "Recommended for suspicious transaction reports (STRs) and cases with indicators consistent with anti-money laundering (AML) concerns or financial crime patterns.",
    scope: "Financial Intelligence",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    routeType: "External — Regulatory Reporting",
  },
  ODPC: {
    fullName: "Office of the Data Protection Commissioner",
    description:
      "Recommended when the incident may also involve unauthorized access to, or exposure of, personal data — potentially constituting a reportable data breach under the Data Protection Act.",
    scope: "Data Protection",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.25)",
    routeType: "External — Regulatory Notification",
  },
  "Internal Review Only": {
    fullName: "Internal Review",
    description:
      "The available evidence does not currently meet the threshold for external escalation. This case is recommended for internal analyst review and documentation only.",
    scope: "Internal Operations",
    color: "#94a3b8",
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.25)",
    routeType: "Internal — No External Reporting",
  },
};

const DEFAULT_AUTHORITY = {
  fullName: "Authority",
  description: "Review recommended by the fraud detection system.",
  scope: "Review",
  color: "#a855f7",
  bg: "rgba(168,85,247,0.08)",
  border: "rgba(168,85,247,0.25)",
  routeType: "Review Required",
};

export default function AuthorityRoutingPanel({ caseData }: AuthorityRoutingPanelProps) {
  const authorities = caseData.recommended_authorities || ["Internal Review Only"];

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
        The following authority routing is recommended by the fraud detection system based on the
        available case evidence. External reporting requires analyst and compliance approval before
        submission.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {authorities.map((auth) => {
          const info = AUTHORITY_INFO[auth] || DEFAULT_AUTHORITY;

          return (
            <div
              key={auth}
              style={{
                padding: "1rem 1.25rem",
                background: info.bg,
                borderRadius: "10px",
                border: `1px solid ${info.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 800, color: info.color }}>
                      {auth}
                    </span>
                    <span
                      style={{
                        padding: "0.125rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        background: `${info.color}20`,
                        color: info.color,
                      }}
                    >
                      {info.scope}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.125rem" }}>
                    {info.fullName}
                  </div>
                </div>
                <span
                  style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    background: "rgba(0,0,0,0.3)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {info.routeType}
                </span>
              </div>

              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                  marginBottom: "0.75rem",
                }}
              >
                {info.description}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "0.6875rem",
                  color: "#f59e0b",
                  padding: "0.375rem 0.5rem",
                  background: "rgba(245,158,11,0.08)",
                  borderRadius: "6px",
                }}
              >
                <AlertTriangle style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                Human analyst and compliance approval required before external submission
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "1.25rem",
          padding: "0.875rem 1rem",
          background: "rgba(0,0,0,0.25)",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
          <ExternalLink style={{ width: "11px", height: "11px" }} />
          <strong style={{ color: "var(--text-secondary)" }}>Routing Disclaimer</strong>
        </div>
        This routing recommendation is generated as a draft by the AI system based on available
        evidence. The system detected indicators consistent with possible fraud. Final routing
        decisions must be made by qualified analysts and compliance personnel. External reporting
        should only occur after appropriate approvals.
      </div>
    </div>
  );
}
