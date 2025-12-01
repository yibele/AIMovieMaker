import { NextRequest, NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import {
  handleApiError,
  validateRequiredParams,
} from '@/lib/api-route-helpers';

// 行级注释：配置 fal.ai 客户端
function configureFalClient(apiKey: string) {
  fal.config({
    credentials: apiKey,
  });
}

// 行级注释：目标分辨率 - 只支持 2K 和 4K
type TargetResolution = '2K' | '4K';

// 行级注释：分辨率映射到 fal.ai API 参数
const RESOLUTION_MAP: Record<TargetResolution, string> = {
  '2K': '1440p',  // 2K = 2560x1440
  '4K': '2160p',  // 4K = 3840x2160
};

/**
 * SeedVR2 图片放大接口（简化版）
 * POST /api/fal/upscale
 *
 * 只支持 2K 和 4K 两种目标分辨率
 * API Key 从环境变量 FAL_API_KEY 读取
 *
 * 请求体:
 * - imageUrl: 要放大的图片 URL (必需)
 * - resolution: 目标分辨率 - '2K' 或 '4K' (可选，默认 '2K')
 * - syncMode: 同步模式，如果为 true 则等待结果返回 (可选，默认 true)
 *
 * 注意：fal.ai 默认限制每用户 2 个并发任务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      resolution = '2K',
      syncMode = true,
    } = body;

    // 行级注释：从环境变量读取 API Key
    const falApiKey = process.env.FAL_API_KEY;

    // 行级注释：验证 API Key 配置
    if (!falApiKey) {
      return NextResponse.json(
        { error: '服务端未配置 FAL_API_KEY 环境变量' },
        { status: 500 }
      );
    }

    // 行级注释：验证必需参数
    const validation = validateRequiredParams(
      { imageUrl },
      ['imageUrl']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    // 行级注释：验证分辨率参数
    if (resolution !== '2K' && resolution !== '4K') {
      return NextResponse.json(
        { error: '无效的分辨率参数，只支持 2K 或 4K' },
        { status: 400 }
      );
    }

    // 行级注释：配置 fal.ai 客户端
    configureFalClient(falApiKey);

    // 行级注释：构建请求输入参数
    const input = {
      image_url: imageUrl,
      upscale_mode: 'target' as const,  // 行级注释：使用目标分辨率模式
      target_resolution: RESOLUTION_MAP[resolution as TargetResolution],
      noise_scale: 0.1,
      output_format: 'jpg' as const,  // 行级注释：使用 JPG 减小文件体积
    };

    if (syncMode) {
      // 行级注释：同步模式 - 等待结果返回
      const result = await fal.subscribe('fal-ai/seedvr/upscale/image', {
        input: input as any,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            console.log(`📸 fal.ai 图片放大中 (${resolution})...`);
          }
        },
      });

      // 行级注释：返回放大后的图片结果
      return NextResponse.json({
        success: true,
        mode: 'sync',
        resolution,
        data: {
          imageUrl: result.data?.image?.url,
          contentType: result.data?.image?.content_type,
          width: result.data?.image?.width,
          height: result.data?.image?.height,
          seed: result.data?.seed,
        },
        requestId: result.requestId,
      });
    } else {
      // 行级注释：异步模式 - 提交任务到队列，立即返回 requestId
      const { request_id } = await fal.queue.submit('fal-ai/seedvr/upscale/image', {
        input: input as any,
      });

      return NextResponse.json({
        success: true,
        mode: 'async',
        resolution,
        requestId: request_id,
        message: '图片放大任务已提交，请使用 /api/fal/upscale/status 查询进度',
      });
    }
  } catch (error: any) {
    // 行级注释：处理 fal.ai 特定错误
    if (error.status === 429) {
      return NextResponse.json(
        {
          error: '已达到并发限制（最多 2 个并发任务），请稍后重试',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    return handleApiError(error, 'fal.ai 图片放大');
  }
}
