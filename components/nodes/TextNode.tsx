'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react';
import { Bold, Italic, Underline } from 'lucide-react';
import type { TextElement, VideoElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';

// 文本节点组件
function TextNode({ data, id }: NodeProps) {
  // 将 data 转换为 TextElement 类型
  const textData = data as unknown as TextElement;
  
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(textData.text);
  const [fontWeight, setFontWeight] = useState(textData.fontWeight || 'normal');
  const [fontStyle, setFontStyle] = useState(textData.fontStyle || 'normal');
  const [textDecoration, setTextDecoration] = useState(textData.textDecoration || 'none');
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const { getEdges } = useReactFlow();

  const BASE_FONT_SIZE = textData.fontSize || 24; // 行级注释：固定字体大小，后续仅通过节点尺寸适配文本
  const sizeRef = useRef(textData.size); // 行级注释：记录最近一次保存的节点尺寸以避免重复写入

  // 根据文字内容计算所需的节点尺寸
  const calculateSizeForText = useCallback((textContent: string) => {
    // 创建临时元素来测量文字尺寸
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.fontSize = `${BASE_FONT_SIZE}px`;
    tempDiv.style.fontWeight = fontWeight;
    tempDiv.style.fontStyle = fontStyle;
    tempDiv.style.textDecoration = textDecoration; // 行级注释：保持测量与展示样式一致
    tempDiv.style.whiteSpace = 'pre-wrap';
    tempDiv.style.lineHeight = '1.4';
    tempDiv.style.maxWidth = '600px'; // 最大宽度限制
    tempDiv.textContent = textContent || '双击编辑文字';
    
    document.body.appendChild(tempDiv);
    const width = Math.ceil(tempDiv.offsetWidth);
    const height = Math.ceil(tempDiv.offsetHeight);
    document.body.removeChild(tempDiv);
    
    // 添加内边距
    const padding = 24;
    const newSize = {
      width: Math.max(100, Math.min(600, width + padding * 2)), // 最小100，最大600
      height: Math.max(60, Math.min(400, height + padding * 2)), // 最小60，最大400
    };
    return newSize;
  }, [fontWeight, fontStyle, textDecoration, BASE_FONT_SIZE]);

  const adjustSizeToText = useCallback((content: string) => {
    const measuredSize = calculateSizeForText(content); // 行级注释：根据最新文本测量节点尺寸
    const previousSize = sizeRef.current; // 行级注释：获取上一次保存的尺寸用于比较
    if (
      !previousSize ||
      previousSize.width !== measuredSize.width ||
      previousSize.height !== measuredSize.height
    ) {
      sizeRef.current = measuredSize; // 行级注释：同步缓存的尺寸
      updateElement(id, { size: measuredSize } as Partial<TextElement>); // 行级注释：更新全局状态中的节点尺寸
    }
  }, [calculateSizeForText, id, updateElement]);

  useEffect(() => {
    sizeRef.current = textData.size; // 行级注释：当外部尺寸变化时同步缓存的尺寸
  }, [textData.size]);

  useEffect(() => {
    adjustSizeToText(text || ''); // 行级注释：文本或样式变化时重新调整节点尺寸
  }, [text, fontWeight, fontStyle, textDecoration, adjustSizeToText]);

  // 自动聚焦编辑框并调整高度
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      // 初始化高度
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [isEditing]);

  // 处理双击进入编辑模式
  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  // 处理失焦保存
  const handleBlur = (e: React.FocusEvent) => {
    // 检查焦点是否移到工具栏
    if (toolbarRef.current && toolbarRef.current.contains(e.relatedTarget as Node)) {
      // 焦点移到工具栏，重新聚焦到 textarea
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    
    // 否则退出编辑模式
    setIsEditing(false);
    
    // 根据当前文字内容自动调整节点尺寸
    const newSize = calculateSizeForText(text); // 行级注释：保存时重新计算尺寸确保文本被完整包裹
    
    // 更新元素，包括新的尺寸
    updateElement(id, { 
      text,
      fontWeight,
      fontStyle,
      textDecoration,
      size: newSize,
    } as Partial<TextElement>);

    // 更新连接的视频节点
    const edges = getEdges?.() ?? [];
    const { elements } = useCanvasStore.getState();
    edges
      .filter((edge) => edge.source === id && edge.targetHandle === 'prompt-text')
      .forEach((edge) => {
        const videoElement = elements.find((el) => el.id === edge.target) as VideoElement | undefined;
        if (!videoElement) {
          return;
        }
        const startId = videoElement.startImageId;
        const endId = videoElement.endImageId;
        const readyForGeneration = Boolean(text.trim() && (startId || endId));
        const sourceIds = new Set<string>(videoElement.generatedFrom?.sourceIds ?? []);
        if (startId) sourceIds.add(startId);
        if (endId) sourceIds.add(endId);
        sourceIds.add(id);

        updateElement(edge.target, {
          promptText: text,
          readyForGeneration,
          generatedFrom: {
            type: 'image-to-image',
            sourceIds: Array.from(sourceIds),
            prompt: text,
          },
        } as Partial<VideoElement>);
      });
  };

  // 处理按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setText(textData.text);
      setIsEditing(false);
    }
    // Cmd/Ctrl + Enter 保存并退出编辑
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleBlur(e as any);
    }
    // 普通 Enter 换行（不需要特殊处理，textarea 默认行为）
  };

  // 切换样式
  const toggleBold = () => {
    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
    setFontWeight(newWeight);
    updateElement(id, { fontWeight: newWeight } as Partial<TextElement>);
  };

  const toggleItalic = () => {
    const newStyle = fontStyle === 'italic' ? 'normal' : 'italic';
    setFontStyle(newStyle);
    updateElement(id, { fontStyle: newStyle } as Partial<TextElement>);
  };

  const toggleUnderline = () => {
    const newDecoration = textDecoration === 'underline' ? 'none' : 'underline';
    setTextDecoration(newDecoration);
    updateElement(id, { textDecoration: newDecoration } as Partial<TextElement>);
  };

  return (
    <div
      className="relative transition-all flex items-center justify-center w-full h-full"
      
      onDoubleClick={handleDoubleClick}
    >
        {/* 编辑工具栏 - 样式与视频节点保持一致 */}
        {isEditing && (
          <div 
            ref={toolbarRef}
            className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200 shadow-2xl px-3 py-2 z-50"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* 粗体 */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={toggleBold}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                fontWeight === 'bold' ? 'bg-blue-600 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.4)]' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="粗体"
              tabIndex={-1}
            >
              <Bold className="w-4 h-4" />
            </button>
            
            {/* 斜体 */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={toggleItalic}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                fontStyle === 'italic' ? 'bg-blue-600 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.4)]' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="斜体"
              tabIndex={-1}
            >
              <Italic className="w-4 h-4" />
            </button>
            
            {/* 下划线 */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={toggleUnderline}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                textDecoration === 'underline' ? 'bg-blue-600 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.4)]' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="下划线"
              tabIndex={-1}
            >
              <Underline className="w-4 h-4" />
            </button>
          </div>
        )}

        {isEditing ? (
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // 自动调整高度
              if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="resize-none outline-none border-none bg-transparent text-gray-900 text-center overflow-hidden w-full p-3"
            style={{
              fontSize: `${BASE_FONT_SIZE}px`,
              color: textData.color || '#000',
              fontWeight,
              fontStyle,
              textDecoration,
              height: 'auto',
              lineHeight: '1.4',
            }}
            rows={1}
          />
        ) : (
          <div
            className="whitespace-pre-wrap cursor-text select-none text-center w-full break-words overflow-hidden p-3"
            style={{
              fontSize: `${BASE_FONT_SIZE}px`,
              color: textData.color || '#000',
              fontWeight,
              fontStyle,
              textDecoration,
              lineHeight: '1.4',
              wordBreak: 'break-word',
            }}
          >
            {textData.text || '双击编辑文字'}
          </div>
        )}
        
      {/* 输出连接点（右侧） - 用于连接到视频节点 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
        style={{ right: '-6px' }}
      />
    </div>
  );
}

export default memo(TextNode);
