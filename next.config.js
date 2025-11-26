/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 启用静态导出（可选）
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

