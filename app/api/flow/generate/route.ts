import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';
import {
  normalizeImageAspectRatio,
  handleApiError,
  validateRequiredParams,
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
      references,
      count, // 生成数量 (1-4)
      prefixPrompt, // 前置提示词
    } = body;

    // 行级注释：验证必需参数
    const validation = validateRequiredParams(
      { bearerToken, projectId, sessionId, prompt },
      ['bearerToken', 'projectId', 'sessionId', 'prompt']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    const normalizedAspect = normalizeImageAspectRatio(aspectRatio);
    const trimmedProjectId = projectId.trim();
    const trimmedSessionId = sessionId.trim();

    // 确保生成数量在 1-4 之间
    const generationCount = Math.max(1, Math.min(4, typeof count === 'number' ? count : 1));

    // 构建最终提示词：如果有前置提示词，则添加到前面
    const finalPrompt = prefixPrompt && prefixPrompt.trim()
      ? `${prefixPrompt.trim()}, ${prompt}`
      : prompt;

    const imageInputs =
      Array.isArray(references) && references.length > 0
        ? references
            .filter(
              (ref: any) =>
                (typeof ref?.mediaId === 'string' && ref.mediaId.trim().length > 0) ||
                (typeof ref?.mediaGenerationId === 'string' && ref.mediaGenerationId.trim().length > 0)
            )
            .map((ref: any) => ({
              name: ref.mediaId || ref.mediaGenerationId, // 优先使用 mediaId，图生图时 Flow 要求传这个字段 // 行级注释说明字段用途
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
        prompt: finalPrompt,
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
        const mediaId =
          entry?.mediaId ||
          entry?.name ||
          generatedImage?.mediaId ||
          generatedImage?.mediaGenerationId ||
          workflowId;

        return {
          encodedImage,
          mediaId,
          mediaGenerationId: generatedImage?.mediaGenerationId,
          workflowId,
          prompt: generatedImage?.prompt || finalPrompt,
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
    return handleApiError(error, 'Flow 生成图片代理');
  }
}


