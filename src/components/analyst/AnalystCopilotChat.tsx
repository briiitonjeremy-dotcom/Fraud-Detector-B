"use client";

import { useState, useRef, useEffect } from "react";
import { AnalystChatMessage } from "@/lib/api";
import { Send, Loader2, MessageSquare } from "lucide-react";

interface AnalystCopilotChatProps {
  caseId: string;
  messages: AnalystChatMessage[];
  isLoading: boolean;
  onSend: (question: string) => void;
}

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
  "What are the main fraud indicators?",
];

export default function AnalystCopilotChat({
  caseId,
  messages,
  isLoading,
  onSend,
}: AnalystCopilotChatProps) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSend() {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput("");
    onSend(q);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "400px",
        gap: "0.875rem",
      }}
    >
      {/* Header note */}
      <div
        style={{
          padding: "0.625rem 0.875rem",
          background: "rgba(6,182,212,0.07)",
          borderRadius: "8px",
          border: "1px solid rgba(6,182,212,0.18)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#06b6d4" }}>Case-Specific Copilot</strong> — Questions are
        grounded in case{" "}
        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{caseId}</span>. The
        assistant does not replace analyst judgment. All responses are advisory.
      </div>

      {/* Suggested questions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              setInput(q);
            }}
            style={{
              padding: "0.3rem 0.675rem",
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.25)",
              borderRadius: "20px",
              fontSize: "0.7125rem",
              color: "#c084fc",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(168,85,247,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = "rgba(168,85,247,0.08)";
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          padding: "1rem",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.06)",
          minHeight: "260px",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              color: "var(--text-muted)",
              padding: "2rem",
            }}
          >
            <MessageSquare style={{ width: "32px", height: "32px", opacity: 0.3 }} />
            <p style={{ fontSize: "0.875rem", textAlign: "center" }}>
              Ask follow-up questions about this case
            </p>
            <p style={{ fontSize: "0.75rem", textAlign: "center", opacity: 0.7 }}>
              Use the suggestions above or type your own question
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Analyst question */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "0.625rem 0.875rem",
                    background: "rgba(6,182,212,0.12)",
                    border: "1px solid rgba(6,182,212,0.25)",
                    borderRadius: "10px 10px 2px 10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.625rem",
                      color: "#06b6d4",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Analyst
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-primary)" }}>
                    {msg.question}
                  </div>
                </div>
              </div>

              {/* AI response */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "0.75rem 1rem",
                    background: "rgba(168,85,247,0.08)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    borderRadius: "2px 10px 10px 10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.625rem",
                      color: "#c084fc",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Analyst AI Copilot
                  </div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.65,
                    }}
                  >
                    {msg.response}
                  </div>
                  {msg.timestamp && (
                    <div
                      style={{
                        marginTop: "0.375rem",
                        fontSize: "0.625rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: "2px 10px 10px 10px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Loader2
                style={{
                  width: "14px",
                  height: "14px",
                  color: "#c084fc",
                  animation: "spin 1s linear infinite",
                }}
              />
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Analyst AI is reviewing the case data...
              </span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: "0.625rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question about this case..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.75rem 1.125rem",
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
          ) : (
            <Send style={{ width: "14px", height: "14px" }} />
          )}
          Send
        </button>
      </div>
    </div>
  );
}
