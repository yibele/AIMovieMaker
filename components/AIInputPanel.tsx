'use client';

import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/lib/store';
import {
  Sparkles,
  Settings2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Layers,
  Zap,
  Type,
  Image as ImageIcon,
  Video,
  LayoutGrid,
} from 'lucide-react';

// 行级注释：AIInputPanel 现在只负责 UI 和用户输入，业务逻辑由外部处理
export default function AIInputPanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [isExpanded, setIsExpanded] = useState(false); // 控制设置面板展开
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  const onGenerateFromInput = useCanvasStore((state) => state.onGenerateFromInput);
  const onGenerateSmartStoryboard = useCanvasStore((state) => state.onGenerateSmartStoryboard);
  const prefixPromptEnabled = useCanvasStore((state) => state.prefixPromptEnabled);
  const setPrefixPromptEnabled = useCanvasStore((state) => state.setPrefixPromptEnabled);

  const generationCount = apiConfig.generationCount || 1;
  const imageModel = apiConfig.imageModel || 'nanobanana';
  const videoModel = apiConfig.videoModel || 'quality';

  // 行级注释：获取选中的图片用于显示缩略图
  const selectedImages = elements
    .filter((el) => selection.includes(el.id) && el.type === 'image')
    .map((el) => el as any);

  // 行级注释：根据选中状态动态调整提示文案
  const getPlaceholder = () => {
    if (selectedImages.length === 0) {
      return '描述你想生成的画面...';
    } else if (selectedImages.length === 1) {
      return '描述如何修改这张图片...';
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
      setIsExpanded(false); // 生成后收起面板
    }
  };

  // 行级注释：处理智能分镜生成（固定 2×2 网格）
  const handleSmartStoryboard = () => {
    if (!prompt.trim()) return;

    if (onGenerateSmartStoryboard) {
      onGenerateSmartStoryboard(prompt, aspectRatio, '2x2', panelRef.current);
      setPrompt(''); // 清空输入框
      setIsExpanded(false); // 生成后收起面板
    }
  };

  // 行级注释：按 Enter 提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // 自动聚焦输入框（当没有选中元素时，或者用户明确点击面板时）
  useEffect(() => {
    // 可以在这里添加逻辑，例如当面板首次加载时聚焦
  }, []);

  // 点击外部区域（如画布）时收起面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const showSelectedThumbnails = selectedImages.length > 0;

  // 行级注释：检查是否有正在处理的选中项
  const hasProcessingSelection = selectedImages.some(
    (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
  );

  return (
    <div
      ref={panelRef}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 transition-all duration-500 ease-in-out"
    >
      <div className={`
        bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]
        border border-white/60 dark:border-slate-700/60 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isExpanded || showSelectedThumbnails ? 'p-5' : 'p-3'}
        ring-1 ring-black/5 dark:ring-white/5
      `}>

        {/* 选中图片的缩略图区域 */}
        <div className={`
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden
          ${showSelectedThumbnails ? 'max-h-32 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}
        `}>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
            <div className="flex-shrink-0 flex items-center justify-center h-12 px-4 rounded-2xl bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-medium border border-violet-100 dark:border-violet-800 whitespace-nowrap shadow-sm">
              <ImageIcon size={16} className="mr-2" />
              选中 {selectedImages.length} 张参考图
            </div>

            {selectedImages.slice(0, 5).map((img: any) => {
              const hasSrc = Boolean(img.src && img.src.trim());
              const isProcessing =
                img.uploadState === 'syncing' || !img.mediaGenerationId || !hasSrc;
              return (
                <div
                  key={img.id}
                  className="relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md group transition-transform hover:scale-105"
                >
                  {isProcessing ? (
                    <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <img
                      src={img.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
              );
            })}
            {selectedImages.length > 5 && (
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold border-2 border-white shadow-md">
                +{selectedImages.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* 主要输入区域 */}
        <div className="flex items-center gap-3 relative">
          {/* 设置按钮 - 控制展开 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex-shrink-0
              ${isExpanded
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rotate-90 shadow-inner'
                : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:shadow-sm hover:scale-105'}
            `}
            title="生成设置"
          >
            <Settings2 size={22} />
          </button>

          {/* 输入框容器 */}
          <div className="flex-1 relative group">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsExpanded(true)}
              placeholder={getPlaceholder()}
              className="w-full pl-5 pr-14 py-3.5 bg-gray-50/80 dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 border border-transparent focus:border-violet-200/50 dark:focus:border-violet-500/30 rounded-2xl outline-none text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 transition-all duration-300 text-[15px] leading-relaxed shadow-inner focus:shadow-[0_4px_20px_-4px_rgba(139,92,246,0.1)]"
            />


          </div>

          {/* 智能分镜按钮 - 一键生成多视角分镜 */}
          <button
            onClick={handleSmartStoryboard}
            disabled={!prompt.trim()}
            title="智能分镜：一键生成多视角连续画面"
            className={`
              flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-sm whitespace-nowrap
              ${prompt.trim()
                ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'}
            `}
          >
            <LayoutGrid size={16} />
            <span>分镜</span>
          </button>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className={`
              flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 shadow-sm min-w-[100px]
              ${prompt.trim()
                ? 'bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'}
            `}
          >
            <Sparkles size={18} className={prompt.trim() ? 'animate-[spin_3s_linear_infinite]' : ''} />
            <span>生成</span>
          </button>
        </div>

        {/* 扩展设置区域 - 使用 grid 实现高度动画 */}
        <div className={`
          grid transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isExpanded ? 'grid-rows-[1fr] mt-5 pt-5 border-t border-gray-100 dark:border-slate-700 opacity-100' : 'grid-rows-[0fr] mt-0 pt-0 border-t-0 border-transparent opacity-0'}
        `}>
          <div className="overflow-hidden min-h-0">
            <div className="grid grid-cols-1 gap-5 pb-1 md:grid-cols-3">

              {/* 1. 比例和数量 */}
              <div className="space-y-3">
                {/* 比例选择 */}
                <div className="flex bg-gray-50/80 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-600 h-[62px] items-center">
                  {[
                    { id: '16:9', label: '横屏', icon: RectangleHorizontal },
                    { id: '9:16', label: '竖屏', icon: RectangleVertical },
                    { id: '1:1', label: '方形', icon: Square },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setAspectRatio(item.id as any)}
                      className={`
                        flex-1 h-full flex flex-col items-center justify-center gap-1 text-[10px] font-medium rounded-xl transition-all duration-200
                        ${aspectRatio === item.id
                          ? 'bg-white dark:bg-slate-600 text-violet-700 dark:text-violet-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100'
                          : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'}
                      `}
                    >
                      <item.icon size={16} strokeWidth={2.5} />
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* 数量选择 */}
                <div className="flex bg-gray-50/80 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-600 h-[62px] items-center">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setApiConfig({ generationCount: count })}
                      className={`
                        flex-1 h-full flex items-center justify-center text-sm font-bold rounded-xl transition-all duration-200
                        ${generationCount === count
                          ? 'bg-white dark:bg-slate-600 text-violet-700 dark:text-violet-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-110 z-10'
                          : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'}
                      `}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 模型设置 */}
              <div className="space-y-3">
                {/* 图片模型 */}
                <div className="flex bg-gray-50/80 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-600 h-[62px] items-center">
                  <button
                    onClick={() => setApiConfig({ imageModel: 'nanobanana' })}
                    className={`
                      flex-1 h-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all duration-200
                      ${imageModel === 'nanobanana'
                        ? 'bg-white dark:bg-slate-600 text-violet-700 dark:text-violet-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                        : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'}
                    `}
                  >
                    <div className={`w-2 h-2 rounded-full ${imageModel === 'nanobanana' ? 'bg-violet-500' : 'bg-gray-300 dark:bg-slate-500'}`} />
                    Banana
                  </button>
                  <button
                    onClick={() => setApiConfig({ imageModel: 'nanobananapro' })}
                    className={`
                      flex-1 h-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all duration-200 relative overflow-hidden
                      ${imageModel === 'nanobananapro'
                        ? 'bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/50 dark:to-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-400 shadow-sm ring-1 ring-fuchsia-200 dark:ring-fuchsia-700'
                        : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'}
                    `}
                  >
                    <div className={`w-2 h-2 rounded-full ${imageModel === 'nanobananapro' ? 'bg-fuchsia-500' : 'bg-gray-300 dark:bg-slate-500'}`} />
                    Pro
                  </button>
                </div>

                {/* 视频模型 - Pro 只能用 Fast，Ultra 可以选 Quality/Fast */}
                <div className="flex bg-gray-50/80 dark:bg-slate-700/50 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-600 h-[62px] items-center">
                  {apiConfig.accountTier === 'ultra' ? (
                    <>
                      <button
                        onClick={() => !apiConfig.isManaged && setApiConfig({ videoModel: 'quality' })}
                        disabled={apiConfig.isManaged}
                        title={apiConfig.isManaged ? "托管模式下仅支持快速模型" : "高质量生成"}
                        className={`
                          flex-1 h-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all duration-200
                          ${videoModel === 'quality'
                            ? 'bg-white dark:bg-slate-600 text-violet-700 dark:text-violet-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                            : apiConfig.isManaged 
                              ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed opacity-50 bg-transparent' 
                              : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'}
                        `}
                      >
                        <div className={`w-2 h-2 rounded-full ${videoModel === 'quality' ? 'bg-violet-500' : 'bg-gray-300 dark:bg-slate-500'}`} />
                        Quality
                      </button>
                      <button
                        onClick={() => setApiConfig({ videoModel: 'fast' })}
                        className={`
                          flex-1 h-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all duration-200
                          ${videoModel === 'fast'
                            ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                            : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'}
                        `}
                      >
                        <div className={`w-2 h-2 rounded-full ${videoModel === 'fast' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-slate-500'}`} />
                        Fast
                      </button>
                    </>
                  ) : (
                    // Pro 账户只显示 Fast 按钮（始终选中状态）
                    <button
                      className="flex-1 h-full flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all duration-200 bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      Fast 视频
                    </button>
                  )}
                </div>
              </div>

              {/* 3. 风格 */}
              <div className="h-full">
                <button
                  onClick={() => setPrefixPromptEnabled(!prefixPromptEnabled)}
                  className={`
                    w-full h-full min-h-[136px] flex flex-col items-center justify-center gap-2 p-2 rounded-2xl text-xs font-medium transition-all duration-300 border
                    ${prefixPromptEnabled
                      ? 'bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-400 shadow-sm'
                      : 'bg-gray-50/50 dark:bg-slate-700/30 border-dashed border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-500 dark:hover:text-slate-400'}
                  `}
                >
                  <Sparkles size={24} className={`transition-all duration-500 ${prefixPromptEnabled ? "text-violet-500 fill-violet-200 scale-110" : "text-gray-300 dark:text-slate-500 scale-100"}`} />
                  {prefixPromptEnabled ? '风格增强' : '风格增强'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
