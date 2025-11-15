'use client';

import { useState } from 'react';
import { Save, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import MaterialsPanel from './MaterialsPanel';
import { MaterialsIcon } from './icons/MaterialsIcon';
import { useCanvasStore } from '@/lib/store';

export default function RightToolbar() {
  const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);

  return (
    <>
      {/* 右侧工具栏 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-white rounded-xl shadow-lg p-2 flex flex-col gap-2">
        {/* 素材库 - 最重要的功能 */}
        <button
          onClick={() => setIsMaterialsPanelOpen(true)}
          className="p-3 rounded-lg transition-all hover:bg-gray-100 text-gray-700 group border-2 border-gray-300"
          title="素材库"
        >
          <MaterialsIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* 分隔线 */}
        <div className="border-t border-gray-200 my-1" />

        {/* 缩放控制 */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => console.log('放大画布')}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
            title="放大"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => console.log('缩小画布')}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
            title="缩小"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => console.log('适应画布')}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
            title="适应画布"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-200 my-1" />

        {/* 项目操作 */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => console.log('保存项目')}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
            title="保存"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={() => console.log('导出项目')}
            className="p-2 rounded-lg transition-all hover:bg-gray-100 text-gray-700"
            title="导出"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 素材库面板 */}
      <MaterialsPanel
        isOpen={isMaterialsPanelOpen}
        onClose={() => setIsMaterialsPanelOpen(false)}
      />
    </>
  );
}