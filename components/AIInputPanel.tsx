'use client';

import { useState, useRef } from 'react';
import { useCanvasStore } from '@/lib/store';

// 行级注释：AIInputPanel 现在只负责 UI 和用户输入，业务逻辑由外部处理
export default function AIInputPanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const panelRef = useRef<HTMLDivElement>(null);
  
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  const onGenerateFromInput = useCanvasStore((state) => state.onGenerateFromInput);
  
  const generationCount = apiConfig.generationCount || 1;
  const imageModel = apiConfig.imageModel || 'nanobanana';

  // 行级注释：获取选中的图片用于显示缩略图
  const selectedImages = elements
    .filter((el) => selection.includes(el.id) && el.type === 'image')
    .map((el) => el as any);

  // 行级注释：根据选中状态动态调整提示文案
  const getPlaceholder = () => {
    if (selectedImages.length === 0) {
      return '你想改变什么？';
    } else if (selectedImages.length === 1) {
      return '编辑图片...';
    } else {
      return `基于 ${selectedImages.length} 张图片生成新内容...`;
    }
  };

  // 行级注释：处理生成，通过 store 的回调触发（逻辑在 Canvas 中）
  const handleGenerate = () => {
    if (!prompt.trim()) return;
    
    if (onGenerateFromInput) {
      onGenerateFromInput(prompt, aspectRatio, generationCount, panelRef.current);
      setPrompt(''); // 清空输入框
    }
  };

  // 行级注释：按 Enter 提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const showSelectedThumbnails = selectedImages.length > 0;
  const hasProcessingSelection = selectedImages.some(
    (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
  );

  return (
    <div ref={panelRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-6xl px-4">
      <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/30 p-4">
        {/* 输入框 */}
        <div className="relative mb-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="w-full px-4 py-3 border border-gray-300/30 rounded-2xl outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all bg-white/40 backdrop-blur-sm"
          />
          {/* 回车提示 - 浮在输入框上面 */}
          <kbd className="absolute top-1/2 -translate-y-1/2 right-3 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg shadow-sm z-10">
            Enter
          </kbd>
        </div>

        {/* 控件选项 - 横向一行 */}
        <div className="flex items-center gap-3">
          {/* 比例选择器 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/30 hover:bg-white/40 backdrop-blur-md rounded-xl text-sm font-medium text-gray-700 transition-all shadow-sm border border-gray-200/50">
            <span className="text-xs text-gray-500">比例</span>
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              横图
            </button>
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              竖图
            </button>
            <button
              onClick={() => setAspectRatio('1:1')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                aspectRatio === '1:1'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              方图
            </button>
          </div>

          {/* 生成数量选择器 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/30 hover:bg-white/40 backdrop-blur-md rounded-xl text-sm font-medium text-gray-700 transition-all shadow-sm border border-gray-200/50">
            <span className="text-xs text-gray-500">数量</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => setApiConfig({ generationCount: count })}
                  className={`w-7 h-6 rounded-lg text-xs font-medium transition-all ${
                    generationCount === count
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={`生成 ${count} 张`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* 模型选择器 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white/30 hover:bg-white/40 backdrop-blur-md rounded-xl text-sm font-medium text-gray-700 transition-all shadow-sm border border-gray-200/50">
            <span className="text-xs text-gray-500">模型</span>
            <button
              onClick={() => setApiConfig({ imageModel: 'nanobanana' })}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                imageModel === 'nanobanana'
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Banana (Preview)"
            >
              Banana
            </button>
            <button
              onClick={() => setApiConfig({ imageModel: 'nanobananapro' })}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all relative ${
                imageModel === 'nanobananapro'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="Banana Pro - 新模型 GEM_PIX_2"
            >
              Banana Pro
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
