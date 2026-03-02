import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { retrieveRelevantLaws, formatCitations, buildSystemPrompt } from "@/lib/rag";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Retrieve relevant laws
        const chunks = await retrieveRelevantLaws(message, 8);
        const citations = formatCitations(chunks);
        const systemPrompt = buildSystemPrompt(chunks);

        // Send citations first
        controller.enqueue(
          encoder.encode(sseEvent({ type: "citations", citations }))
        );

        // Build conversation history (last 10 turns)
        const recentHistory = history.slice(-10);
        const messages: Anthropic.MessageParam[] = [
          ...recentHistory.map((h: { role: string; content: string }) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user", content: message },
        ];

        // Stream from Claude
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(sseEvent({ type: "delta", text: event.delta.text }))
            );
          }
        }

        controller.enqueue(encoder.encode(sseEvent({ type: "done" })));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", message }))
        );
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
