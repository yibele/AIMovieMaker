export type FlowAspectRatioEnum =
  | 'IMAGE_ASPECT_RATIO_LANDSCAPE'
  | 'IMAGE_ASPECT_RATIO_PORTRAIT'
  | 'IMAGE_ASPECT_RATIO_SQUARE';

const aspectRatioMap: Record<'16:9' | '9:16' | '1:1', FlowAspectRatioEnum> = {
  '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
};

function normalizeAspectRatio(
  ratio?: string
): FlowAspectRatioEnum {
  if (!ratio) {
    return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
  }
  if (ratio in aspectRatioMap) {
    return aspectRatioMap[ratio as keyof typeof aspectRatioMap];
  }
  if (
    ratio === 'IMAGE_ASPECT_RATIO_LANDSCAPE' ||
    ratio === 'IMAGE_ASPECT_RATIO_PORTRAIT' ||
    ratio === 'IMAGE_ASPECT_RATIO_SQUARE'
  ) {
    return ratio;
  }
  return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
}

async function handleFlowError(response: Response) {
  const errorText = await response.text();
  try {
    const data = JSON.parse(errorText);
    const message =
      data?.error?.message ||
      data?.message ||
      errorText ||
      'Flow API 请求失败';
    throw new Error(`❌ Flow API 错误 (${response.status}): ${message}`);
  } catch {
    throw new Error(`❌ Flow API 错误 (${response.status}): ${errorText}`);
  }
}

export async function uploadImageWithFlow(params: {
  imageBase64: string;
  bearerToken: string;
  sessionId: string;
  proxy?: string;
  aspectRatio?: FlowAspectRatioEnum;
}): Promise<{
  mediaGenerationId?: string;
  width?: number;
  height?: number;
  workflowId?: string;
  sessionId?: string;
}> {
  const { imageBase64, bearerToken, sessionId, proxy, aspectRatio } = params;

  const response = await fetch('/api/flow/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      bearerToken,
      sessionId,
      proxy,
      aspectRatio: aspectRatio ?? 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    }),
  });

  if (!response.ok) {
    await handleFlowError(response);
  }

  const data = await response.json();
  return {
    mediaGenerationId: data.mediaGenerationId,
    width: data.width,
    height: data.height,
    workflowId: data.workflowId,
    sessionId: data.sessionId ?? sessionId,
  };
}

type FlowGeneratedImage = {
  encodedImage: string;
  base64Image?: string;
  imageBase64?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  prompt?: string;
  seed?: number;
  mimeType?: string;
  fifeUrl?: string;
};

// 视频生成相关类型
export type FlowVideoAspectRatioEnum =
  | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  | 'VIDEO_ASPECT_RATIO_PORTRAIT'
  | 'VIDEO_ASPECT_RATIO_SQUARE';

export type VideoGenerationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'MEDIA_GENERATION_STATUS_PENDING'
  | 'MEDIA_GENERATION_STATUS_ACTIVE'
  | 'MEDIA_GENERATION_STATUS_QUEUED'
  | 'MEDIA_GENERATION_STATUS_SUCCESSFUL'
  | 'MEDIA_GENERATION_STATUS_FAILED';

// 文生视频
export async function generateVideoWithFlow(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  bearerToken: string;
  projectId: string;
  sessionId: string;
  proxy?: string;
  seed?: number;
  sceneId?: string;
}): Promise<{
  operationName: string;
  sceneId: string;
  status: VideoGenerationStatus;
  remainingCredits?: number;
}> {
  const {
    prompt,
    aspectRatio,
    bearerToken,
    projectId,
    sessionId,
    proxy,
    seed,
    sceneId,
  } = params;

  const response = await fetch('/api/flow/video/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio,
      bearerToken,
      projectId,
      sessionId,
      proxy,
      seed,
      sceneId,
    }),
  });

  if (!response.ok) {
    await handleFlowError(response);
  }

  const data = await response.json();
  return {
    operationName: data.operationName,
    sceneId: data.sceneId,
    status: data.status,
    remainingCredits: data.remainingCredits,
  };
}

export async function generateVideoStartEndWithFlow(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  bearerToken: string;
  projectId: string;
  sessionId: string;
  startMediaId: string;
  endMediaId: string;
  proxy?: string;
  seed?: number;
  sceneId?: string;
}): Promise<{
  operationName: string;
  sceneId: string;
  status: VideoGenerationStatus;
  remainingCredits?: number;
}> {
  const {
    prompt,
    aspectRatio,
    bearerToken,
    projectId,
    sessionId,
    startMediaId,
    endMediaId,
    proxy,
    seed,
    sceneId,
  } = params;

  const response = await fetch('/api/flow/video/start-end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio,
      bearerToken,
      projectId,
      sessionId,
      startMediaId,
      endMediaId,
      proxy,
      seed,
      sceneId,
    }),
  });

  if (!response.ok) {
    await handleFlowError(response);
  }

  const data = await response.json();
  return {
    operationName: data.operationName,
    sceneId: data.sceneId,
    status: data.status,
    remainingCredits: data.remainingCredits,
  };
}

// 查询视频生成状态
export async function checkVideoStatusWithFlow(params: {
  operations: Array<{ operation: { name: string } }>;
  bearerToken: string;
  proxy?: string;
}): Promise<{
  operations: Array<{
    operation: { name: string; metadata?: any };
    status: VideoGenerationStatus;
    metadata?: any;
    video?: {
      videoUrl?: string;
      encodedVideo?: string;
      thumbnailUrl?: string;
      mimeType?: string;
    };
    error?: string;
  }>;
  remainingCredits?: number;
}> {
  const { operations, bearerToken, proxy } = params;

  const response = await fetch('/api/flow/video/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operations,
      bearerToken,
      proxy,
    }),
  });

  if (!response.ok) {
    await handleFlowError(response);
  }

  const data = await response.json();
  return {
    operations: data.operations || [],
    remainingCredits: data.remainingCredits,
  };
}

export async function generateImageWithFlow(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  bearerToken: string;
  projectId: string;
  sessionId: string;
  proxy?: string;
  seed?: number;
  references?: Array<{ mediaGenerationId: string }>;
  count?: number; // 生成数量 (1-4)
}): Promise<{
  imageUrl: string;
  mediaGenerationId?: string;
  workflowId?: string;
  sessionId?: string;
  translatedPrompt?: string;
  seed?: number;
  images?: Array<{
    imageUrl: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  const {
    prompt,
    aspectRatio,
    bearerToken,
    projectId,
    sessionId,
    proxy,
    seed,
    references,
    count,
  } = params;

  const response = await fetch('/api/flow/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspectRatio,
      bearerToken,
      projectId,
      sessionId,
      proxy,
      seed,
      references,
      count, // 传递生成数量
    }),
  });

  if (!response.ok) {
    await handleFlowError(response);
  }

  const data = await response.json();

  const imagesRaw: FlowGeneratedImage[] = Array.isArray(data?.images)
    ? data.images
    : [];

  const mappedImages = imagesRaw
    .map((img) => {
      const encoded =
        img?.encodedImage || img?.base64Image || img?.imageBase64;
      if (!encoded) {
        return null;
      }
      const mime = img?.mimeType || 'image/png';
      return {
        encodedImage: encoded,
        mimeType: mime,
        mediaGenerationId: img?.mediaGenerationId,
        workflowId: img?.workflowId,
        prompt: img?.prompt,
        seed: img?.seed,
        fifeUrl: img?.fifeUrl,
      };
    })
    .filter(Boolean) as Array<{
      encodedImage: string;
      mimeType: string;
      mediaGenerationId?: string;
      workflowId?: string;
      prompt?: string;
      seed?: number;
      fifeUrl?: string;
    }>;

  let primaryImage = mappedImages[0];

  if (!primaryImage) {
    const encoded =
      data?.encodedImage || data?.base64Image || data?.imageBase64;
    if (!encoded) {
      throw new Error('❌ Flow API 响应中未找到图片数据');
    }
    primaryImage = {
      encodedImage: encoded,
      mimeType: data?.mimeType || 'image/png',
      mediaGenerationId: data?.mediaGenerationId,
      workflowId: data?.workflowId,
      prompt: data?.prompt,
      seed: data?.seed,
      fifeUrl: data?.fifeUrl,
    };
  }

  const imageUrl = `data:${primaryImage.mimeType};base64,${primaryImage.encodedImage}`;

  return {
    imageUrl,
    mediaGenerationId:
      primaryImage.mediaGenerationId ?? data.mediaGenerationId,
    workflowId: primaryImage.workflowId ?? data.workflowId,
    sessionId: data.sessionId ?? sessionId,
    translatedPrompt: primaryImage.prompt || prompt,
    seed: primaryImage.seed ?? seed,
    images: mappedImages.map((img) => ({
      imageUrl: `data:${img.mimeType};base64,${img.encodedImage}`,
      mediaGenerationId: img.mediaGenerationId,
      workflowId: img.workflowId,
      prompt: img.prompt,
      seed: img.seed,
      fifeUrl: img.fifeUrl,
    })),
  };
}


