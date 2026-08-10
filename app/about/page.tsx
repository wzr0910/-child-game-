import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "关于本项目",
  description:
    "「孩子的游戏」的产品设计思路、Co-Creation 机制与技术决策复盘。",
};

/**
 * 关于页 / 项目复盘
 *
 * 这一页是给面试官看的：
 * 产品经理的价值不在"做了什么功能"，而在"为什么是这个功能、放弃了什么"。
 * 所以这里写的是判断和取舍，不是功能清单。
 */

const DECISIONS = [
  {
    title: "为什么选「孩子」，不选骆驼和狮子",
    body: "尼采的精神三变里，骆驼是忍受，狮子是反抗，孩子是创造。前两个阶段用户不缺——被 KPI 压着是骆驼，想裸辞是狮子。稀缺的是第三个：在没有现成路径的地方，凭自己的意愿开始一件事。这也正是产品的目标用户当下的处境，所以只做「孩子」这一段。",
  },
  {
    title: "为什么不做诊断、不给建议",
    body: "MBTI 类工具的问题是：它给你一个标签，然后你就不再想了。这个产品刻意不输出任何结论性判断，只做一件事——把用户已经发生过的那个瞬间重新描述一遍。判断权始终在用户手里，AI 只负责让他看见。",
  },
  {
    title: "Co-Creation：让用户参与生成",
    body: "最初的设计是 AI 直接给一段宣言。问题在于：纯 AI 生成的东西，用户不会认为那是「自己的」，也就不会想分享。改成「AI 给 3 个候选 → 用户挑 → 用户改 → 用户命名 → 用户选风格」之后，成果物上带着用户自己的痕迹。这是整个产品最关键的一次改动。",
  },
  {
    title: "阶段状态机为什么放在服务端",
    body: "前端传来的对话进度一律不可信。如果只信前端，任何人都能直接调 /api/generate-candidates 跳过引导、反复刷 token。服务端改成按「历史消息条数」反推真实进度，进度对不上直接 400。这既是安全问题，也是成本问题。",
  },
  {
    title: "没有 API Key 也要能跑",
    body: "作品集会被别人 clone、会被面试官当场打开。缺一个环境变量就白屏是不可接受的。所以未配置 DEEPSEEK_API_KEY 时自动进入演示模式，走预置回复，全流程仍然完整；填上 key 后自动切回真实 AI，代码一行不改。",
  },
  {
    title: "画廊为什么先做本地版",
    body: "公共画廊需要 Supabase 建表和 service_role 密钥，属于人工步骤。在那之前如果直接上线云端画廊，用户看到的只会是一个空页面。所以先用 localStorage 落地「我的宣言」，字段命名与未来的数据库表完全对齐，接云端时只换数据源。",
  },
];

const STACK = [
  { name: "Next.js 14 (App Router)", why: "前后端一体，解决「纯前端调不了 AI」" },
  { name: "TypeScript", why: "对话状态机分支多，类型是最便宜的防错手段" },
  { name: "Tailwind CSS", why: "羊皮纸 + 墨色 + 金色主题在配置里集中管理" },
  { name: "DeepSeek", why: "中文语感好、价格低，且兼容 OpenAI SDK 协议" },
  { name: "localStorage", why: "对话与宣言不上传服务器，隐私成本最低" },
];

export default function AboutPage() {
  return (
    <main className="px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          关于本项目
        </h1>
        <p className="text-center text-ink/60 mb-10 text-sm sm:text-base">
          一个 AI 哲学对话产品的设计与取舍
        </p>

        {/* 一句话 */}
        <section className="surface-card p-6 sm:p-8 mb-8">
          <p className="leading-relaxed text-ink/80">
            <strong className="text-ink">「孩子的游戏」</strong>
            让 AI 扮演尼采笔下的查拉图斯特拉，用 3 轮对话帮处在
            <strong className="text-ink">「奥德赛时期」</strong>
            的年轻人看见自己真正愿意做的事，并共同创作一份可分享的
            <strong className="text-ink">孩子宣言</strong>。
          </p>
        </section>

        {/* 决策复盘 */}
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-widest text-ink/40 mb-5">
            关键决策
          </h2>
          <div className="space-y-4">
            {DECISIONS.map((item) => (
              <details key={item.title} className="surface-card group">
                <summary className="cursor-pointer list-none p-5 flex items-start justify-between gap-4 font-semibold">
                  <span>{item.title}</span>
                  <span className="text-gold shrink-0 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm text-ink/70 leading-loose">
                  {item.body}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* 技术栈 */}
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-widest text-ink/40 mb-5">
            技术选型
          </h2>
          <div className="surface-card divide-y divide-ink/5">
            {STACK.map((item) => (
              <div
                key={item.name}
                className="p-5 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
              >
                <div className="font-semibold text-sm sm:w-56 shrink-0">
                  {item.name}
                </div>
                <div className="text-sm text-ink/60 leading-relaxed">
                  {item.why}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 边界 */}
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-widest text-ink/40 mb-5">
            产品边界
          </h2>
          <div className="surface-card p-6 text-sm text-ink/70 leading-loose">
            这个产品触及意义感和自我认同，因此必须讲清楚它不是什么：
            它不提供心理咨询、不做心理评估、不给医疗或职业建议。
            如果你正在经历持续的情绪困扰，请联系专业机构。
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/chat"
            className="inline-block px-10 py-3.5 bg-ink text-parchment rounded-full hover:scale-105 transition-transform shadow-lg"
          >
            开始一次对话 →
          </Link>
        </div>
      </div>
    </main>
  );
}
