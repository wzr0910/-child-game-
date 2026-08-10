import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 客户端封装
 *
 * 用途：未来存储用户生成的"孩子宣言"，并支持公共宣言画廊
 *
 * ⚠️ 空环境变量保护（2026-08-11 修复）
 * createClient("", "") 会直接 throw "supabaseUrl is required"。
 * 旧版没人 import 它所以没炸，但只要有一处引用，整个页面就白屏。
 * 现在改成：没配环境变量就返回 null，调用方自行降级。
 *
 * 当前画廊走的是 lib/utils/gallery.ts（localStorage 版），
 * 等 Supabase 建好表之后，只需把画廊页的数据源换成这里。
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

/** 是否已配置 Supabase（前端可安全读取） */
export const isSupabaseConfigured =
  supabaseUrl.startsWith("http") && supabaseAnonKey.length > 20;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * 数据库表设计（在 Supabase SQL Editor 一次性执行）：
 *
 *   create table declarations (
 *     id uuid primary key default gen_random_uuid(),
 *     user_input jsonb,
 *     declaration_text text not null,
 *     card_style text,
 *     card_name text,
 *     created_at timestamptz default now()
 *   );
 *
 *   alter table declarations enable row level security;
 *
 *   -- 任何人（含匿名）可读公共画廊
 *   create policy "public read" on declarations
 *     for select using (true);
 *
 *   -- 任何人（含匿名）可写入，但只能写这 4 个公开列（无身份字段）
 *   create policy "public insert" on declarations
 *     for insert with check (true);
 *
 *   create index declarations_created_at_idx
 *     on declarations (created_at desc);
 *
 * 说明：insert 策略不限制角色，但表结构本身没有 user_id / 邮箱 / IP 等字段，
 * 所以匿名用户能写的只有宣言内容本身，天然无法泄露身份。
 */
