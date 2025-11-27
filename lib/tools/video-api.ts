/**
 * 视频 API 工具层
 * 
 * 职责：纯 API 调用，不包含任何业务逻辑
 * 特点：
 * - 只接收必要的参数，不从 store 读取
 * - 只返回 API 原始结果，不做业务转换
 * - 统一错误处理格式
 */

// ============================================================================
// 从 direct-google-api.ts 导出纯 API 函数
// ============================================================================

export {
  generateVideoTextDirectly,
  generateVideoImageDirectly,
  generateVideoUpsampleDirectly,
  generateVideoReshootDirectly,
  generateVideoExtendDirectly,
  checkVideoStatusDirectly,
  getVideoCreditStatus,
} from '../direct-google-api';

// ============================================================================
// 类型定义
// ============================================================================

import type { AccountTier, AspectRatio, VideoMode } from '../config/tier-config';
import type { ReshootMotionType } from '../types';

/**
 * 文生视频参数
 */
export interface TextToVideoParams {
  prompt: string;
  bearerToken: string;
  projectId: string;
  sessionId: string;
  aspectRatio: AspectRatio;
  accountTier: AccountTier;
  videoModel: VideoMode;
  seed?: number;
  sceneId?: string;
}

/**
 * 图生视频参数
 */
export interface ImageToVideoParams extends TextToVideoParams {
  startMediaId: string;
  endMediaId?: string;  // 首尾帧模式时提供
}

/**
 * 视频超清放大参数
 */
export interface VideoUpsampleParams {
  mediaId: string;
  bearerToken: string;
  sessionId: string;
  aspectRatio: AspectRatio;
  seed?: number;
}

/**
 * 视频镜头控制参数
 */
export interface VideoReshootParams {
  mediaId: string;
  motionType: ReshootMotionType;
  bearerToken: string;
  sessionId: string;
  projectId: string;
  aspectRatio: AspectRatio;
  accountTier: AccountTier;
  seed?: number;
  sceneId?: string;
}

/**
 * 视频延长参数
 */
export interface VideoExtendParams {
  mediaId: string;
  prompt: string;
  bearerToken: string;
  sessionId: string;
  projectId: string;
  aspectRatio: AspectRatio;
  accountTier: AccountTier;
  videoModel: VideoMode;
  startFrameIndex?: number;
  endFrameIndex?: number;
  seed?: number;
  sceneId?: string;
}

/**
 * 视频操作结果（生成任务提交后）
 */
export interface VideoOperationResult {
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}

/**
 * 视频状态查询结果
 */
export interface VideoStatusResult {
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  mediaGenerationId?: string;
  error?: string;
  remainingCredits?: number;
}

/**
 * 视频生成状态枚举
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

/**
 * 视频积分状态
 */
export interface VideoCreditStatus {
  credits: number;
  userPaygateTier: string;
  g1MembershipState: string;
  isUserAnimateCountryEnabled: boolean;
}

