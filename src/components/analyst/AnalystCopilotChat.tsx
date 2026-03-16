"use client";

import { useState, useRef, useEffect } from "react";
import { AnalystChatMessage } from "@/lib/api";

const SUGGESTED_QUESTIONS = [
  "Why was this routed to DCI?",
  "What evidence is strongest?",
  "What evidence is missing?",
  "Does this look like account takeover?",
  "Does this resemble structuring?",
  "Why is the confidence low?",
  "What action should I take next?",
  "What should be preserved before escalation?",
  "What makes this suitable for internal review only?",
  "What are the key risk indicators in this case?",
];

interface AnalystCopilotChatProps {
  caseId: string;
  messages: AnalystChatMessage[];
  isLoading: boolean;
  chatInput: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestedQuestion: (q: string) => void;
}

function formatResponse(text: string): React.ReactNode {
  // Split on double newlines for paragraphs
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para, i) => {
    // Handle bullet lines
    const lines = para.split("\n");
    const isBulletBlock = lines.some((l) => l.match(/^[-•*]\s/));
    if (isBulletBlock) {
      return (
        <ul key={i} style={{ margin: "0 0 0.625rem 1.25rem", paddingLeft: 0 }}>
          {lines.map((line, j) => {
            const stripped = line.replace(/^[-•*]\s/, "");
            return stripped ? (
              <li key={j} style={{ marginBottom: "0.25rem", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {stripped}
              </li>
            ) : null;
          })}
        </ul>
      );
    }
    return (
      <p key={i} style={{ margin: "0 0 0.5rem 0", color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.7 }}>
        {para}
      </p>
    );
  });
}

export default function AnalystCopilotChat({
  caseId,
  messages,
  isLoading,
  chatInput,
  onInputChange,
  onSend,
  onSuggestedQuestion,
}: AnalystCopilotChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "400px" }}>
      {/* Header */}
      <div style={{ marginBottom: "0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "rgba(168,85,247,0.15)",
              border: "1px solid rgba(168,85,247,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
            }}
          >
            🤖
          </div>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>
            Analyst Copilot
          </h4>
          <span
            style={{
              padding: "0.15rem 0.45rem",
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.2)",
              borderRadius: "4px",
              fontSize: "0.625rem",
              fontWeight: 700,
              color: "#a855f7",
              letterSpacing: "0.05em",
            }}
          >
            CASE-GROUNDED
          </span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
          Ask follow-up questions about case <strong style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{caseId}</strong>.
          All responses are grounded in the available case data and processed by the backend.
        </p>
      </div>

      {/* Suggested questions */}
      <div style={{ marginBottom: "0.875rem" }}>
        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
          SUGGESTED QUESTIONS
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestedQuestion(q)}
              style={{
                padding: "0.3rem 0.625rem",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: "20px",
                fontSize: "0.6875rem",
                color: "#a855f7",
                cursor: "pointer",
                transition: "background 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat message area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "1rem",
          background: "rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          marginBottom: "0.875rem",
          minHeight: "200px",
          maxHeight: "380px",
        }}
      >
        {messages.length === 0 && !isLoading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem 1rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.5 }}>💬</div>
            <p style={{ fontSize: "0.875rem", marginBottom: "0.375rem" }}>
              No questions asked yet for this case.
            </p>
            <p style={{ fontSize: "0.75rem" }}>
              Use the suggested questions above or type your own below.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Analyst question */}
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "80%",
                  padding: "0.75rem 1rem",
                  background: "rgba(6,182,212,0.12)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  borderRadius: "10px 10px 2px 10px",
                }}
              >
                <div style={{ fontSize: "0.6875rem", color: "#06b6d4", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                  ANALYST
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", margin: 0 }}>{msg.question}</p>
              </div>

              {/* AI response */}
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "88%",
                  padding: "0.875rem 1rem",
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  borderRadius: "2px 10px 10px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem" }}>🤖</span>
                  <span style={{ fontSize: "0.6875rem", color: "#a855f7", fontWeight: 700, letterSpacing: "0.05em" }}>
                    ANALYST COPILOT
                  </span>
                  {msg.timestamp && (
                    <span style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div>{formatResponse(msg.response)}</div>
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingTop: "0.375rem",
                    borderTop: "1px solid rgba(168,85,247,0.12)",
                    fontSize: "0.6875rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  Response grounded in case {msg.case_id}. AI-generated — requires analyst judgement.
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "rgba(168,85,247,0.06)", borderRadius: "8px" }}>
            <div
              style={{
                width: "18px",
                height: "18px",
                border: "2px solid rgba(168,85,247,0.3)",
                borderTop: "2px solid #a855f7",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Analyst Copilot is analysing the case...
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div style={{ display: "flex", gap: "0.625rem" }}>
        <input
          type="text"
          value={chatInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
          placeholder="Ask a question about this case..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            outline: "none",
            transition: "border-color 0.15s",
          }}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !chatInput.trim()}
          style={{
            padding: "0.75rem 1.25rem",
            background: isLoading || !chatInput.trim() ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.8)",
            border: "1px solid rgba(168,85,247,0.4)",
            borderRadius: "8px",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: isLoading || !chatInput.trim() ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {isLoading ? "..." : "Send →"}
        </button>
      </div>
    </div>
  );
}
