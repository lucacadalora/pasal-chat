"use client";
import { CitationCard } from "./CitationCard";
import type { Message as MessageType } from "@/lib/types";

export function Message({ message }: { message: MessageType }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: "8px",
        animation: "fadeIn 0.25s ease-out",
        maxWidth: "100%",
      }}
    >
      {/* Bubble */}
      <div
        style={{
          maxWidth: "82%",
          background: isUser ? "var(--surface2)" : "transparent",
          borderRadius: isUser ? "16px 16px 4px 16px" : "0",
          padding: isUser ? "12px 16px" : "0",
          fontFamily: isUser ? "var(--font-sans)" : "var(--font-serif)",
          fontSize: isUser ? "14px" : "15px",
          lineHeight: 1.7,
          color: "var(--text)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content}
        {message.streaming && (
          <span
            style={{
              display: "inline-block",
              width: "2px",
              height: "14px",
              background: "var(--primary)",
              marginLeft: "2px",
              verticalAlign: "middle",
              animation: "blink 1s step-end infinite",
            }}
          />
        )}
      </div>

      {/* Citations */}
      {!isUser && message.citations && message.citations.length > 0 && !message.streaming && (
        <div style={{ maxWidth: "82%", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>
            Sumber Hukum ({message.citations.length})
          </div>
          {message.citations.map((c, i) => (
            <CitationCard key={i} citation={c} index={i} />
          ))}
        </div>
      )}

      {/* Timestamp */}
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-muted)" }}>
        {new Date(message.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}
