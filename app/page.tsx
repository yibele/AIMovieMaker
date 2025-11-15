'use client';

import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import SettingsPanel from '@/components/SettingsPanel';

// 动态导入 Canvas 组件（避免 SSR 问题）
// AIInputPanel 和 Toolbar 已移到 Canvas 内部，以便使用 useReactFlow hook
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-gray-500">加载中...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden relative bg-gray-50">
      {/* 顶部标题栏 */}
      <Header />
      
      {/* 画布区域（包含 Toolbar 和 AIInputPanel） */}
      <div className="w-full h-full pt-16">
        <Canvas />
      </div>
      
      {/* 右上角设置按钮 */}
      <SettingsPanel />
    </main>
  );
}

