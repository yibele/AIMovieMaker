import React from 'react';

// 行级注释：图片子菜单组件的 Props
type ImageSubmenuProps = {
  onBack: () => void;
  onSelectRatio: (aspectRatio: '9:16' | '16:9' | '1:1') => void;
};

// 行级注释：图片子菜单组件 - 选择图片比例（竖图/横图/方图）
export default function ImageSubmenu({ onBack, onSelectRatio }: ImageSubmenuProps) {
  return (
    <div className="min-w-[140px]">
      {/* 行级注释：返回按钮 */}
      <button
        onClick={onBack}
        className="w-full px-6 py-2 text-sm text-gray-500 hover:bg-gray-100 text-left"
      >
        ← 返回
      </button>

      {/* 行级注释：竖图 9:16 */}
      <button
        onClick={() => onSelectRatio('9:16')}
        className="w-full px-6 py-2 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="font-medium text-gray-900">竖图 9:16</div>
      </button>

      {/* 行级注释：横图 16:9 */}
      <button
        onClick={() => onSelectRatio('16:9')}
        className="w-full px-6 py-2 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="font-medium text-gray-900">横图 16:9</div>
      </button>

      {/* 行级注释：方图 1:1 */}
      <button
        onClick={() => onSelectRatio('1:1')}
        className="w-full px-6 py-2 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="font-medium text-gray-900">方图 1:1</div>
      </button>
    </div>
  );
}

