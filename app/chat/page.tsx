import type { Metadata } from "next";
import { ChatWindow } from "@/components/ChatWindow";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "和查拉图斯特拉对话",
  description:
    "3 轮对话，找到那个让你忘记时间的瞬间，并为它命名。",
};

export default function ChatPage() {
  return (
    <main className="px-4 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          和查拉图斯特拉对话
        </h1>
        <p className="text-center text-ink/60 mb-8 text-sm sm:text-base">
          3 轮对话 · 找到你愿意做的事
        </p>

        <ErrorBoundary fallbackTitle="对话没能展开">
          <ChatWindow />
        </ErrorBoundary>

        <p className="text-center text-xs text-ink/40 mt-6 leading-relaxed">
          对话仅保存在你自己的浏览器里，不会上传服务器。
          <br />
          清空浏览器数据会一并清除。
        </p>
      </div>
    </main>
  );
}
