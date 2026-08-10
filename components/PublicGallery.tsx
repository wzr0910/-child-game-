"use client";

import { useEffect, useState } from "react";
import { DeclarationCard, type CardStyle } from "./DeclarationCard";
import {
  isRemoteGalleryEnabled,
  listDeclarationsRemote,
  type RemoteDeclaration,
} from "@/lib/db/declarations";

/**
 * 公共画廊（云端）
 *
 * 读取所有人公开的孩子宣言。
 * - 未配置 Supabase → 显示「公共画廊还没开放」友好态
 * - 配置但为空 → 显示引导文案
 * - 加载中 → 骨架屏
 *
 * 数据源是 declarations.ts 里的匿名 select（公开只读），
 * 服务端渲染时先画骨架，客户端 hydration 后再拉数据，避免不一致。
 */

export function PublicGallery() {
  const [items, setItems] = useState<RemoteDeclaration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isRemoteGalleryEnabled) {
      setLoading(false);
      return;
    }

    let active = true;
    listDeclarationsRemote()
      .then((data) => {
        if (active) setItems(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!isRemoteGalleryEnabled) {
    return (
      <div className="surface-card p-10 sm:p-14 text-center">
        <div className="text-4xl mb-4">🌍</div>
        <h3 className="text-lg font-bold mb-2">公共画廊还没开放</h3>
        <p className="text-sm text-ink/60 leading-relaxed">
          接入数据库后，这里会展示所有人生成的孩子宣言。
          <br />
          你自己的宣言依然安全地保存在本地。
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="surface-card h-56 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="surface-card p-10 sm:p-14 text-center">
        <div className="text-4xl mb-4">🌱</div>
        <h3 className="text-lg font-bold mb-2">还没有人点亮这里</h3>
        <p className="text-sm text-ink/60 leading-relaxed">
          生成一份宣言并公开，就会成为公共画廊的第一颗星。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {items.map((item) => (
        <DeclarationCard
          key={item.id}
          text={item.declaration_text}
          cardName={item.card_name}
          style={item.card_style as CardStyle}
          createdAt={new Date(item.created_at).getTime()}
        />
      ))}
    </div>
  );
}
