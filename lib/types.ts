export interface Citation {
  pasal: string;
  lawTitle: string;
  lawType: string;
  year: number;
  snippet: string;
  status: "berlaku" | "diubah" | "dicabut" | "tidak_berlaku";
  relevanceScore: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
  streaming?: boolean;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface RetrievedChunk {
  work_id: string;
  law_title: string;
  regulation_type: string;
  year: number;
  pasal: string;
  snippet: string;
  status: string;
  relevance_score: number;
}
