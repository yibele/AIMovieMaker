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
  User
} from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

// 类型定义
export interface PromptItem {
  id: string;
  title: string;
  content: string;
  coverImage: string; // 实际上这应该是一个图片URL，这里我们用渐变色或占位图模拟
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

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromptLibraryModal({ isOpen, onClose }: PromptLibraryModalProps) {
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

  // 重置状态当 Modal 关闭时
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
    onClose();
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
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center 
        transition-all duration-500 ease-out
        ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-200'}
      `}
    >
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-md transition-opacity duration-500"
        onClick={onClose}
      />

      {/* 主卡片 */}
      <div 
        className={`
          relative w-[900px] max-w-[95vw] h-[85vh] max-h-[800px] bg-[#FBFBFD] backdrop-blur-2xl rounded-[24px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] 
          border border-white/60 overflow-hidden flex flex-col
          transform transition-all duration-500 cubic-bezier(0.19, 1, 0.22, 1)
          ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}
        `}
      >
        
        {/* 顶部导航栏 - 使用 Grid 确保 Tabs 绝对居中 */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200/60 bg-white/50 grid grid-cols-[1fr_auto_1fr] items-center z-10 gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 justify-start">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 flex-shrink-0">
                <Sparkles size={20} strokeWidth={2.5} />
             </div>
             <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight whitespace-nowrap">提示词库</h2>
                <p className="text-xs text-gray-500 font-medium truncate">Prompt Library</p>
             </div>
          </div>

          {/* Center - Tabs */}
          <div className="flex items-center gap-3 bg-gray-100/50 p-1.5 rounded-xl border border-gray-200/50 justify-center">
            <button
              onClick={() => setActiveTab('system')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap
                ${activeTab === 'system' 
                  ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
              `}
            >
              <Globe size={16} className={activeTab === 'system' ? 'text-violet-600' : ''} />
              系统推荐
            </button>
            <button
              onClick={() => setActiveTab('user')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap
                ${activeTab === 'user' 
                  ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
              `}
            >
              <User size={16} className={activeTab === 'user' ? 'text-violet-600' : ''} />
              我的收藏
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 justify-end">
             {activeTab === 'user' && (
               <button
                 onClick={() => {
                   setEditorMode('create');
                   setEditingPrompt(null);
                   setIsEditorOpen(true);
                 }}
                 className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap"
               >
                 <Plus size={18} strokeWidth={2.5} />
                 新建
               </button>
             )}
             <button
               onClick={onClose}
               className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all flex-shrink-0"
             >
               <X size={24} />
             </button>
          </div>
        </div>

        {/* 搜索和过滤栏 */}
        <div className="flex-shrink-0 px-6 py-4 bg-white/30 border-b border-gray-200/60 flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-600 transition-colors" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`搜索${activeTab === 'system' ? '系统' : '我的'}提示词...`}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <LayoutGrid size={16} />
            <span>{displayedPrompts.length} 个提示词</span>
          </div>
        </div>

        {/* 内容区域 - 滚动 */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {displayedPrompts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedPrompts.map((prompt) => (
                <div 
                  key={prompt.id}
                  onClick={() => handleUsePrompt(prompt)}
                  className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
                >
                  {/* 封面图区域 */}
                  <div className="relative h-40 overflow-hidden bg-gray-100">
                    {prompt.coverImage ? (
                      <img 
                        src={prompt.coverImage} 
                        alt={prompt.title} 
                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Sparkles className="text-gray-300" size={32} />
                      </div>
                    )}
                    
                    {/* 悬浮遮罩 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                       <button className="bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                         立即使用
                       </button>
                    </div>

                    {/* 分类标签 */}
                    {prompt.category && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/30 backdrop-blur-md rounded-lg text-[10px] font-bold text-white border border-white/20">
                        {prompt.category}
                      </div>
                    )}
                  </div>

                  {/* 内容区域 */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-violet-700 transition-colors">
                        {prompt.title}
                      </h3>
                      
                      {/* 用户操作菜单 (仅用户Tab显示) */}
                      {activeTab === 'user' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleEditPrompt(e, prompt)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                            title="编辑"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleDeletePrompt(e, prompt.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mb-3 font-mono bg-gray-50 p-2 rounded-lg border border-gray-100 group-hover:border-violet-100 transition-colors">
                      {prompt.content}
                    </p>

                    {/* 底部状态栏 */}
                    <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400">
                       <div className="flex items-center gap-1">
                         {currentPrefixPrompt === prompt.content && (
                           <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                             <Check size={10} strokeWidth={3} />
                             使用中
                           </span>
                         )}
                       </div>
                       <span>{activeTab === 'system' ? 'System' : 'Custom'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                 <Search size={32} className="opacity-20" />
              </div>
              <p className="text-sm font-medium">未找到相关提示词</p>
              {activeTab === 'user' && (
                <button
                  onClick={() => {
                     setEditorMode('create');
                     setEditingPrompt(null);
                     setIsEditorOpen(true);
                  }}
                  className="mt-4 text-violet-600 text-sm font-bold hover:underline"
                >
                  创建新提示词
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 编辑器 Modal (嵌套) */}
      {isEditorOpen && (
        <PromptEditor
          mode={editorMode}
          initialData={editingPrompt}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSavePrompt}
        />
      )}
    </div>
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
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out_forwards]">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-modal-spring">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="font-bold text-lg text-gray-900">{mode === 'create' ? '新建提示词' : '编辑提示词'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* 简单的封面选择模拟 */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">封面预览</label>
             <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group cursor-pointer" onClick={() => alert('更换封面功能待实现，目前使用随机图')}>
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                   <span className="bg-white/90 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                     更换图片
                   </span>
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">标题</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：我的赛博朋克风"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">提示词内容</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="输入具体的提示词内容..."
              className="w-full h-32 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none font-mono text-sm"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200/50 rounded-xl transition-all"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-lg shadow-gray-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

