/**
 * fal.ai 图片放大服务
 *
 * 用于分镜生成时的高清放大处理
 */

import {
  ENABLE_STORYBOARD_UPSCALE,
  STORYBOARD_UPSCALE_RESOLUTION,
  DEBUG_MODE,
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
 *
 * @returns 是否启用
 */
export function isUpscaleEnabled(): boolean {
  return ENABLE_STORYBOARD_UPSCALE;
}

/**
 * 放大单张图片到指定分辨率
 *
 * @param imageUrl 原始图片 URL
 * @param resolution 目标分辨率 ('2K' | '4K')
 * @returns 放大后的图片 URL
 */
export async function upscaleImage(
  imageUrl: string,
  resolution: '2K' | '4K' = STORYBOARD_UPSCALE_RESOLUTION
): Promise<UpscaleResult> {
  // 行级注释：如果功能未启用，直接返回原图
  if (!isUpscaleEnabled()) {
    if (DEBUG_MODE) {
      console.log('⚠️ 高清放大功能未启用，返回原图');
    }
    return {
      success: true,
      imageUrl: imageUrl,
    };
  }

  try {
    if (DEBUG_MODE) {
      console.log(`📸 开始放大图片到 ${resolution}...`);
    }

    // 行级注释：API Key 在服务端从环境变量读取，不从客户端传递
    const response = await fetch('/api/fal/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl,
        resolution,
        syncMode: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `放大失败: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data?.imageUrl) {
      throw new Error('放大返回数据异常');
    }

    if (DEBUG_MODE) {
      console.log(`✅ 图片放大完成: ${result.data.width}x${result.data.height}`);
    }

    return {
      success: true,
      imageUrl: result.data.imageUrl,
    };
  } catch (error: any) {
    console.error('❌ 图片放大失败:', error);
    return {
      success: false,
      imageUrl: imageUrl,  // 行级注释：失败时返回原图，保证流程继续
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

