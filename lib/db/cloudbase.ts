/**
 * CloudBase（腾讯云开发）PostgreSQL 模式 —— 服务端 REST 中转封装
 *
 * 环境背景（2026-08 新环境，PG 模式）：
 *   - 云开发 PG 模式基于开源 PostgREST，数据库表会自动暴露成 REST 接口。
 *   - 端点：https://{envId}.api.tcloudbasegateway.com/v1/rdb/rest/{table}
 *   - 鉴权：Authorization: Bearer <Publishable Key>（anon 角色，由 RLS 控制匿名读写）
 *   - 不需要任何 SDK，原生 fetch 即可。
 *
 * 为什么还走我们的 /api/gallery 服务端中转（而不是直接浏览器连）：
 *   - 浏览器直连需要「安全域名白名单」，而 EdgeOne 每次重新部署预览域名都变，
 *     白名单跟不上，画廊会废。服务端中转域名随便变都不影响。
 *
 * 凭证来自服务端环境变量（不带 NEXT_PUBLIC_ 前缀，不会进浏览器/前端包）：
 *   CLOUDBASE_ENV_ID           环境 ID，形如 child-game-d4gxbdz4zce7a5c3b
 *   CLOUDBASE_PUBLISHABLE_KEY  Publishable Key（anon 角色）
 *
 * ⚠️ 关于超长 Key 的分片支持（EdgeOne 单个环境变量值上限 1000 字符）：
 *   实测 CloudBase 的 Publishable Key 可能超过 1000 字符，EdgeOne 控制台存不下。
 *   因此这里支持把 key 切成多段分别存，服务端按顺序拼回来：
 *     CLOUDBASE_PUBLISHABLE_KEY_1
 *     CLOUDBASE_PUBLISHABLE_KEY_2
 *     CLOUDBASE_PUBLISHABLE_KEY_3 ...（最多 8 段）
 *   规则：
 *     - 若 CLOUDBASE_PUBLISHABLE_KEY（整段）存在，优先用它，忽略分片。
 *     - 否则从 _1 开始依次拼接，遇到缺号即停止（防止顺序错乱拼出坏 key）。
 *     - 每段各自 trim，切分点不允许有空白字符（JWT 本身不含空格，安全）。
 *
 * 隐私边界：declarations 表只存 4 个公开字段
 *   declaration_text / card_name / card_style / created_at
 * 不存任何用户身份（无 user_id、无邮箱、无 IP）。
 */

const MAX_KEY_PARTS = 8;

const envId = process.env.CLOUDBASE_ENV_ID?.trim() || "";

/** key 的来源，用于自检时定位问题（不泄露 key 内容） */
export type KeySource = "whole" | "parts" | "none";

function resolvePublishableKey(): { key: string; source: KeySource; parts: number } {
  // 1) 整段变量优先（本地开发 .env.local 通常这么写）
  const whole = process.env.CLOUDBASE_PUBLISHABLE_KEY?.trim();
  if (whole) {
    return { key: whole, source: "whole", parts: 1 };
  }

  // 2) 分片拼接：_1、_2、_3 ...，遇到缺号立即停止
  const segments: string[] = [];
  for (let i = 1; i <= MAX_KEY_PARTS; i += 1) {
    const seg = process.env[`CLOUDBASE_PUBLISHABLE_KEY_${i}`]?.trim();
    if (!seg) break;
    segments.push(seg);
  }

  if (segments.length > 0) {
    return { key: segments.join(""), source: "parts", parts: segments.length };
  }

  return { key: "", source: "none", parts: 0 };
}

const resolved = resolvePublishableKey();
const publishableKey = resolved.key;

/** 服务端是否配置了 CloudBase（决定 /api/gallery 是否真连库） */
export const isCloudBaseConfigured =
  envId.length > 0 && publishableKey.length > 0;

/** REST 基址：https://{envId}.api.tcloudbasegateway.com/v1/rdb/rest */
export function getCloudBaseRestBase(): string {
  return `https://${envId}.api.tcloudbasegateway.com/v1/rdb/rest`;
}

/** 请求头：Bearer 鉴权 + JSON；Prefer: return=representation 让写入后返回新行 */
export function getCloudBaseHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${publishableKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "return=representation",
  };
}

/**
 * 配置自检信息 —— 供 /api/gallery?debug=1 使用。
 *
 * 安全说明：**绝不返回 key 明文**。
 *   - keyLength：只是长度数字。
 *   - keyPrefix：JWT 固定头 "eyJhbG..."，前 6 位对所有 JWT 都一样，无信息量，
 *     仅用于确认「粘进去的确实是个 JWT，而不是别的东西」。
 *   - keyLooksLikeJwt：是否是 a.b.c 三段结构，用于识别分片拼接是否漏段/错序。
 */
export function getCloudBaseConfigStatus() {
  const dotCount = (publishableKey.match(/\./g) || []).length;
  return {
    hasEnvId: envId.length > 0,
    envIdLength: envId.length,
    hasKey: publishableKey.length > 0,
    keySource: resolved.source,
    keyParts: resolved.parts,
    keyLength: publishableKey.length,
    keyPrefix: publishableKey.slice(0, 6),
    keyLooksLikeJwt: dotCount === 2 && !/\s/.test(publishableKey),
    keyDotCount: dotCount,
    keyHasWhitespace: /\s/.test(publishableKey),
    configured: isCloudBaseConfigured,
  };
}
