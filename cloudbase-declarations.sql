-- ============================================================
-- CloudBase PG 模式：公共画廊 declarations 表初始化脚本
-- 在 CloudBase 控制台的「SQL 执行 / 查询」面板里整段粘贴运行即可。
-- （没有控制台 SQL 面板时，也可在控制台「表」里手动建表，字段见下方注释）
-- ============================================================

-- 1) 建表（public 模式，主键自增 id）
create table if not exists public.declarations (
  id                bigserial primary key,
  declaration_text  text not null,
  card_name         text not null default '',
  card_style        text not null default '',
  created_at        timestamptz not null default now()
);

-- 2) 开启行级安全（RLS）
alter table public.declarations enable row level security;

-- 3) 表级授权：允许 anon 角色 读 / 写
grant select, insert on public.declarations to anon;
grant usage        on sequence public.declarations_id_seq to anon;

-- 4) 行级策略：匿名可读全部、可插入任意
drop policy if exists "anon_select_declarations" on public.declarations;
create policy "anon_select_declarations"
  on public.declarations for select
  to anon using (true);

drop policy if exists "anon_insert_declarations" on public.declarations;
create policy "anon_insert_declarations"
  on public.declarations for insert
  to anon with check (true);
