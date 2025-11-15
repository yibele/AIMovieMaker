import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// 视频比例映射
const videoAspectRatioMap: Record<string, string> = {
  '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
  '1:1': 'VIDEO_ASPECT_RATIO_SQUARE',
};

function normalizeVideoAspectRatio(aspectRatio: string): string {
  if (!aspectRatio) {
    return 'VIDEO_ASPECT_RATIO_PORTRAIT'; // 默认竖屏
  }
  const normalized = videoAspectRatioMap[aspectRatio];
  if (normalized) {
    return normalized;
  }
  if (
    aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE' ||
    aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT' ||
    aspectRatio === 'VIDEO_ASPECT_RATIO_SQUARE'
  ) {
    return aspectRatio;
  }
  return 'VIDEO_ASPECT_RATIO_PORTRAIT';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      aspectRatio,
      bearerToken,
      projectId,
      sessionId,
      proxy,
      seed,
      sceneId, // 用于追踪视频生成任务
    } = body;

    if (!bearerToken) {
      return NextResponse.json(
        { error: '缺少 Bearer Token' },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: '缺少 Project ID' },
        { status: 400 }
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: '缺少 Session ID' },
        { status: 400 }
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: '缺少 Prompt 指令' },
        { status: 400 }
      );
    }

    const normalizedAspect = normalizeVideoAspectRatio(aspectRatio);
    const trimmedProjectId = projectId.trim();
    const trimmedSessionId = sessionId.trim();
    const generatedSceneId = sceneId || crypto.randomUUID(); // 生成或使用提供的 sceneId
    const requestSeed =
      typeof seed === 'number'
        ? seed
        : Math.floor(Math.random() * 100_000);

    // 根据比例选择对应的模型
    let videoModelKey: string;
    if (normalizedAspect === 'VIDEO_ASPECT_RATIO_PORTRAIT') {
      videoModelKey = 'veo_3_1_t2v_fast_portrait';
    } else if (normalizedAspect === 'VIDEO_ASPECT_RATIO_LANDSCAPE') {
      videoModelKey = 'veo_3_1_t2v_fast';
    } else {
      // 方图暂不支持
      return NextResponse.json(
        { 
          error: '目前不支持方图视频生成，仅支持横屏（16:9）和竖屏（9:16）',
          details: `不支持的比例: ${normalizedAspect}`,
        },
        { status: 400 }
      );
    }

    const payload = {
      clientContext: {
        sessionId: trimmedSessionId,
        projectId: trimmedProjectId,
        tool: 'PINHOLE',
        userPaygateTier: 'PAYGATE_TIER_ONE',
      },
      requests: [
        {
          aspectRatio: normalizedAspect,
          seed: requestSeed,
          textInput: {
            prompt,
          },
          videoModelKey,
          metadata: {
            sceneId: generatedSceneId,
          },
        },
      ],
    };

    console.log('🎬 调用 Flow 文生视频接口', {
      prompt: prompt.substring(0, 50),
      aspectRatio: normalizedAspect,
      videoModelKey,
      sceneId: generatedSceneId,
      sessionId: trimmedSessionId,
      projectId: trimmedProjectId,
      proxy: proxy ? '已配置' : '未配置',
    });
    
    console.log('📤 完整 Payload:', JSON.stringify(payload, null, 2));

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Authorization: `Bearer ${bearerToken}`,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
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
      console.log('📡 使用代理调用 Flow 视频生成接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 视频生成响应状态:', response.status);
    console.log('📥 Flow 视频生成响应数据:', JSON.stringify(response.data, null, 2));

    const data = response.data;

    // 解析返回的 operations
    const operations = data.operations || [];
    if (operations.length === 0) {
      console.error('❌ Flow 视频生成响应中未找到 operations');
      return NextResponse.json(
        { error: 'Flow 响应中未找到视频生成任务' },
        { status: 500 }
      );
    }

    const operation = operations[0];

    return NextResponse.json({
      operationName: operation.operation?.name,
      sceneId: operation.sceneId || generatedSceneId,
      status: operation.status,
      remainingCredits: data.remainingCredits,
    });
  } catch (error: any) {
    console.error('❌ Flow 视频生成代理错误:', error);

    if (error.response) {
      console.error('API 错误响应状态码:', error.response.status);
      console.error('API 错误响应数据:', JSON.stringify(error.response.data, null, 2));
      console.error('API 错误响应头:', error.response.headers);

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

