// 直接调用 Google API，不通过 Vercel 服务器
// 用于节省 Fast Origin Transfer

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

  console.log('📤 直接上传图片到 Google Flow API...');

  try {
    const response = await fetch('https://aisandbox-pa.googleapis.com/v1:uploadUserImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ 图片上传成功（直接调用）');

    return {
      mediaGenerationId: data?.mediaGenerationId?.mediaGenerationId,
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
  prompt: string,
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  accountTier: 'pro' | 'ultra',
  references?: Array<{ mediaId?: string; mediaGenerationId?: string }>,
  seed?: number,
  count?: number,
  prefixPrompt?: string
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

  // 行级注释：根据账号类型选择 PaygateTier
  const userPaygateTier = accountTier === 'ultra' 
    ? 'PAYGATE_TIER_TWO' 
    : 'PAYGATE_TIER_ONE';

  // 构建最终提示词
  const finalPrompt = prefixPrompt && prefixPrompt.trim()
    ? `${prefixPrompt.trim()}, ${prompt}`
    : prompt;

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
  const requests = Array.from({ length: generationCount }, (_, index) => {
    const requestSeed =
      typeof seed === 'number'
        ? seed + index
        : Math.floor(Math.random() * 1_000_000);

    return {
      clientContext: {
        sessionId: sessionId.trim(),
        projectId: projectId.trim(),
        tool: 'PINHOLE',
        userPaygateTier,
      },
      seed: requestSeed,
      imageModelName: 'GEM_PIX',
      imageAspectRatio: normalizedAspect,
      prompt: finalPrompt,
      imageInputs,
    };
  });

  const payload = { requests };

  console.log('🎨 直接调用 Google Flow Generate API...');

  try {
    const response = await fetch(
      `https://aisandbox-pa.googleapis.com/v1/projects/${projectId.trim()}/flowMedia:batchGenerateImages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Generate failed: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    console.log('✅ 图片生成成功（直接调用）');

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
          prompt: generatedImage?.prompt || finalPrompt,
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
  aspectRatio: '16:9' | '9:16' | '1:1',
  accountTier: 'pro' | 'ultra',
  seed?: number,
  sceneId?: string
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  // 规范化视频宽高比
  const normalizedAspect = aspectRatio === '9:16'
    ? 'VIDEO_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
    ? 'VIDEO_ASPECT_RATIO_SQUARE'
    : 'VIDEO_ASPECT_RATIO_LANDSCAPE';

  // 行级注释：根据账号类型选择视频模型
  let videoModelKey: string;
  if (accountTier === 'ultra') {
    // Ultra 账号使用带 _ultra 后缀的模型
    videoModelKey = aspectRatio === '9:16'
      ? 'veo_3_1_t2v_fast_ultra'
      : 'veo_3_1_t2v_fast_ultra'; // 横屏也用 ultra
  } else {
    // Pro 账号使用标准模型
    videoModelKey = aspectRatio === '9:16' 
      ? 'veo_3_1_t2v_fast_portrait' 
      : 'veo_3_1_t2v_fast';
  }

  // 行级注释：根据账号类型选择 PaygateTier
  const userPaygateTier = accountTier === 'ultra' 
    ? 'PAYGATE_TIER_TWO' 
    : 'PAYGATE_TIER_ONE';

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
      userPaygateTier,
    },
    requests: [
      {
        aspectRatio: normalizedAspect,
        seed: requestSeed,
        textInput: {
          prompt: prompt.trim(),
        },
        videoModelKey,
        metadata: {
          sceneId: generatedSceneId,
        },
      },
    ],
  };

  console.log('🎬 直接调用 Google Flow API 生成视频（文生视频）...', {
    accountTier,
    aspectRatio: normalizedAspect,
    videoModelKey,
    userPaygateTier,
    sceneId: generatedSceneId,
  });

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
    console.log('✅ 文生视频任务已提交（直接调用）');

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
  aspectRatio: '16:9' | '9:16' | '1:1',
  accountTier: 'pro' | 'ultra',
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
  // 规范化视频宽高比
  const normalizedAspect = aspectRatio === '9:16'
    ? 'VIDEO_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
    ? 'VIDEO_ASPECT_RATIO_SQUARE'
    : 'VIDEO_ASPECT_RATIO_LANDSCAPE';

  const hasEndImage = Boolean(endMediaId && endMediaId.trim());

  // 行级注释：根据账号类型和模式选择视频模型
  let videoModelKey: string;
  if (accountTier === 'ultra') {
    // Ultra 账号使用带 _ultra 后缀的模型
    if (hasEndImage) {
      // 首尾帧模式
      videoModelKey = aspectRatio === '9:16'
        ? 'veo_3_1_i2v_s_fast_portrait_fl_ultra'
        : 'veo_3_1_i2v_s_fast_fl_ultra';
    } else {
      // 仅首帧模式
      videoModelKey = aspectRatio === '9:16'
        ? 'veo_3_1_i2v_s_fast_portrait_ultra'
        : 'veo_3_1_i2v_s_fast_ultra';
    }
  } else {
    // Pro 账号使用标准模型
    if (hasEndImage) {
      // 首尾帧模式
      videoModelKey = aspectRatio === '9:16'
        ? 'veo_3_1_i2v_s_fast_portrait_fl'
        : 'veo_3_1_i2v_s_fast_fl';
    } else {
      // 仅首帧模式
      videoModelKey = aspectRatio === '9:16'
        ? 'veo_3_1_i2v_s_fast_portrait'
        : 'veo_3_1_i2v_s_fast';
    }
  }

  // 行级注释：根据账号类型选择 PaygateTier
  const userPaygateTier = accountTier === 'ultra' 
    ? 'PAYGATE_TIER_TWO' 
    : 'PAYGATE_TIER_ONE';

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
    aspectRatio: normalizedAspect,
    seed: requestSeed,
    textInput: {
      prompt: prompt.trim(),
    },
    videoModelKey,
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
      userPaygateTier,
    },
    requests: [requestObject],
  };

  // 选择端点
  const apiEndpoint = hasEndImage
    ? 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage'
    : 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage';

  console.log('🎬 直接调用 Google Flow API 生成视频（图生视频）...', {
    accountTier,
    mode: hasEndImage ? '首尾帧' : '仅首帧',
    aspectRatio: normalizedAspect,
    videoModelKey,
    userPaygateTier,
    sceneId: generatedSceneId,
  });

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
    console.log('✅ 图生视频任务已提交（直接调用）');

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
    };
  } catch (error) {
    console.error('❌ 查询视频状态失败:', error);
    throw error;
  }
}

