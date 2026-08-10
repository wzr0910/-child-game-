/**
 * 宣言画廊存储（本地版）
 *
 * 设计取舍说明：
 * PRD 里画廊是 UGC 闭环，规划用 Supabase 做公共画廊。
 * 但 Supabase 需要 service_role key + 建表，属于人工步骤，
 * 在那之前画廊页会一直是空壳。
 *
 * 所以这一版先落地"我的宣言"——存在本地，用户自己看得见收藏。
 * 数据结构与后续 Supabase 的 declarations 表字段保持一致
 * （declaration_text / card_name / card_style / created_at），
 * 将来接云端只需要换 lib/db 的数据源，页面和组件一行不用改。
 */

const GALLERY_KEY = "child-game-gallery-v1";
const MAX_ITEMS = 50;

export type DeclarationRecord = {
  id: string;
  declaration_text: string;
  card_name: string;
  card_style: string;
  created_at: number;
};

function readRaw(): DeclarationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(GALLERY_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DeclarationRecord =>
        !!item &&
        typeof item.id === "string" &&
        typeof item.declaration_text === "string"
    );
  } catch (e) {
    console.error("Load gallery failed:", e);
    return [];
  }
}

function writeRaw(items: DeclarationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch (e) {
    console.error("Save gallery failed:", e);
  }
}

/** 按创建时间倒序列出全部宣言 */
export function listDeclarations(): DeclarationRecord[] {
  return readRaw().sort((a, b) => b.created_at - a.created_at);
}

/**
 * 保存一条宣言
 * @returns 新记录；同一份宣言重复保存会覆盖旧的，不产生重复项
 */
export function saveDeclaration(input: {
  declaration_text: string;
  card_name: string;
  card_style: string;
}): DeclarationRecord {
  const items = readRaw();

  const existing = items.find(
    (item) =>
      item.declaration_text === input.declaration_text &&
      item.card_name === input.card_name
  );

  if (existing) {
    existing.card_style = input.card_style;
    writeRaw(items);
    return existing;
  }

  const record: DeclarationRecord = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    declaration_text: input.declaration_text,
    card_name: input.card_name,
    card_style: input.card_style,
    created_at: Date.now(),
  };

  writeRaw([record, ...items]);
  return record;
}

export function removeDeclaration(id: string) {
  writeRaw(readRaw().filter((item) => item.id !== id));
}

export function clearGallery() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GALLERY_KEY);
  } catch (e) {
    console.error("Clear gallery failed:", e);
  }
}
