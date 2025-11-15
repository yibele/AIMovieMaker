'use client';

import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// 动态导入画布组件，避免 SSR 问题
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">加载画布中...</p>
      </div>
    </div>
  ),
});

export default function ProjectCanvasPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return <Canvas projectId={projectId} />;
}