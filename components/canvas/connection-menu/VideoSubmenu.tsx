import React from 'react';

// 行级注释：视频子菜单组件的 Props
type VideoSubmenuProps = {
  onBack: () => void;
  onSelectRatio: (aspectRatio: '9:16' | '16:9') => void;
};

// 行级注释：视频子菜单组件 - 选择视频比例（竖屏/横屏）
export default function VideoSubmenu({ onBack, onSelectRatio }: VideoSubmenuProps) {
  return (
    <div className="min-w-[140px]">
      {/* 行级注释：返回按钮 */}
      <button
        onClick={onBack}
        className="w-full px-6 py-2 text-sm text-gray-500 hover:bg-gray-100 text-left"
      >
        ← 返回
      </button>

      {/* 行级注释：竖屏 9:16 */}
      <button
        onClick={() => onSelectRatio('9:16')}
        className="w-full px-6 py-2 hover:bg-purple-50 transition-colors text-left"
      >
        <div className="font-medium text-gray-900">竖屏 9:16</div>
      </button>

      {/* 行级注释：横屏 16:9 */}
      <button
        onClick={() => onSelectRatio('16:9')}
        className="w-full px-6 py-2 hover:bg-purple-50 transition-colors text-left"
      >
        <div className="font-medium text-gray-900">横屏 16:9</div>
      </button>
    </div>
  );
}

