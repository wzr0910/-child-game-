import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ToastProvider } from "@/components/Toast";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const title = "孩子的游戏 | 找到你愿意做的事";
const description =
  "用尼采「孩子」哲学 + AI，3 轮对话帮 20-30 岁的你看见那个让自己忘记时间的瞬间，并生成一份属于你的孩子宣言。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | 孩子的游戏",
  },
  description,
  keywords: [
    "尼采",
    "查拉图斯特拉",
    "孩子的游戏",
    "奥德赛时期",
    "AI 哲学对话",
    "自我探索",
  ],
  authors: [{ name: "王梓睿" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    siteName: "孩子的游戏",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f1e8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-parchment text-ink font-serif antialiased min-h-screen flex flex-col">
        <ToastProvider>
          <Nav />
          <div className="flex-1">{children}</div>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
