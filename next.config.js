/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 【部署推荐】独立输出模式 - 生成完整的独立应用
  // output: 'standalone',  // 取消注释以启用
  
  // 【静态导出】如果只需要静态 HTML（不支持 API Routes）
  // output: 'export',
  // trailingSlash: true,
  // images: {
  //   unoptimized: true
  // }
};

// Cloudflare Pages support
// Note: @cloudflare/next-on-pages is not installed yet
// Uncomment after installing: const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev');

// if (process.env.NODE_ENV === 'development') {
//   await setupDevPlatform();
// }

module.exports = nextConfig;

