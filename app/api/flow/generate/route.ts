import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

const aspectRatioMap: Record<string, string> = {
  '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
};

function normalizeAspectRatio(aspectRatio: string): string {
  if (!aspectRatio) {
    return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
  }
  const normalized = aspectRatioMap[aspectRatio];
  if (normalized) {
    return normalized;
  }
  if (
    aspectRatio === 'IMAGE_ASPECT_RATIO_LANDSCAPE' ||
    aspectRatio === 'IMAGE_ASPECT_RATIO_PORTRAIT' ||
    aspectRatio === 'IMAGE_ASPECT_RATIO_SQUARE'
  ) {
    return aspectRatio;
  }
  return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
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
      references,
      count, // 生成数量 (1-4)
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

    const normalizedAspect = normalizeAspectRatio(aspectRatio);
    const trimmedProjectId = projectId.trim();
    const trimmedSessionId = sessionId.trim();
    
    // 确保生成数量在 1-4 之间
    const generationCount = Math.max(1, Math.min(4, typeof count === 'number' ? count : 1));

    const imageInputs =
      Array.isArray(references) && references.length > 0
        ? references
            .filter(
              (ref: any) =>
                typeof ref?.mediaGenerationId === 'string' &&
                ref.mediaGenerationId.trim().length > 0
            )
            .map((ref: any) => ({
              name: ref.mediaGenerationId,
              imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE',
            }))
        : [];

    // 根据 generationCount 生成多个请求
    const requests = Array.from({ length: generationCount }, (_, index) => {
      const requestSeed = typeof seed === 'number' 
        ? seed + index // 如果提供了 seed，则递增以保证每个请求的种子不同
        : Math.floor(Math.random() * 1_000_000);
      
      const request: any = {
        clientContext: {
          sessionId: trimmedSessionId,
        },
        seed: requestSeed,
        imageModelName: 'GEM_PIX',
        imageAspectRatio: normalizedAspect,
        prompt,
        imageInputs, // 始终包含 imageInputs（文生图时为空数组，图生图时为参考图数组）
      };
      
      return request;
    });

    const payload = { requests };

    console.log('🎨 调用 Flow 生成接口', {
      prompt: prompt.substring(0, 50),
      aspectRatio: normalizedAspect,
      sessionId: trimmedSessionId,
      proxy: proxy ? '已配置' : '未配置',
      referenceCount: imageInputs.length,
      generationCount,
    });
    
    // 打印完整的 payload 用于调试
    console.log('📤 Flow API 完整 Payload:', JSON.stringify(payload, null, 2));
    console.log('📤 Payload 结构检查:', {
      hasRequestsKey: 'requests' in payload,
      requestsIsArray: Array.isArray(payload.requests),
      requestsLength: payload.requests?.length,
    });

    const axiosConfig: any = {
      method: 'POST',
      url: `https://aisandbox-pa.googleapis.com/v1/projects/${trimmedProjectId}/flowMedia:batchGenerateImages`,
      headers: {
        'Content-Type': 'application/json',
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
      console.log('📡 使用代理调用 Flow 生成接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 生成响应状态:', response.status);

    const rawData = response.data;
    console.log('Flow 生成响应数据:', rawData);

    // Flow API 返回的数据结构是 { media: [...] }
    const mediaArray = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.media)
      ? rawData.media
      : Array.isArray(rawData?.responses)
      ? rawData.responses
      : [];

    if (!mediaArray.length) {
      console.error('❌ Flow 响应中未找到 media 数组');
      return NextResponse.json(
        { error: 'Flow 响应中未找到图片数据' },
        { status: 500 }
      );
    }

    // 解析每个 media 元素中的图片数据
    const normalizedImages = mediaArray
      .map((entry: any) => {
        if (!entry || !entry.image) {
          console.warn('⚠️ media 条目缺少 image 字段:', entry);
          return null;
        }

        // 图片数据在 entry.image.generatedImage 中
        const generatedImage = entry.image.generatedImage;
        if (!generatedImage) {
          console.warn('⚠️ image 对象缺少 generatedImage:', entry.image);
          return null;
        }

        const encodedImage =
          generatedImage?.encodedImage ||
          generatedImage?.base64Image ||
          generatedImage?.imageBase64;

        if (!encodedImage) {
          console.warn('⚠️ generatedImage 缺少 encodedImage:', generatedImage);
          return null;
        }

        const mimeType = generatedImage?.mimeType || 'image/png';
        const workflowId = entry?.workflowId || generatedImage?.workflowId;

        return {
          encodedImage,
          mediaGenerationId: generatedImage?.mediaGenerationId,
          workflowId,
          prompt: generatedImage?.prompt || prompt,
          seed: generatedImage?.seed,
          mimeType,
          fifeUrl: generatedImage?.fifeUrl,
        };
      })
      .filter(Boolean);

    if (!normalizedImages.length) {
      console.error('❌ 无法从 media 数组中提取图片数据');
      return NextResponse.json(
        { error: 'Flow 响应中未找到图片数据' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      images: normalizedImages,
      sessionId: trimmedSessionId,
    });
  } catch (error: any) {
    console.error('❌ Flow 生成图片代理错误:', error);

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


