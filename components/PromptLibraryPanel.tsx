'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

// 类型定义
export interface PromptItem {
  id: string;
  title: string;
  content: string;
  coverImage: string; 
  category?: string;
  createdAt?: number;
}

// 系统预设提示词数据 (Mock)
const SYSTEM_PROMPTS: PromptItem[] = [
  {
    id: 'sys-1',
    title: '电影质感',
    content: 'cinematic lighting, 8k, highly detailed, dramatic atmosphere, depth of field, movie still, color graded',
    coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80',
    category: '摄影'
  },
  {
    id: 'sys-2',
    title: '吉卜力风格',
    content: 'studio ghibli style, anime, vibrant colors, detailed background, whimsical, hand drawn, cel shaded',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80',
    category: '动漫'
  },
  {
    id: 'sys-3',
    title: '赛博朋克',
    content: 'cyberpunk, neon lights, futuristic city, high tech, night time, rain, reflections, sci-fi',
    coverImage: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=500&q=80',
    category: '科幻'
  },
  {
    id: 'sys-4',
    title: '极简主义',
    content: 'minimalist, clean lines, simple background, pastel colors, flat design, vector art, high contrast',
    coverImage: 'https://images.unsplash.com/photo-1507643179173-442727e34e3b?w=500&q=80',
    category: '设计'
  },
  {
    id: 'sys-5',
    title: '胶片摄影',
    content: '35mm film photography, kodak portra 400, grain, vintage look, light leaks, nostalgic, soft focus',
    coverImage: 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=500&q=80',
    category: '摄影'
  },
  {
    id: 'sys-6',
    title: '3D 渲染',
    content: '3d render, unreal engine 5, ray tracing, octane render, hyperrealistic, plastic texture, studio lighting',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80',
    category: '3D'
  }
];

// 初始用户数据 (Mock)
const INITIAL_USER_PROMPTS: PromptItem[] = [
  {
    id: 'usr-1',
    title: '我的专属风格',
    content: 'my custom style, purple and gold theme, luxury, elegant, sharp focus',
    coverImage: 'https://images.unsplash.com/photo-1558470598-a5dda9640f66?w=500&q=80',
    createdAt: Date.now()
  }
];

interface PromptLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptLibraryPanel({ isOpen, onClose }: PromptLibraryPanelProps) {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
  const [searchQuery, setSearchQuery] = useState('');
  const [userPrompts, setUserPrompts] = useState<PromptItem[]>(INITIAL_USER_PROMPTS);
  
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

  // 过滤显示的提示词
  const displayedPrompts = useMemo(() => {
    const source = activeTab === 'system' ? SYSTEM_PROMPTS : userPrompts;
    if (!searchQuery.trim()) return source;
    return source.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeTab, userPrompts, searchQuery]);

  // 动作处理
  const handleUsePrompt = (prompt: PromptItem) => {
    setPrefixPrompt(prompt.content);
    // 侧边栏模式下，应用后可以选择关闭或保持打开，这里保持打开方便尝试不同风格
    // onClose(); 
  };

  const handleEditPrompt = (e: React.MouseEvent, prompt: PromptItem) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setEditorMode('edit');
    setIsEditorOpen(true);
  };

  const handleDeletePrompt = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个提示词吗？')) {
      setUserPrompts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSavePrompt = (prompt: PromptItem) => {
    if (editorMode === 'create') {
      setUserPrompts(prev => [prompt, ...prev]);
    } else {
      setUserPrompts(prev => prev.map(p => p.id === prompt.id ? prompt : p));
    }
    setIsEditorOpen(false);
    setEditingPrompt(null);
  };

  return (
    <>
      {/* 背景遮罩 (透明，无点击事件，允许操作 Canvas) */}
      {/* 如果需要点击外部关闭，可以加一个不可见的覆盖层，但这里根据需求移除遮罩 */}
      
      {/* 侧边面板 - 右侧滑出 */}
      <div 
        className={`
          fixed right-[80px] top-4 bottom-4 w-[440px] max-w-[90vw] bg-white/90 backdrop-blur-2xl z-[50]
          rounded-3xl border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.05)]
          transform transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          flex flex-col
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
        `}
      >
        
        {/* 头部区域 */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 flex flex-col gap-4 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                  <Sparkles size={18} strokeWidth={2.5} />
               </div>
               <div>
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">提示词库</h2>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Style Presets</p>
               </div>
            </div>
            <button
               onClick={onClose}
               className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
             >
               <X size={20} />
            </button>
          </div>

          {/* Tabs - 紧凑型 Segment Control */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
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
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <tab.icon size={14} className={activeTab === tab.id ? 'text-violet-600' : ''} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 搜索栏 */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-600 transition-colors" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索风格..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10 transition-all shadow-sm"
            />
            {activeTab === 'user' && (
              <button 
                onClick={() => {
                  setEditorMode('create');
                  setEditingPrompt(null);
                  setIsEditorOpen(true);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-violet-50 text-violet-600 rounded-lg transition-colors"
                title="新建提示词"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 - 滚动列表 */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
          {displayedPrompts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {displayedPrompts.map((prompt) => {
                const isContentLong = prompt.content.length > 60;
                const isActive = currentPrefixPrompt === prompt.content;

                return (
                  <div 
                    key={prompt.id}
                    onClick={() => handleUsePrompt(prompt)}
                    className={`
                      group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex
                      ${isActive ? 'border-violet-500 ring-1 ring-violet-500/20' : 'border-gray-100 hover:border-violet-200'}
                    `}
                  >
                    {/* 左侧：小封面图 */}
                    <div className="w-24 h-24 relative flex-shrink-0 bg-gray-100">
                      {prompt.coverImage ? (
                        <img 
                          src={prompt.coverImage} 
                          alt={prompt.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                          <Sparkles className="text-gray-300" size={20} />
                        </div>
                      )}
                      {/* 激活标记 */}
                      {isActive && (
                        <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center backdrop-blur-[1px]">
                           <div className="bg-white rounded-full p-1 shadow-sm">
                             <Check size={12} className="text-violet-600" strokeWidth={3} />
                           </div>
                        </div>
                      )}
                    </div>

                    {/* 右侧：内容 */}
                    <div className="flex-1 p-3 min-w-0 flex flex-col">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`font-bold text-sm truncate ${isActive ? 'text-violet-700' : 'text-gray-900'}`}>
                          {prompt.title}
                        </h3>
                        
                        {/* 操作按钮 */}
                        {activeTab === 'user' && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => handleEditPrompt(e, prompt)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={(e) => handleDeletePrompt(e, prompt.id)}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 font-mono bg-gray-50 p-1.5 rounded border border-gray-50 group-hover:border-gray-100 transition-colors">
                        {prompt.content}
                      </p>
                      
                      {prompt.category && (
                        <div className="mt-auto pt-2 flex justify-between items-center">
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                            {prompt.category}
                          </span>
                          <span className="text-[10px] text-violet-500 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            应用 <ArrowRight size={10} />
                          </span>
                        </div>
                      )}
                    </div>
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
      id: initialData?.id || `usr-${Date.now()}`,
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

