'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LandingPage } from '@/components/LandingPage';
import { LoginModal } from '@/components/LoginModal';
import ProjectsHome from '@/components/ProjectsHome';
import { ViewMode } from '@/types/morpheus';
import { supabase } from '@/lib/supabaseClient';
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

  // 行级注释：自动同步云端 API 授权
  const syncCloudCredentials = useCallback(async (accessToken: string) => {
    try {
      console.log('🔄 自动同步云端 API 授权...');
      
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
          // 行级注释：更新凭证到本地 store
          setApiConfig({
            apiKey: creds.apiKey || '',
            bearerToken: creds.bearerToken || '',
            cookie: creds.cookie || '',
            projectId: creds.projectId || '',
            isManaged: true,
          });
          console.log('✅ API 授权同步成功');
          toast.success('API 授权已自动同步');
        } else {
          console.log('⚠️ 未找到有效的 API 授权');
        }
      } else {
        console.error('❌ 同步 API 授权失败:', response.status);
      }
    } catch (error) {
      console.error('❌ 同步云端凭证出错:', error);
    }
  }, [setApiConfig]);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setView(ViewMode.DASHBOARD);
        // 行级注释：登录时自动同步 API 授权
        syncCloudCredentials(session.access_token);
      }
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setView(ViewMode.DASHBOARD);
        setIsLoginModalOpen(false); // Close modal if open
        
        // 行级注释：登录事件时自动同步 API 授权
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          syncCloudCredentials(session.access_token);
        }
      } else {
        setView(ViewMode.LANDING);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncCloudCredentials]);

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
