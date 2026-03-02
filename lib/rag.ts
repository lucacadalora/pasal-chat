import type { Citation, RetrievedChunk } from "./types";

const PASAL_API = "https://pasal.id/api/v1";

interface SearchResult {
  work_id: number;
  snippet: string;
  score: number;
  matching_pasals: string[];
  work: { frbr_uri: string; title: string; number: string; year: number; status: string; type: string; };
}

async function searchPasal(query: string, limit: number): Promise<RetrievedChunk[]> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`${PASAL_API}/search?${params}`, {
      headers: { "User-Agent": "PasalChat/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((r: SearchResult) => ({
      work_id: String(r.work_id),
      law_title: r.work.title,
      regulation_type: r.work.type,
      year: r.work.year,
      pasal: r.matching_pasals?.[0] ?? "",
      snippet: r.snippet?.slice(0, 500) ?? "",
      status: r.work.status,
      relevance_score: r.score,
    }));
  } catch { return []; }
}

export async function retrieveRelevantLaws(query: string, limit = 8): Promise<RetrievedChunk[]> {
  // Multi-query strategy: run parallel searches with different terms for better recall
  const terms = extractSearchTerms(query);
  const searches = await Promise.all(terms.map(t => searchPasal(t, limit)));
  
  // Merge and deduplicate by work_id, sum scores
  const merged = new Map<string, RetrievedChunk>();
  for (const results of searches) {
    for (const r of results) {
      const existing = merged.get(r.work_id);
      if (existing) {
        existing.relevance_score = Math.max(existing.relevance_score, r.relevance_score);
      } else {
        merged.set(r.work_id, { ...r });
      }
    }
  }
  
  return [...merged.values()]
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}

function extractSearchTerms(query: string): string[] {
  const terms = [query];
  
  // Legal term mappings for better Indonesian FTS
  const mappings: Record<string, string> = {
    "cuti": "cuti tahunan ketenagakerjaan",
    "gaji": "upah minimum ketenagakerjaan",
    "phk": "pemutusan hubungan kerja",
    "pt": "perseroan terbatas",
    "kontrak": "perjanjian kerja waktu tertentu",
    "data pribadi": "perlindungan data pribadi UU 27 2022",
    "pidana": "kitab undang-undang hukum pidana",
    "terdakwa": "hak terdakwa hukum acara pidana",
    "cerai": "perceraian perkawinan",
    "waris": "hukum waris",
    "pajak": "pajak penghasilan",
  };
  
  const lower = query.toLowerCase();
  for (const [key, mapped] of Object.entries(mappings)) {
    if (lower.includes(key)) {
      terms.push(mapped);
      break;
    }
  }
  
  // Add key noun phrases (simple extraction)
  const words = query.split(/\s+/).filter(w => w.length > 4);
  if (words.length > 2) terms.push(words.slice(0, 3).join(" "));
  
  return [...new Set(terms)].slice(0, 3);
}

export function formatCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((c) => ({
    pasal: c.pasal ? `Pasal ${c.pasal}` : "—",
    lawTitle: c.law_title,
    lawType: c.regulation_type,
    year: c.year,
    snippet: c.snippet,
    status: (c.status as Citation["status"]) ?? "berlaku",
    relevanceScore: Math.min(c.relevance_score / 10, 1),
  }));
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  if (!chunks.length) {
    return `You are Pasal Assistant — an AI legal assistant for Indonesian law.
No specific articles were retrieved for this query. Inform the user and suggest searching at pasal.id.
Always respond in the user's language. Add: ⚠️ Ini bukan nasihat hukum.`;
  }

  const context = chunks.map((c, i) =>
    `[${i+1}] ${c.regulation_type} No. ${c.year} — ${c.law_title}\n` +
    `${c.pasal ? `Pasal ${c.pasal}: ` : ""}${c.snippet}`
  ).join("\n\n---\n\n");

  return `You are Pasal Assistant — an expert AI legal assistant for Indonesian law (hukum Indonesia).
Answer questions based ONLY on the retrieved legal context below.

RETRIEVED LEGAL CONTEXT:
${context}

RULES:
1. ONLY cite laws from the context above. Never invent article numbers.
2. Citation format: "Pasal X [TYPE] No. Y Tahun Z tentang [topic]"
3. Structure: direct answer → cited articles → caveats
4. Respond in the SAME language as the user (Indonesian if Indonesian, English if English)
5. If context is insufficient for a complete answer, say so clearly
6. End every response with: "⚠️ Ini bukan nasihat hukum. Konsultasikan dengan pengacara untuk kasus spesifik."`;
}
