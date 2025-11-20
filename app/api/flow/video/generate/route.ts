import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  normalizeVideoAspectRatio,
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';

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

    // 验证必需参数
    const validation = validateRequiredParams(
      { bearerToken, projectId, sessionId, prompt },
      ['bearerToken', 'projectId', 'sessionId', 'prompt']
    );
    if (!validation.valid) {
      return validation.error!;
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

    const headers = {
      'Content-Type': 'text/plain;charset=UTF-8',
      Authorization: `Bearer ${bearerToken}`,
      Origin: 'https://labs.google',
      Referer: 'https://labs.google/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const axiosConfig = createProxiedAxiosConfig(
      'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText',
      'POST',
      headers,
      proxy,
      payload
    );

    axiosConfig.timeout = 60000;

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
    return handleApiError(error, 'Flow 视频生成代理');
  }
}

