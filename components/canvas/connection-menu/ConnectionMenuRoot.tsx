import React from 'react';
import { ConnectionMenuState, ConnectionMenuCallbacks } from '@/types/connection-menu';
import ImageSubmenu from './ImageSubmenu';
import VideoSubmenu from './VideoSubmenu';
import ImagePromptInput from './ImagePromptInput';
import CameraControlSubmenu from './CameraControlSubmenu';
import { Image as ImageIcon, Video as VideoIcon, Camera, Move, Sparkles, Clapperboard, MessageSquarePlus, Layers, ArrowRight } from 'lucide-react';

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
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors text-left border-b border-gray-50 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <VideoIcon size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">生成视频</div>
                    <div className="text-xs text-gray-500">Generate Video</div>
                  </div>
                </button>

                {/* Next Shot Options */}
                <button
                  onClick={callbacks.onShowAutoNextShotCountSubmenu}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-green-50 transition-colors text-left border-b border-gray-50 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors">
                    <Clapperboard size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">自动分镜</div>
                    <div className="text-xs text-gray-500">Auto Next Shot</div>
                  </div>
                </button>
                <button
                  onClick={callbacks.onCustomNextShot}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-orange-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
                    <MessageSquarePlus size={18} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">自定义分镜</div>
                    <div className="text-xs text-gray-500">Custom Next Shot</div>
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

        {/* 行级注释：自定义分镜输入界面 */}
        {state.activeSubmenu === 'customNextShotInput' && (
          <ImagePromptInput
            title="输入分镜内容"
            placeholder="描述你想要的下一个分镜..."
            aspectRatio={state.pendingImageConfig?.aspectRatio ?? '16:9'} // Default to 16:9 for next shot
            prompt={state.pendingImageConfig?.prompt ?? ''}
            inputRef={promptInputRef}
            onPromptChange={callbacks.onImagePromptInputChange}
            onConfirm={callbacks.onConfirmCustomNextShot}
            onBack={callbacks.onBackToMain}
          />
        )}

        {/* Auto Next Shot Count Selection */}
        {state.activeSubmenu === 'autoNextShotCount' && (
          <div className="w-[240px]">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <button
                onClick={callbacks.onBackToMain}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
              <span className="text-sm font-semibold text-gray-900">选择分镜数量</span>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => callbacks.onAutoNextShot(count)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors font-medium">
                    {count}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">生成 {count} 个分镜</div>
                    <div className="text-xs text-gray-500">Generate {count} Shot{count > 1 ? 's' : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
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
      </div >

      {/* 行级注释：点击外部关闭菜单的遮罩层 */}
      < div className="fixed inset-0 z-40" onClick={callbacks.onClose} />
    </>
  );
}

