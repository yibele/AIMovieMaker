'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ExternalLink, Copy, Check, Loader2, Lightbulb } from 'lucide-react';

// 数据源配置（通过 Cloudflare Worker 代理避免 CORS 问题）
const DATA_SOURCE_URL = 'https://weathered-bonus-49d7.vienlinh.workers.dev';
const IMAGE_BASE_URL = 'https://opennana.com/awesome-prompt-gallery/';

// 简单的图片组件 - 带骨架屏
function PromptImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* 骨架屏占位 - 加载完成后隐藏 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-600 dark:to-slate-700 animate-pulse" />
      )}
      {/* 图片 - 使用原生 loading="lazy" */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`${className} transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// 原始数据类型（来自 JSON）
interface RawPromptItem {
  id: number;
  slug: string;
  title: string;
  source: { name: string; url: string } | null;
  images: string[];
  prompts: string[];
  tags: string[];
  coverImage: string;
}

// 处理后的提示词数据类型
interface ProcessedPrompt {
  id: string;
  title: string;
  prompt: string;
  image: string;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  hasRealPrompt: boolean;
}

interface AiwindPromptsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiwindPromptsPanel({ isOpen, onClose }: AiwindPromptsPanelProps) {
  // 状态管理
  const [allPrompts, setAllPrompts] = useState<ProcessedPrompt[]>([]);
  const [displayedPrompts, setDisplayedPrompts] = useState<ProcessedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<ProcessedPrompt | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const PAGE_SIZE = 20;
  
  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // 防止重复请求的标记
  const hasFetchedRef = useRef(false);

  // 从原始数据提取提示词文本（确保返回字符串）
  const extractPromptText = (prompts: string[]): { text: string; hasReal: boolean } => {
    if (!prompts || prompts.length === 0) {
      return { text: '', hasReal: false };
    }
    
    // 第一个元素通常是英文提示词
    const firstPrompt = prompts[0];
    
    // 尝试解析 JSON 格式的提示词
    if (firstPrompt && firstPrompt.startsWith('{')) {
      try {
        const parsed = JSON.parse(firstPrompt);
        if (parsed.prompt) {
          // 确保 prompt 是字符串，如果是对象则转为 JSON 字符串
          const promptValue = typeof parsed.prompt === 'string' 
            ? parsed.prompt 
            : JSON.stringify(parsed.prompt, null, 2);
          return { text: promptValue, hasReal: true };
        }
        // 如果没有 prompt 字段，将整个对象转为格式化字符串
        return { text: JSON.stringify(parsed, null, 2), hasReal: true };
      } catch {
        // 不是有效 JSON，直接使用原文
      }
    }
    
    // 直接使用第一个提示词（确保是字符串）
    if (firstPrompt && typeof firstPrompt === 'string' && firstPrompt.length > 10) {
      return { text: firstPrompt, hasReal: true };
    }
    
    return { text: '', hasReal: false };
  };

  // 处理原始数据
  const processRawData = (items: RawPromptItem[]): ProcessedPrompt[] => {
    return items.map(item => {
      const { text, hasReal } = extractPromptText(item.prompts);
      
      return {
        id: `prompt-${item.id}`,
        title: item.title,
        prompt: hasReal ? text : item.title,
        image: item.coverImage ? `${IMAGE_BASE_URL}${item.coverImage}` : '',
        tags: item.tags || [],
        source: item.source?.name,
        sourceUrl: item.source?.url,
        hasRealPrompt: hasReal,
      };
    });
  };

  // 初始加载（只执行一次）
  useEffect(() => {
    if (!isOpen || hasFetchedRef.current) return;
    
    const fetchData = async () => {
      hasFetchedRef.current = true;
      setIsLoading(true);
      
      try {
        const response = await fetch(DATA_SOURCE_URL);
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          const processed = processRawData(data.items);
          setAllPrompts(processed);
          setDisplayedPrompts(processed.slice(0, PAGE_SIZE));
          setHasMore(processed.length > PAGE_SIZE);
          setPage(1);
        }
      } catch {
        // 静默处理错误
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen]);

  // 搜索过滤
  useEffect(() => {
    if (allPrompts.length === 0) return;
    
    const timer = setTimeout(() => {
      let filtered = allPrompts;
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = allPrompts.filter(p => 
          p.title.toLowerCase().includes(query) ||
          p.prompt.toLowerCase().includes(query) ||
          p.tags.some(t => t.toLowerCase().includes(query))
        );
      }
      
      setDisplayedPrompts(filtered.slice(0, PAGE_SIZE));
      setHasMore(filtered.length > PAGE_SIZE);
      setPage(1);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, allPrompts]);

  // 加载更多（使用 ref 获取最新值，避免依赖问题）
  const allPromptsRef = useRef(allPrompts);
  const searchQueryRef = useRef(searchQuery);
  const pageRef = useRef(page);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  
  // 同步 ref
  useEffect(() => { allPromptsRef.current = allPrompts; }, [allPrompts]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);
  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  const loadMore = useCallback(() => {
    if (isLoadingRef.current || !hasMoreRef.current) return;
    
    const query = searchQueryRef.current.toLowerCase();
    let filtered = allPromptsRef.current;
    
    if (query.trim()) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.prompt.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    const nextPage = pageRef.current + 1;
    const endIndex = nextPage * PAGE_SIZE;
    
    setDisplayedPrompts(filtered.slice(0, endIndex));
    setHasMore(endIndex < filtered.length);
    setPage(nextPage);
  }, []);

  // 无限滚动监听
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
          loadMore();
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
  }, [hasMore, loadMore]);

  // 复制提示词
  const handleCopy = async (prompt: ProcessedPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // 静默处理错误
    }
  };

  // 使用提示词 - 直接复制到剪贴板
  const handleUsePrompt = async (prompt: ProcessedPrompt) => {
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
            {displayedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => setSelectedPrompt(prompt)}
                className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden cursor-pointer hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-700 transition-all duration-300"
              >
                {/* 图片 */}
                <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <PromptImage
                    src={prompt.image}
                    alt={prompt.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
            {!hasMore && displayedPrompts.length > 0 && (
              <span className="text-sm text-gray-400">已加载全部 {displayedPrompts.length} 条</span>
            )}
          </div>

          {/* 空状态 */}
          {!isLoading && displayedPrompts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Lightbulb size={48} className="mb-3 opacity-20" />
              <p className="text-sm">暂无提示词</p>
            </div>
          )}
        </div>
      </div>

      {/* 详情弹窗 - 左图右文布局 */}
      {selectedPrompt && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8"
          onClick={() => setSelectedPrompt(null)}
        >
          <div 
            className="w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 左侧 - 图片 */}
            <div className="md:w-1/2 flex-shrink-0 bg-gray-100 dark:bg-slate-800">
              <img
                src={selectedPrompt.image}
                alt={selectedPrompt.title}
                className="w-full h-64 md:h-full object-cover"
              />
            </div>
            
            {/* 右侧 - 内容 */}
            <div className="md:w-1/2 flex flex-col max-h-[60vh] md:max-h-[90vh]">
              {/* 头部 - 标题和关闭按钮 */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {selectedPrompt.title}
                  </h2>
                  {selectedPrompt.source && (
                    <p className="text-sm text-gray-500 dark:text-slate-400">
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
                </div>
                <button
                  onClick={() => setSelectedPrompt(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* 内容区域 - 可滚动 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* 提示词 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                      Prompt
                    </span>
                    <button
                      onClick={() => handleCopy(selectedPrompt)}
                      className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {copiedId === selectedPrompt.id ? (
                        <>
                          <Check size={12} className="text-green-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedPrompt.prompt}
                  </p>
                </div>

                {/* 标签 */}
                {selectedPrompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedPrompt.tags.map((tag, i) => (
                      <span 
                        key={i}
                        className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-full border border-gray-200 dark:border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 底部操作 */}
              <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  onClick={() => handleUsePrompt(selectedPrompt)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {copiedId === selectedPrompt.id ? (
                    <>
                      <Check size={18} />
                      <span>已复制到剪贴板</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
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
