"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DeclarationCard, type CardStyle } from "./DeclarationCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";
import {
  listDeclarations,
  removeDeclaration,
  type DeclarationRecord,
} from "@/lib/utils/gallery";
import { downloadCardImage, type CardStyleId } from "@/lib/utils/cardImage";

/**
 * 「我的宣言」列表
 *
 * 数据来源是 localStorage（见 lib/utils/gallery.ts）。
 * 字段命名刻意对齐未来的 Supabase declarations 表，
 * 将来换成公共画廊时这个组件不用改。
 *
 * 必须是客户端组件：localStorage 只在浏览器里存在，
 * 服务端渲染阶段拿不到，所以用 mounted 标志避免 hydration 不一致。
 */

export function GalleryList() {
  const { toast } = useToast();
  const [items, setItems] = useState<DeclarationRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setItems(listDeclarations());
    setMounted(true);
  }, []);

  const handleDelete = () => {
    if (!pendingDeleteId) return;
    removeDeclaration(pendingDeleteId);
    setItems(listDeclarations());
    setPendingDeleteId(null);
    toast("已删除这份宣言", "success");
  };

  const handleCopy = async (item: DeclarationRecord) => {
    const text = `《${item.card_name}》\n\n${item.declaration_text}\n\n—— 查拉图斯特拉\n\n#孩子的游戏`;
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制到剪贴板", "success");
    } catch {
      toast("复制失败，请手动长按选中文字", "error");
    }
  };

  const handleDownload = (item: DeclarationRecord) => {
    try {
      downloadCardImage({
        text: item.declaration_text,
        cardName: item.card_name,
        style: item.card_style as CardStyleId,
        createdAt: item.created_at,
      });
      toast("分享图已开始下载", "success");
    } catch (err) {
      console.error(err);
      toast("这个浏览器不支持导出图片", "error");
    }
  };

  // 首屏骨架，避免服务端/客户端内容不一致
  if (!mounted) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="surface-card h-56 animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="surface-card p-10 sm:p-14 text-center">
        <div className="text-4xl mb-4">🌱</div>
        <h2 className="text-lg font-bold mb-2">这里还什么都没有</h2>
        <p className="text-sm text-ink/60 leading-relaxed mb-8">
          走完一次 3 轮对话，生成的宣言会自动收藏到这里。
        </p>
        <Link
          href="/chat"
          className="inline-block px-8 py-3 bg-ink text-parchment rounded-full hover:scale-105 transition-transform"
        >
          去生成第一份宣言 →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {items.map((item) => (
          <article key={item.id} className="space-y-3">
            <DeclarationCard
              text={item.declaration_text}
              cardName={item.card_name}
              style={item.card_style as CardStyle}
              createdAt={item.created_at}
            />
            <div className="flex flex-wrap gap-2 justify-end text-xs">
              <button
                onClick={() => void handleCopy(item)}
                className="px-3 py-1.5 rounded-lg border border-ink/15 hover:bg-ink hover:text-parchment transition-colors"
              >
                复制文字
              </button>
              <button
                onClick={() => handleDownload(item)}
                className="px-3 py-1.5 rounded-lg border border-ink/15 hover:bg-ink hover:text-parchment transition-colors"
              >
                存成图片
              </button>
              <button
                onClick={() => setPendingDeleteId(item.id)}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-800 hover:text-parchment hover:border-red-800 transition-colors"
              >
                删除
              </button>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="删除这份宣言？"
        description="删除后无法恢复。如果只是想换一个风格，可以回到对话页重新生成。"
        confirmText="删除"
        danger
        onConfirm={handleDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}
