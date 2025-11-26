import React from 'react';
import { ArrowLeft, RectangleVertical, RectangleHorizontal, Square } from 'lucide-react';

// 行级注释：图片子菜单组件的 Props
type ImageSubmenuProps = {
  onBack: () => void;
  onSelectRatio: (aspectRatio: '9:16' | '16:9' | '1:1') => void;
};

// 行级注释：图片子菜单组件 - 选择图片比例（竖图/横图/方图）
export default function ImageSubmenu({ onBack, onSelectRatio }: ImageSubmenuProps) {
  const items = [
    { label: '竖图', value: '9:16', icon: RectangleVertical },
    { label: '横图', value: '16:9', icon: RectangleHorizontal },
    { label: '方图', value: '1:1', icon: Square },
  ];

  return (
    <div className="w-[160px]">
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">图片比例</span>
      </div>

      <div className="px-1.5 pb-1.5 flex gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              onClick={() => onSelectRatio(item.value as any)}
              className="flex-1 py-2 flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all"
            >
              <Icon size={18} strokeWidth={2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
