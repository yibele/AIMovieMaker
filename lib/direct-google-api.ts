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
        userPaygateTier: 'PAYGATE_TIER_ONE',
      },
      seed: requestSeed,
      imageModelName: 'GEM_PIX',
      imageAspectRatio: normalizedAspect,
      prompt: finalPrompt,
      imageInputs,
      returnEncodedImage: true, // 要求返回 base64 数据
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

