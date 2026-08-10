import { supabase } from "./supabase";

/**
 * 公共宣言画廊（云端版）
 *
 * 数据直接走 Supabase 匿名客户端（anon key 本身就是公开前缀 NEXT_PUBLIC_），
 * 不绕我们自己的后端——少一跳、少一份密钥管理，也是 Supabase 的标准用法。
 * （lib/db/supabase.ts 的注释里已备好建表 SQL + RLS 策略。）
 *
 * 隐私边界（关键）：declarations 表只存 4 个公开字段
 *   declaration_text / card_name / card_style / created_at
 * 不存任何用户身份（无 user_id、无邮箱、无 IP）。
 * 配合 RLS：select 对所有人开放，insert 对匿名开放但 only 这 4 列。
 *
 * 降级：未配置 Supabase（supabase === null）时，
 *   saveDeclarationRemote 静默返回，listDeclarationsRemote 返回空数组，
 *   画廊页自动退回「仅本地」，主流程永不断。
 */

export type RemoteDeclaration = {
  id: string;
  declaration_text: string;
  card_name: string;
  card_style: string;
  /** Supabase 返回的 ISO 时间戳字符串 */
  created_at: string;
};

/** 是否已接入云端画廊（决定是否显示公共区） */
export const isRemoteGalleryEnabled = supabase !== null;

/**
 * 写入一条公共宣言（匿名，不含身份）
 * @throws 写入失败抛错，由调用方决定是否 toast（不阻断本地流程）
 */
export async function saveDeclarationRemote(input: {
  declaration_text: string;
  card_name: string;
  card_style: string;
}): Promise<void> {
  if (!supabase) return; // 未配置静默降级

  const { error } = await supabase.from("declarations").insert({
    declaration_text: input.declaration_text.trim(),
    card_name: input.card_name.trim(),
    card_style: input.card_style,
  });

  if (error) {
    console.error("[declarations] insert failed:", error.message);
    throw error;
  }
}

/**
 * 读取公共画廊最新 N 条（公开只读）
 * 失败时返回空数组，绝不阻断页面渲染
 */
export async function listDeclarationsRemote(limit = 60): Promise<RemoteDeclaration[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("declarations")
    .select("id, declaration_text, card_name, card_style, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[declarations] list failed:", error.message);
    return [];
  }

  return (data ?? []) as RemoteDeclaration[];
}
