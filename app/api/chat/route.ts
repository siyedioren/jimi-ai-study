import { NextRequest } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// ═══════════════════════════════════════════════════════════════
//                    人 格 配 置 读 取
// ═══════════════════════════════════════════════════════════════

const PERSONA_PATH = join(process.cwd(), "config", "persona.json");
const PERSONA = JSON.parse(readFileSync(PERSONA_PATH, "utf-8"));

// ═══════════════════════════════════════════════════════════════
//                    流 式 响 应 转 发
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode = "general" } = body;

    const modeCfg = PERSONA.modes[mode] || PERSONA.modes.general;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = modeCfg.systemPrompt || "你是基米，一位编程助教。";
    const apiParams = modeCfg.apiParams || {};

    const upstream = await fetch(
      "https://api.moonshot.cn/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modeCfg.model || "moonshot-v1-8k",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: apiParams.temperature ?? 0.6,
          max_tokens: apiParams.max_tokens ?? 1024,
          presence_penalty: apiParams.presence_penalty ?? 0,
          stream: true,
        }),
      }
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        JSON.stringify({ error: errText }),
        { status: upstream.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // 将上游 SSE 流透传给客户端
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;

              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const chunk = JSON.parse(data);
                const delta = chunk.choices?.[0]?.delta?.content;
                if (delta !== undefined) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
                  );
                }
              } catch {
                // 忽略无法解析的行
              }
            }
          }
        } catch (e) {
          controller.error(e);
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
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
