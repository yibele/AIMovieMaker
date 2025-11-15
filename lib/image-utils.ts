// 图片工具函数

/**
 * 加载图片并获取其实际尺寸
 */
export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = src;
  });
}

/**
 * 根据宽高比计算合适的显示尺寸
 */
export function calculateDisplaySize(
  originalWidth: number,
  originalHeight: number,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
) {
  const {
    maxWidth = 640,
    maxHeight = 640,
    minWidth = 200,
    minHeight = 150,
  } = options;

  const aspectRatio = originalWidth / originalHeight;
  let width = originalWidth;
  let height = originalHeight;

  // 如果图片太大，按比例缩小
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  // 确保最小尺寸
  width = Math.max(width, minWidth);
  height = Math.max(height, minHeight);

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}