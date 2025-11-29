'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import { AlertCircle } from 'lucide-react';

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
  const router = useRouter();
  const projectId = params.projectId as string;
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // 检查用户认证状态和项目权限
    const checkAuthAndAccess = async () => {
      // 1. 检查用户是否登录
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user?.email) {
        // 未登录，重定向到首页
        router.push('/');
        return;
      }
      
      setIsAuthenticated(true);
      const userEmail = session.user.email;

      // 2. 从 localStorage 读取该用户的项目列表
      const storageKey = `user_projects_${userEmail}`;
      const projectsData = localStorage.getItem(storageKey);
      
      if (!projectsData) {
        // 没有项目列表缓存，重定向到首页
        setIsAuthorized(false);
        setTimeout(() => {
          router.push('/');
        }, 2000);
        return;
      }

      try {
        const userProjectIds: string[] = JSON.parse(projectsData);
        
        // 3. 检查当前 projectId 是否在用户的项目列表中
        if (userProjectIds.includes(projectId)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
          setTimeout(() => {
            router.push('/');
          }, 2000);
        }
      } catch (error) {
        console.error('❌ 解析项目列表失败:', error);
        setIsAuthorized(false);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    };

    checkAuthAndAccess();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        // 用户登出，重定向到首页
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, projectId]);

  // 加载中或未认证时显示加载界面
  if (isAuthenticated === null || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">验证身份中...</p>
        </div>
      </div>
    );
  }

  // 未授权访问
  if (isAuthorized === false) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">访问被拒绝</h1>
            <p className="text-gray-600">您没有权限访问此项目</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>正在返回首页...</p>
          </div>
        </div>
      </div>
    );
  }

  // 验证中
  if (isAuthorized === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">验证项目权限中...</p>
        </div>
      </div>
    );
  }

  // 已认证且已授权，显示画布
  return <Canvas projectId={projectId} />;
}