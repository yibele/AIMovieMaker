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

/**
 * 查询 SeedVR2 图片放大任务状态
 * POST /api/fal/upscale/status
 *
 * API Key 从环境变量 FAL_API_KEY 读取
 *
 * 请求体:
 * - requestId: 任务请求 ID (必需)
 *
 * 返回状态:
 * - IN_QUEUE: 排队中
 * - IN_PROGRESS: 处理中
 * - COMPLETED: 已完成
 * - FAILED: 失败
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId } = body;

    // 行级注释：从环境变量读取 API Key
    const falApiKey = process.env.FAL_API_KEY;
    if (!falApiKey) {
      return NextResponse.json(
        { error: '服务端未配置 FAL_API_KEY 环境变量' },
        { status: 500 }
      );
    }

    // 行级注释：验证必需参数
    const validation = validateRequiredParams(
      { requestId },
      ['requestId']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    // 行级注释：配置 fal.ai 客户端
    configureFalClient(falApiKey);

    // 行级注释：查询任务状态
    const status = await fal.queue.status('fal-ai/seedvr/upscale/image', {
      requestId,
      logs: true,
    });

    // 行级注释：如果任务已完成，获取结果
    if (status.status === 'COMPLETED') {
      const result = await fal.queue.result('fal-ai/seedvr/upscale/image', {
        requestId,
      });

      return NextResponse.json({
        success: true,
        status: 'COMPLETED',
        data: {
          imageUrl: result.data?.image?.url,
          contentType: result.data?.image?.content_type,
          width: result.data?.image?.width,
          height: result.data?.image?.height,
          seed: result.data?.seed,
        },
        requestId: result.requestId,
      });
    }

    // 行级注释：返回当前状态
    return NextResponse.json({
      success: true,
      status: status.status,
      queuePosition: (status as any).queue_position,
      logs: (status as any).logs?.map((log: any) => log.message) || [],
      requestId,
    });
  } catch (error: any) {
    // 行级注释：处理任务不存在的错误
    if (error.status === 404) {
      return NextResponse.json(
        {
          error: '任务不存在或已过期',
          code: 'REQUEST_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return handleApiError(error, 'fal.ai 图片放大状态查询');
  }
}

