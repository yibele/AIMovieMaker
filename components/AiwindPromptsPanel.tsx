'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink, Copy, Check, Loader2, Lightbulb } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

// Aiwind 提示词数据类型
interface AiwindPrompt {
  id: string;
  title: string;
  prompt: string;
  image: string;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  hasRealPrompt?: boolean; // 是否有真正的英文提示词
}

interface AiwindPromptsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiwindPromptsPanel({ isOpen, onClose }: AiwindPromptsPanelProps) {
  // 状态管理
  const [prompts, setPrompts] = useState<AiwindPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<AiwindPrompt | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 全局 Store - 用于设置前缀提示词
  const setPrefixPrompt = useCanvasStore((state) => state.setPrefixPrompt);

  // 加载数据
  const fetchPrompts = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/aiwind/prompts?page=${pageNum}&search=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success) {
        if (reset) {
          setPrompts(data.prompts);
        } else {
          setPrompts(prev => [...prev, ...data.prompts]);
        }
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, searchQuery]);

  // 初始加载
  useEffect(() => {
    if (isOpen && prompts.length === 0) {
      fetchPrompts(1, true);
    }
  }, [isOpen]);

  // 搜索变化时重新加载
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchPrompts(1, true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // 无限滚动监听
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPrompts(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, page, fetchPrompts]);

  // 复制提示词
  const handleCopy = async (prompt: AiwindPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // 静默处理错误
    }
  };

  // 使用提示词 - 直接复制到剪贴板
  const handleUsePrompt = async (prompt: AiwindPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
      setSelectedPrompt(null);
    } catch (err) {
      // 静默处理错误
    }
  };

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setSelectedPrompt(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  return (
    <>
      {/* 侧边面板 */}
      <div 
        className={`
          fixed right-[80px] top-4 bottom-4 w-[480px] max-w-[90vw] 
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl z-[50]
          rounded-3xl border border-white/50 dark:border-slate-700/50 
          shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)]
          overflow-hidden flex flex-col
          transform transition-all duration-500 ease-out
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}
        `}
      >
        {/* 头部 */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Lightbulb size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">灵感库</h2>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <span>Powered by</span>
                  <a 
                    href="https://www.aiwind.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    aiwind.org
                  </a>
                  <ExternalLink size={10} />
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索提示词..."
              className="w-full px-4 py-2.5 pl-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 内容区域 */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-slate-800/30"
        >
          {/* 提示词网格 */}
          <div className="grid grid-cols-2 gap-3">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => setSelectedPrompt(prompt)}
                className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700 transition-all duration-300"
              >
                {/* 图片 */}
                <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img
                    src={prompt.image}
                    alt={prompt.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                
                {/* 信息 */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate mb-1">
                    {prompt.title}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {prompt.tags.slice(0, 3).map((tag, i) => (
                      <span 
                        key={i}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 悬浮操作 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUsePrompt(prompt);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {copiedId === prompt.id ? (
                      <>
                        <Check size={16} />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>复制提示词</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* 有真正提示词的标记 */}
                {prompt.hasRealPrompt && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                    PRO
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 加载更多触发器 */}
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">加载中...</span>
              </div>
            )}
            {!hasMore && prompts.length > 0 && (
              <span className="text-sm text-gray-400">已加载全部</span>
            )}
          </div>

          {/* 空状态 */}
          {!isLoading && prompts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Lightbulb size={48} className="mb-3 opacity-20" />
              <p className="text-sm">暂无提示词</p>
            </div>
          )}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedPrompt && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedPrompt(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图片 */}
            <div className="aspect-video bg-gray-100 dark:bg-slate-700 overflow-hidden">
              <img
                src={selectedPrompt.image.replace('w_500', 'w_1200')}
                alt={selectedPrompt.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* 内容 */}
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedPrompt.title}
              </h2>
              
              {selectedPrompt.source && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  来源：
                  {selectedPrompt.sourceUrl ? (
                    <a 
                      href={selectedPrompt.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:underline ml-1"
                    >
                      {selectedPrompt.source}
                    </a>
                  ) : (
                    <span className="ml-1">{selectedPrompt.source}</span>
                  )}
                </p>
              )}

              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPrompt.tags.map((tag, i) => (
                  <span 
                    key={i}
                    className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* 提示词 */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Prompt</span>
                  <button
                    onClick={() => handleCopy(selectedPrompt)}
                    className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    {copiedId === selectedPrompt.id ? (
                      <>
                        <Check size={12} />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-700 dark:text-slate-300 font-mono leading-relaxed">
                  {selectedPrompt.prompt}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedPrompt(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => handleUsePrompt(selectedPrompt)}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {copiedId === selectedPrompt.id ? (
                    <>
                      <Check size={16} />
                      <span>已复制到剪贴板</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>复制提示词</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

