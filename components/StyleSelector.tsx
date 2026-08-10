/**
 * 风格选择组件
 *
 * 用户选择宣言卡片的视觉风格
 * 4 种风格：简约 / 古典 / 未来感 / 手绘
 */

type Style = "minimal" | "classical" | "futuristic" | "handwritten";

type StyleSelectorProps = {
  selectedStyle: Style | null;
  onSelect: (style: Style) => void;
};

const STYLES: Array<{
  id: Style;
  name: string;
  desc: string;
  preview: string;
}> = [
  {
    id: "minimal",
    name: "简约",
    desc: "现代、克制",
    preview: "bg-white text-ink border-2 border-ink",
  },
  {
    id: "classical",
    name: "古典",
    desc: "典雅、像古籍",
    preview: "bg-parchment text-ink border-4 border-double border-gold",
  },
  {
    id: "futuristic",
    name: "未来感",
    desc: "深邃、神秘",
    preview: "bg-ink text-parchment border-2 border-gold",
  },
  {
    id: "handwritten",
    name: "手绘",
    desc: "温暖、自然",
    preview: "bg-sage/10 text-ink border-2 border-dashed border-sage",
  },
];

export function StyleSelector({ selectedStyle, onSelect }: StyleSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold mb-2">🎨 选择你的宣言风格</h3>
        <p className="text-sm text-ink/60">
          不同的风格承载不同的你
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {STYLES.map((s) => {
          const isSelected = selectedStyle === s.id;
          return (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-gold bg-gold/5 shadow-md scale-105"
                  : "border-ink/10 bg-white/60 hover:border-ink/30"
              }`}
            >
              {/* 风格预览 */}
              <div
                className={`h-20 rounded-lg mb-3 flex items-center justify-center text-xs ${s.preview}`}
              >
                Aa
              </div>
              <div className="text-center">
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-ink/50 mt-1">{s.desc}</div>
              </div>
              {isSelected && (
                <div className="text-center mt-2 text-xs text-gold font-semibold">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
