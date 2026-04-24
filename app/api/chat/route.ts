import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// ═══════════════════════════════════════════════════════════════
//                    人 格 配 置 读 取
// ═══════════════════════════════════════════════════════════════

const PERSONA_PATH = join(process.cwd(), "config", "persona.json");
const PERSONA = JSON.parse(readFileSync(PERSONA_PATH, "utf-8"));

// ═══════════════════════════════════════════════════════════════
//                         API 转 发
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode = "general" } = body;

    const modeCfg = PERSONA.modes[mode] || PERSONA.modes.general;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key not configured" },
        { status: 500 }
      );
    }

    // 直接使用 JSON 里手写的 systemPrompt
    const systemPrompt = modeCfg.systemPrompt || "你是基米，一位编程助教。";

    // 读取该模式专属的 API 参数，没有则用默认
    const apiParams = modeCfg.apiParams || {};

    const response = await fetch(
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
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content || "基米暂时没有思路，请再试一次。";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
