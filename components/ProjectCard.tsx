import React from 'react';
import { Folder, MoreHorizontal, Clock } from 'lucide-react';
import { Project } from '../types/morpheus';

interface ProjectCardProps {
    project: Project;
    onProjectClick?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onProjectClick }) => {
    const [imageError, setImageError] = React.useState(false);

    const formatDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        }).format(d);
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const handleCardClick = () => {
        if (onProjectClick) {
            onProjectClick(project.id);
        }
    };

    const handleMoreClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        // 未来可以在这里添加更多选项菜单
    };

    return (
        <div
            className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-[300px]"
            onClick={handleCardClick}
        >
            {/* Image Area */}
            <div className="h-48 overflow-hidden bg-slate-50 relative">
                {project.imageUrl && !imageError ? (
                    <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        {imageError ? (
                            <div className="text-center">
                                <div className="text-red-400 text-xs mb-2">Failed to load</div>
                                <Folder className="w-12 h-12 mx-auto" />
                            </div>
                        ) : (
                            <Folder className="w-12 h-12" />
                        )}
                    </div>
                )}

                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content Area */}
            <div className="flex-1 p-5 flex flex-col justify-between bg-white">
                <div>
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-slate-900 line-clamp-1 group-hover:text-violet-600 transition-colors">
                            {project.title}
                        </h3>
                        <button
                            onClick={handleMoreClick}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {project.description}
                    </p>
                </div>

                <div className="flex items-center text-[10px] font-medium text-slate-400 uppercase tracking-wide mt-4">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDate(project.createdAt)}
                </div>
            </div>
        </div>
    );
};
