'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText, Maximize2, Minimize2 } from 'lucide-react';
import type { NoteElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';

// 行级注释：记事本节点组件，用于长文本（剧本、分镜等），支持 Markdown 显示
function NoteNode({ data, id, selected }: NodeProps) {
  const noteData = data as unknown as NoteElement;

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteData.content || '');
  const [title, setTitle] = useState(noteData.title || '分镜');
  const [isExpanded, setIsExpanded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);

  // 行级注释：同步外部数据变化
  useEffect(() => {
    setContent(noteData.content || '');
    setTitle(noteData.title || '分镜');
  }, [noteData.content, noteData.title]);

  // 行级注释：进入编辑模式时自动聚焦
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // 将光标移到末尾
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  // 行级注释：双击进入编辑模式
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  // 行级注释：保存并退出编辑
  const handleSave = useCallback(() => {
    setIsEditing(false);
    updateElement(id, {
      content,
      title,
    } as Partial<NoteElement>);
  }, [id, content, title, updateElement]);

  // 行级注释：按键处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Escape 取消编辑
    if (e.key === 'Escape') {
      setContent(noteData.content || '');
      setTitle(noteData.title || '分镜');
      setIsEditing(false);
    }
    // Cmd/Ctrl + Enter 保存
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    // 阻止事件冒泡，避免触发画布快捷键
    e.stopPropagation();
  }, [noteData.content, noteData.title, handleSave]);

  // 行级注释：展开/折叠 - 横向纵向都放大，通过 updateElement 更新让选中边框跟随
  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) {
      // 收起
      updateElement(id, { size: { width: 400, height: 300 } } as Partial<NoteElement>);
    } else {
      // 展开
      updateElement(id, { size: { width: 700, height: 500 } } as Partial<NoteElement>);
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, id, updateElement]);

  return (
    // 行级注释：添加 nowheel 类名禁用 ReactFlow 的默认选中边框样式
    <div
      className={`relative flex flex-col bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 transition-all duration-300 ${
        selected
          ? 'border-amber-500 shadow-[0_10px_40px_rgba(245,158,11,0.25)]'
          : 'border-amber-200 dark:border-amber-700 shadow-lg hover:shadow-xl'
      }`}
      style={{ 
        width: '100%', 
        height: '100%',
      }}
      onDoubleClick={handleDoubleClick}
    >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-3 py-2 bg-amber-100 dark:bg-amber-800/30 rounded-t-xl border-b border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-none outline-none text-sm font-semibold text-amber-900 dark:text-amber-100 w-40"
                placeholder="标题..."
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100 truncate max-w-[200px]">
                {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleExpand}
              className="p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-700 transition-colors"
              title={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-3 bg-transparent border-none outline-none resize-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
              placeholder="在这里输入内容...

按 Cmd/Ctrl + Enter 保存"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="w-full h-full p-3 overflow-y-auto custom-scrollbar">
              {content ? (
                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              ) : (
                <div className="text-amber-400 dark:text-amber-600 text-sm">
                  双击编辑内容...
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        {isEditing && (
          <div className="px-3 py-1.5 bg-amber-100 dark:bg-amber-800/30 rounded-b-xl border-t border-amber-200 dark:border-amber-700">
            <span className="text-[10px] text-amber-600 dark:text-amber-400">
              Cmd/Ctrl+Enter 保存 · Esc 取消
            </span>
          </div>
        )}

        {/* 连接点 */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
          style={{ left: '-6px' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-amber-500 !border-2 !border-white"
          style={{ right: '-6px' }}
        />
      </div>
  );
}

export default memo(NoteNode);

