/**
 * 图片生成服务
 * 
 * 职责：处理图片生成相关的业务逻辑
 * 依赖：
 * - 工具层 (lib/tools/image-api.ts)
 * - 配置层 (lib/config/tier-config.ts)
 * - 服务层 (prompt-builder.service.ts, node-management.service.ts)
 */

import { ImageElement } from '../types';
import { generateImageDirectly, uploadImageDirectly } from '../tools/image-api';
import { buildFinalPrompt, getApiContext, updateSessionContext, validateApiConfig } from './prompt-builder.service';
import {
  createImagePlaceholders,
  updateImagePlaceholders,
  deletePlaceholders,
  getRightSidePosition,
} from './node-management.service';
import type { AspectRatio } from '../config/tier-config';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 图片生成选项
 */
export interface GenerateImageOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  count?: number;
  position: { x: number; y: number };
  usePrefixPrompt?: boolean;  // 是否使用前置提示词（默认 true）
}

/**
 * 图生图选项
 */
export interface ImageToImageOptions {
  prompt: string;
  aspectRatio: AspectRatio;
  count?: number;
  usePrefixPrompt?: boolean;  // 图生图默认不使用前置提示词
}

/**
 * 图片生成结果
 */
export interface GenerateImageResult {
  nodeIds: string[];
  images: Array<{
    imageUrl: string;
    base64?: string;
    mediaId?: string;
    mediaGenerationId?: string;
  }>;
}

// ============================================================================
// 服务函数
// ============================================================================

/**
 * 文生图服务
 * 
 * @param options 生成选项
 * @returns 生成结果（包含节点ID和图片数据）
 * 
 * @example
 * const result = await generateImages({
 *   prompt: 'a cute cat',
 *   aspectRatio: '16:9',
 *   count: 2,
 *   position: { x: 100, y: 100 }
 * });
 */
export async function generateImages(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const { prompt, aspectRatio, count = 1, position, usePrefixPrompt = true } = options;
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();

  // 行级注释：验证 API 配置
  const validation = validateApiConfig(true);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 行级注释：构建最终提示词（根据选项决定是否附加前置提示词）
  const finalPrompt = usePrefixPrompt ? buildFinalPrompt(prompt) : prompt;

  // 行级注释：使用节点管理服务创建占位符节点
  const placeholderIds = createImagePlaceholders(count, position, aspectRatio, {
    prompt,
    generatedFromType: 'input',
  });

  try {
    // 行级注释：调用工具层 API 生成图片
    const result = await generateImageDirectly(
      finalPrompt,
      apiConfig.bearerToken,
      apiConfig.projectId,
      sessionId,
      aspectRatio,
      accountTier,
      undefined, // references
      undefined, // seed
      count,
      imageModel
    );

    // 行级注释：更新会话上下文
    updateSessionContext(result.sessionId);

    // 行级注释：使用节点管理服务更新占位符节点
    updateImagePlaceholders(placeholderIds, result.images.map(img => ({
      imageUrl: img.fifeUrl,
      base64: img.encodedImage,
      mediaId: img.mediaId || img.mediaGenerationId,
      mediaGenerationId: img.mediaGenerationId,
    })));

    return {
      nodeIds: placeholderIds,
      images: result.images.map(img => ({
        imageUrl: img.fifeUrl || '',
        base64: img.encodedImage,
        mediaId: img.mediaId,
        mediaGenerationId: img.mediaGenerationId,
      })),
    };
  } catch (error) {
    // 行级注释：生成失败时使用节点管理服务删除占位符
    deletePlaceholders(placeholderIds);
    throw error;
  }
}

/**
 * 图生图服务
 * 
 * @param sourceImage 源图片元素
 * @param options 生成选项
 * @returns 生成结果
 */
export async function generateImageFromImage(
  sourceImage: ImageElement,
  options: ImageToImageOptions
): Promise<GenerateImageResult> {
  const { prompt, aspectRatio, count = 1, usePrefixPrompt = false } = options;
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();

  // 行级注释：验证 API 配置
  const validation = validateApiConfig(true);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 行级注释：获取或上传源图片的 mediaId
  let effectiveMediaId = sourceImage.mediaId || sourceImage.mediaGenerationId;
  if (!effectiveMediaId) {
    const base64 = sourceImage.base64 || extractBase64FromDataUrl(sourceImage.src);
    if (!base64) {
      throw new Error('源图片缺少 base64 数据，无法上传');
    }
    
    const uploadResult = await uploadImageDirectly(base64, apiConfig.bearerToken, sessionId);
    effectiveMediaId = uploadResult.mediaGenerationId;

    if (!effectiveMediaId) {
      throw new Error('上传图片失败：未获取到 mediaGenerationId');
    }
  }

  // 行级注释：使用节点管理服务计算位置（源图片右侧）
  const position = getRightSidePosition(
    sourceImage.position,
    sourceImage.size || { width: 400, height: 225 }
  );

  // 行级注释：使用节点管理服务创建占位符节点（标记来源为图生图）
  const placeholderIds = createImagePlaceholders(count, position, aspectRatio, {
    prompt,
    generatedFromType: 'image-to-image',
    sourceIds: [sourceImage.id],
  });

  try {
    // 行级注释：图生图不使用前置提示词（除非明确指定）
    const finalPrompt = usePrefixPrompt ? buildFinalPrompt(prompt) : prompt;

    // 行级注释：调用工具层 API（带参考图）
    const result = await generateImageDirectly(
      finalPrompt,
      apiConfig.bearerToken,
      apiConfig.projectId,
      sessionId,
      aspectRatio,
      accountTier,
      [{ mediaId: effectiveMediaId }],  // 参考图
      undefined, // seed
      count,
      imageModel
    );

    // 行级注释：更新会话上下文
    updateSessionContext(result.sessionId);

    // 行级注释：使用节点管理服务更新占位符节点
    updateImagePlaceholders(placeholderIds, result.images.map(img => ({
      imageUrl: img.fifeUrl,
      base64: img.encodedImage,
      mediaId: img.mediaId || img.mediaGenerationId,
      mediaGenerationId: img.mediaGenerationId,
    })));

    return {
      nodeIds: placeholderIds,
      images: result.images.map(img => ({
        imageUrl: img.fifeUrl || '',
        base64: img.encodedImage,
        mediaId: img.mediaId,
        mediaGenerationId: img.mediaGenerationId,
      })),
    };
  } catch (error) {
    // 行级注释：生成失败时使用节点管理服务删除占位符
    deletePlaceholders(placeholderIds);
    throw error;
  }
}

/**
 * 上传图片服务
 * 
 * @param imageBase64 图片 base64 数据
 * @param aspectRatio 宽高比（可选）
 * @returns 上传结果
 */
export async function uploadImage(imageBase64: string, aspectRatio?: AspectRatio) {
  const { apiConfig, sessionId } = getApiContext();

  const validation = validateApiConfig(false);  // 上传不需要 projectId
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const result = await uploadImageDirectly(imageBase64, apiConfig.bearerToken, sessionId, aspectRatio);
  updateSessionContext(result.sessionId);

  return result;
}

// ============================================================================
// 私有辅助函数
// ============================================================================

// 行级注释：createPlaceholderNodes 和 updatePlaceholderNodes 已移至 node-management.service.ts

/**
 * 从 Data URL 提取 base64
 */
function extractBase64FromDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1] || '';
  }
  return dataUrl;
}

