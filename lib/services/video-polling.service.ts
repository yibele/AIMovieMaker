/**
 * 视频轮询服务
 * 
 * 职责：轮询视频生成状态，直到成功或失败
 */

import { useCanvasStore } from '../store';

// ============================================================================
// 常量配置
// ============================================================================

// 行级注释：视频状态轮询间隔（15秒）
const VIDEO_POLL_INTERVAL_MS = 15000;

// 行级注释：最多轮询 60 次（约 15 分钟）
const VIDEO_MAX_ATTEMPTS = 60;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 视频轮询结果
 */
export interface VideoPollingResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  mediaGenerationId?: string;
}

/**
 * 视频生成状态
 */
export type VideoGenerationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'MEDIA_GENERATION_STATUS_PENDING'
  | 'MEDIA_GENERATION_STATUS_ACTIVE'
  | 'MEDIA_GENERATION_STATUS_QUEUED'
  | 'MEDIA_GENERATION_STATUS_SUCCESSFUL'
  | 'MEDIA_GENERATION_STATUS_FAILED';

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 服务函数
// ============================================================================

/**
 * 轮询视频生成状态
 * 
 * @param operationName 操作名称（从视频生成 API 返回）
 * @param bearerToken Bearer Token
 * @param sceneId 场景 ID（可选）
 * @param proxy 代理地址（可选，当前未使用）
 * @returns 视频轮询结果
 * 
 * @example
 * const result = await pollVideoOperation(operationName, bearerToken, sceneId);
 * console.log(result.videoUrl);
 */
export async function pollVideoOperation(
  operationName: string,
  bearerToken: string,
  sceneId?: string,
  proxy?: string
): Promise<VideoPollingResult> {
  // 行级注释：动态导入 API 函数，避免循环依赖
  const { checkVideoStatusDirectly } = await import('../direct-google-api');

  for (let attempt = 1; attempt <= VIDEO_MAX_ATTEMPTS; attempt++) {

    try {
      // 行级注释：直接调用 Google API 查询状态
      const result = await checkVideoStatusDirectly(
        operationName,
        bearerToken,
        sceneId
      );

      const status = result.status;

      // 行级注释：失败状态 - 立即抛出错误
      if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
        const errorMessage = result.error || 'Flow 视频生成失败';
        throw new Error(errorMessage);
      }

      // 行级注释：成功状态 - 直接返回视频数据
      if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {

        if (!result.videoUrl) {
          throw new Error('Flow 返回缺少视频地址');
        }

        // 行级注释：更新积分到 store
        if (typeof result.remainingCredits === 'number') {
          useCanvasStore.getState().setCredits(result.remainingCredits);
        }



        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl || '',
          duration: result.duration || 8,
          mediaGenerationId: result.mediaGenerationId || '',
        };
      }

      // 行级注释：其他状态（PENDING, ACTIVE 等）- 继续轮询

    } catch (error: any) {
      console.error(`❌ 轮询第 ${attempt} 次出错:`, error);
      console.error('错误详情:', error.message, error.stack);

      // 行级注释：直接抛出错误，不要继续轮询了
      throw error;
    }

    // 行级注释：等待后进行下一次轮询
    await delay(VIDEO_POLL_INTERVAL_MS);
  }

  throw new Error('视频生成超时，请稍后重试');
}

/**
 * 轮询视频生成状态（别名，保持向后兼容）
 * @deprecated 请使用 pollVideoOperation
 */
export const pollFlowVideoOperation = pollVideoOperation;

