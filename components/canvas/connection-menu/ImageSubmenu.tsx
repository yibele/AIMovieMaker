import React from 'react';
import { ArrowLeft, Smartphone, Monitor, Square } from 'lucide-react';

// 行级注释：图片子菜单组件的 Props
type ImageSubmenuProps = {
  onBack: () => void;
  onSelectRatio: (aspectRatio: '9:16' | '16:9' | '1:1') => void;
};

// 行级注释：图片子菜单组件 - 选择图片比例（竖图/横图/方图）
export default function ImageSubmenu({ onBack, onSelectRatio }: ImageSubmenuProps) {
  const items = [
    { label: '竖图 9:16', sub: 'Portrait', value: '9:16', icon: <Smartphone size={16} /> },
    { label: '横图 16:9', sub: 'Landscape', value: '16:9', icon: <Monitor size={16} /> },
    { label: '方图 1:1', sub: 'Square', value: '1:1', icon: <Square size={16} /> },
  ];

  return (
    <div className="w-64">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={14} className="text-gray-500" />
        </button>
        <span className="font-medium text-sm text-gray-900">选择图片比例</span>
      </div>

      <div className="py-1">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onSelectRatio(item.value as any)}
            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <div className="text-xs text-gray-500">{item.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

