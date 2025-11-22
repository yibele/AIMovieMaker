import React, { useState } from 'react';
import { X, Loader2, Wand2, ImageIcon, ArrowRight } from 'lucide-react';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (prompt: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        await onSubmit(prompt);
        setIsGenerating(false);
        setPrompt('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500">
            <div
                className="absolute inset-0 bg-white/60 backdrop-blur-xl transition-opacity duration-500"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100">
                <div className="p-8 pb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Start a new journey</h2>
                        <p className="text-slate-500 text-sm">What would you like to create today?</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-8 pb-8">
                    <div className="relative group mb-8">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your vision... e.g., 'A futuristic city floating in clouds with neon lights'"
                            className="w-full h-40 px-6 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-violet-500/20 outline-none text-lg text-slate-800 placeholder:text-slate-400 transition-all resize-none shadow-inner"
                            autoFocus
                        />
                        <div className="absolute bottom-4 right-4 pointer-events-none">
                            <Wand2 className={`w-5 h-5 text-violet-400 transition-opacity duration-300 ${prompt ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
                            <ImageIcon className="w-3.5 h-3.5 mr-2 text-violet-500" />
                            Auto-generated cover
                        </div>

                        <button
                            type="submit"
                            disabled={!prompt.trim() || isGenerating}
                            className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-2xl text-sm font-semibold text-white bg-slate-900 hover:bg-black active:scale-95 disabled:opacity-70 disabled:active:scale-100 transition-all duration-300 shadow-lg shadow-slate-900/20 overflow-hidden"
                        >
                            <span className={`flex items-center gap-2 transition-transform duration-300 ${isGenerating ? 'translate-y-12 opacity-0' : 'translate-y-0'}`}>
                                Create Project
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                            
                            <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ${isGenerating ? 'translate-y-0' : '-translate-y-12 opacity-0'}`}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Dreaming...</span>
                            </div>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
