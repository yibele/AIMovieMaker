'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { LandingPage } from '@/components/LandingPage';
import { LoginModal } from '@/components/LoginModal';
import ProjectsHome from '@/components/ProjectsHome';
import { ViewMode } from '@/types/morpheus';
import { supabase, getCachedSession, clearSessionCache } from '@/lib/supabaseClient';
import { useCanvasStore } from '@/lib/store';
import { toast } from 'sonner';

// Dynamically import Canvas to avoid SSR issues if needed, 
// though currently we are managing the flow at a higher level.
const Canvas = dynamic(() => import('@/components/Canvas'), { ssr: false });

export default function Home() {
  const [view, setView] = useState<ViewMode>(ViewMode.LANDING);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 行级注释：获取 store 中的 setApiConfig 方法
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  
  // 行级注释：追踪是否已经同步过 API 授权，避免重复同步
  const hasSyncedRef = useRef(false);

  // 行级注释：自动同步云端 API 授权（只执行一次）
  const syncCloudCredentials = useCallback(async (accessToken: string, userId: string, forceSync: boolean = false) => {
    // 行级注释：如果已经同步过且不是强制同步，则跳过
    if (hasSyncedRef.current && !forceSync) {
      return;
    }
    
    try {
      
      const response = await fetch('/api/activation/activate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.activated && data.credentials) {
          const creds = data.credentials;
          // 行级注释：更新凭证到本地 store（包含 userId）
          setApiConfig({
            apiKey: creds.apiKey || '',
            bearerToken: creds.bearerToken || '',
            cookie: creds.cookie || '',
            projectId: creds.projectId || '',
            isManaged: true,
            userId, // 行级注释：设置 userId，避免其他组件重复调用 getUser
          });
          // 行级注释：标记已同步
          hasSyncedRef.current = true;
          toast.success('API 授权已自动同步');
        } else {
          // 行级注释：即使没有凭证，也设置 userId
          setApiConfig({ userId });
        }
      } else {
        // 行级注释：即使失败，也设置 userId
        setApiConfig({ userId });
      }
    } catch (error) {
      // 行级注释：即使出错，也设置 userId
      setApiConfig({ userId });
    }
  }, [setApiConfig]);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      // 行级注释：使用缓存的 session，减少 API 请求
      const session = await getCachedSession();
      if (session) {
        setView(ViewMode.DASHBOARD);
        // 行级注释：登录时自动同步 API 授权，传入 userId
        syncCloudCredentials(session.access_token, session.user.id);
      }
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setView(ViewMode.DASHBOARD);
        setIsLoginModalOpen(false); // Close modal if open
        
        // 行级注释：只在新登录时强制同步，TOKEN_REFRESHED 时跳过（因为凭证没变）
        if (event === 'SIGNED_IN') {
          // 行级注释：新登录，强制同步，传入 userId
          hasSyncedRef.current = false;
          syncCloudCredentials(session.access_token, session.user.id, true);
        }
        // 行级注释：TOKEN_REFRESHED 不需要重新同步，凭证没有变化
      } else {
        setView(ViewMode.LANDING);
        // 行级注释：登出时重置同步状态和 userId
        hasSyncedRef.current = false;
        setApiConfig({ userId: undefined });
      }
    });

    return () => subscription.unsubscribe();
  }, [syncCloudCredentials, setApiConfig]);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  // This is now primarily for manual triggers if needed, 
  // but the auth listener handles the state change.
  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    setView(ViewMode.DASHBOARD);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView(ViewMode.LANDING);
  };

  if (isLoading) {
    // Optional: A loading spinner could go here to prevent flash of landing page
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
    </div>;
  }

  return (
    <div className="font-sans antialiased text-slate-900 bg-slate-50 min-h-screen">
      {view === ViewMode.LANDING && (
        <LandingPage
          onGetStarted={handleLoginClick}
          onLoginClick={handleLoginClick}
        />
      )}

      {view === ViewMode.DASHBOARD && (
        <ProjectsHome onLogout={handleLogout} />
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
