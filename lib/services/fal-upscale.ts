/**
 * fal.ai 图片放大服务
 *
 * 用于分镜生成时的高清放大处理
 */

import {
  ENABLE_STORYBOARD_UPSCALE,
  STORYBOARD_UPSCALE_RESOLUTION,
} from '@/lib/config/features';

// 行级注释：放大结果类型
interface UpscaleResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * 检查高清放大功能是否启用
 * 注意：API Key 在服务端验证，客户端只检查开关
 * 彩蛋模式（devMode）下强制启用
 *
 * @returns 是否启用
 */
export function isUpscaleEnabled(): boolean {
  // 行级注释：彩蛋模式下强制启用高清放大
  if (typeof window !== 'undefined') {
    try {
      const { useCanvasStore } = require('@/lib/store');
      const devMode = useCanvasStore.getState().apiConfig.devMode;
      if (devMode) return true;
    } catch {
      // 忽略错误
    }
  }
  return ENABLE_STORYBOARD_UPSCALE;
}

/**
 * 放大单张图片到指定分辨率
 *
 * @param imageUrl 原始图片 URL
 * @param resolution 目标分辨率 ('2K' | '4K')
 * @param apiKey 可选的用户 API Key（优先使用用户的，其次服务端环境变量）
 * @returns 放大后的图片 URL
 */
export async function upscaleImage(
  imageUrl: string,
  resolution: '2K' | '4K' = STORYBOARD_UPSCALE_RESOLUTION,
  apiKey?: string
): Promise<UpscaleResult> {
  // 行级注释：用户传入 apiKey 时直接启用，否则检查系统配置
  const shouldUpscale = apiKey ? true : isUpscaleEnabled();
  
  if (!shouldUpscale) {
    return {
      success: true,
      imageUrl: imageUrl,
    };
  }

  try {
    // 行级注释：如果有用户 API Key 则传递，否则使用服务端环境变量
    const response: Response = await fetch('/api/fal/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        resolution,
        syncMode: true,
        apiKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `放大失败: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error('放大请求失败');
    }
    
    const upscaledUrl = result.data?.imageUrl;
    if (!upscaledUrl) {
      throw new Error('放大返回的 imageUrl 为空');
    }

    return {
      success: true,
      imageUrl: upscaledUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      imageUrl: imageUrl,
      error: error.message,
    };
  }
}

/**
 * 批量放大多张图片
 *
 * 注意：fal.ai 限制每用户 2 个并发任务
 * 因此采用串行处理，避免触发限流
 *
 * @param imageUrls 原始图片 URL 数组
 * @param resolution 目标分辨率
 * @param onProgress 进度回调
 * @returns 放大后的图片 URL 数组
 */
export async function upscaleImages(
  imageUrls: string[],
  resolution: '2K' | '4K' = STORYBOARD_UPSCALE_RESOLUTION,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  // 行级注释：如果功能未启用，直接返回原图数组
  if (!isUpscaleEnabled()) {
    return imageUrls;
  }

  const results: string[] = [];

  // 行级注释：串行处理，避免并发限制
  for (let i = 0; i < imageUrls.length; i++) {
    const result = await upscaleImage(imageUrls[i], resolution);
    results.push(result.imageUrl || imageUrls[i]);

    if (onProgress) {
      onProgress(i + 1, imageUrls.length);
    }
  }

  return results;
}

