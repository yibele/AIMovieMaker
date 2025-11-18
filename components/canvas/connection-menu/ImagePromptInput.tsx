import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

// 行级注释：图生图提示词输入组件的 Props
type ImagePromptInputProps = {
  aspectRatio: '9:16' | '16:9' | '1:1';
  prompt: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPromptChange: (value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
};

// 行级注释：图生图提示词输入组件 - 输入提示词并确认生成
export default function ImagePromptInput({
  aspectRatio,
  prompt,
  inputRef,
  onPromptChange,
  onConfirm,
  onBack,
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
    <div className="w-[320px] p-4 flex flex-col gap-3">
      {/* 行级注释：标题和比例显示 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">输入提示词</span>
        <span className="text-xs text-gray-500">{aspectRatio}</span>
      </div>

      {/* 行级注释：输入框和确认按钮 */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请先输入提示词..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onConfirm}
          disabled={!isPromptReady}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isPromptReady
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title="确认生成"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

