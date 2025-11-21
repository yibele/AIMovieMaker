'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查用户认证状态
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 未登录，重定向到首页
        router.push('/');
        return;
      }
      
      setIsAuthenticated(true);
    };

    checkAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // 用户登出，重定向到首页
        router.push('/');
      } else {
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // 加载中或未认证时显示加载界面
  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <div className="text-gray-500 text-sm">验证身份中...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden relative">
      <Canvas />
    </main>
  );
}