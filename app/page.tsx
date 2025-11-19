'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LandingPage } from '@/components/LandingPage';
import { LoginModal } from '@/components/LoginModal';
import ProjectsHome from '@/components/ProjectsHome';
import { ViewMode } from '@/types/morpheus';
import { supabase } from '@/lib/supabaseClient';

// Dynamically import Canvas to avoid SSR issues if needed, 
// though currently we are managing the flow at a higher level.
const Canvas = dynamic(() => import('@/components/Canvas'), { ssr: false });

export default function Home() {
  const [view, setView] = useState<ViewMode>(ViewMode.LANDING);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setView(ViewMode.DASHBOARD);
      }
      setIsLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setView(ViewMode.DASHBOARD);
        setIsLoginModalOpen(false); // Close modal if open
      } else {
        setView(ViewMode.LANDING);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
