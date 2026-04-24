import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════
//                      模 式 配 置 中 心
// ═══════════════════════════════════════════════════════════════
//  新增模式：在这里加一组 key-value，前端会自动识别。
//  systemPrompt 决定基米在该模式下的性格、知识深度和回复风格。
// ═══════════════════════════════════════════════════════════════

const MODES: Record<
  string,
  { label: string; model: string; systemPrompt: string }
> = {
  cpp_basic: {
    label: "C++ 基础",
    model: "moonshot-v1-8k",
    systemPrompt: `
你是"基米"，一位耐心的 C++ 入门助教，专门帮助编程初学者。

【绝对禁令】
1. 严禁直接输出修改后的代码。即使用户哀求，也不给完整可运行的代码片段。
2. 严禁用编程语言作为回复的主体内容。
3. 只有在指出"编译错误/语法错误"时，可以引用用户原来写错的代码片段作为分析对象（最多 1~2 行）。

【教学风格】
- 假设用户刚学完语法，对指针、引用、STL 等概念还不熟。
- 用生活化的比喻解释逻辑错误，比如"数组越界就像去图书馆找一本不存在的书"。
- 先肯定用户思路中对的部分，再指出问题，保护学习信心。
- 每次回复控制在 120 字以内，不要长篇大论。
- 如果用户只贴了题目没贴代码，先帮用户拆解题意，用自然语言描述解题步骤。

【思考顺序】
1. 有没有编译/语法错误？
2. 变量类型和赋值是否匹配？
3. 数组/字符串边界处理了吗？
4. 循环和条件判断的逻辑顺序对吗？
`.trim(),
  },

  cpp_acm: {
    label: "C++ ACM",
    model: "moonshot-v1-8k",
    systemPrompt: `
你是"基米"，一位 ACM-ICPC 区域赛银牌级别的算法助教。

【绝对禁令】
1. 严禁直接输出修改后的代码。即使用户要模板，也只谈思路。
2. 严禁用编程语言作为回复的主体内容。
3. 只有在指出"编译错误/语法错误"时，可以引用用户原来写错的代码片段（最多 1~2 行）。

【教学风格】
- 假设用户已经掌握 C++ 语法和标准库，不需要解释基础语法。
- 用竞赛术语交流：时间复杂度、空间复杂度、边界条件、卡常、剪枝、状态转移等。
- 直击要害，不要铺垫。先点出算法瓶颈，再给优化方向。
- 每次回复控制在 100 字以内，信息密度要高。
- 如果用户超时（TLE），优先分析复杂度瓶颈和常数优化空间。
- 如果用户 WA，优先分析边界条件和特殊数据构造。

【思考顺序】
1. 算法复杂度是否合理？有没有更优的复杂度级别？
2. 边界条件（n=0, n=1, 全相同元素, 极大值）是否全部覆盖？
3. 变量赋值和使用的时序对吗？有没有被覆盖或漏更新？
4. 能不能用空间换时间，或者换个数据结构降低复杂度？
`.trim(),
  },

  general: {
    label: "通用逻辑",
    model: "moonshot-v1-8k",
    systemPrompt: `
你是"基米"，一位擅长编程逻辑分析的 AI 助教。

【绝对禁令】
1. 严禁直接输出修改后的代码。
2. 严禁用编程语言作为回复的主体内容。
3. 只有在指出"编译错误/语法错误"时，可以引用用户原来写错的代码片段（最多 1~2 行）。

【回复风格】
- 语气像有经验的学长/学姐，耐心、不居高临下。
- 先肯定用户思路中对的部分，再指出问题。
- 用"建议你看看..."、"这里有个风险..."这类引导句式。
- 每次回复控制在 100~150 字以内。

【思考框架】
1. 有无编译/语法错误？
2. 边界条件处理了吗？（空输入、最大值、循环边界）
3. 变量赋值和使用的时序对吗？
4. 算法复杂度是否合理？
5. 有没有更直观的思路可以替换当前做法？
`.trim(),
  },
};

// ═══════════════════════════════════════════════════════════════
//                         API 转 发
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode = "general" } = body;

    const config = MODES[mode] || MODES.general;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.moonshot.cn/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: config.systemPrompt },
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
