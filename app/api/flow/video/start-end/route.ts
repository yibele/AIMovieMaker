import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

const videoAspectRatioMap: Record<string, string> = {
  '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
  '1:1': 'VIDEO_ASPECT_RATIO_SQUARE',
}; // 行级注释：支持常用比例与 Flow 枚举互转

const i2vModelMap: Record<string, string> = {
  VIDEO_ASPECT_RATIO_LANDSCAPE: 'veo_3_1_i2v_s_fast', // 行级注释：横屏模型
  VIDEO_ASPECT_RATIO_PORTRAIT: 'veo_3_1_i2v_s_fast_portrait', // 行级注释：竖屏模型（修正：移除 _fl 后缀）
  VIDEO_ASPECT_RATIO_SQUARE: 'veo_3_1_i2v_s_fast_portrait', // 行级注释：方形场景使用竖屏模型
};

function normalizeAspectRatio(aspectRatio?: string): string {
  if (!aspectRatio) {
    return 'VIDEO_ASPECT_RATIO_PORTRAIT'; // 行级注释：默认竖屏
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

function resolveSceneId(sceneId?: string): string {
  if (sceneId && sceneId.trim()) {
    return sceneId.trim();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      sceneId,
      startMediaId,
      endMediaId,
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

    if (!startMediaId || typeof startMediaId !== 'string') {
      return NextResponse.json(
        { error: '缺少首帧 mediaId' },
        { status: 400 }
      );
    }

    const normalizedAspect = normalizeAspectRatio(aspectRatio);
    const modelKey =
      i2vModelMap[normalizedAspect] ??
      'veo_3_1_i2v_s_fast_portrait'; // 行级注释：未知比例回退竖屏模型（修正：移除 _fl 后缀）

    const trimmedProjectId = projectId.trim();
    const trimmedSessionId = sessionId.trim();
    const requestPrompt = typeof prompt === 'string' ? prompt : '';
    const trimmedStartMediaId = startMediaId.trim();
    const trimmedEndMediaId =
      typeof endMediaId === 'string' ? endMediaId.trim() : '';
    const hasEndImage = trimmedEndMediaId && trimmedEndMediaId.length > 0; // 行级注释：检查是否真的有尾帧
    const resolvedSceneId = resolveSceneId(sceneId);
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

    const axiosConfig: any = {
      method: 'POST',
      url: apiEndpoint,
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
      console.log('📡 使用代理调用 Flow 图生视频接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

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
    console.error('❌ Flow 图生视频代理错误:', error);

    if (error.response) {
      console.error(
        'API 错误响应数据:',
        JSON.stringify(error.response.data, null, 2)
      );
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

