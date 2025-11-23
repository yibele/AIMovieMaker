import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';

interface VisionAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAnalyze: (prompt: string) => Promise<void>;
    isAnalyzing: boolean;
}

export function VisionAnalysisModal({ isOpen, onClose, onAnalyze, isAnalyzing }: VisionAnalysisModalProps) {
    const [prompt, setPrompt] = useState('描述这张图片');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        await onAnalyze(prompt);
        // onClose is handled by parent or after success
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <h3 className="font-medium text-gray-900">视觉识别分析</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isAnalyzing}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label htmlFor="vision-prompt" className="block text-sm font-medium text-gray-700 mb-1">
                            分析指令
                        </label>
                        <textarea
                            id="vision-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[100px] text-sm"
                            placeholder="请输入你想让 AI 分析的内容..."
                            disabled={isAnalyzing}
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isAnalyzing}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isAnalyzing || !prompt.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    分析中...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    开始分析
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
