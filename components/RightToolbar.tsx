'use client';

import { useState } from 'react';
import { Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Download, Sparkles } from 'lucide-react';
import MaterialsPanel from './MaterialsPanel';
import { MaterialsIcon } from './icons/MaterialsIcon';
import PrefixPromptModal from './PrefixPromptModal';
import { useCanvasStore } from '@/lib/store';

export default function RightToolbar() {
  const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);
  const [isPrefixPromptOpen, setIsPrefixPromptOpen] = useState(false);
  const prefixPrompt = useCanvasStore((state) => state.currentPrefixPrompt);

  return (
    <>
      {/* 右侧工具栏 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white rounded-xl shadow-lg p-2 flex flex-col gap-2">
        {/* 素材库 - 最重要的功能 */}
        <button
          onClick={() => setIsMaterialsPanelOpen(!isMaterialsPanelOpen)}
          className={`p-3 rounded-lg transition-all group
            ${isMaterialsPanelOpen
              ? 'bg-blue-100 text-blue-600'
              : 'hover:bg-gray-100 text-gray-700'
            }`}
          title="素材库"
        >
          <MaterialsIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* 分隔线 */}
        <div className="border-t border-gray-200 my-1" />

        {/* 前置提示词 */}
        <button
          onClick={() => setIsPrefixPromptOpen(true)}
          className={`p-3 rounded-lg transition-all group relative
            ${prefixPrompt
              ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700'
              : 'hover:bg-gray-100 text-gray-700'
            }`}
          title={prefixPrompt ? `前置提示词：${prefixPrompt.slice(0, 50)}${prefixPrompt.length > 50 ? '...' : ''}` : '前置提示词'}
        >
          <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {prefixPrompt && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full"></div>
          )}
        </button>
        <button
          onClick={() => console.log('缩小画布')}
          className="p-3 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => console.log('适应画布')}
          className="p-3 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
          title="适应画布"
        >
          <Maximize2 className="w-5 h-5" />
        </button>

        {/* 分隔线 */}
        <div className="border-t border-gray-200 my-1" />

        {/* 项目操作 */}
        <button
          onClick={() => console.log('保存项目')}
          className="p-3 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
          title="保存"
        >
          <Save className="w-5 h-5" />
        </button>
        <button
          onClick={() => console.log('导出项目')}
          className="p-3 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
          title="导出"
        >
          <Download className="w-5 h-5" />
        </button>
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