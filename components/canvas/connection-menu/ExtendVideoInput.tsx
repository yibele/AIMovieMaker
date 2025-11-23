import React, { useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

type ExtendVideoInputProps = {
    prompt: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onPromptChange: (value: string) => void;
    onConfirm: () => void;
    onBack: () => void;
};

export default function ExtendVideoInput({
    prompt,
    inputRef,
    onPromptChange,
    onConfirm,
    onBack,
}: ExtendVideoInputProps) {
    useEffect(() => {
        // 自动聚焦到输入框
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [inputRef]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (prompt.trim()) {
                onConfirm();
            }
        } else if (e.key === 'Escape') {
            onBack();
        }
    };

    return (
        <div className="w-80">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={14} className="text-gray-500" />
                </button>
                <span className="font-medium text-sm text-gray-900">延长视频</span>
            </div>

            <div className="p-4">
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-gray-700">延长内容描述</span>
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="描述视频接下来的内容..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        按 Enter 确认，Esc 返回
                    </p>
                </div>

                <button
                    onClick={onConfirm}
                    disabled={!prompt.trim()}
                    className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                    开始延长
                </button>
            </div>
        </div>
    );
}
