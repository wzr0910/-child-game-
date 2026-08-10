import Link from "next/link";

/**
 * 全局页脚
 *
 * 作品集属性：明确署名、技术栈、以及"这是一个作品集项目"的边界声明。
 * 边界声明不是免责套话——产品直接触及意义感和自我认同，
 * 讲清楚"这不是心理咨询"是产品伦理的一部分。
 */

export function Footer() {
  return (
    <footer className="border-t border-ink/10 mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-sm text-ink/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="italic">
            &ldquo;孩子是无辜的和遗忘的，一个新的开始，一个游戏。&rdquo;
          </p>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-ink transition-colors">
              关于本项目
            </Link>
            <a
              href="https://github.com/wzr0910"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-ink transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-ink/5 text-xs">
          <p>
            Next.js 14 · TypeScript · Tailwind CSS · DeepSeek　|　作品集项目
          </p>
          <p>
            本产品不提供心理咨询或医疗建议，如需帮助请联系专业机构。
          </p>
        </div>
      </div>
    </footer>
  );
}
