/**
 * 提示词构建服务
 * 
 * 职责：处理提示词相关的业务逻辑
 * - 构建最终提示词（附加前置提示词）
 * - 获取 API 上下文配置
 * - 更新会话上下文
 */

import { useCanvasStore } from '../store';
import {
  getEffectiveVideoMode,
  type AccountTier,
  type VideoMode,
  type ImageModel,
} from '../config/tier-config';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * API 上下文配置
 */
export interface ApiContext {
  apiConfig: ReturnType<typeof useCanvasStore.getState>['apiConfig'];
  sessionId: string;
  accountTier: AccountTier;
  imageModel: ImageModel;
  videoModel: VideoMode;
}

// ============================================================================
// 服务函数
// ============================================================================

/**
 * 构建最终提示词（附加前置提示词）
 * 
 * @param userPrompt 用户输入的提示词
 * @param prefixPrompt 前置提示词（可选，默认从 store 读取）
 * @returns 完整的提示词
 * 
 * @example
 * // 使用 store 中的前置提示词
 * buildFinalPrompt('a cute cat')  
 * // => 'a cute cat, cinematic lighting, high quality'
 * 
 * // 使用自定义前置提示词
 * buildFinalPrompt('a cute cat', 'anime style')  
 * // => 'a cute cat, anime style'
 */
export function buildFinalPrompt(userPrompt: string, prefixPrompt?: string): string {
  // 行级注释：检查前置提示词是否启用
  const store = useCanvasStore.getState();
  const isEnabled = store.prefixPromptEnabled;

  if (!isEnabled) {
    return userPrompt; // 未启用，直接返回用户提示词
  }

  const prefix = prefixPrompt !== undefined
    ? prefixPrompt
    : store.currentPrefixPrompt;

  if (!prefix || !prefix.trim()) {
    return userPrompt;
  }

  // 行级注释：前置提示词实际后置（附加在用户提示词之后）
  return `${userPrompt}, ${prefix.trim()}`;
}

/**
 * 获取 API 配置和会话信息
 * 
 * @returns API 上下文配置
 * 
 * @example
 * const { apiConfig, sessionId, accountTier, imageModel, videoModel } = getApiContext();
 */
export function getApiContext(): ApiContext {
  const apiConfig = useCanvasStore.getState().apiConfig;

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = useCanvasStore.getState().regenerateFlowContext();
    sessionId = context.sessionId;
  }

  const accountTier: AccountTier = apiConfig.accountTier || 'pro';
  const imageModel: ImageModel = apiConfig.imageModel || 'nanobanana';
  // 行级注释：使用 tier-config 适配器获取有效视频模式（Pro 自动降级为 fast）
  const videoModel: VideoMode = getEffectiveVideoMode(accountTier, apiConfig.videoModel as VideoMode | undefined);

  return {
    apiConfig,
    sessionId,
    accountTier,
    imageModel,
    videoModel,
  };
}

/**
 * 更新会话上下文（如果 sessionId 变化）
 * 
 * @param newSessionId 新的会话 ID
 */
export function updateSessionContext(newSessionId?: string): void {
  if (!newSessionId) return;

  const apiConfig = useCanvasStore.getState().apiConfig;
  if (newSessionId !== apiConfig.sessionId) {
    useCanvasStore.getState().setApiConfig({ sessionId: newSessionId });
  }
}

/**
 * 验证 API 配置是否完整
 * 
 * @param requireProjectId 是否需要 projectId
 * @returns 验证结果
 */
export function validateApiConfig(requireProjectId: boolean = true): { valid: boolean; error?: string } {
  const { apiConfig } = getApiContext();

  if (!apiConfig.bearerToken?.trim()) {
    return { valid: false, error: '请先在右上角设置中配置 Bearer Token' };
  }

  if (requireProjectId && !apiConfig.projectId?.trim()) {
    return { valid: false, error: '请在设置中配置 Flow Project ID' };
  }

  return { valid: true };
}

