import { NextRequest, NextResponse } from "next/server";
import { deepseek, isAIConfigured } from "@/lib/ai/deepseek";
import { getSystemPrompt, type ChatStage } from "@/lib/ai/prompts";
import { getDemoReply, demoDelay } from "@/lib/ai/fallback";
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
 * 聊天 API 路由
 *
 * 这是 Next.js 的"后端入口"——前端 fetch("/api/chat") 就会调到这里
 * 然后这里调用 DeepSeek，再把 AI 回复返回给前端
 *
 * 这就解决了你之前的痛点 #1：纯前端没有后端
 * 在 Next.js 里，前后端写在同一个项目里
 *
 * ⚠️ 阶段状态机放在服务端（关键设计）
 * 前端传来的 stage 一律不可信，服务端按"历史消息条数"反推真实进度。
 * 用户没走完引导就想直接要宣言 → 400，既保护体验也保护 token。
 */

export const runtime = "nodejs";

/** 每个阶段应有的历史消息条数（AI 与用户交替，各占一条） */
const EXPECTED_HISTORY_LENGTH: Record<string, number> = {
  greet: 0,
  0: 2,
  1: 4,
  2: 6,
};

const RATE_LIMIT_PER_MIN = 30;

function parseStage(raw: unknown): ChatStage | null {
  if (raw === "greet") return "greet";
  if (raw === 0 || raw === 1 || raw === 2) return raw;
  // 容错：前端可能传字符串
  if (raw === "0") return 0;
  if (raw === "1") return 1;
  if (raw === "2") return 2;
  return null;
}

export async function POST(req: NextRequest) {
  // 1. 限流
  const ip = getClientIp(req);
  if (!checkRateLimit(`chat:${ip}`, RATE_LIMIT_PER_MIN)) {
    return errorResponse("你问得太快了，喘口气再来", 429);
  }

  // 2. 解析请求体
  let body: { messages?: unknown; stage?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse("请求格式错误", 400);
  }

  // 3. 校验阶段
  const stage = parseStage(body.stage);
  if (stage === null) {
    return errorResponse("无效的对话阶段", 400);
  }

  // 4. 校验消息
  const messages = (body.messages ?? []) as ChatMessage[];
  const invalid = validateMessages(messages);
  if (invalid) {
    return errorResponse(invalid, 400);
  }

  // 5. 服务端进度校验（防跳过引导）
  if (messages.length !== EXPECTED_HISTORY_LENGTH[String(stage)]) {
    return errorResponse("对话进度不匹配，请刷新后重新开始", 400);
  }

  // 6. 演示模式降级（未配置 DEEPSEEK_API_KEY）
  if (!isAIConfigured) {
    await demoDelay();
    return NextResponse.json({
      message: getDemoReply(stage),
      stage,
      demo: true,
    });
  }

  // 7. 调用 DeepSeek
  try {
    const completion = await deepseek.chat.completions.create(
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: getSystemPrompt(stage) },
          ...sanitizeMessages(messages),
        ],
        temperature: 0.8, // 0-1，越大越有创造性
        max_tokens: 800,
      },
      { timeout: 30_000 }
    );

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "……（查拉图斯特拉沉默）";

    return NextResponse.json({ message: reply, stage, demo: false });
  } catch (error) {
    return handleUpstreamError(error, "chat");
  }
}
