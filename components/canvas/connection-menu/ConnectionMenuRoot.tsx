import React from 'react';
import { ConnectionMenuState, ConnectionMenuCallbacks } from '@/types/connection-menu';
import ImageSubmenu from './ImageSubmenu';
import VideoSubmenu from './VideoSubmenu';
import ImagePromptInput from './ImagePromptInput';
import CameraControlSubmenu from './CameraControlSubmenu';
import { Image as ImageIcon, Video as VideoIcon, Camera, Move, Sparkles, Clapperboard, MessageSquarePlus, ArrowLeft, Lock } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';

// 行级注释：连线菜单根组件的 Props
type ConnectionMenuRootProps = {
  state: ConnectionMenuState;
  callbacks: ConnectionMenuCallbacks;
  promptInputRef: React.RefObject<HTMLInputElement | null>;
};

// 行级注释：简洁的菜单按钮组件
function MenuButton({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-500/20',
    purple: 'text-purple-500 hover:bg-purple-500/10 dark:hover:bg-purple-500/20',
    green: 'text-green-500 hover:bg-green-500/10 dark:hover:bg-green-500/20',
    orange: 'text-orange-500 hover:bg-orange-500/10 dark:hover:bg-orange-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 flex items-center gap-3 rounded-lg transition-all duration-150 text-left ${colorClasses[color]}`}
    >
      <Icon size={18} strokeWidth={2} />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
    </button>
  );
}

// 行级注释：连线菜单根组件 - 处理菜单显示逻辑和子菜单切换
export default function ConnectionMenuRoot({
  state,
  callbacks,
  promptInputRef,
}: ConnectionMenuRootProps) {
  // 行级注释：获取凭证模式，Cloud Mode 下禁用高级视频功能
  const credentialMode = useCanvasStore((s) => s.apiConfig.credentialMode);
  const isCloudMode = credentialMode === 'cloud';

  if (!state.visible) {
    return null;
  }

  return (
    <>
      {/* 行级注释：菜单容器 - 简洁胶囊风格 */}
      <div
        className="fixed z-50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden min-w-[180px] p-1.5"
        style={{
          left: `${state.position.x}px`,
          top: `${state.position.y}px`,
        }}
      >
        {/* 行级注释：主菜单 - 选择生成图片或视频 */}
        {state.activeSubmenu === null && (
          <div className="space-y-0.5">
            {state.sourceNodeType !== 'video' ? (
              <>
                <MenuButton
                  icon={ImageIcon}
                  label="生成图片"
                  color="blue"
                  onClick={callbacks.onShowImageSubmenu}
                />
                <MenuButton
                  icon={VideoIcon}
                  label="生成视频"
                  color="purple"
                  onClick={() => {
                    if (state.sourceNodeType === 'image') {
                      callbacks.onGenerateVideoFromImage();
                    } else {
                      callbacks.onShowVideoSubmenu();
                    }
                  }}
                />
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                <MenuButton
                  icon={Clapperboard}
                  label="自动分镜"
                  color="green"
                  onClick={callbacks.onShowAutoNextShotCountSubmenu}
                />
                <MenuButton
                  icon={MessageSquarePlus}
                  label="自定义分镜"
                  color="orange"
                  onClick={callbacks.onCustomNextShot}
                />
              </>
            ) : (
              // 视频节点的主菜单 - 镜头控制（Cloud Mode 下禁用）
              isCloudMode ? (
                // 行级注释：Cloud Mode 下显示禁用提示
                <div className="px-3 py-4 text-center">
                  <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    视频高级功能仅限开发者模式
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    请在设置中切换到 Developer Mode
                  </p>
                </div>
              ) : (
                <>
                  <MenuButton
                    icon={Camera}
                    label="镜头控制"
                    color="purple"
                    onClick={callbacks.onShowCameraControlSubmenu}
                  />
                  <MenuButton
                    icon={Move}
                    label="镜头位置"
                    color="purple"
                    onClick={callbacks.onShowCameraPositionSubmenu}
                  />
                  <MenuButton
                    icon={Sparkles}
                    label="延长视频"
                    color="purple"
                    onClick={callbacks.onShowExtendVideoSubmenu}
                  />
                </>
              )
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
            aspectRatio={state.pendingImageConfig?.aspectRatio ?? '16:9'}
            prompt={state.pendingImageConfig?.prompt ?? ''}
            inputRef={promptInputRef}
            onPromptChange={callbacks.onImagePromptInputChange}
            onConfirm={callbacks.onConfirmCustomNextShot}
            onBack={callbacks.onBackToMain}
          />
        )}

        {/* 自动分镜数量选择 - 简化版 */}
        {state.activeSubmenu === 'autoNextShotCount' && (
          <div className="w-[160px]">
            <div className="px-3 py-2 flex items-center gap-2">
              <button
                onClick={callbacks.onBackToMain}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">分镜数量</span>
            </div>
            <div className="px-1.5 pb-1.5 flex gap-1">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  onClick={() => callbacks.onAutoNextShot(count)}
                  className="flex-1 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-green-500/10 dark:hover:bg-green-500/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all"
                >
                  {count}
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
      </div>

      {/* 行级注释：点击外部关闭菜单的遮罩层 */}
      <div className="fixed inset-0 z-40" onClick={callbacks.onClose} />
    </>
  );
}
