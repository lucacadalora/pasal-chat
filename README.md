# Pasal Chat — AI Legal Assistant for Indonesian Law

> Harvey.ai for Indonesian law. Ask questions in Indonesian or English, get grounded answers with exact Pasal citations from 937,000+ legal articles.

**Live database:** [pasal.id](https://pasal.id) by [@ilhamfp](https://github.com/ilhamfp/pasal)

## Features

- **Zero hallucination** — RAG retrieval against 937K+ real articles before every answer
- **Exact citations** — Every claim cites specific Pasal with law type, number, and year  
- **Streaming responses** — Claude claude-sonnet-4-5 streams token by token
- **40,000+ regulations** — UU, PP, Perpres, Permen, Perda, and more (1945–2026)
- **Bilingual** — Indonesian & English
- **Dark professional UI** — Harvey.ai-inspired minimal design

## Stack

| Layer | Tech |
|-------|------|
| Frontend + API | Next.js 15, React 19, TypeScript |
| AI | Anthropic claude-sonnet-4-5 (streaming) |
| Database | Supabase PostgreSQL (pasal.id) |
| RAG | `search_legal_chunks()` RPC with Indonesian FTS |
| Deployment | Vercel / Docker |

## Quick Start

```bash
git clone https://github.com/lucacadalora/pasal-chat
cd pasal-chat
cp .env.example .env.local
# Fill in your keys (see below)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (use pasal.id's or your fork) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key — read-only via RLS, safe for browser |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (Claude access) |

> **Tip:** To use the live pasal.id database, connect to their public Supabase instance. To run your own data, fork [ilhamfp/pasal](https://github.com/ilhamfp/pasal) and follow their data pipeline docs.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lucacadalora/pasal-chat&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,ANTHROPIC_API_KEY)

Add the 3 environment variables and click Deploy.

## Deploy via Docker

```bash
docker build -t pasal-chat .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e ANTHROPIC_API_KEY=... \
  pasal-chat
```

## Architecture

```
User Query
    │
    ▼
Next.js /api/chat
    │
    ├─→ search_legal_chunks() ──→ Supabase PostgreSQL
    │   (Indonesian FTS, 3-layer)   (937K+ articles)
    │           │
    │           ▼
    │   Top 8 relevant chunks
    │           │
    ├─→ Claude claude-sonnet-4-5 (with RAG context)
    │           │
    ▼           ▼
SSE Stream → UI renders citations + streaming answer
```

## Customization

- **Swap AI model:** Change `claude-sonnet-4-5` in `app/api/chat/route.ts`
- **Adjust retrieval:** Change `limit` in `lib/rag.ts` `retrieveRelevantLaws()`
- **Edit prompts:** Modify `lib/rag.ts` `buildSystemPrompt()`
- **Add tools:** Extend the API route with additional Supabase queries

## Credits

- Legal database: [pasal.id](https://pasal.id) by [ilhamfp](https://github.com/ilhamfp/pasal) — AGPL-3.0
- Built with [Claude claude-sonnet-4-5](https://anthropic.com)
