'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings2 } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

// 行级注释：AIInputPanel 现在只负责 UI 和用户输入，业务逻辑由外部处理
export default function AIInputPanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  const onGenerateFromInput = useCanvasStore((state) => state.onGenerateFromInput);
  
  const generationCount = apiConfig.generationCount || 1;

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

  // 行级注释：点击外部关闭设置面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSettings &&
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const showSelectedThumbnails = selectedImages.length > 0;
  const hasProcessingSelection = selectedImages.some(
    (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
  );

  return (
    <div ref={panelRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      {/* 图片设置下拉面板 */}
      <div className="flex items-center justify-center gap-3 mb-2 relative">
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-white/30 hover:bg-white/40 backdrop-blur-md rounded-xl text-sm font-medium text-gray-700 transition-all shadow-sm border border-gray-200/50"
          >
            <Settings2 className="w-4 h-4" />
            图片设置
          </button>
          
          {showSettings && (
            <div className="absolute bottom-full left-0 mb-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-4 min-w-[280px]">
              {/* 比例选择器 */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">比例</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === '16:9'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    横图
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === '9:16'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    竖图
                  </button>
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === '1:1'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    方图
                  </button>
                </div>
              </div>
              
              {/* 生成数量选择器 */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">生成数量</div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setApiConfig({ generationCount: count })}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
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
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/30 p-4">
        {/* 选中图片的缩略图 */}
        {showSelectedThumbnails ? (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
            {selectedImages.slice(0, 5).map((img: any) => {
              const hasSrc = Boolean(img.src && img.src.trim());
              const isProcessing =
                img.uploadState === 'syncing' || !img.mediaGenerationId || !hasSrc;
              return (
                <div
                  key={img.id}
                  className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/60 shadow-[0_10px_25px_rgba(148,163,184,0.18)]"
                >
                  {isProcessing ? (
                    <div className="loading-glow w-full h-full rounded-lg" data-variant="compact" />
                  ) : (
                    <img
                      src={img.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })}
            {selectedImages.length > 5 && (
              <span className="text-sm text-gray-500">
                +{selectedImages.length - 5}
              </span>
            )}
          </div>
        ) : hasProcessingSelection ? (
          <div className="flex items-center justify-start gap-3 mb-3">
            <div className="loading-glow w-16 h-16 rounded-2xl" data-variant="compact" />
            <div className="loading-glow w-12 h-12 rounded-2xl opacity-85" data-variant="compact" />
            <div className="loading-glow w-10 h-10 rounded-xl opacity-65" data-variant="compact" />
          </div>
        ) : null}
        
        {/* 输入框 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="w-full px-4 py-3 border border-gray-300/30 rounded-2xl outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all bg-white/40 backdrop-blur-sm"
            />
          </div>
        </div>
        
        {/* 提示文字 */}
        <div className="mt-2 text-xs text-gray-400 text-center">
          {selectedImages.length === 0 && '输入描述生成图片'}
          {selectedImages.length === 1 && '输入描述编辑选中的图片'}
          {selectedImages.length > 1 && `基于选中的 ${selectedImages.length} 张图片生成新内容`}
        </div>
      </div>
    </div>
  );
}
