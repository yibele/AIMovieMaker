'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Quote, Wand2 } from 'lucide-react';
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
    if (isOpen) {
      setTempPrompt(prefixPrompt || '');
      // 稍微延迟聚焦，等待动画
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, prefixPrompt]);

  const handleSave = () => {
    setPrefixPrompt(tempPrompt.trim());
    onClose();
  };

  const handleClear = () => {
    setTempPrompt('');
    setPrefixPrompt('');
    onClose();
  };

  // 预设风格 (可选功能，丰富 UI)
  const presetStyles = [
    "cinematic lighting, 8k, highly detailed",
    "anime style, studio ghibli, vibrant colors",
    "photorealistic, 35mm film photography, grainy"
  ];

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center 
        transition-all duration-500 ease-out
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-200'}
      `}
    >
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      {/* 内容卡片 */}
      <div 
        className={`
          relative w-[520px] max-w-[90vw] bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] 
          border border-white/60 overflow-hidden flex flex-col
          transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
          ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-8 opacity-0'}
        `}
      >
        {/* 装饰背景 */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />
        
        {/* 头部 */}
        <div className="relative flex items-center justify-between px-8 pt-8 pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">前置提示词</h2>
              <p className="text-xs font-medium text-gray-500 mt-0.5">设定统一的风格基调</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 主体内容 */}
        <div className="px-8 pb-8 flex-1 flex flex-col gap-6">
          
          {/* 说明卡片 */}
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/60 text-sm text-blue-900/80 leading-relaxed">
            <Quote className="absolute top-3 left-3 w-4 h-4 text-blue-200/80 rotate-180" />
            <div className="pl-5">
              前置提示词会自动拼接到所有生成请求的开头。适合用来固定画风、光影或质量词。
            </div>
          </div>

          {/* 输入区域 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Prompt Content
              </label>
              {tempPrompt && (
                <span className="text-xs text-purple-600 font-medium animate-in fade-in">
                  {tempPrompt.length} chars
                </span>
              )}
            </div>
            
            <div className="relative group">
              <textarea
                ref={textareaRef}
                value={tempPrompt}
                onChange={(e) => setTempPrompt(e.target.value)}
                placeholder="输入风格提示词..."
                className="w-full h-40 p-5 text-base leading-relaxed bg-gray-50/50 border-2 border-transparent hover:bg-white focus:bg-white rounded-2xl resize-none outline-none ring-1 ring-gray-200/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-gray-400 text-gray-800 shadow-inner focus:shadow-none"
              />
              <div className="absolute inset-0 rounded-2xl pointer-events-none border border-gray-200 group-hover:border-gray-300 peer-focus:border-purple-500/50 transition-colors" />
            </div>

            {/* 快捷标签 */}
            <div className="flex flex-wrap gap-2 pt-1">
              {presetStyles.map((style, i) => (
                <button
                  key={i}
                  onClick={() => setTempPrompt(prev => (prev ? `${prev}, ${style}` : style))}
                  className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 text-xs text-gray-600 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  <Wand2 className="w-3 h-3 opacity-50" />
                  {style.split(',')[0]}...
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 底部栏 */}
        <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between backdrop-blur-sm">
          <button
            onClick={handleClear}
            disabled={!tempPrompt}
            className={`
              px-4 py-2 text-sm font-medium rounded-xl transition-all
              ${!tempPrompt 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}
            `}
          >
            清除内容
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              保存设置
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

