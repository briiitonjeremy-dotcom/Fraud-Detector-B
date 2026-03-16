"use client";

import { AnalystCase } from "@/lib/api";
import {
  Cpu,
  FileCode,
  Clock,
  ShieldCheck,
  Download,
  BarChart3,
} from "lucide-react";

interface AuditMetadataCardProps {
  caseData: AnalystCase;
}

function AuditItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.375rem 0.75rem",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.05)",
        minWidth: "160px",
      }}
    >
      <span style={{ color: "#64748b", flexShrink: 0 }}>{icon}</span>
      <div>
        <div
          style={{
            fontSize: "0.625rem",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

export default function AuditMetadataCard({ caseData }: AuditMetadataCardProps) {
  const audit = caseData.audit || {};

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.625rem 1rem",
        background: "rgba(0,0,0,0.25)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{
          fontSize: "0.6875rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginRight: "0.25rem",
          flexShrink: 0,
        }}
      >
        Audit
      </span>

      <AuditItem
        icon={<Cpu style={{ width: "11px", height: "11px" }} />}
        label="Model"
        value={audit.model_version || "—"}
      />
      <AuditItem
        icon={<FileCode style={{ width: "11px", height: "11px" }} />}
        label="Prompt"
        value={audit.prompt_version || "—"}
      />
      <AuditItem
        icon={<Clock style={{ width: "11px", height: "11px" }} />}
        label="Report Generated"
        value={
          audit.report_timestamp
            ? new Date(audit.report_timestamp).toLocaleString()
            : "—"
        }
      />
      {audit.reviewer_decision && (
        <AuditItem
          icon={<ShieldCheck style={{ width: "11px", height: "11px" }} />}
          label="Reviewer Decision"
          value={audit.reviewer_decision.replace(/_/g, " ").toUpperCase()}
        />
      )}
      {audit.review_timestamp && (
        <AuditItem
          icon={<Clock style={{ width: "11px", height: "11px" }} />}
          label="Review Time"
          value={new Date(audit.review_timestamp).toLocaleString()}
        />
      )}
      <AuditItem
        icon={<BarChart3 style={{ width: "11px", height: "11px" }} />}
        label="Case Status"
        value={(caseData.status || "open").replace(/_/g, " ").toUpperCase()}
      />
      <AuditItem
        icon={<Download style={{ width: "11px", height: "11px" }} />}
        label="Case ID"
        value={caseData.case_id}
      />
    </div>
  );
}
