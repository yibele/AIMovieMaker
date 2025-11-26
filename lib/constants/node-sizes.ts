/**
 * 节点大小常量定义
 * 统一管理所有节点类型的标准大小
 */

// ============================================================================
// 图片节点大小
// ============================================================================

export const IMAGE_NODE_SIZES = {
  '16:9': { width: 640, height: 360 },  // 横屏
  '9:16': { width: 360, height: 640 },  // 竖屏
  '1:1': { width: 512, height: 512 },   // 方形
} as const;

// 图片节点默认大小（横屏）
export const IMAGE_NODE_DEFAULT_SIZE = IMAGE_NODE_SIZES['16:9'];

// ============================================================================
// 视频节点大小（与图片节点保持一致）
// ============================================================================

export const VIDEO_NODE_SIZES = {
  '16:9': { width: 640, height: 360 },  // 横屏（与图片一致）
  '9:16': { width: 360, height: 640 },  // 竖屏（与图片一致）
} as const;

// 视频节点默认大小（横屏）
export const VIDEO_NODE_DEFAULT_SIZE = VIDEO_NODE_SIZES['16:9'];

// ============================================================================
// 文字节点大小
// ============================================================================

export const TEXT_NODE_DEFAULT_SIZE = { width: 200, height: 80 };

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据比例获取图片节点大小
 */
export function getImageNodeSize(aspectRatio: '16:9' | '9:16' | '1:1') {
  return IMAGE_NODE_SIZES[aspectRatio] || IMAGE_NODE_DEFAULT_SIZE;
}

/**
 * 根据比例获取视频节点大小
 */
export function getVideoNodeSize(aspectRatio: '16:9' | '9:16') {
  return VIDEO_NODE_SIZES[aspectRatio] || VIDEO_NODE_DEFAULT_SIZE;
}

/**
 * 根据宽高判断比例类型
 */
export function detectAspectRatio(width: number, height: number): '16:9' | '9:16' | '1:1' {
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  return '1:1';
}

/**
 * 根据宽高判断视频比例（视频只支持 16:9 和 9:16）
 */
export function detectVideoAspectRatio(width: number, height: number): '16:9' | '9:16' {
  const ratio = width / height;
  // 只有明确是竖屏时才返回 9:16，其他情况都返回 16:9
  return Math.abs(ratio - 9 / 16) < 0.1 ? '9:16' : '16:9';
}

