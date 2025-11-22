import React, { useState, useEffect, useRef } from 'react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { Project } from '../types/morpheus';
import { Settings, Plus, Search, Bell, LogOut, RefreshCw, User, Zap, Sparkles, Play, ArrowDown, LayoutGrid } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

interface DashboardViewProps {
    projects: Project[];
    onCreateProject: (prompt: string) => Promise<void>;
    onRefreshProjects: () => Promise<void>;
    onProjectClick?: (projectId: string) => void;
    isLoading?: boolean;
    onLogout: () => void;
    authStatus: 'valid' | 'missing' | 'expired';
}

export const DashboardView: React.FC<DashboardViewProps> = ({ projects, onCreateProject, onRefreshProjects, onProjectClick, isLoading, onLogout, authStatus }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const setIsSettingsOpen = useCanvasStore((state) => state.setIsSettingsOpen);
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [scrolled, setScrolled] = useState(false);
    const mainRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.avatar_url) {
                setAvatarUrl(user.user_metadata.avatar_url);
            }
        };
        getUserProfile();

        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToProjects = () => {
        mainRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#f2f3f5] text-slate-900 font-sans selection:bg-violet-200 selection:text-violet-900 overflow-x-hidden">
            
            {/* Layer 1: Fixed Hero Background (Text & Image) */}
            <div className="fixed inset-0 z-0 flex flex-col items-center justify-center min-h-screen overflow-hidden bg-slate-900">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    <img 
                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
                        alt="Abstract Background" 
                        className="w-full h-full object-cover opacity-40 scale-105 animate-slow-zoom"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/20 to-[#f2f3f5]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,#f2f3f5_100%)] opacity-80"></div>
                </div>

                {/* Giant Hero Text */}
                <div className="relative z-10 text-center px-6 max-w-5xl mx-auto -translate-y-32 select-none">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-bold tracking-[0.2em] uppercase mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 shadow-lg">
                        <Sparkles className="w-3 h-3" />
                        Morpheus Workspace
                    </div>
                    <h1 className="text-[5rem] md:text-[8rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-800 to-transparent tracking-tighter leading-[0.85] mb-8 animate-in fade-in zoom-in-50 duration-1000 delay-100 drop-shadow-sm">
                        Create<br />
                        Something<br />
                        Extraordinary.
                    </h1>
                    <p className="text-lg md:text-2xl text-slate-700 font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 drop-shadow-sm">
                        Unleash your creativity with AI-powered tools. Build immersive stories, generate stunning visuals, and bring your ideas to life.
                    </p>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer text-slate-500 hover:text-slate-900 transition-colors p-4" onClick={scrollToProjects}>
                    <ArrowDown className="w-8 h-8" />
                </div>
            </div>

            {/* Top Navigation - Fixed Glass */}
            <header className={`
                fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${scrolled ? 'bg-white/70 backdrop-blur-2xl shadow-sm border-b border-white/20' : 'bg-transparent'}
            `}>
                <div className="max-w-[1800px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        {/* Logo */}
                        <div className="flex items-center gap-3 group cursor-pointer relative">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-300">
                                <Zap className="w-5 h-5 fill-current" />
                            </div>
                            <span className={`text-lg font-bold tracking-tight transition-colors duration-300 ${scrolled ? 'text-slate-900' : 'text-slate-900/80'}`}>Morpheus</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Actions */}
                        <div className="flex items-center gap-3 pl-6">
                            <button className={`p-3 rounded-2xl transition-all duration-300 group ${scrolled ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-900 hover:bg-white/20'}`}>
                                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>

                            <div className="h-10 w-10 rounded-2xl p-[2px] bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 cursor-pointer hover:from-violet-500 hover:to-indigo-500 transition-colors duration-300 group">
                                <div className="h-full w-full rounded-[14px] bg-white overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={onLogout} 
                                className={`p-3 rounded-2xl transition-all duration-300 group ${scrolled ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-slate-500 hover:text-red-600 hover:bg-white/20'}`}
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Layer 2: Scrolling Content */}
            <div className="relative z-10 pt-[100vh]">
                {/* Gradient Mask for smooth transition */}
                <div className="h-64 bg-gradient-to-b from-transparent via-[#f2f3f5]/50 to-[#f2f3f5]"></div>
                
                <main 
                    ref={mainRef}
                    className="bg-[#f2f3f5] min-h-screen px-6 md:px-10 pb-32 relative shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.1)]"
                >
                    <div className="max-w-[1800px] mx-auto">
                        
                        {/* Content Header (Toolbar) */}
                        <div className="sticky top-24 z-30 mb-12 -mt-20">
                            <div className="bg-white/80 backdrop-blur-xl p-2 pr-3 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 inline-flex items-center gap-4 mx-auto md:mx-0">
                                <div className="relative group">
                                    <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-violet-600 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Search projects..." 
                                        className="w-64 bg-transparent border-none py-3.5 pl-12 pr-4 text-sm font-medium outline-none text-slate-700 placeholder:text-slate-400" 
                                    />
                                </div>
                                <div className="w-px h-8 bg-slate-200/60"></div>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                                    title="Settings"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={onRefreshProjects}
                                    disabled={isLoading}
                                    className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <div className="w-px h-8 bg-slate-200/60"></div>
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-xl hover:bg-black hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="font-bold text-sm">New Project</span>
                                </button>
                            </div>
                        </div>

                        {/* Projects Grid */}
                        {projects.length === 0 ? (
                            <div className="relative overflow-hidden py-32 rounded-[3rem] bg-white border border-dashed border-slate-200">
                                <div className="flex flex-col items-center justify-center text-center px-6">
                                    <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                                        <LayoutGrid className="w-10 h-10 text-slate-300" />
                                    </div>
                                    {authStatus === 'valid' ? (
                                        <>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to Create?</h3>
                                            <p className="text-slate-500 mb-8 max-w-sm">Start your first project and watch your ideas come to life.</p>
                                            <button
                                                onClick={() => setIsCreateModalOpen(true)}
                                                className="text-violet-600 font-bold hover:underline decoration-2 underline-offset-4"
                                            >
                                                Create your first project
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Authentication Required</h3>
                                            <p className="text-slate-500 mb-8 max-w-sm">Please configure your API settings to continue.</p>
                                            <button
                                                onClick={() => setIsSettingsOpen(true)}
                                                className="text-violet-600 font-bold hover:underline decoration-2 underline-offset-4"
                                            >
                                                Open Settings
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                                {projects.map((project, index) => (
                                    <div
                                        key={project.id}
                                        className="group animate-in fade-in slide-in-from-bottom-16 duration-700 fill-mode-backwards"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <ProjectCard project={project} onProjectClick={onProjectClick} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={onCreateProject}
            />
        </div>
    );
};
