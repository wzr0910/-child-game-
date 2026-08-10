/**
 * 宣言候选选择组件
 *
 * 用户在 3 个 AI 生成的候选中选择一个
 * 也可以编辑选中的文本
 */

type Candidate = {
  id: number;
  style: string;
  text: string;
};

type CandidateSelectorProps = {
  candidates: Candidate[];
  selectedId: number | null;
  editedText: string;
  onSelect: (id: number) => void;
  onEdit: (text: string) => void;
  onConfirm: () => void;
};

const STYLE_BADGE: Record<string, string> = {
  "激情": "bg-red-100 text-red-700 border-red-200",
  "诗意": "bg-blue-100 text-blue-700 border-blue-200",
  "简洁": "bg-amber-100 text-amber-700 border-amber-200",
};

export function CandidateSelector({
  candidates,
  selectedId,
  editedText,
  onSelect,
  onEdit,
  onConfirm,
}: CandidateSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">✨ 选择你最有感觉的一句</h3>
        <p className="text-sm text-ink/60">
          点击卡片选中，你也可以直接编辑文字
        </p>
      </div>

      <div className="space-y-3">
        {candidates.map((c) => {
          const isSelected = selectedId === c.id;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-gold bg-gold/5 shadow-md"
                  : "border-ink/10 bg-white/60 hover:border-ink/30"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${
                    STYLE_BADGE[c.style] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {c.style}版
                </span>
                {isSelected && (
                  <span className="text-xs text-gold font-semibold">
                    ✓ 已选中
                  </span>
                )}
              </div>
              {isSelected ? (
                <textarea
                  value={editedText}
                  onChange={(e) => onEdit(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  rows={6}
                  className="w-full p-3 bg-white/80 border border-ink/20 rounded-lg focus:outline-none focus:border-gold resize-none leading-relaxed"
                />
              ) : (
                <p className="text-ink/80 leading-relaxed whitespace-pre-wrap">
                  {c.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onConfirm}
          disabled={selectedId === null}
          className="btn-primary flex-1"
        >
          确认，下一步 →
        </button>
      </div>
    </div>
  );
}
