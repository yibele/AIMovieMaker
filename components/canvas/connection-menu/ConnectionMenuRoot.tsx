import React from 'react';
import { ConnectionMenuState, ConnectionMenuCallbacks } from '@/types/connection-menu';
import ImageSubmenu from './ImageSubmenu';
import VideoSubmenu from './VideoSubmenu';
import ImagePromptInput from './ImagePromptInput';
import CameraControlSubmenu from './CameraControlSubmenu';
import ExtendVideoInput from './ExtendVideoInput';
import { Image as ImageIcon, Video as VideoIcon, Camera, Move, Sparkles } from 'lucide-react';

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
        className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden min-w-[240px]"
        style={{
          left: `${state.position.x}px`,
          top: `${state.position.y}px`,
        }}
      >
        {/* 行级注释：主菜单 - 选择生成图片或视频 */}
        {state.activeSubmenu === null && (
          <div>
            {state.sourceNodeType !== 'video' ? (
              <>
                <button
                  onClick={callbacks.onShowImageSubmenu}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-50 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">生成图片</div>
                    <div className="text-xs text-gray-500">Generate Image</div>
                  </div>
                </button>
                <button
                  onClick={callbacks.onShowVideoSubmenu}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <VideoIcon size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">生成视频</div>
                    <div className="text-xs text-gray-500">Generate Video</div>
                  </div>
                </button>
              </>
            ) : (
              // 视频节点的主菜单 - 镜头控制
              <>
                <button
                  onClick={callbacks.onShowCameraControlSubmenu}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left border-b border-gray-50 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <Camera size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">镜头控制</div>
                    <div className="text-xs text-gray-500">Camera Control</div>
                  </div>
                </button>
                <button
                  onClick={callbacks.onShowCameraPositionSubmenu}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left border-b border-gray-50 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <Move size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">镜头位置</div>
                    <div className="text-xs text-gray-500">Camera Position</div>
                  </div>
                </button>
                <button
                  onClick={callbacks.onShowExtendVideoSubmenu}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">延长视频</div>
                    <div className="text-xs text-gray-500">Extend Video</div>
                  </div>
                </button>
              </>
            )}
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

        {/* 行级注释：镜头控制子菜单 */}
        {state.activeSubmenu === 'cameraControl' && (
          <CameraControlSubmenu
            type="control"
            onBack={callbacks.onBackToMain}
            onSelect={callbacks.onGenerateReshoot}
          />
        )}

        {/* 行级注释：镜头位置子菜单 */}
        {state.activeSubmenu === 'cameraPosition' && (
          <CameraControlSubmenu
            type="position"
            onBack={callbacks.onBackToMain}
            onSelect={callbacks.onGenerateReshoot}
          />
        )}

        {/* 行级注释：延长视频输入界面 */}
        {state.activeSubmenu === 'extendVideo' && (
          <ExtendVideoInput
            prompt={state.pendingExtendPrompt ?? ''}
            inputRef={promptInputRef}
            onPromptChange={callbacks.onExtendPromptChange}
            onConfirm={callbacks.onConfirmExtend}
            onBack={callbacks.onBackToMain}
          />
        )}
      </div>

      {/* 行级注释：点击外部关闭菜单的遮罩层 */}
      <div className="fixed inset-0 z-40" onClick={callbacks.onClose} />
    </>
  );
}

