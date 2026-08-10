"use client";

import { useEffect } from "react";

/**
 * 确认弹窗
 *
 * 替换掉原来的 window.confirm()。
 * "重新开始"会清空用户辛苦聊出来的宣言，是不可逆操作，
 * 必须给一个能看清后果、能反悔的界面，而不是一个系统灰框。
 */

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Esc 关闭 + 打开时锁滚动
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-parchment rounded-2xl border border-ink/10 shadow-2xl p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title" className="text-lg font-bold mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-ink/60 leading-relaxed mb-6">
            {description}
          </p>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 !py-2.5">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 !py-2.5 rounded-lg transition-all text-parchment ${
              danger
                ? "bg-red-800 hover:bg-red-900"
                : "bg-ink hover:bg-ink/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
