"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 全局错误页
 *
 * ErrorBoundary 只兜住组件树内部的渲染错误；
 * 这一层兜住整页级别的异常，保证任何情况下都不出现浏览器原生白屏。
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <main className="px-4 py-24">
      <div className="max-w-md mx-auto text-center">
        <div className="text-4xl mb-6">🌫️</div>
        <h1 className="text-2xl font-bold mb-4">山上起雾了</h1>
        <p className="text-ink/60 leading-relaxed mb-10 text-sm">
          页面遇到了一个意外错误。你的对话记录保存在本地，不会丢失。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            再试一次
          </button>
          <Link href="/" className="btn-secondary">
            回到首页
          </Link>
        </div>
      </div>
    </main>
  );
}
