'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { LandingPage } from '@/components/LandingPage';
import { LoginModal } from '@/components/LoginModal';
import ProjectsHome from '@/components/ProjectsHome';
import { ViewMode } from '@/types/morpheus';

// Dynamically import Canvas to avoid SSR issues if needed, 
// though currently we are managing the flow at a higher level.
const Canvas = dynamic(() => import('@/components/Canvas'), { ssr: false });

export default function Home() {
  const [view, setView] = useState<ViewMode>(ViewMode.LANDING);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    setView(ViewMode.DASHBOARD);
  };

  const handleLogout = () => {
    setView(ViewMode.LANDING);
  };

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
