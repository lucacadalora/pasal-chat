import supabase from "./supabase";
import type { Citation, RetrievedChunk } from "./types";

interface RawChunk {
  work_id: string;
  content: string;
  snippet?: string;
  score: number;
  metadata?: {
    pasal?: string;
    type?: string;
    year?: number;
    title?: string;
  };
}

interface WorkRow {
  id: string;
  title_id: string;
  status: string;
  year: number;
  regulation_types?: { code: string } | null;
}

export async function retrieveRelevantLaws(
  query: string,
  limit = 8
): Promise<RetrievedChunk[]> {
  try {
    const { data: chunks, error } = await supabase.rpc("search_legal_chunks", {
      query_text: query,
      match_count: limit * 3,
      metadata_filter: {},
    });

    if (error || !chunks?.length) return [];

    // Fetch work metadata
    const workIds = [...new Set((chunks as RawChunk[]).map((c) => c.work_id))];
    const { data: works } = await supabase
      .from("works")
      .select("id, title_id, status, year, regulation_types(code)")
      .in("id", workIds);

    const worksMap = new Map(
      (works as WorkRow[] || []).map((w) => [w.id, w])
    );

    // Deduplicate by work_id, keep highest score
    const seen = new Map<string, RetrievedChunk>();
    for (const chunk of chunks as RawChunk[]) {
      const work = worksMap.get(chunk.work_id);
      if (!work) continue;
      const existing = seen.get(chunk.work_id);
      if (existing && existing.relevance_score >= chunk.score) continue;
      seen.set(chunk.work_id, {
        work_id: chunk.work_id,
        law_title: work.title_id,
        regulation_type: work.regulation_types?.code ?? chunk.metadata?.type ?? "",
        year: work.year ?? chunk.metadata?.year ?? 0,
        pasal: chunk.metadata?.pasal ?? "",
        snippet: chunk.snippet ?? chunk.content?.slice(0, 300) ?? "",
        status: work.status,
        relevance_score: chunk.score,
      });
    }

    return [...seen.values()]
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export function formatCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((c) => ({
    pasal: c.pasal ? `Pasal ${c.pasal}` : "—",
    lawTitle: c.law_title,
    lawType: c.regulation_type,
    year: c.year,
    snippet: c.snippet,
    status: (c.status as Citation["status"]) ?? "berlaku",
    relevanceScore: c.relevance_score,
  }));
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const context = chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.regulation_type} No. ${c.year} — ${c.law_title}\n` +
        `${c.pasal ? `Pasal ${c.pasal}: ` : ""}${c.snippet}`
    )
    .join("\n\n");

  return `You are Pasal Assistant — an expert AI legal assistant specializing in Indonesian law (hukum Indonesia).

RETRIEVED LEGAL CONTEXT (use ONLY these sources for citations):
${context || "No specific laws retrieved for this query."}

RULES:
1. ONLY cite laws that appear in the retrieved context above. Never invent article numbers.
2. Citation format: "Pasal [X] [TYPE] No. [Y] Tahun [Z]" — e.g., "Pasal 81 UU No. 13 Tahun 2003"
3. If the context doesn't cover the question, say so clearly and suggest consulting a lawyer.
4. Respond in the SAME language as the user (Indonesian if they write in Indonesian, English if English).
5. Structure your answer: brief direct answer → supporting articles → important caveats.
6. End with disclaimer: "⚠️ Ini bukan nasihat hukum. Selalu konsultasikan dengan pengacara untuk kasus spesifik."

Be precise, authoritative, and grounded. You are a legal research tool, not a chatbot.`;
}
