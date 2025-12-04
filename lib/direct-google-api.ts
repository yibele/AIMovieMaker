// 直接调用 Google API，不通过 Vercel 服务器
// 用于节省 Fast Origin Transfer
import { ReshootMotionType } from './types';
// 行级注释：导入套餐配置适配器，统一管理 Pro/Ultra 差异
import {
  getVideoApiConfig,
  getImageApiConfig,
  getPaygateTier,
  getVideoAspectRatioEnum,
  type AccountTier,
  type AspectRatio,
  type VideoMode,
  type VideoGenerationType,
} from './config/tier-config';

// ============================================================================
// 网络重试工具
// ============================================================================

/**
 * 判断是否为网络错误（可重试）
 */
function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('failed to fetch') ||
    error?.name === 'TypeError' || // fetch 失败通常是 TypeError
    error?.name === 'AbortError'
  );
}

/**
 * 带重试的 fetch 请求
 * 
 * @param url 请求 URL
 * @param options fetch 选项
 * @param maxRetries 最大重试次数（默认 2）
 * @param retryDelay 重试延迟毫秒数（默认 1000）
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error: any) {
      lastError = error;

      // 行级注释：只有网络错误才重试
      if (isNetworkError(error) && attempt < maxRetries) {
        console.warn(`⚠️ 网络错误，${retryDelay}ms 后重试 (${attempt + 1}/${maxRetries}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // 行级注释：非网络错误或重试次数用完，抛出
      throw error;
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * 获取视频积分状态
 * 返回当前账户的积分数量和付费等级
 */
export async function getVideoCreditStatus(
  bearerToken: string
): Promise<{
  credits: number;
  userPaygateTier: string;
  g1MembershipState: string;
  isUserAnimateCountryEnabled: boolean;
}> {
  const url = 'https://aisandbox-pa.googleapis.com/v1/whisk:getVideoCreditStatus';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      Authorization: `Bearer ${bearerToken}`,
      Origin: 'https://labs.google',
      Referer: 'https://labs.google/',
    },
    body: '{}',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('获取积分状态失败:', response.status, errorText);
    throw new Error(`获取积分失败: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * 直接上传图片到 Google Flow API
 * 不需要 Cookie，可以绕过 Vercel 服务器
 */
export async function uploadImageDirectly(
  imageBase64: string,
  bearerToken: string,
  sessionId: string,
  aspectRatio?: '16:9' | '9:16' | '1:1'
): Promise<{
  mediaGenerationId?: string;
  mediaId?: string; // 行级注释：与 mediaGenerationId 相同，用于兼容首尾帧生成
  width?: number;
  height?: number;
  workflowId?: string;
  sessionId: string;
}> {
  // 处理 base64 数据
  let base64Data = imageBase64.trim();
  let mimeType = 'image/jpeg';

  const dataUrlMatch = base64Data.match(/^data:(.*?);base64,(.*)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1] || mimeType;
    base64Data = dataUrlMatch[2];
  }

  const sanitizedBase64 = base64Data.replace(/\s/g, '');

  // 规范化宽高比
  const normalizedAspectRatio = aspectRatio === '9:16'
    ? 'IMAGE_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
      ? 'IMAGE_ASPECT_RATIO_SQUARE'
      : 'IMAGE_ASPECT_RATIO_LANDSCAPE';

  const payload = {
    imageInput: {
      rawImageBytes: sanitizedBase64,
      mimeType,
      isUserUploaded: true,
      aspectRatio: normalizedAspectRatio,
    },
    clientContext: {
      sessionId: sessionId.trim(),
      tool: 'ASSET_MANAGER',
    },
  };


  try {
    // 行级注释：使用带重试的 fetch，网络错误时自动重试 2 次
    const response = await fetchWithRetry(
      'https://aisandbox-pa.googleapis.com/v1:uploadUserImage',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
      },
      2, // 最大重试 2 次
      1500 // 重试间隔 1.5 秒
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 行级注释：调试日志，查看 API 返回的完整数据结构
    console.log('📤 uploadImageDirectly 响应:', JSON.stringify(data, null, 2));

    // 行级注释：提取 mediaGenerationId，API 返回格式为 { mediaGenerationId: { mediaGenerationId: "xxx" } }
    const mediaGenId = data?.mediaGenerationId?.mediaGenerationId;

    return {
      mediaGenerationId: mediaGenId,
      // 行级注释：mediaId 和 mediaGenerationId 使用相同值，因为上传 API 只返回 mediaGenerationId
      mediaId: mediaGenId,
      width: data?.width,
      height: data?.height,
      workflowId: data?.workflowId,
      sessionId: sessionId.trim(),
    };
  } catch (error) {
    console.error('❌ 直接上传图片失败:', error);
    throw error;
  }
}

/**
 * 直接调用 Google Flow Generate API 生成图片
 * 返回 base64，不通过 Vercel 服务器，节省 Fast Origin Transfer
 */
export async function generateImageDirectly(
  prompt: string, // 行级注释：已拼接好的完整 prompt（由 api-mock 层处理业务逻辑）
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  accountTier: 'pro' | 'ultra',
  references?: Array<{ mediaId?: string; mediaGenerationId?: string }>,
  seed?: number,
  count?: number,
  model?: 'nanobanana' | 'nanobananapro',
  prompts?: string[] // 新增：支持传入多个不同的 prompt
): Promise<{
  images: Array<{
    encodedImage?: string; // base64
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    mimeType?: string;
    fifeUrl?: string;
  }>;
  sessionId: string;
}> {
  // 规范化宽高比
  const normalizedAspect = aspectRatio === '9:16'
    ? 'IMAGE_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
      ? 'IMAGE_ASPECT_RATIO_SQUARE'
      : 'IMAGE_ASPECT_RATIO_LANDSCAPE';

  const generationCount = Math.max(1, Math.min(4, count || 1));

  // 行级注释：根据模型选择 imageModelName
  const imageModelName = model === 'nanobananapro'
    ? 'GEM_PIX_2'
    : 'GEM_PIX';

  // 处理参考图
  const imageInputs =
    Array.isArray(references) && references.length > 0
      ? references
        .filter(
          (ref: any) =>
            (typeof ref?.mediaId === 'string' && ref.mediaId.trim().length > 0) ||
            (typeof ref?.mediaGenerationId === 'string' && ref.mediaGenerationId.trim().length > 0)
        )
        .map((ref: any) => ({
          name: ref.mediaId || ref.mediaGenerationId,
          imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE',
        }))
      : [];

  // 生成多个请求
  const requestCount = (prompts && prompts.length > 0) ? prompts.length : generationCount;

  const requests = Array.from({ length: requestCount }, (_, index) => {
    const requestSeed =
      typeof seed === 'number'
        ? seed + index
        : Math.floor(Math.random() * 1_000_000);

    // 如果有 prompts 数组，使用对应的 prompt，否则使用统一的 prompt
    const requestPrompt = (prompts && prompts[index]) ? prompts[index] : prompt;

    return {
      clientContext: {
        sessionId: sessionId.trim(),
      },
      seed: requestSeed,
      imageModelName: imageModelName,
      imageAspectRatio: normalizedAspect,
      prompt: requestPrompt,
      imageInputs,
    };
  });

  const payload = { requests };

  try {
    // 行级注释：使用带重试的 fetch，网络错误时自动重试 2 次
    const response = await fetchWithRetry(
      `https://aisandbox-pa.googleapis.com/v1/projects/${projectId.trim()}/flowMedia:batchGenerateImages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
      },
      2, // 最大重试 2 次
      1500 // 重试间隔 1.5 秒
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API 错误响应:', JSON.stringify(errorData, null, 2));
      throw new Error(`Generate failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const rawData = await response.json();

    // 解析响应
    const mediaArray = Array.isArray(rawData)
      ? rawData
      : rawData?.media || rawData?.result?.media || [];

    if (!mediaArray.length) {
      throw new Error('No media in response');
    }

    const normalizedImages = mediaArray
      .map((entry: any) => {
        const generatedImage =
          entry?.generatedImage ||
          entry?.image?.generatedImage ||
          entry?.image;

        if (!generatedImage) {
          return null;
        }

        const encodedImage =
          generatedImage?.encodedImage ||
          generatedImage?.base64Image ||
          generatedImage?.imageBase64;

        const fifeUrl = generatedImage?.fifeUrl;

        // 必须有 fifeUrl 或 encodedImage
        if (!fifeUrl && !encodedImage) {
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
          encodedImage, // 返回 base64！
          mediaId,
          mediaGenerationId: generatedImage?.mediaGenerationId,
          workflowId,
          prompt: generatedImage?.prompt || prompt,
          seed: generatedImage?.seed,
          mimeType,
          fifeUrl,
        };
      })
      .filter(Boolean);

    if (!normalizedImages.length) {
      throw new Error('No valid images in response');
    }

    return {
      images: normalizedImages,
      sessionId: sessionId.trim(),
    };
  } catch (error) {
    console.error('❌ 直接生成图片失败:', error);
    throw error;
  }
}

/**
 * 直接调用 Google Flow API 生成视频（文生视频）
 * 不通过 Vercel 服务器，节省成本和提高速度
 */
export async function generateVideoTextDirectly(
  prompt: string,
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: AspectRatio,
  accountTier: AccountTier,
  videoModel: VideoMode = 'quality',
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  // 行级注释：使用 tier-config 适配器获取所有配置，消除条件判断
  const config = getVideoApiConfig('text-to-video', accountTier, aspectRatio, videoModel);

  const requestSeed = typeof seed === 'number'
    ? seed
    : Math.floor(Math.random() * 100_000);

  const generatedSceneId = sceneId && sceneId.trim()
    ? sceneId.trim()
    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const payload = {
    clientContext: {
      sessionId: sessionId.trim(),
      projectId: projectId.trim(),
      tool: 'PINHOLE',
      userPaygateTier: config.userPaygateTier,  // 行级注释：使用 tier-config 获取的配置
    },
    requests: [
      {
        aspectRatio: config.aspectRatioEnum,  // 行级注释：使用 tier-config 获取的配置
        seed: requestSeed,
        textInput: {
          prompt: prompt.trim(),
        },
        videoModelKey: config.videoModelKey,  // 行级注释：使用 tier-config 获取的配置
        metadata: {
          sceneId: generatedSceneId,
        },
      },
    ],
  };



  try {
    const response = await fetch(
      'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'Authorization': `Bearer ${bearerToken}`,
          'Origin': 'https://labs.google',
          'Referer': 'https://labs.google/',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 文生视频失败:', errorData);
      throw new Error(`Video generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const operations = data.operations || [];
    if (operations.length === 0) {
      throw new Error('No operations in response');
    }

    const operation = operations[0];

    return {
      operationName: operation?.operation?.name || '',
      sceneId: operation?.sceneId || generatedSceneId,
      status: operation?.status || 'MEDIA_GENERATION_STATUS_PENDING',
      remainingCredits: data.remainingCredits,
    };
  } catch (error) {
    console.error('❌ 直接生成视频（文生视频）失败:', error);
    throw error;
  }
}

/**
 * 直接调用 Google Flow API 生成视频（图生视频）
 * 支持仅首帧或首尾帧模式
 */
export async function generateVideoImageDirectly(
  prompt: string,
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: AspectRatio,
  accountTier: AccountTier,
  videoModel: VideoMode = 'quality',
  startMediaId: string,
  endMediaId?: string,
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  const hasEndImage = Boolean(endMediaId && endMediaId.trim());

  // 行级注释：使用 tier-config 适配器获取配置，根据是否有尾帧选择不同的生成类型
  const generationType: VideoGenerationType = hasEndImage ? 'image-to-video-fl' : 'image-to-video';
  const config = getVideoApiConfig(generationType, accountTier, aspectRatio, videoModel);

  const requestSeed = typeof seed === 'number'
    ? seed
    : Math.floor(Math.random() * 100_000);

  const generatedSceneId = sceneId && sceneId.trim()
    ? sceneId.trim()
    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  // 构建请求对象
  const requestObject: any = {
    aspectRatio: config.aspectRatioEnum,  // 行级注释：使用 tier-config 获取的配置
    seed: requestSeed,
    textInput: {
      prompt: prompt.trim(),
    },
    videoModelKey: config.videoModelKey,  // 行级注释：使用 tier-config 获取的配置
    startImage: {
      mediaId: startMediaId.trim(),
    },
    metadata: {
      sceneId: generatedSceneId,
    },
  };

  // 只有当有尾帧时才添加 endImage 字段
  if (hasEndImage) {
    requestObject.endImage = {
      mediaId: endMediaId!.trim(),
    };
  }

  const payload = {
    clientContext: {
      sessionId: sessionId.trim(),
      projectId: projectId.trim(),
      tool: 'PINHOLE',
      userPaygateTier: config.userPaygateTier,  // 行级注释：使用 tier-config 获取的配置
    },
    requests: [requestObject],
  };

  // 选择端点
  const apiEndpoint = hasEndImage
    ? 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage'
    : 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage';



  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 图生视频失败:', errorData);
      throw new Error(`Video generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const operations = data.operations || [];
    if (operations.length === 0) {
      throw new Error('No operations in response');
    }

    const operation = operations[0];

    return {
      operationName: operation?.operation?.name || '',
      sceneId: operation?.sceneId || generatedSceneId,
      status: operation?.status || 'MEDIA_GENERATION_STATUS_PENDING',
      remainingCredits: data.remainingCredits,
    };
  } catch (error) {
    console.error('❌ 直接生成视频（图生视频）失败:', error);
    throw error;
  }
}

/**
 * 直接调用 Google Flow API 查询视频生成状态
 */
export async function checkVideoStatusDirectly(
  operationName: string,
  bearerToken: string,
  sceneId?: string
): Promise<{
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  mediaGenerationId?: string;
  error?: string;
  remainingCredits?: number; // 行级注释：视频完成时返回的剩余积分
}> {
  const payload = {
    operations: [
      {
        operation: {
          name: operationName,
        },
        ...(sceneId ? { sceneId } : {}),
        status: 'MEDIA_GENERATION_STATUS_PENDING',
      },
    ],
  };

  try {
    const response = await fetch(
      'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          'Authorization': `Bearer ${bearerToken}`,
          'Origin': 'https://labs.google',
          'Referer': 'https://labs.google/',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const operations = data.operations || [];

    if (operations.length === 0) {
      throw new Error('No operations in response');
    }

    const operation = operations[0];
    const status = operation?.status || 'UNKNOWN';

    // 解析视频数据
    const metadata = operation?.metadata || operation?.operation?.metadata;
    const videoData = operation?.video || metadata?.video;

    return {
      status,
      videoUrl: videoData?.fifeUrl || videoData?.videoUrl || '',
      thumbnailUrl: videoData?.servingBaseUri || videoData?.thumbnailUrl || '',
      duration: videoData?.durationSeconds || 0,
      mediaGenerationId: videoData?.mediaGenerationId || operation?.mediaGenerationId,
      error: operation?.error || metadata?.error,
      remainingCredits: data.remainingCredits, // 行级注释：返回剩余积分
    };
  } catch (error) {
    console.error('❌ 查询视频状态失败:', error);
    throw error;
  }
}

// 行级注释：视频超清放大（1080p）- 直接调用 Google API
export async function generateVideoUpsampleDirectly(
  originalMediaId: string,
  bearerToken: string,
  sessionId: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  const url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo';

  // 行级注释：转换宽高比格式
  const videoAspectRatio =
    aspectRatio === '16:9'
      ? 'VIDEO_ASPECT_RATIO_LANDSCAPE'
      : aspectRatio === '9:16'
        ? 'VIDEO_ASPECT_RATIO_PORTRAIT'
        : 'VIDEO_ASPECT_RATIO_SQUARE';

  // 行级注释：生成场景 ID
  const finalSceneId = sceneId || crypto.randomUUID();

  // 行级注释：生成随机种子
  const finalSeed = seed ?? Math.floor(Math.random() * 100000);

  const payload = {
    requests: [
      {
        aspectRatio: videoAspectRatio,
        seed: finalSeed,
        videoInput: {
          mediaId: originalMediaId,
        },
        videoModelKey: 'veo_2_1080p_upsampler_8s', // 行级注释：固定使用 1080p 超清模型
        metadata: {
          sceneId: finalSceneId,
        },
      },
    ],
    clientContext: {
      sessionId: sessionId,
    },
  };



  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Authorization': `Bearer ${bearerToken}`,
      'Origin': 'https://labs.google',
      'Referer': 'https://labs.google/',
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`视频超清请求失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  const operation = data.operations?.[0];
  if (!operation) {
    throw new Error('视频超清响应缺少 operation 字段');
  }

  // 行级注释：详细日志，调试 operationName 提取


  const extractedOperationName = operation.operation?.name || '';

  if (!extractedOperationName) {
    console.error('❌ 警告：operationName 为空！完整响应:', JSON.stringify(data, null, 2));
  }

  return {
    operationName: extractedOperationName,
    sceneId: operation.sceneId || finalSceneId,
    status: operation.status || 'MEDIA_GENERATION_STATUS_PENDING',
    remainingCredits: data.remainingCredits,
  };
}

/**
 * 直接调用 Google Flow API 生成视频（镜头控制重拍）
 */
export async function generateVideoReshootDirectly(
  mediaId: string,
  reshootMotionType: ReshootMotionType,
  bearerToken: string,
  sessionId: string,
  projectId: string,
  aspectRatio: AspectRatio,
  accountTier: AccountTier,
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  const url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoReshootVideo';

  // 行级注释：使用 tier-config 适配器获取配置（镜头控制只需要 modelKey 和 paygateTier）
  const config = getVideoApiConfig('reshoot', accountTier, aspectRatio);

  const requestSeed = typeof seed === 'number'
    ? seed
    : Math.floor(Math.random() * 100_000);

  const generatedSceneId = sceneId && sceneId.trim()
    ? sceneId.trim()
    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const payload = {
    clientContext: {
      sessionId: sessionId.trim(),
      projectId: projectId.trim(),
      tool: 'PINHOLE',
      userPaygateTier: config.userPaygateTier,  // 行级注释：使用 tier-config 获取的配置
    },
    requests: [
      {
        seed: requestSeed,
        aspectRatio: config.aspectRatioEnum,  // 行级注释：使用 tier-config 获取的配置
        videoInput: {
          mediaId: mediaId.trim(),
        },
        reshootMotionType,
        videoModelKey: config.videoModelKey,  // 行级注释：使用 tier-config 获取的配置
        metadata: {
          sceneId: generatedSceneId,
        },
      },
    ],
  };



  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 镜头控制重拍失败:', errorData);
      throw new Error(`Reshoot failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const operations = data.operations || [];
    if (operations.length === 0) {
      throw new Error('No operations in response');
    }

    const operation = operations[0];

    return {
      operationName: operation?.operation?.name || '',
      sceneId: operation?.sceneId || generatedSceneId,
      status: operation?.status || 'MEDIA_GENERATION_STATUS_PENDING',
      remainingCredits: data.remainingCredits,
    };
  } catch (error) {
    console.error('❌ 直接生成视频（镜头控制）失败:', error);
    throw error;
  }
}

/**
 * 直接调用 Google Flow API 生成视频（多图参考）
 * 最多支持 3 张参考图片作为视频生成的视觉参考
 * 
 * @param prompt 视频描述提示词
 * @param referenceMediaIds 参考图片的 mediaId 数组（最多 3 张）
 * @param bearerToken 认证令牌
 * @param projectId 项目 ID
 * @param sessionId 会话 ID
 * @param aspectRatio 视频宽高比
 * @param accountTier 账号套餐
 * @param seed 随机种子（可选）
 * @param sceneId 场景 ID（可选）
 */
export async function generateVideoReferenceImagesDirectly(
  prompt: string,
  referenceMediaIds: string[],
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: AspectRatio,
  accountTier: AccountTier,
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  // 行级注释：验证参考图片数量（1-3 张）
  if (!referenceMediaIds || referenceMediaIds.length === 0) {
    throw new Error('多图参考视频至少需要 1 张参考图片');
  }
  if (referenceMediaIds.length > 3) {
    throw new Error('多图参考视频最多支持 3 张参考图片');
  }

  const url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoReferenceImages';

  // 行级注释：使用 tier-config 获取配置
  const config = getVideoApiConfig('reference-images', accountTier, aspectRatio);

  const requestSeed = typeof seed === 'number'
    ? seed
    : Math.floor(Math.random() * 100_000);

  const generatedSceneId = sceneId && sceneId.trim()
    ? sceneId.trim()
    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  // 行级注释：构建参考图片数组，每张图片的 imageUsageType 为 IMAGE_USAGE_TYPE_ASSET
  const referenceImages = referenceMediaIds
    .filter(id => id && id.trim())
    .map(mediaId => ({
      imageUsageType: 'IMAGE_USAGE_TYPE_ASSET',
      mediaId: mediaId.trim(),
    }));

  const payload = {
    clientContext: {
      sessionId: sessionId.trim(),
      projectId: projectId.trim(),
      tool: 'PINHOLE',
      userPaygateTier: config.userPaygateTier,  // 行级注释：使用 tier-config 获取的配置
    },
    requests: [
      {
        aspectRatio: config.aspectRatioEnum,  // 行级注释：使用 tier-config 获取的配置
        metadata: {
          sceneId: generatedSceneId,
        },
        referenceImages,  // 行级注释：参考图片数组
        seed: requestSeed,
        textInput: {
          prompt: prompt.trim(),
        },
        videoModelKey: config.videoModelKey,  // 行级注释：使用 tier-config 获取的配置
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 多图参考视频生成失败:', errorData);
      throw new Error(`Video generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const operations = data.operations || [];
    if (operations.length === 0) {
      throw new Error('No operations in response');
    }

    const operation = operations[0];

    return {
      operationName: operation?.operation?.name || '',
      sceneId: operation?.sceneId || generatedSceneId,
      status: operation?.status || 'MEDIA_GENERATION_STATUS_PENDING',
      remainingCredits: data.remainingCredits,
    };
  } catch (error) {
    console.error('❌ 直接生成视频（多图参考）失败:', error);
    throw error;
  }
}

/**
 * 直接调用 Google Flow API 延长视频
 */
export async function generateVideoExtendDirectly(
  mediaId: string,
  prompt: string,
  bearerToken: string,
  sessionId: string,
  projectId: string,
  aspectRatio: AspectRatio,
  accountTier: AccountTier,
  videoModel: VideoMode,
  startFrameIndex?: number,
  endFrameIndex?: number,
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  const url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoExtendVideo';

  // 行级注释：使用 tier-config 适配器获取配置
  const config = getVideoApiConfig('extend', accountTier, aspectRatio, videoModel);

  const requestSeed = typeof seed === 'number'
    ? seed
    : Math.floor(Math.random() * 100_000);

  const generatedSceneId = sceneId && sceneId.trim()
    ? sceneId.trim()
    : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  // 行级注释：默认使用视频的最后 24 帧（约 1 秒，假设 24fps）
  const finalStartFrameIndex = startFrameIndex !== undefined ? startFrameIndex : 168;
  const finalEndFrameIndex = endFrameIndex !== undefined ? endFrameIndex : 191;

  const payload = {
    clientContext: {
      sessionId: sessionId.trim(),
      projectId: projectId.trim(),
      tool: 'PINHOLE',
      userPaygateTier: config.userPaygateTier,  // 行级注释：使用 tier-config 获取的配置
    },
    requests: [
      {
        textInput: {
          prompt: prompt.trim(),
        },
        videoInput: {
          mediaId: mediaId.trim(),
          startFrameIndex: finalStartFrameIndex,
          endFrameIndex: finalEndFrameIndex,
        },
        videoModelKey: config.videoModelKey,  // 行级注释：使用 tier-config 获取的配置
        aspectRatio: config.aspectRatioEnum,  // 行级注释：使用 tier-config 获取的配置
        seed: requestSeed,
        metadata: {
          sceneId: generatedSceneId,
        },
      },
    ],
  };



  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ 视频延长失败:', errorData);
      throw new Error(`Video extend failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const operations = data.operations || [];
    if (operations.length === 0) {
      throw new Error('No operations in response');
    }

    const operation = operations[0];

    return {
      operationName: operation?.operation?.name || '',
      sceneId: operation?.sceneId || generatedSceneId,
      status: operation?.status || 'MEDIA_GENERATION_STATUS_PENDING',
      remainingCredits: data.remainingCredits,
    };
  } catch (error) {
    console.error('❌ 直接生成视频（延长）失败:', error);
    throw error;
  }
}
