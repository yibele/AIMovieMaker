/**
 * 图片 API 工具层
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
  uploadImageDirectly,
  generateImageDirectly,
} from '../direct-google-api';

// ============================================================================
// 类型定义
// ============================================================================

import type { AccountTier, AspectRatio, ImageModel } from '../config/tier-config';

/**
 * 图片生成参数
 */
export interface ImageGenerationParams {
  prompt: string;
  bearerToken: string;
  projectId: string;
  sessionId: string;
  aspectRatio: AspectRatio;
  accountTier: AccountTier;
  model: ImageModel;
  references?: Array<{ mediaId?: string; mediaGenerationId?: string }>;
  seed?: number;
  count?: number;
  prompts?: string[];  // 支持多个不同的 prompt
}

/**
 * 图片生成结果
 */
export interface ImageGenerationResult {
  images: Array<{
    encodedImage?: string;  // base64
    fifeUrl?: string;       // Google URL
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    mimeType?: string;
  }>;
  sessionId: string;
}

/**
 * 图片上传参数
 */
export interface ImageUploadParams {
  imageBase64: string;
  bearerToken: string;
  sessionId: string;
  aspectRatio?: AspectRatio;
}

/**
 * 图片上传结果
 */
export interface ImageUploadResult {
  mediaGenerationId?: string;
  width?: number;
  height?: number;
  workflowId?: string;
  sessionId: string;
}

