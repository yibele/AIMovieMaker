import React, { useState, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { Project } from '../types/morpheus';
import { Settings, Plus, Search, Bell, LogOut, RefreshCw, LayoutGrid, User, Sparkles } from 'lucide-react';
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

    useEffect(() => {
        const getUserProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.avatar_url) {
                setAvatarUrl(user.user_metadata.avatar_url);
            }
        };
        getUserProfile();

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans pb-24 transition-all duration-500 selection:bg-violet-100 selection:text-violet-900">
            {/* Background Elements - 极简光效 */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full bg-gradient-to-b from-violet-100/40 to-transparent blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[30rem] h-[30rem] rounded-full bg-gradient-to-t from-blue-50/40 to-transparent blur-[80px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Top Navigation - 悬浮极简导航 */}
            <header className={`
                fixed top-0 left-0 right-0 z-50 px-8 py-5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${scrolled ? 'bg-white/70 backdrop-blur-xl shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]' : 'bg-transparent'}
            `}>
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        {/* Logo */}
                        <div className="flex items-center gap-3 group cursor-pointer select-none">
                            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20 group-hover:rotate-12 group-hover:scale-105 transition-all duration-300 ease-out">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">Morpheus</span>
                        </div>
                        
                        {/* Nav Links - 极简风格 */}
                        <nav className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-full border border-slate-200/50 shadow-sm">
                            <button className="px-5 py-1.5 text-sm font-semibold text-slate-900 bg-white rounded-full shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all">Flows</button>
                            <button className="px-5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-all hover:bg-white/50 rounded-full">Assets</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-5">
                        {/* Search - 极简线条风格 */}
                        <div className="hidden md:flex items-center w-64 group relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-0 transition-colors group-focus-within:text-slate-900" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="w-full bg-transparent border-b border-slate-200 py-2 pl-7 pr-2 text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-300 text-slate-700" 
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 pl-4 border-l border-slate-200/60">
                            <button className="relative p-2 text-slate-400 hover:text-slate-900 transition-colors group">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-[#f8f9fa] scale-0 group-hover:scale-100 transition-transform duration-300"></span>
                            </button>

                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white shadow-sm transition-transform group-hover:scale-105">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={onLogout} 
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors" 
                                    title="Logout"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-[1400px] mx-auto px-8 pt-36">

                {/* Hero Section - 更加极简大气 */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
                    <div className="space-y-1 relative">
                        <h2 className="text-[3.5rem] font-bold text-slate-900 tracking-tight leading-tight">
                            Workspace
                        </h2>
                        <div className="h-1.5 w-12 bg-slate-900 rounded-full mt-2"></div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-sm border border-slate-100">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                                title="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                            <div className="w-px h-4 bg-slate-200"></div>
                            <button
                                onClick={onRefreshProjects}
                                disabled={isLoading}
                                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="group flex items-center gap-3 bg-slate-900 text-white pl-5 pr-6 py-3.5 rounded-2xl hover:bg-black hover:scale-105 hover:shadow-xl hover:shadow-slate-900/20 active:scale-95 transition-all duration-300 ease-out"
                        >
                            <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                                <Plus className="w-4 h-4" />
                            </div>
                            <span className="font-semibold tracking-wide">New Project</span>
                        </button>
                    </div>
                </div>

                {/* Projects Grid - 优化间距和卡片展示 */}
                {projects.length === 0 ? (
                    <div className="relative overflow-hidden text-center py-40 bg-white/40 backdrop-blur-md border border-dashed border-slate-200 rounded-[2.5rem] animate-in zoom-in-95 duration-700 ease-out group hover:border-slate-300 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/30 to-white/60 pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center">
                            {authStatus === 'valid' ? (
                                <>
                                    <div className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
                                        <LayoutGrid className="w-10 h-10 text-slate-900" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Start Creating</h3>
                                    <p className="text-slate-500 mb-10 max-w-sm mx-auto leading-relaxed">Ready to bring your ideas to life? Create your first project now.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="inline-flex items-center gap-2 text-slate-900 bg-white px-8 py-3.5 rounded-2xl font-semibold shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Project
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-24 h-24 bg-orange-50 rounded-[2rem] flex items-center justify-center mb-8 border-2 border-orange-100 animate-pulse">
                                        <Settings className="w-10 h-10 text-orange-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                                        {authStatus === 'missing' ? 'Configuration Needed' : 'Session Expired'}
                                    </h3>
                                    <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">
                                        {authStatus === 'missing'
                                            ? 'Please configure your API settings to start creating.'
                                            : 'Your session has expired. Please update your credentials.'}
                                    </p>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="bg-slate-900 text-white px-10 py-3.5 rounded-2xl font-semibold shadow-xl shadow-slate-900/10 hover:bg-black hover:-translate-y-1 transition-all duration-300"
                                    >
                                        Open Settings
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-24">
                        {projects.map((project, index) => (
                            <div
                                key={project.id}
                                className="group animate-in fade-in slide-in-from-bottom-12 duration-700 fill-mode-backwards"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <ProjectCard project={project} onProjectClick={onProjectClick} />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={onCreateProject}
            />
        </div>
    );
};
