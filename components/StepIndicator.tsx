/**
 * 阶段进度条
 *
 * ⚠️ 样式修复（2026-08-11）
 * 旧版组件自带 p-4 / border-b / bg-ink/5，
 * 但它在 ChatWindow 里被放进一个已经有同样样式的容器，
 * 结果是双重内边距 + 两条分隔线的视觉重影。
 * 现在组件只负责内容，容器样式交给父级。
 *
 * 另外：进度条现在贯穿全流程（含"宣言"一格），
 * 旧版 step > 2 后整个组件被替换掉，第 4 格永远不会点亮。
 */

type StepIndicatorProps = {
  /** 前端状态机的 step（0-6） */
  currentStep: number;
};

const STEPS = [
  { id: 0, name: "回忆", desc: "忘记时间的瞬间" },
  { id: 1, name: "觉察", desc: "主动还是被动" },
  { id: 2, name: "命名", desc: "给它一个名字" },
  { id: 3, name: "宣言", desc: "你的孩子宣言" },
];

/** step 0-2 是三轮对话，step 3 及以后都归到"宣言"这一格 */
function toIndicatorStep(step: number): number {
  return step <= 2 ? step : 3;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const active = toIndicatorStep(currentStep);

  return (
    <div className="flex-1 flex items-center justify-around">
      {STEPS.map((step) => {
        const reached = step.id <= active;
        const done = step.id < active;
        return (
          <div
            key={step.id}
            title={step.desc}
            className={`flex flex-col items-center text-xs transition-colors ${
              reached ? "text-ink" : "text-ink/30"
            }`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${
                reached ? "bg-gold text-parchment" : "bg-ink/10"
              }`}
            >
              {done ? "✓" : step.id + 1}
            </div>
            <div className="font-semibold">{step.name}</div>
          </div>
        );
      })}
    </div>
  );
}
