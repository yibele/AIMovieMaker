'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Download, Sparkles, LayoutGrid, Image as ImageIcon, Box, Palette, FolderOpen, Bot, Lightbulb } from 'lucide-react';
import MaterialsPanel from './MaterialsPanel';
import PromptLibraryPanel from './PromptLibraryPanel';
import GrokAssistantPanel from './GrokAssistantPanel';
import AiwindPromptsPanel from './AiwindPromptsPanel';
import { useCanvasStore } from '@/lib/store';

export default function RightToolbar() {
  const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [isAiwindPanelOpen, setIsAiwindPanelOpen] = useState(false);
  const prefixPrompt = useCanvasStore((state) => state.currentPrefixPrompt);
  const isAssistantOpen = useCanvasStore((state) => state.isAssistantOpen);
  const setIsAssistantOpen = useCanvasStore((state) => state.setIsAssistantOpen);
  const isManaged = useCanvasStore((state) => state.apiConfig.isManaged); // 读取是否为托管模式

  // 关闭所有面板的辅助函数
  const closeAllPanels = () => {
    setIsMaterialsPanelOpen(false);
    setIsPromptLibraryOpen(false);
    setIsAiwindPanelOpen(false);
    setIsAssistantOpen(false);
  };

  // 按钮配置
  const mainGroups = [
    // 第一组：核心资产
    {
      id: 'assets',
      items: [
        {
          icon: FolderOpen,
          onClick: () => {
            setIsMaterialsPanelOpen(!isMaterialsPanelOpen);
            if (!isMaterialsPanelOpen) {
              setIsPromptLibraryOpen(false);
              setIsAiwindPanelOpen(false);
            }
          },
          title: '素材库',
          isActive: isMaterialsPanelOpen,
          dotColor: 'bg-blue-500',
        },
        {
          icon: Sparkles,
          onClick: () => {
            setIsPromptLibraryOpen(!isPromptLibraryOpen);
            if (!isPromptLibraryOpen) {
              setIsMaterialsPanelOpen(false);
              setIsAiwindPanelOpen(false);
            }
          },
          title: prefixPrompt ? `风格库：${prefixPrompt.slice(0, 20)}...` : '风格库',
          isActive: isPromptLibraryOpen || Boolean(prefixPrompt),
          dotColor: 'bg-purple-500'
        },
        {
          icon: Lightbulb,
          onClick: () => {
            setIsAiwindPanelOpen(!isAiwindPanelOpen);
            if (!isAiwindPanelOpen) {
              setIsMaterialsPanelOpen(false);
              setIsPromptLibraryOpen(false);
              setIsAssistantOpen(false);
            }
          },
          title: '灵感库',
          isActive: isAiwindPanelOpen,
          dotColor: 'bg-amber-500'
        },
        {
          icon: Bot,
          onClick: () => {
            setIsAssistantOpen(!isAssistantOpen);
            if (!isAssistantOpen) {
              setIsMaterialsPanelOpen(false);
              setIsPromptLibraryOpen(false);
              setIsAiwindPanelOpen(false);
            }
          },
          title: 'Grok 助手',
          isActive: isAssistantOpen,
          dotColor: 'bg-black'
        }
      ]
    },
    // 第二组：画布控制
    {
      id: 'view',
      items: [
        {
          icon: ZoomOut,
          onClick: () => console.log('缩小画布'), // 这里应该连接实际的画布控制逻辑
          title: '缩小',
          isActive: false,
          dotColor: undefined // 添加可选属性
        },
        {
          icon: Maximize2,
          onClick: () => console.log('适应画布'), // 这里应该连接实际的画布控制逻辑
          title: '适应画布',
          isActive: false,
          dotColor: undefined // 添加可选属性
        },
      ]
    },
    // 第三组：项目操作
    {
      id: 'project',
      items: [
        {
          icon: Save,
          onClick: () => console.log('保存项目'),
          title: '保存',
          isActive: false,
          dotColor: undefined // 添加可选属性
        },
        {
          icon: Download,
          onClick: () => console.log('导出项目'),
          title: '导出',
          isActive: false,
          dotColor: undefined // 添加可选属性
        },
      ]
    }
  ];

  return (
    <>
      {/* 右侧工具栏 - 悬浮胶囊设计 - 垂直居中 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 pointer-events-none">

        {/* 主工具栏 */}
        <div className="pointer-events-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-white/60 dark:border-slate-700/60 p-2 flex flex-col gap-4 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">

          {mainGroups.map((group, groupIndex) => {
            // 过滤掉隐藏的项
            const visibleItems = group.items.filter((item: any) => !item.hidden);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className={`flex flex-col gap-2 ${groupIndex > 0 ? 'pt-2 border-t border-gray-100 dark:border-slate-700' : ''}`}>
                {visibleItems.map((btn, btnIndex) => {
                  const Icon = btn.icon;
                  return (
                    <div key={btnIndex} className="relative group/btn">
                      <button
                        onClick={btn.onClick}
                        className={`
                        relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300
                        ${btn.isActive
                            ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white shadow-inner'
                            : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white hover:scale-105 active:scale-95'}
                      `}
                      >
                        <Icon
                          className={`w-5 h-5 transition-all duration-300 ${btn.isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`}
                        />

                        {/* 激活状态指示点 */}
                        {btn.isActive && btn.dotColor && (
                          <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${btn.dotColor} shadow-sm animate-pulse`} />
                        )}
                      </button>

                      {/* Tooltip - 左侧弹出 */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg opacity-0 invisible -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:visible group-hover/btn:translate-x-0 transition-all duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                        {btn.title}
                        {/* 小箭头 */}
                        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-gray-900/90 rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

      </div>

      {/* 素材库面板 - 侧边滑出 */}
      <MaterialsPanel
        isOpen={isMaterialsPanelOpen}
        onClose={() => setIsMaterialsPanelOpen(false)}
      />

      {/* 提示词库 - 左侧面板 */}
      <PromptLibraryPanel
        isOpen={isPromptLibraryOpen}
        onClose={() => setIsPromptLibraryOpen(false)}
      />

      {/* Grok 助手面板 */}
      <GrokAssistantPanel />

      {/* 灵感库面板 - aiwind.org */}
      <AiwindPromptsPanel
        isOpen={isAiwindPanelOpen}
        onClose={() => setIsAiwindPanelOpen(false)}
      />
    </>
  );
}
