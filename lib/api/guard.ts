import { NextRequest, NextResponse } from "next/server";

/**
 * API 防护层
 *
 * 解决的问题（作品集里最容易被面试官问到的一环）：
 * 1. DeepSeek 余额被刷爆      → IP 滑动窗口限流
 * 2. 前端伪造进度直接要结果   → 服务端按历史消息条数校验阶段
 * 3. 超长输入烧 token         → 单条 + 总条数上限
 * 4. 上游报错把内部信息吐给用户 → 错误统一脱敏
 *
 * 注意：限流用的是内存 Map，只在单实例内有效。
 * Serverless 多实例场景下需要换 Redis / Upstash——这是已知取舍，
 * 对作品集 demo 的流量级别足够，且零外部依赖。
 */

// ---------- 输入约束 ----------
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_MESSAGE_COUNT = 20;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// ---------- 限流 ----------
type Bucket = number[];
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

/** 定期清理过期桶，避免内存无限增长 */
function sweep(now: number) {
  if (buckets.size < 500) return;
  buckets.forEach((stamps, key) => {
    const alive = stamps.filter((t) => now - t < WINDOW_MS);
    if (alive.length === 0) buckets.delete(key);
    else buckets.set(key, alive);
  });
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * 滑动窗口限流
 * @returns true = 放行，false = 超限
 */
export function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  sweep(now);

  const stamps = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= limit) {
    buckets.set(key, stamps);
    return false;
  }

  stamps.push(now);
  buckets.set(key, stamps);
  return true;
}

// ---------- 消息体校验 ----------

/**
 * 校验 messages 数组的结构与体积
 * @returns 错误提示；null 表示通过
 */
export function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages)) return "消息格式错误";
  if (messages.length > MAX_MESSAGE_COUNT) return "对话太长了，请重新开始";

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") return "消息格式错误";
    const { role, content } = msg as Partial<ChatMessage>;
    if (role !== "user" && role !== "assistant") return "消息格式错误";
    if (typeof content !== "string") return "消息格式错误";
    if (content.length === 0) return "消息不能为空";
    if (content.length > MAX_MESSAGE_LENGTH) {
      return `单条消息不能超过 ${MAX_MESSAGE_LENGTH} 字`;
    }
  }

  return null;
}

/**
 * 只保留模型需要的字段，剥掉前端可能夹带的多余属性
 */
export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({ role: m.role, content: m.content.trim() }));
}

// ---------- 统一响应 ----------

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 上游异常统一脱敏
 *
 * 绝不把 error.message 原样返回：
 * 它可能包含 baseURL、组织 ID、甚至 key 片段
 */
export function handleUpstreamError(error: unknown, scene: string) {
  const status = (error as { status?: number })?.status;
  const name = (error as { name?: string })?.name;

  // 服务端日志保留全量信息，方便自己排查
  console.error(`[${scene}] upstream error:`, error);

  if (name === "AbortError" || name === "APIConnectionTimeoutError") {
    return errorResponse("查拉图斯特拉沉思太久了，请再说一次", 504);
  }
  if (status === 401 || status === 403) {
    return errorResponse("AI 服务未正确配置，请联系站点作者", 503);
  }
  if (status === 429) {
    return errorResponse("此刻问道的人太多，请稍后再试", 429);
  }
  return errorResponse("山上起雾了，请稍后再试", 500);
}
