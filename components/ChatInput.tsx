"use client";
import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSend = useCallback(() => {
    const msg = value.trim();
    if (!msg || disabled) return;
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(msg);
  }, [value, disabled, onSend]);

  return (
    <div style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "10px",
      background: "var(--surface)",
      border: "1px solid var(--border-mid)",
      borderRadius: "12px",
      padding: "10px 14px",
      transition: "border-color 0.15s",
    }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); resize(); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={disabled}
        placeholder="Tanyakan tentang hukum Indonesia... (Enter untuk kirim)"
        rows={1}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          lineHeight: "1.5",
          resize: "none",
          minHeight: "22px",
          maxHeight: "120px",
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "8px",
          border: "none",
          background: disabled || !value.trim() ? "var(--surface3)" : "var(--primary)",
          color: disabled || !value.trim() ? "var(--text-muted)" : "#fff",
          cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s, color 0.15s",
          fontSize: "16px",
        }}
      >
        ↑
      </button>
    </div>
  );
}
