import cloudbase from "@cloudbase/node-sdk";

/**
 * CloudBase（腾讯云开发）服务端封装 —— 仅限服务端（API 路由）使用。
 *
 * 为什么走服务端而不是浏览器直连：
 *   - 浏览器直连 CloudBase 需要「安全域名白名单」，而 EdgeOne 每次重新部署
 *     预览域名都会变（child-game-xxxx.edgeone.cool），白名单跟不上，画廊会废。
 *   - 走我们自己的 /api/gallery 接口中转，域名随便变都不影响，也不用开匿名登录。
 *
 * 凭证来自服务端环境变量（绝不带 NEXT_PUBLIC_ 前缀，不会进浏览器/前端包）：
 *   CLOUDBASE_ENV_ID    环境 ID，形如 child-game-d4gxbdz4zce7a5c3b
 *   CLOUDBASE_SECRET_ID 腾讯云 API 密钥 ID
 *   CLOUDBASE_SECRET_KEY 腾讯云 API 密钥 Key
 *   CLOUDBASE_REGION    地域，默认 ap-shanghai（你的环境域名是 *.ap-shanghai.app.tcloudbase.com）
 *
 * 隐私边界：declarations 集合只存 4 个公开字段
 *   declaration_text / card_name / card_style / createdAt
 * 不存任何用户身份（无 user_id、无邮箱、无 IP）。
 */

const envId = process.env.CLOUDBASE_ENV_ID?.trim() || "";
const secretId = process.env.CLOUDBASE_SECRET_ID?.trim() || "";
const secretKey = process.env.CLOUDBASE_SECRET_KEY?.trim() || "";
const region = process.env.CLOUDBASE_REGION?.trim() || "ap-shanghai";

/** 服务端是否配置了 CloudBase（决定 /api/gallery 是否真连库） */
export const isCloudBaseConfigured =
  envId.length > 0 && secretId.length > 0 && secretKey.length > 0;

let _dbPromise: Promise<any> | null = null;

/**
 * 返回 CloudBase 数据库引用（懒加载、进程内复用单例）。
 * 未配置时直接抛错，由调用方（API 路由）捕获并降级。
 */
function getDb(): Promise<any> {
  if (!isCloudBaseConfigured) {
    throw new Error(
      "CloudBase 未配置：缺少 CLOUDBASE_ENV_ID / CLOUDBASE_SECRET_ID / CLOUDBASE_SECRET_KEY"
    );
  }
  if (!_dbPromise) {
    const app = cloudbase.init({
      env: envId,
      secretId,
      secretKey,
      region,
    });
    _dbPromise = Promise.resolve(app.database());
  }
  return _dbPromise;
}

export async function getCloudBaseDb(): Promise<any> {
  return getDb();
}
