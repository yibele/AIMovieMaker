'use client';

import { ArrowLeft, Home, FolderOpen } from 'lucide-react';

export default function CanvasNavigation() {
  return (
    <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
      <button
        onClick={() => window.location.href = '/'}
        className="inline-flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-white transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <Home className="w-4 h-4" />
        返回项目
      </button>

      <button
        onClick={() => window.location.href = '/'}
        className="inline-flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-white transition-all"
      >
        <FolderOpen className="w-4 h-4" />
        项目列表
      </button>
    </div>
  );
}