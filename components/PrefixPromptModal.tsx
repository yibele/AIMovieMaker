'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

export default function PrefixPromptModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const prefixPrompt = useCanvasStore((state) => state.currentPrefixPrompt);
  const setPrefixPrompt = useCanvasStore((state) => state.setPrefixPrompt);
  const [tempPrompt, setTempPrompt] = useState(prefixPrompt || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isOpen]);

  const handleSave = () => {
    setPrefixPrompt(tempPrompt.trim());
    onClose();
  };

  const handleClear = () => {
    setTempPrompt('');
    setPrefixPrompt('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 w-[500px] max-w-[90vw] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100/80 backdrop-blur-sm border border-gray-200/50 text-gray-700 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">前置提示词</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/70 rounded-lg transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 说明 */}
        <div className="px-6 pt-4">
          <div className="rounded-xl bg-blue-50/70 backdrop-blur-sm border border-blue-100/70 p-4">
            <p className="text-sm text-blue-900 leading-relaxed">
              设置前置提示词后，它将自动添加到每个图片生成请求的前面，帮助保持风格的统一性。
              <br />
              <span className="text-blue-700 font-medium">例如：</span>
              <span className="text-blue-600 font-mono"> "anime style, high quality, detailed"</span>
            </p>
          </div>
        </div>

        {/* 输入框 */}
        <div className="px-6 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            前置提示词
          </label>
          <textarea
            ref={textareaRef}
            value={tempPrompt}
            onChange={(e) => setTempPrompt(e.target.value)}
            placeholder="输入风格提示词，例如：cinematic lighting, ultra detailed, 8k..."
            className="w-full h-32 p-3 border border-gray-200/50 bg-white/80 backdrop-blur-sm rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all"
          />
        </div>

        {/* 当前状态 */}
        {prefixPrompt && (
          <div className="px-6 pt-2">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50/70 backdrop-blur-sm px-3 py-2 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              已设置前置提示词
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/50 mt-4 bg-gray-50/30 backdrop-blur-sm">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100/70 rounded-lg transition-colors backdrop-blur-sm"
          >
            清除
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100/70 rounded-lg transition-colors backdrop-blur-sm"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/80 rounded-lg transition-all shadow-sm hover:shadow-md border border-gray-200/50"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}