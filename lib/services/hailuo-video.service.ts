/**
 * 海螺 Hailuo 视频生成服务
 * 
 * 职责：处理海螺视频生成的完整流程（直接调用 DMXAPI）
 * - 提交生成任务
 * - 轮询任务状态
 * - 获取视频下载链接
 * 
 * 文档: https://doc.dmxapi.cn/hailuo-img2video.html
 */

import { useCanvasStore } from '../store';
import type { VideoModelType } from '../types';

// ============================================================================
// 常量配置
// ============================================================================

// 行级注释：DMXAPI 基础地址
const HAILUO_API_BASE = 'https://www.dmxapi.cn';

// 行级注释：轮询间隔（10秒）
const POLL_INTERVAL_MS = 10000;

// 行级注释：最大轮询次数（约 10 分钟）
const MAX_POLL_ATTEMPTS = 60;

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 海螺视频生成选项
 */
export interface HailuoVideoOptions {
  prompt: string;
  model: VideoModelType;
  firstFrameImage?: string;  // 首帧图片 URL 或 Base64
  lastFrameImage?: string;   // 尾帧图片 URL 或 Base64（仅 hailuo-2.0 支持）
  duration?: number;         // 视频时长（秒），默认 6
}

/**
 * 海螺视频生成结果
 */
export interface HailuoVideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  taskId: string;
  fileId: string;
}

/**
 * 任务状态
 * 注意：API 返回的失败状态是 'Fail' 不是 'Failed'
 */
type TaskStatus = 'Processing' | 'Success' | 'Fail';

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
 * 获取海螺 API Key
 */
function getHailuoApiKey(): string {
  const { apiConfig } = useCanvasStore.getState();
  const apiKey = apiConfig.hailuoApiKey?.trim();
  
  if (!apiKey) {
    throw new Error('请先在设置中配置海螺 API Key');
  }
  
  return apiKey;
}

/**
 * 获取海螺模型名称
 */
function getHailuoModelName(model: VideoModelType): string {
  const modelMap: Record<string, string> = {
    'hailuo-2.3': 'MiniMax-Hailuo-2.3',
    'hailuo-2.3-fast': 'MiniMax-Hailuo-2.3-Fast',
    'hailuo-2.0': 'MiniMax-Hailuo-02',
  };
  
  return modelMap[model] || 'MiniMax-Hailuo-2.3';
}

// ============================================================================
// 核心服务函数（直接调用 DMXAPI）
// ============================================================================

/**
 * 提交海螺视频生成任务（直接调用 DMXAPI）
 */
export async function submitHailuoVideoTask(options: HailuoVideoOptions): Promise<string> {
  const { prompt, model, firstFrameImage, lastFrameImage, duration = 6 } = options;
  const apiKey = getHailuoApiKey();
  const modelName = getHailuoModelName(model);

  console.log('🎬 提交海螺视频任务:', { 
    model: modelName, 
    prompt: prompt.substring(0, 50) + '...',
    hasFirstFrame: Boolean(firstFrameImage),
    hasLastFrame: Boolean(lastFrameImage),
  });

  // 行级注释：构建请求体
  const requestBody: Record<string, any> = {
    model: modelName,
    prompt,
    duration,
    prompt_optimizer: true,
    aigc_watermark: false,
  };

  // 行级注释：如果有首帧图片，添加到请求
  if (firstFrameImage) {
    requestBody.first_frame_image = firstFrameImage;
  }

  // 行级注释：如果有尾帧图片，添加到请求（仅 hailuo-2.0 支持）
  if (lastFrameImage) {
    requestBody.last_frame_image = lastFrameImage;
  }

  // 行级注释：直接调用 DMXAPI
  const response = await fetch(`${HAILUO_API_BASE}/v1/video_generation`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok || data.base_resp?.status_code !== 0) {
    console.error('❌ 海螺 API 错误:', data);
    throw new Error(data.base_resp?.status_msg || '提交海螺视频任务失败');
  }

  console.log('✅ 海螺任务已提交:', data.task_id);
  return data.task_id;
}

/**
 * 查询海螺视频任务状态（直接调用 DMXAPI）
 */
export async function checkHailuoTaskStatus(taskId: string): Promise<{
  status: TaskStatus;
  fileId?: string;
  videoWidth?: number;
  videoHeight?: number;
  errorMessage?: string;  // 错误信息
  errorCode?: number;     // 错误码
}> {
  const apiKey = getHailuoApiKey();

  // 行级注释：直接调用 DMXAPI
  const response = await fetch(
    `${HAILUO_API_BASE}/v1/query/video_generation?task_id=${encodeURIComponent(taskId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ 海螺状态查询错误:', data);
    throw new Error(data.base_resp?.status_msg || '查询海螺任务状态失败');
  }

  return {
    status: data.status,
    fileId: data.file_id,
    videoWidth: data.video_width,
    videoHeight: data.video_height,
    errorMessage: data.base_resp?.status_msg,  // 返回错误信息
    errorCode: data.base_resp?.status_code,    // 返回错误码
  };
}

/**
 * 获取海螺视频下载链接（直接调用 DMXAPI）
 */
export async function getHailuoVideoDownloadUrl(
  fileId: string,
  taskId: string
): Promise<string> {
  const apiKey = getHailuoApiKey();

  // 行级注释：直接调用 DMXAPI
  const response = await fetch(
    `${HAILUO_API_BASE}/v1/files/retrieve?file_id=${encodeURIComponent(fileId)}&task_id=${encodeURIComponent(taskId)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || data.base_resp?.status_code !== 0) {
    console.error('❌ 海螺下载链接获取错误:', data);
    throw new Error(data.base_resp?.status_msg || '获取海螺视频下载链接失败');
  }

  return data.file.download_url;
}

/**
 * 轮询海螺视频生成状态
 * 
 * @param taskId 任务 ID
 * @param onProgress 进度回调（可选）
 * @returns 视频生成结果
 */
export async function pollHailuoVideoTask(
  taskId: string,
  onProgress?: (attempt: number, status: TaskStatus) => void
): Promise<HailuoVideoResult> {
  console.log('⏳ 开始轮询海螺任务:', taskId);

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const result = await checkHailuoTaskStatus(taskId);
      
      // 行级注释：通知进度
      onProgress?.(attempt, result.status);

      // 行级注释：失败状态 - 立即停止并抛出错误
      if (result.status === 'Fail') {
        const errorMsg = result.errorMessage || '海螺视频生成失败';
        console.error('❌ 海螺任务失败:', { taskId, errorCode: result.errorCode, errorMessage: errorMsg });
        throw new Error(`海螺视频生成失败: ${errorMsg}`);
      }

      // 行级注释：成功状态 - 获取下载链接
      if (result.status === 'Success' && result.fileId) {
        console.log('✅ 海螺任务完成:', { taskId, fileId: result.fileId });

        // 行级注释：获取下载链接
        const downloadUrl = await getHailuoVideoDownloadUrl(result.fileId, taskId);

        return {
          videoUrl: downloadUrl,
          thumbnailUrl: '', // 海螺不返回缩略图，使用视频第一帧
          duration: 6, // 默认时长
          taskId,
          fileId: result.fileId,
        };
      }

      // 行级注释：处理中状态 - 继续轮询
      console.log(`⏳ 海螺任务处理中... (第 ${attempt} 次轮询, 状态: ${result.status})`);

    } catch (error) {
      // 行级注释：如果是业务错误（如 Fail 状态），直接抛出，停止轮询
      if (error instanceof Error && (error.message.includes('失败') || error.message.includes('Fail'))) {
        throw error;
      }
      console.warn(`⚠️ 轮询第 ${attempt} 次出错:`, error);
    }

    // 行级注释：等待后进行下一次轮询
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error('海螺视频生成超时，请稍后重试');
}

/**
 * 完整的海螺视频生成流程
 * 
 * @param options 生成选项
 * @param onProgress 进度回调
 * @returns 视频生成结果
 */
export async function generateHailuoVideo(
  options: HailuoVideoOptions,
  onProgress?: (stage: 'submitting' | 'processing' | 'downloading', progress: number) => void
): Promise<HailuoVideoResult> {
  // 行级注释：阶段1 - 提交任务
  onProgress?.('submitting', 10);
  const taskId = await submitHailuoVideoTask(options);

  // 行级注释：阶段2 - 轮询状态
  onProgress?.('processing', 20);
  const result = await pollHailuoVideoTask(taskId, (attempt, status) => {
    // 行级注释：进度从 20% 到 90%
    const progress = 20 + Math.min(70, attempt * 2);
    onProgress?.('processing', progress);
  });

  // 行级注释：阶段3 - 完成
  onProgress?.('downloading', 100);

  return result;
}

