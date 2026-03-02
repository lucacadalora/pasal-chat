# Pasal Chat — Harvey.ai for Indonesian Law
## Vision
An AI legal assistant for Indonesian law. Ask a question in natural language (Indonesian or English),
get a grounded answer with exact citations from 937K+ articles. Zero hallucination.
Built on top of pasal.id's Supabase DB + MCP tools.

## Design Reference: Harvey.ai
- Dark, professional, minimal interface
- Chat-first layout (full height, no clutter)
- Left sidebar: conversation history + law browser
- Right area: chat with inline citation cards
- Font: Instrument Serif for headings, Instrument Sans for UI, JetBrains Mono for citations/code
- Color: near-black bg (#0D0D0D), warm graphite surfaces, verdigris accent (#2B6150 → bright mode: #4DAA89)
- Tone: serious, authoritative, NOT a consumer chatbot

## Architecture

### Tech Stack
- **Frontend + API**: Next.js 15 (App Router), TypeScript, Tailwind v4
- **AI**: Anthropic Claude claude-sonnet-4-5 (streaming via @anthropic-ai/sdk)
- **Database**: Supabase (PostgreSQL) — same DB as pasal.id
- **RAG**: Direct Supabase RPC calls to search_legal_chunks() + get_pasal context building
- **Auth**: None initially (anonymous sessions via localStorage)
- **Deploy**: Vercel

### Project Structure
```
pasal-chat/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # [AGENT 1] Streaming RAG endpoint
│   ├── layout.tsx                # [AGENT 2] Root layout, dark theme
│   ├── page.tsx                  # [AGENT 2] Home → redirect to /chat
│   └── chat/
│       └── page.tsx              # [AGENT 2] Main chat page
├── components/
│   ├── ChatWindow.tsx            # [AGENT 2] Message list
│   ├── ChatInput.tsx             # [AGENT 2] Input bar
│   ├── Message.tsx               # [AGENT 2] Message bubble with citation rendering
│   ├── CitationCard.tsx          # [AGENT 3] Inline law citation card
│   ├── LawSidebar.tsx            # [AGENT 3] Left sidebar
│   └── SourcePanel.tsx           # [AGENT 3] Right panel for retrieved laws
├── lib/
│   ├── supabase.ts               # [AGENT 1] Supabase client (anon key)
│   ├── rag.ts                    # [AGENT 1] Retrieval logic
│   ├── prompts.ts                # [AGENT 1] System prompts
│   └── types.ts                  # [AGENT 1] Shared types
├── package.json                  # [AGENT 4]
├── next.config.ts                # [AGENT 4]
├── tsconfig.json                 # [AGENT 4]
├── tailwind.config.ts            # [AGENT 4]
├── .env.example                  # [AGENT 4]
├── Dockerfile                    # [AGENT 4]
└── README.md                     # [AGENT 4]
```

## CRITICAL: Shared Type Contracts (ALL agents must use these exactly)

### types.ts exports (Agent 1 writes, others import)
```typescript
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface Citation {
  pasal: string;
  lawTitle: string;
  lawType: string;
  year: number;
  snippet: string;
  status: 'berlaku' | 'diubah' | 'dicabut' | 'tidak_berlaku';
  relevanceScore: number;
}

export interface ChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
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
```

### API Route Contract: POST /api/chat
- Request: `{ message: string, history: Array<{role, content}> }`
- Response: Server-Sent Events stream
  - data: `{ type: 'citations', citations: Citation[] }`
  - data: `{ type: 'delta', text: string }`
  - data: `{ type: 'done' }`
  - data: `{ type: 'error', message: string }`

### RAG function signatures (lib/rag.ts)
```typescript
export async function retrieveRelevantLaws(query: string, limit?: number): Promise<RetrievedChunk[]>
export function buildSystemPrompt(chunks: RetrievedChunk[]): string
export function formatCitations(chunks: RetrievedChunk[]): Citation[]
```

## UI Design Spec

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  [sidebar 260px fixed]  │  [chat area flex-1]           │
│  ─────────────────────  │  ──────────────────────────── │
│  Logo: Pasal.id Chat    │  [messages scroll area]        │
│                         │  [message bubbles]             │
│  [New Chat]             │  [citation cards inline]       │
│                         │                                │
│  Recent Chats           │  [input bar fixed bottom]      │
│  · UU Ketenagakerjaan   │  [textarea + send btn]         │
│  · UU Perkawinan        │                                │
│  · PP Cipta Kerja       │  source: pasal.id database     │
└─────────────────────────────────────────────────────────┘
```

### Colors (CSS vars)
- `--bg`: `#0B0B0A`
- `--surface`: `#141413`
- `--surface2`: `#1C1C1A`
- `--border`: `rgba(255,255,255,0.07)`
- `--text`: `#E8E4DC`
- `--text-dim`: `#8A8478`
- `--primary`: `#4DAA89` (bright verdigris for dark bg)
- `--primary-dim`: `rgba(77,170,137,0.12)`
- `--gold`: `#C4922A`

### Message style
- User messages: right-aligned, surface2 bg
- Assistant messages: left-aligned, no bg (just text), Instrument Serif for body
- Citations: rendered as small cards below assistant message (verdigris border-left)
- Status badges: berlaku=green, diubah=amber, dicabut=red

## RAG Logic (lib/rag.ts)

1. Call `supabase.rpc('search_legal_chunks', { query_text: query, match_count: 20 })`
2. Fetch work metadata for returned work_ids
3. Deduplicate by work_id (keep highest score per work)
4. Take top 8 chunks for context
5. Build system prompt with retrieved context embedded
6. Stream Claude response with citations pre-extracted

## System Prompt Template (lib/prompts.ts)
```
You are Pasal Assistant, an AI legal assistant specializing in Indonesian law.
You provide grounded, accurate legal information based on actual legislation.

RETRIEVED LEGAL CONTEXT:
{chunks.map(c => `[${c.regulation_type} ${c.year}] ${c.law_title}\n${c.pasal}: ${c.snippet}`).join('\n\n')}

RULES:
1. ONLY cite laws from the retrieved context above. Never cite laws not in context.
2. Always format citations as: "Pasal X [LAW_TYPE] No. Y Tahun Z"
3. If the retrieved context doesn't answer the question, say so clearly.
4. Respond in the same language as the user (Indonesian or English).
5. Add disclaimer: "Ini bukan nasihat hukum. Selalu konsultasikan dengan pengacara."
```

## Environment Variables (.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Notes
- Supabase anon key is safe to expose (RLS on all tables, public read for legal data)
- Use @anthropic-ai/sdk for Claude streaming (not OpenAI SDK)
- Stream SSE from API route using ReadableStream
- localStorage for conversation history (no server-side sessions needed)
- The search_legal_chunks() RPC already returns snippets — no need to re-fetch article text for context
