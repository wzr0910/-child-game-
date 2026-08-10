/**
 * localStorage 工具
 *
 * 用于保存用户的对话状态，实现"刷新不丢失"
 * 这是 P0 功能之一
 *
 * ⚠️ v2 修复（2026-08-11）
 * v1 只存了 messages / step / 最终宣言，没存 candidates。
 * 后果：用户在"选择候选"这一步刷新页面，step 恢复成 4，
 * 但 candidates 是空数组，ChatWindow 的
 *   {step === 4 && candidates.length > 0 && ...}
 * 直接渲染不出任何东西 → 页面变空壳，只能点"重新开始"，是个死局。
 *
 * v2 把中间态全部纳入存档，并加版本号；读到旧版本直接丢弃，避免脏数据。
 */

const STORAGE_KEY = "child-game-state-v2";
const LEGACY_KEYS = ["child-game-state"];

export const SCHEMA_VERSION = 2;

export type StoredMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StoredCandidate = {
  id: number;
  style: string;
  text: string;
};

export type SavedState = {
  version: number;
  messages: StoredMessage[];
  step: number;
  candidates: StoredCandidate[];
  selectedCandidateId: number | null;
  editedText: string;
  cardStyle: string | null;
  cardName: string;
  /** 宣言定稿时间，用于卡片落款；未定稿为 null */
  cardCreatedAt: number | null;
  updatedAt: number;
};

export function saveState(state: Omit<SavedState, "version">) {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedState = { ...state, version: SCHEMA_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error("Save state failed:", e);
  }
}

export function loadState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<SavedState>;
    if (parsed.version !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.messages)) return null;

    return {
      version: SCHEMA_VERSION,
      messages: parsed.messages,
      step: typeof parsed.step === "number" ? parsed.step : 0,
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      selectedCandidateId:
        typeof parsed.selectedCandidateId === "number"
          ? parsed.selectedCandidateId
          : null,
      editedText: typeof parsed.editedText === "string" ? parsed.editedText : "",
      cardStyle: typeof parsed.cardStyle === "string" ? parsed.cardStyle : null,
      cardName: typeof parsed.cardName === "string" ? parsed.cardName : "",
      cardCreatedAt:
        typeof parsed.cardCreatedAt === "number" ? parsed.cardCreatedAt : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch (e) {
    console.error("Load state failed:", e);
    return null;
  }
}

export function clearState() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    // 顺手清掉 v1 遗留，避免用户浏览器里堆垃圾
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.error("Clear state failed:", e);
  }
}
