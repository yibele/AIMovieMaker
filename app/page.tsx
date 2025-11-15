'use client';

import dynamic from 'next/dynamic';
import ProjectsHome from '@/components/ProjectsHome';

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
  // 暂时直接显示项目首页
  // 后续会根据路由来决定显示首页还是画布
  return (
    <main className="w-screen h-screen overflow-hidden relative">
      {/* 项目首页 */}
      <ProjectsHome />
    </main>
  );
}

