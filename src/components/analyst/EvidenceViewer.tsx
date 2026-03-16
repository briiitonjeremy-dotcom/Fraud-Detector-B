"use client";

import { useState } from "react";
import { EvidenceItem } from "@/lib/api";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Cpu,
  Lock,
  Link2,
  ClipboardList,
  Activity,
} from "lucide-react";

interface EvidenceViewerProps {
  evidence: EvidenceItem[];
}

const CATEGORIES = [
  {
    key: "transaction",
    label: "Transaction Evidence",
    icon: Database,
    color: "#06b6d4",
    types: ["amount", "channel", "transaction_type", "sender", "recipient", "currency", "account"],
  },
  {
    key: "model",
    label: "Model Evidence",
    icon: Cpu,
    color: "#a855f7",
    types: ["model_score", "shap", "feature_importance", "rule_trigger", "risk_score"],
  },
  {
    key: "access",
    label: "Access / Authentication Evidence",
    icon: Lock,
    color: "#f59e0b",
    types: ["otp", "login", "device", "ip", "browser", "session", "failed_attempt"],
  },
  {
    key: "linked",
    label: "Linked Activity",
    icon: Link2,
    color: "#10b981",
    types: ["linked_transaction", "linked_account", "related_case"],
  },
  {
    key: "audit",
    label: "Audit Trail",
    icon: ClipboardList,
    color: "#64748b",
    types: ["audit_log", "timestamp", "note", "export"],
  },
];

function categorizeEvidence(
  evidence: EvidenceItem[]
): Record<string, EvidenceItem[]> {
  const categorized: Record<string, EvidenceItem[]> = {};

  for (const cat of CATEGORIES) {
    categorized[cat.key] = evidence.filter((e) =>
      cat.types.some((t) => e.type?.toLowerCase().includes(t))
    );
  }

  // Uncategorized
  const allCatTypes = CATEGORIES.flatMap((c) => c.types);
  categorized["other"] = evidence.filter(
    (e) => !allCatTypes.some((t) => e.type?.toLowerCase().includes(t))
  );

  return categorized;
}

function EvidenceCategory({
  cat,
  items,
}: {
  cat: (typeof CATEGORIES)[0] | { key: string; label: string; icon: typeof Activity; color: string };
  items: EvidenceItem[];
}) {
  const [open, setOpen] = useState(true);
  const Icon = cat.icon;

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "0.75rem",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "0.75rem 1rem",
          background: "rgba(0,0,0,0.25)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <Icon style={{ width: "14px", height: "14px", color: cat.color }} />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: cat.color }}>
            {cat.label}
          </span>
          <span
            style={{
              padding: "0.1rem 0.5rem",
              borderRadius: "10px",
              fontSize: "0.625rem",
              fontWeight: 700,
              background: items.length > 0 ? `${cat.color}20` : "rgba(100,116,139,0.15)",
              color: items.length > 0 ? cat.color : "#64748b",
            }}
          >
            {items.length}
          </span>
        </div>
        {open ? (
          <ChevronDown style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
        ) : (
          <ChevronRight style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
        )}
      </button>

      {open && (
        <div style={{ padding: "0.75rem" }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: "0.75rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontStyle: "italic",
              }}
            >
              No evidence items in this category.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "6px",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontWeight: 600,
                      }}
                    >
                      {item.label || item.type}
                    </span>
                    {item.type && item.label && item.type !== item.label && (
                      <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                        type: {item.type}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      textAlign: "right",
                      maxWidth: "55%",
                      wordBreak: "break-word",
                    }}
                  >
                    {String(item.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvidenceViewer({ evidence }: EvidenceViewerProps) {
  const categorized = categorizeEvidence(evidence || []);

  return (
    <div>
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: "1rem",
          lineHeight: 1.5,
        }}
      >
        Evidence is organized by category. Expand each section to inspect available data points.
        Missing evidence categories may indicate incomplete data collection.
      </p>

      {CATEGORIES.map((cat) => (
        <EvidenceCategory key={cat.key} cat={cat} items={categorized[cat.key] || []} />
      ))}

      {categorized["other"] && categorized["other"].length > 0 && (
        <EvidenceCategory
          cat={{
            key: "other",
            label: "Other Evidence",
            icon: Activity,
            color: "#94a3b8",
          }}
          items={categorized["other"]}
        />
      )}
    </div>
  );
}
