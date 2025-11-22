import React, { useState, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { Project } from '../types/morpheus';
import { Settings, Plus, Search, Bell, LogOut, RefreshCw, LayoutGrid, User, Sparkles, Zap, Play } from 'lucide-react';
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
        <div className="min-h-screen bg-[#f2f3f5] text-slate-900 font-sans pb-24 transition-all duration-500 selection:bg-violet-200 selection:text-violet-900">
            {/* Background Elements - 更具流动感和深度的背景 */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                {/* 主光晕 - 更加柔和且多彩，添加 will-change-transform 优化性能 */}
                <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] rounded-full bg-gradient-to-br from-purple-100/60 via-blue-50/40 to-transparent blur-[120px] animate-pulse-slow opacity-70 will-change-transform"></div>
                <div className="absolute top-[10%] right-[-20%] w-[45rem] h-[45rem] rounded-full bg-gradient-to-bl from-indigo-100/50 via-violet-50/30 to-transparent blur-[100px] animate-pulse-slow will-change-transform" style={{ animationDelay: '3s' }}></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[60rem] h-[40rem] rounded-full bg-gradient-to-t from-white via-blue-50/20 to-transparent blur-[140px] will-change-transform"></div>
                
                {/* 网格纹理 - 增加科技感 */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            </div>

            {/* Top Navigation - 更加精致的毛玻璃 */}
            <header className={`
                fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-3 md:py-5 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${scrolled ? 'bg-white/60 backdrop-blur-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] border-b border-white/20' : 'bg-transparent'}
            `}>
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8 md:gap-14">
                        {/* Logo Area */}
                        <div className="flex items-center gap-3 group cursor-pointer select-none relative">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-xl"></div>
                                <div className="relative w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl flex items-center justify-center shadow-xl ring-1 ring-white/20 group-hover:rotate-[10deg] group-hover:scale-110 transition-all duration-500 ease-out">
                                    <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base md:text-lg font-bold tracking-tight text-slate-900 leading-none">Morpheus</span>
                                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-0.5 group-hover:text-violet-600 transition-colors">Studio</span>
                            </div>
                        </div>
                        
                        {/* Nav Links - 悬浮胶囊设计 */}
                        <nav className="hidden md:flex items-center bg-white/40 backdrop-blur-md p-1.5 rounded-full border border-white/40 shadow-sm ring-1 ring-black/5">
                            <button className="relative px-6 py-2 text-sm font-bold text-slate-900 rounded-full transition-all overflow-hidden group">
                                <span className="relative z-10">Projects</span>
                                <div className="absolute inset-0 bg-white shadow-sm rounded-full transition-transform duration-300 ease-out opacity-100"></div>
                            </button>
                            <button className="relative px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 rounded-full transition-all overflow-hidden group">
                                <span className="relative z-10">Assets</span>
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/50 rounded-full transition-colors duration-300"></div>
                            </button>
                            <button className="relative px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 rounded-full transition-all overflow-hidden group">
                                <span className="relative z-10">Community</span>
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/50 rounded-full transition-colors duration-300"></div>
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Search - 极简胶囊 */}
                        <div className="hidden lg:flex items-center w-80 group relative transition-all duration-300 focus-within:w-96">
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/40 shadow-sm group-focus-within:bg-white/80 group-focus-within:shadow-lg transition-all duration-300"></div>
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 relative z-10 transition-colors group-focus-within:text-violet-600" />
                            <input 
                                type="text" 
                                placeholder="Search your imagination..." 
                                className="w-full bg-transparent relative z-10 py-2.5 pl-10 pr-4 text-sm font-medium outline-none text-slate-700 placeholder:text-slate-500" 
                            />
                            <div className="absolute right-3 relative z-10 flex items-center gap-1 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">⌘K</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 md:gap-3 pl-4 md:pl-6 border-l border-slate-200/50">
                            <button className="relative p-2 md:p-3 text-slate-400 hover:text-slate-900 bg-white/0 hover:bg-white/60 rounded-2xl transition-all duration-300 group">
                                <Bell className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                                <span className="absolute top-2 md:top-3 right-2 md:right-3 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#f2f3f5] scale-0 group-hover:scale-100 transition-transform duration-300"></span>
                            </button>

                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-2xl p-[2px] bg-gradient-to-tr from-violet-500/20 to-indigo-500/20 cursor-pointer hover:from-violet-500 hover:to-indigo-500 transition-colors duration-300 group">
                                <div className="h-full w-full rounded-[12px] md:rounded-[14px] bg-white overflow-hidden relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="User" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                                            <User className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={onLogout} 
                                className="p-2 md:p-3 text-slate-400 hover:text-red-500 bg-white/0 hover:bg-red-50 rounded-2xl transition-all duration-300 group" 
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={`max-w-[1600px] mx-auto px-4 md:px-8 transition-all duration-700 ${projects.length > 0 ? 'pt-28 md:pt-32' : 'pt-32 md:pt-40'}`}>

                {/* Hero Section - 响应式 & 状态自适应 */}
                <div className={`relative animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-out transition-all duration-700 ${projects.length > 0 ? 'mb-12 md:mb-16' : 'mb-16 md:mb-24'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-10">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 rounded-full bg-violet-100/50 text-violet-700 text-[10px] md:text-[11px] font-bold tracking-widest uppercase border border-violet-200/50 backdrop-blur-sm">
                                    Workspace
                                </span>
                                <div className="h-px w-12 md:w-16 bg-gradient-to-r from-violet-200 to-transparent"></div>
                            </div>
                            <h2 className={`
                                font-black text-slate-900 tracking-tight leading-[0.95] md:leading-[0.9] mb-4 md:mb-6 drop-shadow-sm transition-all duration-700
                                ${projects.length > 0 
                                    ? 'text-4xl sm:text-5xl md:text-6xl' // Compact mode for existing users
                                    : 'text-5xl sm:text-6xl md:text-7xl lg:text-[5rem]' // Grand mode for new users
                                }
                            `}>
                                Create<br className="hidden md:block"/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 animate-gradient-x mr-2 md:mr-0">Something</span>
                                <br className="hidden md:block"/>
                                Extraordinary.
                            </h2>
                            <p className={`
                                text-slate-500 font-medium max-w-lg leading-relaxed transition-all duration-700
                                ${projects.length > 0 ? 'text-sm md:text-base' : 'text-base md:text-lg'}
                            `}>
                                Unleash your creativity with AI-powered tools. Build immersive stories, generate stunning visuals, and bring your ideas to life.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 md:gap-5 relative z-10 pb-2 md:pb-4">
                            <div className="flex items-center bg-white/50 backdrop-blur-xl p-1.5 md:p-2 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-3 md:p-4 text-slate-500 hover:text-slate-900 hover:bg-white rounded-2xl transition-all duration-300 hover:shadow-md active:scale-95 group"
                                    title="Settings"
                                >
                                    <Settings className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-500" />
                                </button>
                                <div className="w-px h-6 md:h-8 bg-slate-200/60 mx-1"></div>
                                <button
                                    onClick={onRefreshProjects}
                                    disabled={isLoading}
                                    className="p-3 md:p-4 text-slate-500 hover:text-slate-900 hover:bg-white rounded-2xl transition-all duration-300 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                </button>
                            </div>
                            
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="group relative flex-1 md:flex-none items-center justify-center gap-3 md:gap-4 bg-slate-900 text-white px-6 md:pl-8 md:pr-10 py-4 md:py-6 rounded-[2rem] hover:bg-black hover:scale-[1.02] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all duration-500 ease-out overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <div className="relative z-10 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-xl group-hover:bg-white group-hover:text-violet-600 transition-all duration-500">
                                    <Plus className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="relative z-10 flex flex-col items-start text-left">
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-80 mb-0.5">New Project</span>
                                    <span className="text-base md:text-lg font-bold tracking-wide leading-none">Start Creating</span>
                                </div>
                                <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-10 group-hover:-translate-x-4 transition-all duration-500 delay-100 hidden md:block">
                                    <Sparkles className="w-24 h-24 text-white rotate-12" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Projects Grid - 高级质感卡片 */}
                {projects.length === 0 ? (
                    <div className="relative overflow-hidden py-40 rounded-[3rem] group transition-all duration-700">
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[inset_0_0_100px_rgba(255,255,255,0.5)] rounded-[3rem] group-hover:shadow-[inset_0_0_100px_rgba(255,255,255,0.8),0_20px_40px_-10px_rgba(0,0,0,0.05)] transition-all duration-700"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
                            {authStatus === 'valid' ? (
                                <>
                                    <div className="relative w-32 h-32 mb-10 group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500 to-indigo-500 rounded-[2rem] rotate-6 opacity-20 blur-xl group-hover:rotate-12 transition-all duration-700"></div>
                                        <div className="absolute inset-0 bg-white rounded-[2rem] shadow-xl flex items-center justify-center border border-white/50">
                                            <Play className="w-12 h-12 text-slate-900 fill-slate-900 ml-1" />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Your Canvas is Empty</h3>
                                    <p className="text-lg text-slate-500 mb-12 max-w-md leading-relaxed font-medium">
                                        The best stories are yet to be told. Begin your journey by creating your first project.
                                    </p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="inline-flex items-center gap-3 text-white bg-slate-900 hover:bg-black px-10 py-4 rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Create New Project
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="relative w-32 h-32 mb-10 animate-pulse">
                                        <div className="absolute inset-0 bg-orange-500/20 rounded-[2rem] rotate-6 blur-xl"></div>
                                        <div className="absolute inset-0 bg-white rounded-[2rem] shadow-xl flex items-center justify-center border-2 border-orange-50">
                                            <Settings className="w-12 h-12 text-orange-500 animate-spin-slow" />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
                                        {authStatus === 'missing' ? 'Setup Required' : 'Session Expired'}
                                    </h3>
                                    <p className="text-lg text-slate-500 mb-12 max-w-md leading-relaxed font-medium">
                                        {authStatus === 'missing'
                                            ? 'Configure your API settings to unlock the full potential of Morpheus Studio.'
                                            : 'Your creative session has ended. Please refresh your credentials to continue.'}
                                    </p>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="inline-flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 px-10 py-4 rounded-2xl font-bold text-sm shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <Settings className="w-5 h-5" />
                                        Open Configuration
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
                                className="group animate-in fade-in slide-in-from-bottom-16 duration-1000 fill-mode-backwards"
                                style={{ animationDelay: `${index * 100}ms` }}
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
