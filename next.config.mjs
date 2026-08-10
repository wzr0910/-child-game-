/** @type {import('next').NextConfig} */
const nextConfig = {
  // EdgeOne Pages 全栈部署：保持标准 Next.js 构建即可（SSR + API 路由由平台转成云函数）
  // 关闭 next/image 服务端优化，避免依赖 Sharp 在构建环境缺失时报错
  images: { unoptimized: true },
};

export default nextConfig;
