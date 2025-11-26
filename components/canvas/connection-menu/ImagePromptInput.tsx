import React, { useEffect } from 'react';
import { Send } from 'lucide-react';

// 行级注释：图生图提示词输入组件的 Props
type ImagePromptInputProps = {
  aspectRatio: '9:16' | '16:9' | '1:1';
  prompt: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  title?: string;
  placeholder?: string;
};

// 行级注释：图生图提示词输入组件 - 输入提示词并确认生成
export default function ImagePromptInput({
  aspectRatio,
  prompt,
  inputRef,
  onPromptChange,
  onConfirm,
  onBack,
  title = '输入提示词',
  placeholder = '描述你想要的画面...',
}: ImagePromptInputProps) {
  // 行级注释：自动聚焦并选中输入框内容
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inputRef]);

  // 行级注释：检查提示词是否有效
  const isPromptReady = Boolean(prompt.trim());

  // 行级注释：处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="w-[260px] p-3 flex flex-col gap-2">
      {/* 行级注释：标题和比例显示 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{title}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{aspectRatio}</span>
      </div>

      {/* 行级注释：输入框和确认按钮 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 pr-10 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/30"
        />
        <button
          onClick={onConfirm}
          disabled={!isPromptReady}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isPromptReady
            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          title="确认生成 (Enter)"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
