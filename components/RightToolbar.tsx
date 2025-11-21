'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Download, Sparkles } from 'lucide-react';
import MaterialsPanel from './MaterialsPanel';
import { MaterialsIcon } from './icons/MaterialsIcon';
import PrefixPromptModal from './PrefixPromptModal';
import { useCanvasStore } from '@/lib/store';

export default function RightToolbar() {
  const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);
  const [isPrefixPromptOpen, setIsPrefixPromptOpen] = useState(false);
  const prefixPrompt = useCanvasStore((state) => state.currentPrefixPrompt);

  // macOS Dock 效果状态
  const [mouseY, setMouseY] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 计算按钮缩放比例（macOS Dock 效果）
  const calculateScale = useCallback((buttonIndex: number) => {
    if (mouseY === null) return 1;
    
    const button = buttonRefs.current[buttonIndex];
    if (!button) return 1;
    
    const rect = button.getBoundingClientRect();
    const buttonCenterY = rect.top + rect.height / 2;
    const distance = Math.abs(mouseY - buttonCenterY);
    
    // 距离越近，缩放越大
    const maxScale = 2.0; // 最大缩放 200%
    const minScale = 1.0; // 最小缩放 100%
    const range = 80; // 影响范围 80px
    
    if (distance > range) return minScale;
    
    const scale = maxScale - ((distance / range) * (maxScale - minScale));
    return scale;
  }, [mouseY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseY(e.clientY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseY(null);
  }, []);

  // 按钮配置
  const buttons: Array<
    | { type: 'divider' }
    | {
        icon: React.ComponentType<{ className?: string }>;
        onClick: () => void;
        title: string;
        isActive: boolean;
        showIndicator: boolean;
      }
  > = [
    {
      icon: MaterialsIcon,
      onClick: () => setIsMaterialsPanelOpen(!isMaterialsPanelOpen),
      title: '素材库',
      isActive: isMaterialsPanelOpen,
      showIndicator: false,
    },
    { type: 'divider' },
    {
      icon: Sparkles,
      onClick: () => setIsPrefixPromptOpen(true),
      title: prefixPrompt ? `前置提示词：${prefixPrompt.slice(0, 50)}${prefixPrompt.length > 50 ? '...' : ''}` : '前置提示词',
      isActive: Boolean(prefixPrompt),
      showIndicator: Boolean(prefixPrompt),
    },
    {
      icon: ZoomOut,
      onClick: () => console.log('缩小画布'),
      title: '缩小',
      isActive: false,
      showIndicator: false,
    },
    {
      icon: Maximize2,
      onClick: () => console.log('适应画布'),
      title: '适应画布',
      isActive: false,
      showIndicator: false,
    },
    { type: 'divider' },
    {
      icon: Save,
      onClick: () => console.log('保存项目'),
      title: '保存',
      isActive: false,
      showIndicator: false,
    },
    {
      icon: Download,
      onClick: () => console.log('导出项目'),
      title: '导出',
      isActive: false,
      showIndicator: false,
    },
  ];

  let buttonIndex = 0;

  return (
    <>
      {/* 右侧工具栏 */}
      <div 
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 p-3 flex flex-col gap-2"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {buttons.map((button, index) => {
          if ('type' in button && button.type === 'divider') {
            return <div key={`divider-${index}`} className="border-t border-gray-200 my-1" />;
          }

          if (!('icon' in button)) return null;

          const Icon = button.icon;
          const currentIndex = buttonIndex++;
          const scale = calculateScale(currentIndex);

          return (
            <button
              key={index}
              ref={(el) => { buttonRefs.current[currentIndex] = el; }}
              onClick={button.onClick}
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className="relative p-3 rounded-xl origin-center group"
              title={button.title}
            >
              <Icon 
                className={`w-5 h-5 relative z-10 transition-colors duration-200 ${
                  button.isActive
                    ? 'text-blue-500'
                    : 'text-gray-600 group-hover:text-purple-500'
                }`}
              />
              {button.showIndicator && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* 素材库面板 */}
      <MaterialsPanel
        isOpen={isMaterialsPanelOpen}
        onClose={() => setIsMaterialsPanelOpen(false)}
      />

      {/* 前置提示词弹窗 */}
      <PrefixPromptModal
        isOpen={isPrefixPromptOpen}
        onClose={() => setIsPrefixPromptOpen(false)}
      />
    </>
  );
}