"use client";

import { useState } from "react";
import { EvidenceItem } from "@/lib/api";

interface EvidenceViewerProps {
  evidence: EvidenceItem[];
}

const categoryConfig: {
  key: string;
  label: string;
  types: string[];
  icon: string;
  accentColor: string;
}[] = [
  {
    key: "transaction",
    label: "Transaction Evidence",
    types: ["amount", "channel", "transaction_type", "sender", "recipient", "balance", "currency", "transaction_id"],
    icon: "💳",
    accentColor: "#06b6d4",
  },
  {
    key: "model",
    label: "Model Evidence",
    types: ["model_score", "shap", "feature_importance", "prediction", "risk_score"],
    icon: "🤖",
    accentColor: "#ef4444",
  },
  {
    key: "access",
    label: "Access / Authentication Evidence",
    types: ["login", "otp", "device", "ip", "browser", "session", "failed_auth", "mfa"],
    icon: "🔐",
    accentColor: "#f59e0b",
  },
  {
    key: "linked",
    label: "Linked Activity",
    types: ["linked_transaction", "linked_account", "related_case", "network"],
    icon: "🔗",
    accentColor: "#a855f7",
  },
  {
    key: "audit",
    label: "Audit Trail",
    types: ["audit_log", "rule_trigger", "event_log", "system_log"],
    icon: "📋",
    accentColor: "#10b981",
  },
];

function categoriseEvidence(
  evidence: EvidenceItem[]
): Map<string, EvidenceItem[]> {
  const map = new Map<string, EvidenceItem[]>();

  for (const cat of categoryConfig) {
    map.set(cat.key, []);
  }
  map.set("other", []);

  for (const item of evidence) {
    const typeLower = item.type?.toLowerCase() || "";
    let matched = false;
    for (const cat of categoryConfig) {
      if (cat.types.some((t) => typeLower.includes(t))) {
        map.get(cat.key)!.push(item);
        matched = true;
        break;
      }
    }
    if (!matched) {
      map.get("other")!.push(item);
    }
  }

  return map;
}

function EvidenceCard({ item }: { item: EvidenceItem }) {
  const valueStr =
    typeof item.value === "object"
      ? JSON.stringify(item.value, null, 2)
      : String(item.value ?? "");

  const isScore = item.type === "model_score" || item.label?.toLowerCase().includes("score");
  const scoreVal = isScore ? parseFloat(valueStr) : null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.625rem 0.875rem",
        background: "rgba(0,0,0,0.2)",
        borderRadius: "7px",
        border: "1px solid rgba(255,255,255,0.05)",
        gap: "1rem",
      }}
    >
      <div>
        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "0.2rem" }}>
          {item.label || item.type}
        </div>
        {typeof item.value === "object" ? (
          <pre style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {valueStr}
          </pre>
        ) : (
          <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontFamily: item.type?.includes("log") || item.type?.includes("id") ? "monospace" : "inherit" }}>
            {valueStr}
          </div>
        )}
      </div>

      {isScore && scoreVal !== null && !isNaN(scoreVal) && (
        <div style={{ flexShrink: 0, textAlign: "right" }}>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: scoreVal > 0.7 ? "#ef4444" : scoreVal > 0.5 ? "#f59e0b" : "#10b981",
            }}
          >
            {(scoreVal <= 1 ? scoreVal * 100 : scoreVal).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryPanelProps {
  cat: (typeof categoryConfig)[0];
  items: EvidenceItem[];
}

function CategoryPanel({ cat, items }: CategoryPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const isEmpty = items.length === 0;

  return (
    <div
      style={{
        border: `1px solid ${isEmpty ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "10px",
        overflow: "hidden",
        opacity: isEmpty ? 0.5 : 1,
      }}
    >
      <button
        onClick={() => !isEmpty && setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: `linear-gradient(90deg, ${cat.accentColor}12 0%, transparent 100%)`,
          border: "none",
          cursor: isEmpty ? "default" : "pointer",
          borderBottom: expanded && !isEmpty ? `1px solid rgba(255,255,255,0.06)` : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontSize: "1rem" }}>{cat.icon}</span>
          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: isEmpty ? "var(--text-muted)" : cat.accentColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {cat.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              padding: "0.2rem 0.5rem",
              background: isEmpty ? "rgba(255,255,255,0.05)" : `${cat.accentColor}20`,
              color: isEmpty ? "var(--text-muted)" : cat.accentColor,
              borderRadius: "5px",
              fontSize: "0.6875rem",
              fontWeight: 700,
            }}
          >
            {isEmpty ? "NO DATA" : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </span>
          {!isEmpty && (
            <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
              {expanded ? "▲" : "▼"}
            </span>
          )}
        </div>
      </button>

      {expanded && !isEmpty && (
        <div style={{ padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {items.map((item, i) => (
            <EvidenceCard key={i} item={item} />
          ))}
        </div>
      )}

      {isEmpty && (
        <div style={{ padding: "0.625rem 1rem", fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          No {cat.label.toLowerCase()} available for this case.
        </div>
      )}
    </div>
  );
}

export default function EvidenceViewer({ evidence }: EvidenceViewerProps) {
  const categorised = categoriseEvidence(evidence || []);
  const totalItems = evidence?.length || 0;

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
          Evidence Viewer
        </h4>
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
          {totalItems} EVIDENCE ITEM{totalItems !== 1 ? "S" : ""}
        </span>
      </div>

      {totalItems === 0 ? (
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
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📂</div>
          <p>No evidence has been assembled for this case yet.</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.375rem" }}>
            Evidence will be populated when the backend processes this case.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {categoryConfig.map((cat) => (
            <CategoryPanel key={cat.key} cat={cat} items={categorised.get(cat.key) || []} />
          ))}
          {(categorised.get("other") || []).length > 0 && (
            <CategoryPanel
              cat={{ key: "other", label: "Other Evidence", types: [], icon: "📄", accentColor: "#64748b" }}
              items={categorised.get("other") || []}
            />
          )}
        </div>
      )}
    </div>
  );
}
