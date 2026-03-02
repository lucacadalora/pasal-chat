"use client";
import { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { useRouter } from "next/navigation";

const REG_TYPES = ["UU","PP","PERPRES","PERMEN","PERPPU","KEPPRES","PERDA","PERMA","UUD"];

interface Law {
  id: string; title_id: string; status: string; year: number; number: string;
  frbr_uri: string; regulation_types?: { code: string } | null;
}

export default function BrowsePage() {
  const router = useRouter();
  const [laws, setLaws] = useState<Law[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    const res = await fetch(`/api/browse?${params}`);
    const data = await res.json();
    setLaws(data.laws ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, type, status, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const askAbout = (law: Law) => {
    const code = law.regulation_types?.code ?? "";
    router.push(`/chat?q=${encodeURIComponent(`Jelaskan ${code} No. ${law.number} Tahun ${law.year} tentang ${law.title_id}`)}`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-sans)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <a href="/chat" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--primary)", textDecoration: "none" }}>
            ← Kembali ke Chat
          </a>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "32px", fontStyle: "italic", marginTop: "12px" }}>
            Jelajahi Peraturan
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
            {total.toLocaleString("id-ID")} peraturan tersedia
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari judul peraturan..."
            style={{ flex: "1 1 240px", padding: "9px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontFamily: "var(--font-sans)", fontSize: "13px", outline: "none" }} />
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}
            style={{ padding: "9px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: type ? "var(--text)" : "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "12px", outline: "none" }}>
            <option value="">Semua Jenis</option>
            {REG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ padding: "9px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", color: status ? "var(--text)" : "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: "12px", outline: "none" }}>
            <option value="">Semua Status</option>
            <option value="berlaku">Berlaku</option>
            <option value="diubah">Diubah</option>
            <option value="dicabut">Dicabut</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            Memuat...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
            {laws.map((law) => (
              <div key={law.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--primary)", background: "var(--primary-dim)", padding: "2px 7px", borderRadius: "3px" }}>
                    {law.regulation_types?.code ?? "—"} {law.year}
                  </span>
                  <StatusBadge status={law.status} />
                </div>
                <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: 1.5, flex: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {law.title_id}
                </p>
                <button onClick={() => askAbout(law)}
                  style={{ padding: "7px 12px", background: "var(--primary-dim)", border: "1px solid rgba(77,170,137,0.2)", borderRadius: "6px", color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: "11px", cursor: "pointer", textAlign: "left", transition: "background 0.12s" }}>
                  Tanya tentang ini →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 24 && (
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "32px" }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              style={{ padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", color: page === 1 ? "var(--text-muted)" : "var(--text)", cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              ← Sebelumnya
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-dim)", padding: "8px 16px" }}>
              {page} / {Math.ceil(total / 24)}
            </span>
            <button disabled={page * 24 >= total} onClick={() => setPage((p) => p + 1)}
              style={{ padding: "8px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", color: page * 24 >= total ? "var(--text-muted)" : "var(--text)", cursor: page * 24 >= total ? "not-allowed" : "pointer", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
              Berikutnya →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
