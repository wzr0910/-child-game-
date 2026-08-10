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
 *   CLOUDBASE_PUBLISHABLE_KEY  Publishable Key（anon 角色，可暴露但只放服务端更稳）
 *
 * 隐私边界：declarations 表只存 4 个公开字段
 *   declaration_text / card_name / card_style / created_at
 * 不存任何用户身份（无 user_id、无邮箱、无 IP）。
 */

const envId = process.env.CLOUDBASE_ENV_ID?.trim() || "";
const publishableKey = process.env.CLOUDBASE_PUBLISHABLE_KEY?.trim() || "";

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
