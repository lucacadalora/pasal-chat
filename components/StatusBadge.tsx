"use client";
const STATUS_CONFIG = {
  berlaku:       { label: "Berlaku",      bg: "rgba(77,170,137,0.12)",  color: "#4DAA89",  border: "rgba(77,170,137,0.25)" },
  diubah:        { label: "Diubah",       bg: "rgba(217,119,6,0.10)",   color: "#D97706",  border: "rgba(217,119,6,0.25)" },
  dicabut:       { label: "Dicabut",      bg: "rgba(192,57,43,0.10)",   color: "#E07070",  border: "rgba(192,57,43,0.25)" },
  tidak_berlaku: { label: "Tidak Berlaku",bg: "rgba(130,124,114,0.10)", color: "#8A8478",  border: "rgba(130,124,114,0.25)" },
};
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.berlaku;
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: "9px",
      fontWeight: 500,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "2px 7px",
      borderRadius: "3px",
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}
