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
        <div className="min-h-screen bg-gray-50/50 text-slate-900 font-sans pb-24 transition-all duration-500">
            {/* Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute top-0 left-0 w-full h-full bg-dot-pattern opacity-[0.6]"></div>
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/20 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-200/20 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Top Navigation - Floating Glassmorphism */}
            <header className={`
                fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60' : 'bg-transparent'}
            `}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform duration-300">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Morpheus Studio</h1>
                        </div>
                        <nav className="hidden md:flex items-center bg-slate-100/80 p-1.5 rounded-xl backdrop-blur-sm border border-slate-200/50">
                            <button className="px-5 py-2 text-sm font-medium bg-white shadow-sm rounded-lg text-slate-900 transition-all hover:shadow-md">Flows</button>
                            <button className="px-5 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-all hover:bg-white/50 rounded-lg">Assets</button>
                        </nav>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl w-72 border border-slate-200 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100 transition-all shadow-sm hover:shadow-md group">
                            <Search className="w-4 h-4 text-slate-400 mr-3 group-focus-within:text-violet-500 transition-colors" />
                            <input type="text" placeholder="Search projects..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-700" />
                        </div>

                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                            <button className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all relative group">
                                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                            </button>

                            <div className="flex items-center gap-3 pl-2">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-0.5 cursor-pointer hover:scale-105 transition-transform shadow-md ring-2 ring-white ring-offset-2 ring-offset-transparent">
                                    <div className="h-full w-full rounded-full bg-white overflow-hidden">
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
                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:rotate-90" 
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 pt-32">

                {/* Hero Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
                            Your Workspace
                        </h2>
                        <p className="text-lg text-slate-500 font-medium">Manage your creative flows and generated assets.</p>
                    </div>

                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-3 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl transition-all hover:shadow-md active:scale-95"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onRefreshProjects}
                            disabled={isLoading}
                            className="p-3 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh Projects"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-violet-600 shadow-lg shadow-slate-900/20 hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 group"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                            <span className="font-semibold">New Project</span>
                        </button>
                    </div>
                </div>

                {/* Projects Grid with Staggered Animation */}
                {projects.length === 0 ? (
                    <div className="relative overflow-hidden text-center py-32 bg-white/40 backdrop-blur-sm border border-dashed border-slate-300 rounded-[2rem] animate-in zoom-in-95 duration-500">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50 pointer-events-none" />
                        <div className="relative z-10">
                            {authStatus === 'valid' ? (
                                <>
                                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl shadow-slate-200/50 flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                                        <LayoutGrid className="w-10 h-10 text-violet-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No projects yet</h3>
                                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">Your creative journey starts here. Create your first project to begin generating amazing content.</p>
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="inline-flex items-center gap-2 text-white bg-violet-600 px-8 py-3 rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:bg-violet-700 hover:-translate-y-0.5 transition-all duration-300"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Create Project
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-100 animate-pulse">
                                        <Settings className="w-10 h-10 text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                                        {authStatus === 'missing' ? 'API Configuration Required' : 'Session Expired'}
                                    </h3>
                                    <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                                        {authStatus === 'missing'
                                            ? 'To start creating videos, you need to configure your Flow API Cookie and Token in settings.'
                                            : 'Your authorization has expired. Please update your API Cookie and Token to continue.'}
                                    </p>
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-300"
                                    >
                                        Configure API
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
                        {projects.map((project, index) => (
                            <div
                                key={project.id}
                                className="group animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards"
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
