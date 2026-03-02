import { NextRequest } from "next/server";
import { retrieveRelevantLaws, formatCitations, buildSystemPrompt } from "@/lib/rag";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent";

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(sseEvent({ type: "error", message: "GEMINI_API_KEY not set" }), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Retrieve relevant laws
        const chunks = await retrieveRelevantLaws(message, 8);
        const citations = formatCitations(chunks);
        const systemPrompt = buildSystemPrompt(chunks);

        // Send citations first
        controller.enqueue(encoder.encode(sseEvent({ type: "citations", citations })));

        // Build conversation for Gemini
        const recentHistory = history.slice(-8);
        const contents = [
          ...recentHistory.map((h: { role: string; content: string }) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          })),
          { role: "user", parts: [{ text: message }] },
        ];

        const body = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        };

        const res = await fetch(`${GEMINI_API}?key=${apiKey}&alt=sse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok || !res.body) {
          const err = await res.text();
          throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const evt = JSON.parse(raw);
              const text = evt?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (text) {
                controller.enqueue(encoder.encode(sseEvent({ type: "delta", text })));
              }
            } catch { /* skip */ }
          }
        }

        controller.enqueue(encoder.encode(sseEvent({ type: "done" })));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(sseEvent({ type: "error", message: msg })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
