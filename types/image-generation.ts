import { ImageElement, TextElement } from '@/lib/types';

// 行级注释：图片比例类型
export type ImageAspectRatio = '9:16' | '16:9' | '1:1';

// 行级注释：视频比例类型
export type VideoAspectRatio = '9:16' | '16:9';

// 行级注释：根据比例计算图片尺寸
export function getImageSizeFromRatio(aspectRatio: ImageAspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': // 竖图
      return { width: 180, height: 320 };
    case '16:9': // 横图
      return { width: 320, height: 180 };
    case '1:1': // 方图
      return { width: 180, height: 180 };
  }
}

// 行级注释：根据比例计算视频尺寸
export function getVideoSizeFromRatio(aspectRatio: VideoAspectRatio): { width: number; height: number } {
  if (aspectRatio === '9:16') {
    return { width: 270, height: 480 };
  } else {
    return { width: 480, height: 270 };
  }
}

// 行级注释：计算目标节点位置（在源节点右侧）
export function getTargetPositionRightOf(
  sourceNode: ImageElement | TextElement,
  offsetX: number = 100,
  defaultWidth: number = 200
): { x: number; y: number } {
  return {
    x: sourceNode.position.x + (sourceNode.size?.width || defaultWidth) + offsetX,
    y: sourceNode.position.y,
  };
}

