import React, { useState } from 'react';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { Project } from '../types/morpheus';
import { Settings, Plus, Search, Bell, LogOut, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

interface DashboardViewProps {
    projects: Project[];
    onCreateProject: (prompt: string) => Promise<void>;
    onRefreshProjects: () => Promise<void>;
    onProjectClick?: (projectId: string) => void;
    isLoading?: boolean;
    onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ projects, onCreateProject, onRefreshProjects, onProjectClick, isLoading, onLogout }) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const setIsSettingsOpen = useCanvasStore((state) => state.setIsSettingsOpen);

    return (
        <div className="min-h-screen bg-dot-pattern text-slate-900 font-sans pb-24 animate-in fade-in duration-500">
            {/* Top Navigation */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Morpheus Studio</h1>
                        <nav className="hidden md:flex items-center space-x-1 bg-slate-100/50 p-1 rounded-lg">
                            <button className="px-4 py-1.5 text-sm font-medium bg-white shadow-sm rounded-md text-slate-900 transition-all">Flows</button>
                            <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-all">Assets</button>
                        </nav>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center bg-slate-100 px-3 py-2 rounded-full w-64 border border-transparent focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                            <Search className="w-4 h-4 text-slate-400 mr-2" />
                            <input type="text" placeholder="Search projects..." className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400" />
                        </div>

                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>

                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-0.5">
                            <div className="h-full w-full rounded-full bg-white p-0.5">
                                <img src="https://i.pravatar.cc/150?u=1" alt="User" className="rounded-full w-full h-full object-cover" />
                            </div>
                        </div>

                        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Logout">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 pt-12">

                {/* Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Your Workspace</h2>
                        <p className="text-slate-500">Manage your creative flows and generated assets.</p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-white transition-all"
                            title="Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onRefreshProjects}
                            disabled={isLoading}
                            className="p-2.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh Projects"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-violet-600 hover:shadow-lg hover:shadow-violet-500/30 active:scale-95 transition-all duration-300"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">New Project</span>
                        </button>
                    </div>
                </div>

                {/* Projects Grid with Waterfall Animation */}
                {projects.length === 0 ? (
                    <div className="text-center py-32 bg-white/50 border border-dashed border-slate-300 rounded-3xl animate-fade-in-up">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No projects yet</h3>
                        <p className="text-slate-500 mb-6">Start your first creative session.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="text-violet-600 font-medium hover:underline"
                        >
                            Create a project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {projects.map((project, index) => (
                            <div
                                key={project.id}
                                className="opacity-0 animate-fade-in-up"
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
