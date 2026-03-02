"use client";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { Citation } from "@/lib/types";

export function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        borderLeft: "2px solid var(--primary)",
        background: "var(--surface)",
        borderRadius: "0 6px 6px 0",
        padding: "10px 14px",
        cursor: "pointer",
        transition: "background 0.15s",
        animation: "fadeIn 0.3s ease-out both",
        animationDelay: `${index * 0.05}s`,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary)", fontWeight: 600 }}>
          {citation.pasal}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>
          {citation.lawType} {citation.year}
        </span>
        <StatusBadge status={citation.status} />
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--text-muted)" }}>
          {Math.round(citation.relevanceScore * 100)}%
        </span>
      </div>
      <p style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--text-dim)",
        lineHeight: 1.5,
        display: expanded ? "block" : "-webkit-box",
        WebkitLineClamp: expanded ? "unset" : 2,
        WebkitBoxOrient: "vertical",
        overflow: expanded ? "visible" : "hidden",
      }}>
        {citation.snippet}
      </p>
      {!expanded && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--primary)", marginTop: "4px", display: "block" }}>
          + tampilkan selengkapnya
        </span>
      )}
    </div>
  );
}
