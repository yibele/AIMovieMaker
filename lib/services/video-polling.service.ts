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

  // 行级注释：记录连续网络错误次数
  let consecutiveNetworkErrors = 0;
  const MAX_NETWORK_ERRORS = 3;

  for (let attempt = 1; attempt <= VIDEO_MAX_ATTEMPTS; attempt++) {

    try {
      // 行级注释：直接调用 Google API 查询状态
      const result = await checkVideoStatusDirectly(
        operationName,
        bearerToken,
        sceneId
      );

      // 行级注释：成功获取状态，重置网络错误计数
      consecutiveNetworkErrors = 0;

      const status = result.status;

      // 行级注释：失败状态 - 立即抛出错误
      if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
        const errorMessage = result.error || '视频生成失败';
        throw new Error(errorMessage);
      }

      // 行级注释：成功状态 - 直接返回视频数据
      if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {

        if (!result.videoUrl) {
          throw new Error('视频生成成功但返回地址为空');
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



    } catch (error: any) {
      // 行级注释：区分业务错误和网络错误
      const isNetworkError = 
        error.message?.includes('fetch') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT') ||
        error.name === 'TypeError'; // fetch 失败通常是 TypeError

      if (isNetworkError) {
        consecutiveNetworkErrors++;

        // 行级注释：连续网络错误达到上限才抛出
        if (consecutiveNetworkErrors >= MAX_NETWORK_ERRORS) {
          throw new Error('网络连接不稳定，请检查网络后重试');
        }
        // 行级注释：网络错误时继续重试
      } else {
        // 行级注释：业务错误（如 FAILED 状态）直接抛出
        throw error;
      }
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

