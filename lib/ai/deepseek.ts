import OpenAI from "openai";

/**
 * DeepSeek 客户端封装
 *
 * 知识点：DeepSeek 的 API 完全兼容 OpenAI 的接口协议
 * 所以我们可以直接用 OpenAI 的 SDK，只换 baseURL 就行
 *
 * 这就是为什么我没装 "deepseek" 专门的包——用 OpenAI SDK 更标准
 */

const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || "";

/**
 * 是否已配置真实的 AI 能力
 *
 * 没配 key 时项目不应该崩——而是降级到"演示模式"（见 lib/ai/fallback.ts）。
 * 这样任何人 clone 下来 npm run dev 就能看到完整流程，
 * 填上 key 之后自动切回真实 AI，代码一行不用改。
 */
export const isAIConfigured = apiKey.length > 0 && !apiKey.startsWith("sk-xxx");

export const deepseek = new OpenAI({
  apiKey: apiKey || "not-configured",
  baseURL: process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
  // 单次请求上限，避免上游卡死拖垮 serverless 函数
  timeout: 45_000,
  maxRetries: 1,
});
