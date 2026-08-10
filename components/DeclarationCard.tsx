/**
 * 宣言卡片组件
 *
 * 最终展示用户的孩子宣言
 * 支持 4 种风格切换
 *
 * ⚠️ 日期修复（2026-08-11）
 * 旧版在组件内部 new Date()，导致：
 * 1. 从存档恢复的宣言显示的是"今天"，不是生成那天
 * 2. 每次重渲染日期都会重算
 * 现在改成由外部传入 createdAt。
 */

export type CardStyle =
  | "minimal"
  | "classical"
  | "futuristic"
  | "handwritten";

type DeclarationCardProps = {
  text: string;
  cardName: string;
  style: CardStyle;
  createdAt?: number;
};

const STYLE_CONFIG: Record<
  CardStyle,
  { container: string; title: string; meta: string; text: string; badge: string }
> = {
  minimal: {
    container: "bg-white text-ink border-2 border-ink",
    title: "text-2xl font-bold text-ink",
    meta: "text-ink/50",
    text: "text-ink/80 leading-relaxed",
    badge: "bg-ink text-white",
  },
  classical: {
    container: "bg-parchment text-ink border-4 border-double border-gold shadow-2xl",
    title: "text-2xl font-bold text-gold italic",
    meta: "text-gold/70",
    text: "text-ink leading-loose italic",
    badge: "bg-gold text-parchment",
  },
  futuristic: {
    container: "bg-ink text-parchment border-2 border-gold shadow-2xl",
    title: "text-2xl font-bold text-gold",
    meta: "text-parchment/60",
    text: "text-parchment/90 leading-relaxed",
    badge: "bg-gold text-ink",
  },
  handwritten: {
    container: "bg-sage/10 text-ink border-2 border-dashed border-sage shadow-lg",
    title: "text-2xl font-bold text-sage",
    meta: "text-ink/50",
    text: "text-ink leading-loose",
    badge: "bg-sage text-white",
  },
};

export function DeclarationCard({
  text,
  cardName,
  style,
  createdAt,
}: DeclarationCardProps) {
  const config = STYLE_CONFIG[style] || STYLE_CONFIG.minimal;
  const date = new Date(createdAt ?? Date.now()).toLocaleDateString("zh-CN");

  return (
    <div className={`p-6 sm:p-8 rounded-2xl ${config.container}`}>
      {/* 顶部装饰 */}
      <div className="flex items-center justify-between mb-6">
        <span className={`text-xs px-3 py-1 rounded-full ${config.badge}`}>
          🌀 孩子的游戏
        </span>
        <span className={`text-xs ${config.meta}`}>{date}</span>
      </div>

      {/* 卡片名（用户起的名字） */}
      {cardName && (
        <div className="text-center mb-6">
          <div className={`text-xs uppercase tracking-widest mb-2 ${config.meta}`}>
            My Declaration
          </div>
          <h2 className={config.title}>《{cardName}》</h2>
        </div>
      )}

      {/* 宣言正文 */}
      <div className={`whitespace-pre-wrap mb-6 ${config.text}`}>{text}</div>

      {/* 底部签名 */}
      <div className={`text-center text-sm italic ${config.meta}`}>
        —— 查拉图斯特拉
      </div>
    </div>
  );
}
