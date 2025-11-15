'use client';

import dynamic from 'next/dynamic';

// 动态导入 Canvas 组件（避免 SSR 问题）
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-500">加载中...</div>
    </div>
  ),
});

export default function CanvasPage() {
  return (
    <main className="w-screen h-screen overflow-hidden relative">
      <Canvas />
    </main>
  );
}