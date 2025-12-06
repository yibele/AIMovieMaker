/**
 * Sora2 视频生成服务
 * 
 * 职责：处理 Sora2 视频生成的完整流程（调用 apimart.ai）
 * - 提交生成任务
 * - 轮询任务状态
 * - 获取视频下载链接
 * 
 * 文档: https://api.apimart.ai
 */

import { useCanvasStore } from '../store';

// ============================================================================
// 常量配置
// ============================================================================

// 行级注释：Sora2 API 基础地址
const SORA2_API_BASE = 'https://api.apimart.ai';

// 行级注释：轮询间隔（10秒）
const POLL_INTERVAL_MS = 10000;

// 行级注释：最大轮询次数（约 20 分钟）
const MAX_POLL_ATTEMPTS = 120;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Sora2 视频生成选项
 */
export interface Sora2VideoOptions {
  prompt: string;
  duration?: 10 | 15;      // 视频时长（秒），10 或 15，默认 10
  aspectRatio?: '16:9' | '9:16' | '1:1';  // 宽高比
  imageUrls?: string[];    // 参考图片 URL（图生视频模式）
}

/**
 * Sora2 视频生成结果
 */
export interface Sora2VideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  taskId: string;
  width: number;
  height: number;
}

/**
 * 任务状态
 */
type TaskStatus = 'submitted' | 'processing' | 'completed' | 'failed';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 获取 Sora2 API Key
 */
function getSora2ApiKey(): string {
  const { apiConfig } = useCanvasStore.getState();
  const apiKey = apiConfig.sora2ApiKey?.trim();
  
  if (!apiKey) {
    throw new Error('请先在设置中配置 Sora2 API Key');
  }
  
  return apiKey;
}

// ============================================================================
// 核心服务函数
// ============================================================================

/**
 * 提交 Sora2 视频生成任务
 */
export async function submitSora2VideoTask(options: Sora2VideoOptions): Promise<string> {
  const { prompt, duration = 10, aspectRatio = '16:9', imageUrls } = options;
  const apiKey = getSora2ApiKey();

  // 行级注释：构建请求体
  const requestBody: Record<string, any> = {
    model: 'sora-2',
    prompt,
    duration,
    aspect_ratio: aspectRatio,
  };

  // 行级注释：如果有参考图片，添加到请求（图生视频模式）
  if (imageUrls && imageUrls.length > 0) {
    requestBody.image_urls = imageUrls;
  }

  // 行级注释：调用 Sora2 API
  const response = await fetch(`${SORA2_API_BASE}/v1/videos/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  // 行级注释：检查响应
  if (!response.ok || data.code !== 200) {
    throw new Error(data.message || '提交 Sora2 视频任务失败');
  }

  // 行级注释：从响应中提取 task_id
  const taskId = data.data?.[0]?.task_id;
  if (!taskId) {
    throw new Error('Sora2 响应缺少 task_id');
  }

  return taskId;
}

/**
 * 查询 Sora2 视频任务状态
 */
export async function checkSora2TaskStatus(taskId: string): Promise<{
  status: TaskStatus;
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  errorMessage?: string;
}> {
  const apiKey = getSora2ApiKey();

  // 行级注释：调用 Sora2 任务查询 API
  const response = await fetch(
    `${SORA2_API_BASE}/v1/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  const responseData = await response.json();

  if (!response.ok || responseData.code !== 200) {
    throw new Error(responseData.message || '查询 Sora2 任务状态失败');
  }

  // 行级注释：数据在 data 字段内
  const data = responseData.data;
  
  // 行级注释：解析视频结果（url 是数组）
  const video = data.result?.videos?.[0];
  const videoUrl = Array.isArray(video?.url) ? video.url[0] : video?.url;
  

  
  return {
    status: data.status as TaskStatus,
    progress: data.progress,
    videoUrl: videoUrl,
    thumbnailUrl: videoUrl, // Sora2 没有单独的缩略图，使用视频 URL
    duration: data.actual_time || data.estimated_time,
    width: video?.width,
    height: video?.height,
    errorMessage: data.error,
  };
}

/**
 * 轮询 Sora2 视频生成状态
 * 
 * @param taskId 任务 ID
 * @param onProgress 进度回调（可选）
 * @returns 视频生成结果
 */
export async function pollSora2VideoTask(
  taskId: string,
  onProgress?: (attempt: number, status: TaskStatus, progress?: number) => void
): Promise<Sora2VideoResult> {

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const result = await checkSora2TaskStatus(taskId);
      
      // 行级注释：通知进度
      onProgress?.(attempt, result.status, result.progress);

      // 行级注释：失败状态 - 立即停止并抛出错误
      if (result.status === 'failed') {
        const errorMsg = result.errorMessage || 'Sora2 视频生成失败';
        throw new Error(`Sora2 视频生成失败: ${errorMsg}`);
      }

      // 行级注释：成功状态 - 返回结果
      if (result.status === 'completed' && result.videoUrl) {

        return {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl || result.videoUrl,
          duration: result.duration || 10,
          taskId,
          width: result.width || 1920,
          height: result.height || 1080,
        };
      }

      // 行级注释：处理中状态 - 继续轮询

    } catch (error) {
      // 行级注释：如果是业务错误，直接抛出，停止轮询
      if (error instanceof Error && (error.message.includes('失败') || error.message.includes('failed'))) {
        throw error;
      }
    }

    // 行级注释：等待后进行下一次轮询
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('Sora2 视频生成超时，请稍后重试');
}

/**
 * 完整的 Sora2 视频生成流程
 * 
 * @param options 生成选项
 * @param onProgress 进度回调
 * @returns 视频生成结果
 */
export async function generateSora2Video(
  options: Sora2VideoOptions,
  onProgress?: (stage: 'submitting' | 'processing' | 'downloading', progress: number) => void
): Promise<Sora2VideoResult> {
  // 行级注释：阶段1 - 提交任务
  onProgress?.('submitting', 10);
  const taskId = await submitSora2VideoTask(options);

  // 行级注释：阶段2 - 轮询状态
  onProgress?.('processing', 20);
  const result = await pollSora2VideoTask(taskId, (attempt, status, apiProgress) => {
    // 行级注释：如果 API 返回了进度，使用 API 进度；否则估算
    const progress = apiProgress !== undefined 
      ? Math.min(90, 20 + apiProgress * 0.7) 
      : 20 + Math.min(70, attempt * 1.5);
    onProgress?.('processing', progress);
  });

  // 行级注释：阶段3 - 完成
  onProgress?.('downloading', 100);

  return result;
}

