import { NextRequest, NextResponse } from "next/server";
import { deepseek, isAIConfigured } from "@/lib/ai/deepseek";
import { CANDIDATE_PROMPT } from "@/lib/ai/prompts";
import { DEMO_CANDIDATES, demoDelay } from "@/lib/ai/fallback";
import {
  checkRateLimit,
  errorResponse,
  getClientIp,
  handleUpstreamError,
  sanitizeMessages,
  validateMessages,
  type ChatMessage,
} from "@/lib/api/guard";

/**
 * 生成孩子宣言候选 API
 *
 * 接收用户与查拉图斯特拉的 3 轮对话历史
 * 输出 3 个不同风格的"孩子宣言"候选
 *
 * 这是 Co-Creation 机制的核心：AI 给候选，用户选/改
 *
 * 这个接口比 /api/chat 贵得多（max_tokens 2000），
 * 所以限流更严，并且要求必须走完 3 轮对话才放行。
 */

export const runtime = "nodejs";

const RATE_LIMIT_PER_MIN = 10;

/** 走完 greet + 3 轮问答后的消息条数；留一点容错区间 */
const MIN_HISTORY_LENGTH = 7;
const MAX_HISTORY_LENGTH = 12;

export type Candidate = {
  id: number;
  style: string;
  text: string;
};

const FALLBACK_STYLES = ["激情", "诗意", "简洁"];

/**
 * 归一化 AI 返回的候选
 *
 * 双保险：模型偶尔会漏 id、把 style 写成英文、或多返回一条。
 * 前端用 id 做选中判断，缺 id 会导致整个选择逻辑失效——
 * 所以这里强制重排 id，绝不把脏数据放进 UI。
 */
function normalizeCandidates(raw: unknown): Candidate[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item, index) => {
      const source = (item ?? {}) as Partial<Candidate>;
      const text = typeof source.text === "string" ? source.text.trim() : "";
      if (!text) return null;

      return {
        id: index + 1,
        style:
          typeof source.style === "string" && source.style.trim()
            ? source.style.trim()
            : FALLBACK_STYLES[index] || "候选",
        text,
      };
    })
    .filter((c): c is Candidate => c !== null)
    .slice(0, 3);
}

export async function POST(req: NextRequest) {
  // 1. 限流
  const ip = getClientIp(req);
  if (!checkRateLimit(`candidates:${ip}`, RATE_LIMIT_PER_MIN)) {
    return errorResponse("铸造宣言需要时间，请稍后再试", 429);
  }

  // 2. 解析请求体
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("请求格式错误", 400);
  }

  // 3. 校验消息
  const messages = (body.messages ?? []) as ChatMessage[];
  const invalid = validateMessages(messages);
  if (invalid) {
    return errorResponse(invalid, 400);
  }

  // 4. 进度校验：必须走完 3 轮对话
  if (
    messages.length < MIN_HISTORY_LENGTH ||
    messages.length > MAX_HISTORY_LENGTH
  ) {
    return errorResponse("请先完成 3 轮对话", 400);
  }

  // 5. 演示模式降级
  if (!isAIConfigured) {
    await demoDelay(1600);
    return NextResponse.json({ candidates: DEMO_CANDIDATES, demo: true });
  }

  // 6. 调用 DeepSeek（强结构化输出）
  try {
    const completion = await deepseek.chat.completions.create(
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: CANDIDATE_PROMPT },
          ...sanitizeMessages(messages),
        ],
        temperature: 0.9,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      },
      { timeout: 45_000 }
    );

    const rawContent = completion.choices[0]?.message?.content || "{}";

    // 解析 JSON（处理可能的 markdown 包裹）
    let parsed: { candidates?: unknown };
    try {
      const cleaned = rawContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[candidates] JSON parse failed:", rawContent.slice(0, 200));
      return errorResponse("宣言铸造失败了，请重试", 502);
    }

    const candidates = normalizeCandidates(parsed.candidates);
    if (candidates.length === 0) {
      console.error("[candidates] empty after normalize:", rawContent.slice(0, 200));
      return errorResponse("宣言铸造失败了，请重试", 502);
    }

    return NextResponse.json({ candidates, demo: false });
  } catch (error) {
    return handleUpstreamError(error, "candidates");
  }
}
