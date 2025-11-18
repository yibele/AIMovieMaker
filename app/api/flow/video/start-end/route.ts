import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  normalizeVideoAspectRatio,
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
  generateWorkflowId,
  generateSessionId,
} from '@/lib/api-route-helpers';

const i2vModelMap: Record<string, string> = {
  VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_s_fast',
  VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_s_fast_portrait',
  VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_s_fast_portrait',
};

const i2vStartEndModelMap: Record<string, string> = {
  VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_s_fast_fl',
  VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_s_fast_portrait_fl',
  VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_s_fast_portrait_fl',
};

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
      sceneId,
      startMediaId,
      endMediaId,
    } = body;

    // 验证必需参数
    const validation = validateRequiredParams(
      { bearerToken, projectId, sessionId, startMediaId },
      ['bearerToken', 'projectId', 'sessionId', 'startMediaId']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    const normalizedAspect = normalizeVideoAspectRatio(aspectRatio);
    const trimmedProjectId = projectId.trim();
    const trimmedSessionId = sessionId.trim();
    const requestPrompt = typeof prompt === 'string' ? prompt : '';
    const trimmedStartMediaId = startMediaId.trim();
    const trimmedEndMediaId =
      typeof endMediaId === 'string' ? endMediaId.trim() : '';
    const hasEndImage = Boolean(
      trimmedEndMediaId && trimmedEndMediaId.length > 0
    ); // 行级注释：检查是否真的有尾帧
    const baseModelFallback = 'veo_3_1_i2v_s_fast_portrait';
    const startEndModelFallback = 'veo_3_1_i2v_s_fast_portrait_fl';
    const baseModelKey =
      i2vModelMap[normalizedAspect] ?? baseModelFallback; // 行级注释：仅首帧模式模型
    const startEndModelKey =
      i2vStartEndModelMap[normalizedAspect] ?? startEndModelFallback; // 行级注释：首尾帧模式模型
    const modelKey = hasEndImage ? startEndModelKey : baseModelKey; // 行级注释：根据模式选择模型
    const resolvedSceneId = sceneId && sceneId.trim() ? sceneId.trim() : generateWorkflowId();
    const requestSeed =
      typeof seed === 'number'
        ? seed
        : Math.floor(Math.random() * 100_000);

    // 行级注释：根据是否有尾帧构建不同的 request 对象
    const requestObject: any = {
      aspectRatio: normalizedAspect,
      seed: requestSeed,
      textInput: {
        prompt: requestPrompt,
      },
      videoModelKey: modelKey,
      startImage: {
        mediaId: trimmedStartMediaId,
      },
      metadata: {
        sceneId: resolvedSceneId,
      },
    };

    // 行级注释：只有当有尾帧时才添加 endImage 字段
    if (hasEndImage) {
      requestObject.endImage = {
        mediaId: trimmedEndMediaId,
      };
    }

    const payload = {
      clientContext: {
        sessionId: trimmedSessionId,
        projectId: trimmedProjectId,
        tool: 'PINHOLE',
        userPaygateTier: 'PAYGATE_TIER_ONE',
      },
      requests: [requestObject],
    };

    console.log('🎬 调用 Flow 图生视频接口', {
      aspectRatio: normalizedAspect,
      modelKey,
      sceneId: resolvedSceneId,
      sessionId: trimmedSessionId,
      projectId: trimmedProjectId,
      proxy: proxy ? '已配置' : '未配置',
    });

    console.log('📤 Flow 图生视频 Payload:', JSON.stringify(payload, null, 2));

    // 行级注释：根据是否有尾帧选择不同的端点
    const apiEndpoint = hasEndImage
      ? 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage'
      : 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage';

    console.log('🎯 使用端点:', hasEndImage ? '首尾帧' : '仅首帧', apiEndpoint);

    const headers = {
      'Content-Type': 'text/plain;charset=UTF-8',
      Authorization: `Bearer ${bearerToken}`,
      Origin: 'https://labs.google',
      Referer: 'https://labs.google/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const axiosConfig = createProxiedAxiosConfig(
      apiEndpoint,
      'POST',
      headers,
      proxy,
      payload
    );

    axiosConfig.timeout = 60000;

    const response = await axios(axiosConfig);

    console.log('📥 Flow 图生视频响应状态:', response.status);
    console.log('📥 Flow 图生视频响应数据:', JSON.stringify(response.data, null, 2));

    const data = response.data;
    const operations = data.operations || [];
    if (operations.length === 0) {
      console.error('❌ Flow 图生视频响应中未找到 operations');
      return NextResponse.json(
        { error: 'Flow 响应中未找到视频生成任务' },
        { status: 500 }
      );
    }

    const operation = operations[0];
    const operationName =
      operation?.operation?.name || operation?.name || '';
    // 行级注释：首尾帧模式下 Flow 不返回 status，默认设为 PENDING
    const operationStatus = operation?.status || 'MEDIA_GENERATION_STATUS_PENDING';
    // 行级注释：首尾帧模式下 Flow 不返回 sceneId，使用我们发送的
    const operationSceneId = operation?.sceneId || resolvedSceneId;

    console.log('✅ 视频生成任务已提交', {
      operationName,
      sceneId: operationSceneId,
      status: operationStatus,
    });

    return NextResponse.json({
      operationName,
      sceneId: operationSceneId,
      status: operationStatus,
      remainingCredits: data.remainingCredits,
    });
  } catch (error: any) {
    return handleApiError(error, 'Flow 图生视频代理');
  }
}

