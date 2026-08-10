"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * 轻量 Toast 系统
 *
 * 替换掉原来散落在 ChatWindow 里的 alert()。
 * 为什么值得做：alert 会阻塞主线程、样式不可控、移动端体验很差，
 * 而且在作品集里是很明显的"半成品"信号。
 *
 * 零依赖实现，跟着项目的哲学主题色走。
 */

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLE: Record<ToastKind, string> = {
  success: "bg-ink text-parchment border-gold/40",
  error: "bg-red-900 text-parchment border-red-400/40",
  info: "bg-ink/90 text-parchment border-ink/40",
};

const KIND_ICON: Record<ToastKind, string> = {
  success: "✓",
  error: "!",
  info: "·",
};

let seed = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++seed;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`animate-toast-in flex items-center gap-3 w-full px-5 py-3 rounded-xl border shadow-lg text-sm ${
              KIND_STYLE[item.kind]
            }`}
          >
            <span className="shrink-0 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-xs">
              {KIND_ICON[item.kind]}
            </span>
            <span className="whitespace-pre-wrap leading-relaxed">
              {item.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 兜底：即使忘了套 Provider 也不要让页面崩
    return { toast: (message: string) => console.warn("[toast]", message) };
  }
  return ctx;
}
