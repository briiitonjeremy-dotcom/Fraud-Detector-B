"use client";

import { CaseAudit } from "@/lib/api";

interface AuditMetadataPanelProps {
  audit: CaseAudit | null | undefined;
  caseId: string;
  caseStatus?: string;
  createdAt?: string;
}

function AuditField({ label, value, mono = false, highlight = false }: {
  label: string;
  value: string | undefined | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  const displayValue = value || "N/A";
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          color: highlight && displayValue !== "N/A" ? "#06b6d4" : "var(--text-secondary)",
          fontFamily: mono ? "monospace" : "inherit",
          wordBreak: "break-all",
        }}
      >
        {displayValue}
      </div>
    </div>
  );
}

export default function AuditMetadataPanel({ audit, caseId, caseStatus, createdAt }: AuditMetadataPanelProps) {
  const fields: { label: string; value: string | undefined | null; mono?: boolean; highlight?: boolean }[] = [
    { label: "Case ID", value: caseId, mono: true, highlight: true },
    { label: "Case Status", value: (caseStatus || "open").replace("_", " ").toUpperCase() },
    { label: "Case Created", value: createdAt ? new Date(createdAt).toLocaleString() : undefined },
    { label: "Model Version", value: audit?.model_version, mono: true },
    { label: "Prompt Version", value: audit?.prompt_version, mono: true },
    { label: "Report Timestamp", value: audit?.report_timestamp ? new Date(audit.report_timestamp).toLocaleString() : undefined },
    { label: "Reviewer Decision", value: audit?.reviewer_decision ? audit.reviewer_decision.replace(/_/g, " ").toUpperCase() : "Pending" },
    { label: "Review Timestamp", value: audit?.review_timestamp ? new Date(audit.review_timestamp).toLocaleString() : undefined },
  ];

  return (
    <div
      style={{
        padding: "0.75rem 1.25rem",
        background: "rgba(0,0,0,0.15)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "8px",
      }}
    >
      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.625rem" }}>
        AUDIT & TRACEABILITY METADATA
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "0.625rem 1.25rem",
        }}
      >
        {fields.map((f, i) => (
          <AuditField key={i} label={f.label} value={f.value} mono={f.mono} highlight={f.highlight} />
        ))}
      </div>
    </div>
  );
}
