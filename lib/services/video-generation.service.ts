/**
 * 视频生成服务
 * 
 * 职责：处理视频生成相关的业务逻辑
 * 依赖：
 * - 工具层 (lib/tools/video-api.ts)
 * - 配置层 (lib/config/tier-config.ts)
 * - 服务层 (prompt-builder.service.ts, video-polling.service.ts)
 */

import { VideoElement, ImageElement, ReshootMotionType } from '../types';
import { useCanvasStore } from '../store';
import {
  generateVideoTextDirectly,
  generateVideoImageDirectly,
  generateVideoUpsampleDirectly,
  generateVideoReshootDirectly,
  generateVideoExtendDirectly,
} from '../tools/video-api';
import { buildFinalPrompt, getApiContext, validateApiConfig } from './prompt-builder.service';
import { pollVideoOperation } from './video-polling.service';
import { getVideoNodeSize, detectAspectRatio } from '../constants/node-sizes';
import type { AspectRatio } from '../config/tier-config';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 文生视频选项
 */
export interface TextToVideoOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  seed?: number;
  usePrefixPrompt?: boolean;  // 是否使用前置提示词（默认 true）
}

/**
 * 图生视频选项
 */
export interface ImageToVideoOptions {
  startImageId: string;
  endImageId?: string;  // 首尾帧模式时提供
  prompt?: string;
  usePrefixPrompt?: boolean;  // 图生视频默认不使用前置提示词
}

/**
 * 视频生成结果
 */
export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  mediaGenerationId?: string;
}

// ============================================================================
// 服务函数
// ============================================================================

/**
 * 文生视频服务
 * 
 * @param options 生成选项
 * @returns 生成结果
 * 
 * @example
 * const result = await generateTextToVideo({
 *   prompt: 'A cat walking in the garden',
 *   aspectRatio: '16:9'
 * });
 */
export async function generateTextToVideo(options: TextToVideoOptions): Promise<VideoGenerationResult> {
  const { prompt, aspectRatio, seed, usePrefixPrompt = true } = options;
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();

  // 行级注释：验证 API 配置
  const validation = validateApiConfig(true);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 行级注释：构建最终提示词
  const finalPrompt = usePrefixPrompt ? buildFinalPrompt(prompt) : prompt;

  // 行级注释：生成场景 ID
  const sceneId = crypto.randomUUID();


  // 行级注释：调用工具层 API
  const task = await generateVideoTextDirectly(
    finalPrompt,
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    videoModel,
    seed,
    sceneId
  );

  // 行级注释：轮询等待结果
  const result = await pollVideoOperation(
    task.operationName,
    apiConfig.bearerToken,
    task.sceneId
  );

  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    mediaGenerationId: result.mediaGenerationId,
  };
}

/**
 * 图生视频服务
 * 
 * @param options 生成选项
 * @returns 生成结果
 */
export async function generateImageToVideo(options: ImageToVideoOptions): Promise<VideoGenerationResult> {
  const { startImageId, endImageId, prompt, usePrefixPrompt = false } = options;
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();
  const { elements } = useCanvasStore.getState();

  // 行级注释：验证 API 配置
  const validation = validateApiConfig(true);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 行级注释：获取图片元素
  const startImage = elements.find(el => el.id === startImageId && el.type === 'image') as ImageElement | undefined;
  const endImage = endImageId
    ? elements.find(el => el.id === endImageId && el.type === 'image') as ImageElement | undefined
    : undefined;

  if (!startImage) {
    throw new Error('找不到首帧图片节点');
  }

  // 行级注释：获取 mediaId
  const startMediaId = startImage.mediaId?.trim() || startImage.mediaGenerationId?.trim();
  const endMediaId = endImage
    ? (endImage.mediaId?.trim() || endImage.mediaGenerationId?.trim())
    : undefined;

  if (!startMediaId) {
    throw new Error('首帧图片缺少 Flow mediaId，请先使用 Flow 生成或上传同步');
  }

  if (endImageId && !endImage) {
    throw new Error('找不到尾帧图片节点');
  }

  if (endImageId && !endMediaId) {
    throw new Error('尾帧图片缺少 Flow mediaId，请先使用 Flow 生成或上传同步');
  }

  // 行级注释：推断宽高比
  const aspectRatio = inferAspectRatioFromImages(startImage, endImage);

  // 行级注释：提示词（图生视频默认不使用前置提示词）
  const finalPrompt = usePrefixPrompt
    ? buildFinalPrompt(prompt || 'Seamless transition between scenes')
    : (prompt?.trim() || 'Seamless transition between scenes');

  const sceneId = crypto.randomUUID();

  // 行级注释：调用工具层 API
  const task = await generateVideoImageDirectly(
    finalPrompt,
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    videoModel,
    startMediaId,
    endMediaId,
    undefined, // seed
    sceneId
  );


  // 行级注释：轮询等待结果
  const result = await pollVideoOperation(
    task.operationName,
    apiConfig.bearerToken,
    task.sceneId
  );

  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    mediaGenerationId: result.mediaGenerationId,
  };
}

/**
 * 视频超清放大服务
 * 
 * @param videoElement 视频元素
 * @returns 生成结果
 */
export async function upsampleVideo(videoElement: VideoElement): Promise<VideoGenerationResult> {
  const { apiConfig, sessionId } = getApiContext();

  if (!videoElement.mediaGenerationId) {
    throw new Error('视频缺少 mediaGenerationId');
  }

  // 行级注释：检查宽高比（超清只支持 16:9）
  const aspectRatio = inferVideoAspectRatio(videoElement);
  if (aspectRatio !== '16:9') {
    throw new Error('超清放大仅支持 16:9 横屏视频');
  }


  const task = await generateVideoUpsampleDirectly(
    videoElement.mediaGenerationId,
    apiConfig.bearerToken,
    sessionId,
    aspectRatio
  );

  const result = await pollVideoOperation(
    task.operationName,
    apiConfig.bearerToken,
    task.sceneId
  );

  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    mediaGenerationId: result.mediaGenerationId,
  };
}

/**
 * 视频镜头控制重拍服务
 * 
 * @param videoElement 视频元素
 * @param motionType 运动类型
 * @returns 生成结果
 */
export async function reshootVideo(
  videoElement: VideoElement,
  motionType: ReshootMotionType
): Promise<VideoGenerationResult> {
  const { apiConfig, sessionId, accountTier } = getApiContext();

  if (!videoElement.mediaGenerationId) {
    throw new Error('视频缺少 mediaGenerationId');
  }

  const aspectRatio = inferVideoAspectRatio(videoElement);


  const task = await generateVideoReshootDirectly(
    videoElement.mediaGenerationId,
    motionType,
    apiConfig.bearerToken,
    sessionId,
    apiConfig.projectId,
    aspectRatio,
    accountTier
  );

  const result = await pollVideoOperation(
    task.operationName,
    apiConfig.bearerToken,
    task.sceneId
  );

  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    mediaGenerationId: result.mediaGenerationId,
  };
}

/**
 * 视频延长服务
 * 
 * @param videoElement 视频元素
 * @param prompt 延长提示词
 * @returns 生成结果
 */
export async function extendVideo(
  videoElement: VideoElement,
  prompt: string
): Promise<VideoGenerationResult> {
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();

  if (!videoElement.mediaGenerationId) {
    throw new Error('视频缺少 mediaGenerationId');
  }

  const aspectRatio = inferVideoAspectRatio(videoElement);


  const task = await generateVideoExtendDirectly(
    videoElement.mediaGenerationId,
    prompt,
    apiConfig.bearerToken,
    sessionId,
    apiConfig.projectId,
    aspectRatio,
    accountTier,
    videoModel
  );

  const result = await pollVideoOperation(
    task.operationName,
    apiConfig.bearerToken,
    task.sceneId
  );

  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    mediaGenerationId: result.mediaGenerationId,
  };
}

// ============================================================================
// 私有辅助函数
// ============================================================================

/**
 * 从图片推断宽高比
 */
function inferAspectRatioFromImages(
  startImage?: ImageElement,
  endImage?: ImageElement
): AspectRatio {
  const candidate = startImage?.size || endImage?.size || { width: 400, height: 300 };
  const { width, height } = candidate;

  if (!width || !height) {
    return '9:16';  // 默认竖屏
  }

  return detectAspectRatio(width, height);
}

/**
 * 从视频推断宽高比
 */
function inferVideoAspectRatio(video: VideoElement): AspectRatio {
  const width = video.size?.width || 640;
  const height = video.size?.height || 360;

  return detectAspectRatio(width, height);
}

