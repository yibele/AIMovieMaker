import React from 'react';
import { ConnectionMenuState, ConnectionMenuCallbacks } from '@/types/connection-menu';
import ImageSubmenu from './ImageSubmenu';
import VideoSubmenu from './VideoSubmenu';
import ImagePromptInput from './ImagePromptInput';

// 行级注释：连线菜单根组件的 Props
type ConnectionMenuRootProps = {
  state: ConnectionMenuState;
  callbacks: ConnectionMenuCallbacks;
  promptInputRef: React.RefObject<HTMLInputElement | null>;
};

// 行级注释：连线菜单根组件 - 处理菜单显示逻辑和子菜单切换
export default function ConnectionMenuRoot({
  state,
  callbacks,
  promptInputRef,
}: ConnectionMenuRootProps) {
  if (!state.visible) {
    return null;
  }

  return (
    <>
      {/* 行级注释：菜单容器 */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
        style={{
          left: `${state.position.x}px`,
          top: `${state.position.y}px`,
        }}
      >
        {/* 行级注释：主菜单 - 选择生成图片或视频 */}
        {state.activeSubmenu === null && (
          <div>
            <button
              onClick={callbacks.onShowImageSubmenu}
              className="w-full px-8 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors text-left"
            >
              <div className="font-medium text-gray-900">图片</div>
            </button>
            <button
              onClick={callbacks.onShowVideoSubmenu}
              className="w-full px-8 py-2 flex items-center justify-between hover:bg-purple-50 transition-colors text-left"
            >
              <div className="font-medium text-gray-900">视频</div>
            </button>
          </div>
        )}

        {/* 行级注释：图片子菜单 - 选择图片比例 */}
        {state.activeSubmenu === 'image' && (
          <ImageSubmenu
            onBack={callbacks.onBackToMain}
            onSelectRatio={callbacks.onGenerateImage}
          />
        )}

        {/* 行级注释：视频子菜单 - 选择视频比例 */}
        {state.activeSubmenu === 'video' && (
          <VideoSubmenu
            onBack={callbacks.onBackToMain}
            onSelectRatio={callbacks.onGenerateVideo}
          />
        )}

        {/* 行级注释：图生图提示词输入界面 */}
        {state.activeSubmenu === 'imagePrompt' && (
          <ImagePromptInput
            aspectRatio={state.pendingImageConfig?.aspectRatio ?? '1:1'}
            prompt={state.pendingImageConfig?.prompt ?? ''}
            inputRef={promptInputRef}
            onPromptChange={callbacks.onImagePromptInputChange}
            onConfirm={callbacks.onConfirmImagePrompt}
            onBack={callbacks.onBackToImageSubmenu}
          />
        )}
      </div>

      {/* 行级注释：点击外部关闭菜单的遮罩层 */}
      <div className="fixed inset-0 z-40" onClick={callbacks.onClose} />
    </>
  );
}

