import { CanvasElement, ReshootMotionType } from '@/lib/types';

// 行级注释：图片连线阶段临时保存用户选择的比例和提示词
export type ImagePromptConfig = {
  aspectRatio: '9:16' | '16:9' | '1:1';
  prompt: string;
};

// 行级注释：连线菜单的状态类型
export type ConnectionMenuState = {
  visible: boolean;
  position: { x: number; y: number };
  sourceNodeId: string | null;
  sourceNodeType: CanvasElement['type'] | null;
  activeSubmenu: 'image' | 'video' | 'imagePrompt' | 'cameraControl' | 'cameraPosition' | 'extendVideo' | 'customNextShotInput' | null;
  pendingImageConfig: ImagePromptConfig | null;
  pendingExtendPrompt?: string; // 行级注释：延长视频的提示词
};

// 行级注释：连线菜单的操作回调类型
export type ConnectionMenuCallbacks = {
  onShowImageSubmenu: () => void;
  onShowVideoSubmenu: () => void;
  onGenerateImage: (aspectRatio: '9:16' | '16:9' | '1:1') => void;
  onGenerateVideo: (aspectRatio: '9:16' | '16:9') => void;
  onImagePromptInputChange: (value: string) => void;
  onConfirmImagePrompt: () => void;
  onBackToMain: () => void;
  onBackToImageSubmenu: () => void;
  onClose: () => void;
  // 新增：镜头控制回调
  onShowCameraControlSubmenu: () => void;
  onShowCameraPositionSubmenu: () => void;
  onGenerateReshoot: (motionType: ReshootMotionType) => void;
  // 新增：视频延长回调
  onShowExtendVideoSubmenu: () => void;
  onExtendPromptChange: (value: string) => void;
  onConfirmExtend: () => void;
  // Next Shot callbacks
  onAutoNextShot: () => void;
  onCustomNextShot: () => void;
  onConfirmCustomNextShot: () => void;
};

