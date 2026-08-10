/** @type {import('next').NextConfig} */
const nextConfig = {
  // EdgeOne Pages 全栈部署：保持标准 Next.js 构建即可（SSR + API 路由由平台转成云函数）
  // 关闭 next/image 服务端优化，避免依赖 Sharp 在构建环境缺失时报错
  images: { unoptimized: true },
  experimental: {
    // CloudBase Node SDK 内部用了 request / jsonwebtoken 等带动态 require 的包，
    // 交给 Node 运行时原生加载，别让 Next 打包它们，否则运行时会报找不到模块。
    serverComponentsExternalPackages: ["@cloudbase/node-sdk"],
  },
};

export default nextConfig;
