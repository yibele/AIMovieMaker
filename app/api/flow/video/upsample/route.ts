import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// 视频比例映射
const videoAspectRatioMap: Record<string, string> = {
  '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
};

function normalizeVideoAspectRatio(aspectRatio: string): string {
  if (!aspectRatio) {
    return 'VIDEO_ASPECT_RATIO_LANDSCAPE'; // 默认横屏
  }
  const normalized = videoAspectRatioMap[aspectRatio];
  if (normalized) {
    return normalized;
  }
  if (
    aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE' ||
    aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT'
  ) {
    return aspectRatio;
  }
  return 'VIDEO_ASPECT_RATIO_LANDSCAPE';
}

/**
 * 视频超清放大接口（1080p）
 * POST /api/flow/video/upsample
 * 
 * 请求体:
 * - bearerToken: OAuth 2.0 访问令牌
 * - mediaId: 原始视频的媒体 ID
 * - sceneId: 场景 ID
 * - aspectRatio: 视频比例 (可选，默认横屏)
 * - sessionId: 会话 ID (可选)
 * - seed: 随机种子 (可选)
 * - proxy: 代理配置 (可选)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bearerToken,
      mediaId,
      sceneId,
      aspectRatio,
      sessionId,
      seed,
      proxy,
    } = body;

    // 验证必需参数
    if (!bearerToken) {
      return NextResponse.json(
        { error: '缺少 Bearer Token' },
        { status: 400 }
      );
    }

    if (!mediaId || typeof mediaId !== 'string') {
      return NextResponse.json(
        { error: '缺少视频媒体 ID' },
        { status: 400 }
      );
    }

    if (!sceneId || typeof sceneId !== 'string') {
      return NextResponse.json(
        { error: '缺少场景 ID' },
        { status: 400 }
      );
    }

    const normalizedAspect = normalizeVideoAspectRatio(aspectRatio);
    const generatedSessionId = sessionId || `;${Date.now()}`;
    const requestSeed =
      typeof seed === 'number'
        ? seed
        : Math.floor(Math.random() * 1_000_000);

    const payload = {
      requests: [
        {
          aspectRatio: normalizedAspect,
          seed: requestSeed,
          videoInput: {
            mediaId,
          },
          videoModelKey: 'veo_2_1080p_upsampler_8s',
          metadata: {
            sceneId,
          },
        },
      ],
      clientContext: {
        sessionId: generatedSessionId,
      },
    };

    console.log('📺 调用 Flow 视频超清接口', {
      mediaId: mediaId.substring(0, 30) + '...',
      sceneId,
      aspectRatio: normalizedAspect,
      sessionId: generatedSessionId,
      proxy: proxy ? '已配置' : '未配置',
    });

    console.log('📤 完整 Payload:', JSON.stringify(payload, null, 2));

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Authorization: `Bearer ${bearerToken}`,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 60000,
      proxy: false,
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理调用 Flow 视频超清接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 视频超清响应状态:', response.status);
    console.log('📥 Flow 视频超清响应数据:', JSON.stringify(response.data, null, 2));

    const data = response.data;

    // 解析返回的 operations
    const operations = data.operations || [];
    if (operations.length === 0) {
      console.error('❌ Flow 视频超清响应中未找到 operations');
      return NextResponse.json(
        { error: 'Flow 响应中未找到视频超清任务' },
        { status: 500 }
      );
    }

    const operation = operations[0];

    return NextResponse.json({
      operationName: operation.operation?.name,
      sceneId: operation.sceneId,
      status: operation.status,
      remainingCredits: data.remainingCredits,
      message: '视频超清任务已创建，请使用 /api/flow/video/status 查询进度',
    });
  } catch (error: any) {
    console.error('❌ Flow 视频超清错误:', error);

    if (error.response) {
      console.error('API 错误响应状态码:', error.response.status);
      console.error('API 错误响应数据:', JSON.stringify(error.response.data, null, 2));

      return NextResponse.json(error.response.data, {
        status: error.response.status,
      });
    }

    return NextResponse.json(
      {
        error: error.message || '服务器错误',
        details: error.code || error.cause?.message,
      },
      { status: 500 }
    );
  }
}

