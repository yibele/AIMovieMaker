import React, { useState } from 'react';
import { X, Loader2, Wand2, ImageIcon } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center space-x-2 text-violet-600">
                        <Wand2 className="w-5 h-5" />
                        <h2 className="text-lg font-semibold text-slate-900">Create New Project</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            What do you want to create?
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your vision... e.g., 'A futuristic city floating in clouds with neon lights'"
                            className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 resize-none outline-none text-slate-800 placeholder:text-slate-400 transition-all"
                            autoFocus
                        />
                        <p className="mt-2 text-xs text-slate-500 flex items-center">
                            <ImageIcon className="w-3 h-3 mr-1" />
                            AI will generate a cover image and title for you.
                        </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            disabled={isGenerating}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!prompt.trim() || isGenerating}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Dreaming...
                                </>
                            ) : (
                                'Generate Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
