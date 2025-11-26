import React from 'react';
import { ArrowLeft, RectangleVertical, RectangleHorizontal } from 'lucide-react';

// 行级注释：视频子菜单组件的 Props
type VideoSubmenuProps = {
  onBack: () => void;
  onSelectRatio: (aspectRatio: '9:16' | '16:9') => void;
};

// 行级注释：视频子菜单组件 - 选择视频比例（竖屏/横屏）
export default function VideoSubmenu({ onBack, onSelectRatio }: VideoSubmenuProps) {
  const items = [
    { label: '竖屏', value: '9:16', icon: RectangleVertical },
    { label: '横屏', value: '16:9', icon: RectangleHorizontal },
  ];

  return (
    <div className="w-[140px]">
      <div className="px-3 py-2 flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">视频比例</span>
      </div>

      <div className="px-1.5 pb-1.5 flex gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              onClick={() => onSelectRatio(item.value as any)}
              className="flex-1 py-2 flex flex-col items-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-purple-500/10 dark:hover:bg-purple-500/20 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-all"
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
