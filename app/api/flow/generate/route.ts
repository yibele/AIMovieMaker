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

    // 构建最终提示词：如果有前置提示词（实际上作为后置风格修饰），则添加到后面
    const finalPrompt = prefixPrompt && prefixPrompt.trim()
      ? `${prompt}, ${prefixPrompt.trim()}`
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
          projectId: trimmedProjectId,
          tool: 'PINHOLE',
          userPaygateTier: 'PAYGATE_TIER_ONE',
        },
        seed: requestSeed,
        imageModelName: 'GEM_PIX2',
        imageAspectRatio: normalizedAspect,
        prompt: finalPrompt,
        imageInputs, // 始终包含 imageInputs（文生图时为空数组，图生图时为参考图数组）
      };
      
      return request;
    });

    const payload = { requests };


    


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
      timeout: 180000, // 180 秒超时
      proxy: false,
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
    }

    const response = await axios(axiosConfig);


    const rawData = response.data;

    // Flow API 返回的数据结构是 { media: [...] }
    const mediaArray = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.media)
      ? rawData.media
      : Array.isArray(rawData?.responses)
      ? rawData.responses
      : [];

    if (!mediaArray.length) {
      return NextResponse.json(
        { error: 'Flow 响应中未找到图片数据' },
        { status: 500 }
      );
    }

    // 解析每个 media 元素中的图片数据
    const normalizedImages = mediaArray
      .map((entry: any) => {
        if (!entry || !entry.image) {
          return null;
        }

        // 图片数据在 entry.image.generatedImage 中
        const generatedImage = entry.image.generatedImage;
        if (!generatedImage) {
          return null;
        }

        const fifeUrl = generatedImage?.fifeUrl;

        // 只使用 fifeUrl，不返回 base64 以节省带宽
        if (!fifeUrl) {
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
          // encodedImage: 不再返回 base64，节省 Fast Origin Transfer
          mediaId,
          mediaGenerationId: generatedImage?.mediaGenerationId,
          workflowId,
          prompt: generatedImage?.prompt || finalPrompt,
          seed: generatedImage?.seed,
          mimeType,
          fifeUrl,
        };
      })
      .filter(Boolean);

    if (!normalizedImages.length) {
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


