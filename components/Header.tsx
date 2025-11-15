'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Share2, Settings } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

export default function Header() {
  const projectTitle = useCanvasStore((state) => state.projectTitle);
  const setProjectTitle = useCanvasStore((state) => state.setProjectTitle);
  const setIsSettingsOpen = useCanvasStore((state) => state.setIsSettingsOpen);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(projectTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 保存标题
  const handleSave = () => {
    setIsEditing(false);
    if (title.trim()) {
      setProjectTitle(title.trim());
    } else {
      setTitle(projectTitle);
    }
  };

  // 按键处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(projectTitle);
      setIsEditing(false);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-4">
      {/* 左侧：返回按钮 + 标题 */}
      <div className="flex items-center gap-3">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="返回"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="text-lg font-medium px-2 py-1 border border-blue-500 rounded outline-none"
            style={{ minWidth: '200px' }}
          />
        ) : (
          <h1
            className="text-lg font-medium text-gray-900 cursor-pointer px-2 py-1 hover:bg-gray-100 rounded transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {projectTitle}
          </h1>
        )}
      </div>

      {/* 右侧：分享按钮 + 设置按钮 */}
      <div className="flex items-center gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
          title="分享"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="设置"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </header>
  );
}

