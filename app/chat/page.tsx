"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Message } from "@/components/Message";
import { ChatInput } from "@/components/ChatInput";
import type { Message as MessageType, Citation } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const EXAMPLE_QUESTIONS = [
  "Apa saja hak cuti tahunan pekerja?",
  "Syarat pendirian PT di Indonesia?",
  "Kapan UU Perlindungan Data Pribadi berlaku?",
  "Hak-hak terdakwa dalam KUHAP?",
];

const SIDEBAR_LINKS = [
  { label: "pasal.id", href: "https://pasal.id", desc: "Browse database" },
  { label: "GitHub", href: "https://github.com/lucacadalora/pasal-chat", desc: "Source code" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (isStreaming) return;

    const userMsg: MessageType = { id: uuidv4(), role: "user", content: text, timestamp: new Date() };
    const assistantId = uuidv4();
    const assistantMsg: MessageType = {
      id: assistantId, role: "assistant", content: "", citations: [], timestamp: new Date(), streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "citations") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, citations: event.citations as Citation[] } : m)
              );
            } else if (event.type === "delta") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.text } : m)
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m)
              );
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `⚠️ Error: ${event.message}`, streaming: false }
                    : m
                )
              );
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "⚠️ Terjadi kesalahan. Coba lagi.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, streaming: false } : m));
    }
  }, [isStreaming, messages]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <aside style={{
        width: "260px",
        flexShrink: 0,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 0",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "4px" }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: "22px", fontStyle: "italic", color: "var(--text)" }}>
              Pasal
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--primary)" }}>
              .id Chat
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.4 }}>
            AI Legal Assistant · Hukum Indonesia
          </p>
        </div>

        {/* New chat */}
        <div style={{ padding: "16px 16px 12px" }}>
          <button
            onClick={() => setMessages([])}
            style={{
              width: "100%",
              padding: "9px 14px",
              background: "var(--primary-dim)",
              border: "1px solid rgba(77,170,137,0.25)",
              borderRadius: "8px",
              color: "var(--primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
          >
            + Percakapan Baru
          </button>
        </div>

        {/* Example questions */}
        <div style={{ padding: "0 16px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>
            Contoh Pertanyaan
          </div>
          {EXAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSend(q)}
              disabled={isStreaming}
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "transparent",
                border: "none",
                borderRadius: "6px",
                color: "var(--text-dim)",
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left",
                lineHeight: 1.4,
                marginBottom: "4px",
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--surface2)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Footer links */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          {SIDEBAR_LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", textDecoration: "none", marginBottom: "4px" }}>
              {l.label} <span style={{ opacity: 0.5 }}>· {l.desc}</span>
            </a>
          ))}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", marginTop: "6px", opacity: 0.5 }}>
            937K+ pasal · AGPL-3.0
          </div>
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "14px 32px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "var(--bg)",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            MODEL
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary)",
            background: "var(--primary-dim)", padding: "2px 8px", borderRadius: "4px",
          }}>
            claude-sonnet-4-5
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)" }}>
            RAG · pasal.id database
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
          maxWidth: "820px",
          width: "100%",
          margin: "0 auto",
          alignSelf: "center",
          boxSizing: "border-box",
        }}>
          {messages.length === 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "12px",
              opacity: 0.6,
            }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "28px", fontStyle: "italic", color: "var(--text-dim)" }}>
                Tanyakan tentang hukum Indonesia
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-muted)", textAlign: "center", lineHeight: 1.6 }}>
                Jawaban berdasarkan 937.000+ pasal dari database pasal.id<br/>
                Didukung oleh Claude claude-sonnet-4-5 dengan retrieval augmented generation
              </div>
            </div>
          )}
          {messages.map((m) => <Message key={m.id} message={m} />)}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "var(--primary)",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "16px 32px 24px",
          background: "var(--bg)",
          maxWidth: "820px",
          width: "100%",
          margin: "0 auto",
          alignSelf: "center",
          boxSizing: "border-box",
        }}>
          <ChatInput onSend={handleSend} disabled={isStreaming} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
            Ini bukan nasihat hukum · Selalu verifikasi dengan pengacara
          </div>
        </div>
      </main>
    </div>
  );
}
