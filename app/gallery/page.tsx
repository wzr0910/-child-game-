import type { Metadata } from "next";
import { GalleryList } from "@/components/GalleryList";
import { PublicGallery } from "@/components/PublicGallery";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "宣言画廊",
  description: "你的孩子宣言，与所有人点亮的孩子宣言。",
};

export default function GalleryPage() {
  return (
    <main className="px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          宣言画廊
        </h1>
        <p className="text-center text-ink/60 mb-8 text-sm sm:text-base">
          你生成过的宣言，和所有人点亮的孩子宣言
        </p>

        {/* 我的宣言（本地收藏） */}
        <section className="mb-12">
          <h2 className="text-sm uppercase tracking-widest text-ink/40 text-center mb-6">
            我的宣言
          </h2>
          <ErrorBoundary fallbackTitle="我的宣言没能展开">
            <GalleryList />
          </ErrorBoundary>
        </section>

        {/* 公共画廊（云端，所有人可见） */}
        <section>
          <h2 className="text-sm uppercase tracking-widest text-ink/40 text-center mb-6">
            公共画廊
          </h2>
          <ErrorBoundary fallbackTitle="公共画廊没能展开">
            <PublicGallery />
          </ErrorBoundary>
        </section>
      </div>
    </main>
  );
}
