/**
 * 公共宣言画廊（云端版）
 *
 * 数据走我们自己的 /api/gallery 接口（服务端再中转 CloudBase 数据库），
 * 不直接在浏览器里连数据库——这样 EdgeOne 预览域名随便变都不影响画廊，
 * 也不需要 CloudBase 的「安全域名白名单」或匿名登录。
 *
 * 隐私边界（关键）：只存 4 个公开字段
 *   declaration_text / card_name / card_style / created_at
 * 不存任何用户身份（无 user_id、无邮箱、无 IP）。
 *
 * 降级：
 *   - 服务端没配 CloudBase → /api/gallery 返回 configured:false，前端显示「还没开放」
 *   - 读取/写入失败 → 前端退回空态，主流程永不断
 *
 * 注意：本文件运行在浏览器（被客户端组件 import），所以只做 fetch，
 * 真正的数据库操作在 app/api/gallery/route.ts 里。
 */

export type RemoteDeclaration = {
  id: string;
  declaration_text: string;
  card_name: string;
  card_style: string;
  /** ISO 时间戳字符串 */
  created_at: string;
};

/**
 * 是否启用云端画廊。接口本身始终存在，这里恒为 true；
 * 是否「真的连上数据库」由服务端通过 configured 标志告诉前端。
 */
export const isRemoteGalleryEnabled = true;

/**
 * 写入一条公共宣言（匿名，不含身份）
 * @throws 写入失败抛错，由调用方决定是否 toast（不阻断本地流程）
 */
export async function saveDeclarationRemote(input: {
  declaration_text: string;
  card_name: string;
  card_style: string;
}): Promise<void> {
  const res = await fetch("/api/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      declaration_text: input.declaration_text.trim(),
      card_name: input.card_name.trim(),
      card_style: input.card_style,
    }),
  });
  if (!res.ok) {
    throw new Error("save failed");
  }
}

/**
 * 读取公共画廊最新 N 条（公开只读）
 * 返回 { configured, items }：configured=false 表示服务端还没配数据库。
 * 失败时返回 { configured: true, items: [] }，绝不阻断页面渲染。
 */
export async function listDeclarationsRemote(
  limit = 60
): Promise<{ configured: boolean; items: RemoteDeclaration[] }> {
  try {
    const res = await fetch(`/api/gallery?limit=${limit}`, { method: "GET" });
    if (!res.ok) return { configured: true, items: [] };
    const data = (await res.json()) as {
      configured?: boolean;
      items?: RemoteDeclaration[];
    };
    return {
      configured: Boolean(data.configured),
      items: (data.items ?? []) as RemoteDeclaration[],
    };
  } catch (e) {
    console.error("[declarations] list failed:", e);
    return { configured: true, items: [] };
  }
}
