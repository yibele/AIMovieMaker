'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  LayoutGrid, 
  Globe,
  User,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { supabase, getCachedUser } from '@/lib/supabaseClient';

// 类型定义
export interface PromptItem {
  id: string;
  title: string;
  content: string;
  coverImage: string; 
  category?: string;
  createdAt?: number;
}

interface PromptLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptLibraryPanel({ isOpen, onClose }: PromptLibraryPanelProps) {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [systemPrompts, setSystemPrompts] = useState<PromptItem[]>([]);
  const [userPrompts, setUserPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 编辑/新建状态
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  // 全局 Store
  const setPrefixPrompt = useCanvasStore((state) => state.setPrefixPrompt);
  const currentPrefixPrompt = useCanvasStore((state) => state.currentPrefixPrompt);

  // 重置状态当 Panel 关闭时
  useEffect(() => {
    if (!isOpen) {
      setIsEditorOpen(false);
      setEditingPrompt(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  // 初始化加载数据
  useEffect(() => {
    if (isOpen) {
      fetchSystemPrompts();
      fetchUserPrompts();
    }
  }, [isOpen]);

  const fetchSystemPrompts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('system_prompts')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (data) {
        const formattedData: PromptItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          coverImage: item.cover_image,
          category: item.category,
          createdAt: new Date(item.created_at).getTime()
        }));
        setSystemPrompts(formattedData);
      }
    } catch (error) {
      console.error('Error fetching system prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserPrompts = async () => {
    try {
      // 行级注释：使用缓存的用户信息，减少 API 请求
      const user = await getCachedUser();
      
      // 如果用户未登录，暂不获取用户提示词
      if (!user) return;

      const { data, error } = await supabase
        .from('user_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData: PromptItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          coverImage: item.cover_image || 'https://source.unsplash.com/random/500x300?abstract', // 默认图
          createdAt: new Date(item.created_at).getTime()
        }));
        setUserPrompts(formattedData);
      }
    } catch (error) {
      console.error('Error fetching user prompts:', error);
    }
  };

  // 过滤显示的提示词
  const displayedPrompts = useMemo(() => {
    const source = activeTab === 'system' ? systemPrompts : userPrompts;
    if (!searchQuery.trim()) return source;
    return source.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, systemPrompts, userPrompts, searchQuery]);

  // 动作处理
  const handleUsePrompt = (prompt: PromptItem) => {
    setPrefixPrompt(prompt.content);
  };

  const handleEditPrompt = (e: React.MouseEvent, prompt: PromptItem) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setEditorMode('edit');
    setIsEditorOpen(true);
  };

  const handleDeletePrompt = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('确定要删除这个提示词吗？')) return;

    try {
      const { error } = await supabase
        .from('user_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // 更新本地状态
      setUserPrompts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSavePrompt = async (prompt: PromptItem) => {
    try {
      // 行级注释：使用缓存的用户信息，减少 API 请求
      const user = await getCachedUser();
      if (!user) {
        alert('请先登录再保存提示词');
        return;
      }

      const promptData = {
        title: prompt.title,
        content: prompt.content,
        cover_image: prompt.coverImage,
        user_id: user.id
      };

      let result;
      
      if (editorMode === 'create') {
        // 创建
        result = await supabase
          .from('user_prompts')
          .insert(promptData)
          .select()
          .single();
      } else {
        // 更新
        result = await supabase
          .from('user_prompts')
          .update(promptData)
          .eq('id', prompt.id)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // 刷新用户列表
      fetchUserPrompts();
      setIsEditorOpen(false);
      setEditingPrompt(null);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('保存失败，请重试');
    }
  };

  // 强制切换为 Grid 视图
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSyncPrompts = async () => {
    setIsSyncing(true);
    await fetchSystemPrompts();
    // 添加一个小延迟让用户感知到刷新动作
    setTimeout(() => setIsSyncing(false), 500);
  };

  return (
    <>
      {/* 背景遮罩 (透明，无点击事件，允许操作 Canvas) */}
      {/* 如果需要点击外部关闭，可以加一个不可见的覆盖层，但这里根据需求移除遮罩 */}
      
      {/* 侧边面板 - 右侧滑出 */}
      <div 
        className={`
          fixed right-[80px] top-4 bottom-4 w-[440px] max-w-[90vw] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl z-[50]
          rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden
          transform transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          flex flex-col
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
        `}
      >
        
        {/* 头部区域 */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex flex-col gap-4 bg-white/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                  <Sparkles size={18} strokeWidth={2.5} />
               </div>
               <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">风格库</h2>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">Style Presets</p>
               </div>
            </div>
            <button
               onClick={onClose}
               className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all"
             >
               <X size={20} />
            </button>
          </div>

          {/* Tabs - 紧凑型 Segment Control */}
          <div className="flex bg-gray-100/80 dark:bg-slate-700/50 p-1 rounded-xl">
            {[
              { id: 'system', label: '系统推荐', icon: Globe },
              { id: 'user', label: '我的收藏', icon: User }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all duration-300
                  ${activeTab === tab.id
                    ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}
                `}
              >
                <tab.icon size={14} className={activeTab === tab.id ? 'text-violet-600 dark:text-violet-400' : ''} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 搜索栏 */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 group-focus-within:text-violet-600 dark:group-focus-within:text-violet-400 transition-colors" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索风格..."
              className="w-full pl-9 pr-10 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-300 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all shadow-sm"
            />
            
            {/* 右侧操作按钮：同步或新建 */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {activeTab === 'system' ? (
                <button 
                  onClick={handleSyncPrompts}
                  className={`p-1 hover:bg-violet-50 text-gray-400 hover:text-violet-600 rounded-lg transition-all group/sync ${isSyncing ? 'text-violet-600 bg-violet-50' : ''}`}
                  title="同步官方提示词"
                  disabled={isSyncing}
                >
                  <RefreshCw size={16} className={isSyncing ? "animate-spin" : "group-hover/sync:animate-spin"} />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setEditorMode('create');
                    setEditingPrompt(null);
                    setIsEditorOpen(true);
                  }}
                  className="p-1 hover:bg-violet-50 text-violet-600 rounded-lg transition-colors"
                  title="新建提示词"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 内容区域 - 滚动列表 */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {isLoading && systemPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">加载提示词...</p>
            </div>
          ) : displayedPrompts.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-500">
              {displayedPrompts.map((prompt) => {
                const isActive = currentPrefixPrompt === prompt.content;

                return (
                  <div 
                    key={prompt.id}
                    onClick={() => handleUsePrompt(prompt)}
                    className={`
                      group relative aspect-square bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden
                      ${isActive ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-100 hover:border-violet-200'}
                    `}
                  >
                    {/* 背景图片 */}
                    <div className="absolute inset-0 bg-gray-100">
                      {prompt.coverImage ? (
                        <img 
                          src={prompt.coverImage} 
                          alt={prompt.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <Sparkles className="text-gray-300" size={24} />
                        </div>
                      )}
                    </div>

                    {/* 悬浮遮罩和标题 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-all duration-300 flex flex-col justify-end p-2">
                       <div className="flex justify-between items-end w-full gap-1">
                         <span className="text-[11px] text-white font-semibold truncate leading-tight">{prompt.title}</span>
                         
                         {/* 操作按钮 (仅用户模式显示) */}
                         {activeTab === 'user' && (
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                             <button 
                               onClick={(e) => handleEditPrompt(e, prompt)}
                               className="p-1 bg-white/20 hover:bg-white/40 rounded text-white backdrop-blur-sm transition-colors"
                             >
                               <Edit2 size={10} />
                             </button>
                             <button 
                               onClick={(e) => handleDeletePrompt(e, prompt.id)}
                               className="p-1 bg-white/20 hover:bg-red-500/80 rounded text-white backdrop-blur-sm transition-colors"
                             >
                               <Trash2 size={10} />
                             </button>
                           </div>
                         )}
                       </div>
                    </div>

                    {/* 激活标记 */}
                    {isActive && (
                      <div className="absolute top-2 right-2 bg-violet-500 rounded-full p-0.5 shadow-sm z-10">
                         <Check size={10} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                 <Search size={24} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">没有找到提示词</p>
              {activeTab === 'user' && (
                <button
                  onClick={() => {
                     setEditorMode('create');
                     setEditingPrompt(null);
                     setIsEditorOpen(true);
                  }}
                  className="mt-2 text-violet-600 text-xs font-bold hover:underline"
                >
                  创建新提示词
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑器 Modal (全屏覆盖或居中弹窗，这里用居中弹窗覆盖在面板之上) */}
      {isEditorOpen && (
        <PromptEditor
          mode={editorMode}
          initialData={editingPrompt}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSavePrompt}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------
// 子组件：编辑器
// ----------------------------------------------------------------------

function PromptEditor({ 
  mode, 
  initialData, 
  onClose, 
  onSave 
}: { 
  mode: 'create' | 'edit', 
  initialData: PromptItem | null, 
  onClose: () => void, 
  onSave: (data: PromptItem) => void 
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || `https://source.unsplash.com/random/500x300?abstract&sig=${Date.now()}`);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    
    const newData: PromptItem = {
      id: initialData?.id || '', // ID 由后端生成或在更新时保留
      title,
      content,
      coverImage,
      createdAt: initialData?.createdAt || Date.now()
    };
    onSave(newData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out_forwards]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modal-spring">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-lg text-gray-900">{mode === 'create' ? '新建' : '编辑'}提示词</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">标题</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：我的赛博朋克风"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all font-medium text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">内容</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="输入具体的提示词内容..."
              className="w-full h-24 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none font-mono text-xs"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200/50 rounded-xl transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className="px-5 py-2 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-lg shadow-gray-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
