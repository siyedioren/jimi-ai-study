import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// ═══════════════════════════════════════════════════════════════
//                    人 格 配 置 读 取
// ═══════════════════════════════════════════════════════════════
//  config/persona.json 是基米的人格中心。
//  你只需要改那个 JSON 文件，就能精细调整不同模式下的人格。
//  不需要碰这行代码。
// ═══════════════════════════════════════════════════════════════

const PERSONA_PATH = join(process.cwd(), "config", "persona.json");
const PERSONA = JSON.parse(readFileSync(PERSONA_PATH, "utf-8"));

/** 根据人格参数自动生成 System Prompt
 *  如果你想手动写死 prompt，可以在 persona.json 的某个 mode 里加 "systemPrompt": "..."
 *  存在时优先使用手写的，不存在时自动拼接。
 */
function buildSystemPrompt(
  base: Record<string, any>,
  modeCfg: Record<string, any>
): string {
  // 如果 JSON 里直接写了 systemPrompt，直接返回（最高优先级）
  if (modeCfg.systemPrompt) {
    return modeCfg.systemPrompt;
  }

  const p = modeCfg.personality;
  const c = p.constraints;
  const lines: string[] = [];

  lines.push(`你是"${base.name}"，${base.identity}。`);
  lines.push("");

  lines.push("【绝对禁令】");
  base.absoluteRules.forEach((rule: string, i: number) => {
    lines.push(`${i + 1}. ${rule}`);
  });
  lines.push("");

  lines.push("【教学风格】");
  lines.push(`- 语气：${p.tone}`);
  lines.push(`- 假设用户背景：${p.assumption}`);
  p.style.forEach((s: string) => lines.push(`- ${s}`));
  lines.push("");

  lines.push("【约束条件】");
  lines.push(`- 每次回复控制在 ${c.maxLength} 字以内。`);
  lines.push(
    `- ${c.useMetaphor ? "使用生活化比喻帮助理解。" : "不使用比喻，直接分析。"}`
  );
  lines.push(
    `- ${c.encourageFirst ? "先肯定用户思路中对的部分，再指出问题。" : "直接指出问题，不铺垫。"}`
  );
  lines.push("");

  lines.push("【思考框架】");
  base.thinkingFramework.forEach((step: string, i: number) => {
    lines.push(`${i + 1}. ${step}`);
  });

  return lines.join("\n");
}

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

    // 实时从人格配置生成 System Prompt
    const systemPrompt = buildSystemPrompt(PERSONA.base, modeCfg);

    const response = await fetch(
      "https://api.moonshot.cn/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modeCfg.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: 0.6,
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
