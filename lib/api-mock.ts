import { GenerationMode, ImageElement } from './types';
import { useCanvasStore } from './store';

// ============================================================================
// Flow API 类型定义和工具函数（从 flow-api.ts 合并）
// ============================================================================

export type FlowAspectRatioEnum =
  | 'IMAGE_ASPECT_RATIO_LANDSCAPE'
  | 'IMAGE_ASPECT_RATIO_PORTRAIT'
  | 'IMAGE_ASPECT_RATIO_SQUARE';

const aspectRatioMap: Record<'16:9' | '9:16' | '1:1', FlowAspectRatioEnum> = {
  '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
};

function normalizeAspectRatio(ratio?: string): FlowAspectRatioEnum {
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

type FlowGeneratedImage = {
  encodedImage: string;
  base64Image?: string;
  imageBase64?: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  prompt?: string;
  seed?: number;
  mimeType?: string;
  fifeUrl?: string;
};

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

// ============================================================================
// Flow API 调用函数（从 flow-api.ts 合并）
// ============================================================================

async function uploadImageWithFlow(params: {
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

async function generateVideoWithFlow(params: {
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

async function generateVideoStartEndWithFlow(params: {
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

async function generateImageWithFlow(params: {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  bearerToken: string;
  projectId: string;
  sessionId: string;
  proxy?: string;
  seed?: number;
  references?: Array<{ mediaId?: string; mediaGenerationId?: string }>;
  count?: number;
}): Promise<{
  imageUrl: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  sessionId?: string;
  translatedPrompt?: string;
  seed?: number;
  images?: Array<{
    imageUrl: string;
    mediaId?: string;
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
      count,
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
        mediaId: img?.mediaId,
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
      mediaId?: string;
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
      mediaId: data?.mediaId,
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
    mediaId: primaryImage.mediaId ?? data.mediaId,
    mediaGenerationId:
      primaryImage.mediaGenerationId ?? data.mediaGenerationId,
    workflowId: primaryImage.workflowId ?? data.workflowId,
    sessionId: data.sessionId ?? sessionId,
    translatedPrompt: primaryImage.prompt || prompt,
    seed: primaryImage.seed ?? seed,
    images: mappedImages.map((img) => ({
      imageUrl: `data:${img.mimeType};base64,${img.encodedImage}`,
      mediaId: img.mediaId,
      mediaGenerationId: img.mediaGenerationId,
      workflowId: img.workflowId,
      prompt: img.prompt,
      seed: img.seed,
      fifeUrl: img.fifeUrl,
    })),
  };
}

// ============================================================================
// 原 api-mock.ts 代码开始
// ============================================================================

// 虚拟图片库（使用 Unsplash 随机图片）
const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop',
];

// 虚拟视频库
const MOCK_VIDEOS = [
  {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=300&fit=crop',
    duration: 5,
  },
  {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&h=300&fit=crop',
    duration: 8,
  },
  {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1476842384041-a57a4f124e2e?w=400&h=300&fit=crop',
    duration: 3,
  },
];

// 模拟 API 延迟
const MOCK_LATENCY = 1500; // 1.5 秒

// 随机获取图片
function getRandomImage(): string {
  return MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
}

// 随机获取视频
function getRandomVideo(): { src: string; thumbnail: string; duration: number } {
  return MOCK_VIDEOS[Math.floor(Math.random() * MOCK_VIDEOS.length)];
}

// 模拟延迟
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const VIDEO_POLL_INTERVAL_MS = 5000; // 行级注释：视频状态轮询间隔
const VIDEO_MAX_ATTEMPTS = 60; // 行级注释：最多轮询 5 分钟

function inferVideoAspectRatio(
  startImage?: ImageElement,
  endImage?: ImageElement
): '16:9' | '9:16' | '1:1' {
  const candidate =
    startImage?.size || endImage?.size || { width: 400, height: 300 };
  const { width, height } = candidate;
  if (!width || !height) {
    return '9:16';
  }

  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.1) {
    return '1:1';
  }
  return ratio >= 1 ? '16:9' : '9:16';
}

type FlowVideoResult = {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  mediaGenerationId?: string;
};

function extractFlowVideoData(operation: any): FlowVideoResult | null {
  if (!operation) {
    return null;
  }

  const metadata =
    operation.metadata ?? operation.operation?.metadata ?? null;
  const videoData =
    operation.video ?? metadata?.video ?? metadata?.media ?? null;

  if (!videoData) {
    return null;
  }

  const videoUrl =
    videoData.fifeUrl ||
    videoData.videoUrl ||
    videoData.videoUri ||
    videoData.uri ||
    '';

  const thumbnailUrl =
    videoData.servingBaseUri ||
    videoData.thumbnailUrl ||
    videoData.thumbnail ||
    '';

  const duration =
    typeof videoData.durationSeconds === 'number'
      ? videoData.durationSeconds
      : typeof videoData.duration === 'number'
      ? videoData.duration
      : typeof videoData.durationMs === 'number'
      ? Math.round(videoData.durationMs / 1000)
      : 0;

  return {
    videoUrl,
    thumbnailUrl,
    duration,
    mediaGenerationId: videoData.mediaGenerationId,
  };
}

async function pollFlowVideoOperation(
  operationName: string,
  bearerToken: string,
  proxy?: string
): Promise<FlowVideoResult> {
  for (let attempt = 1; attempt <= VIDEO_MAX_ATTEMPTS; attempt++) {
    console.log(`🔁 图生视频轮询第 ${attempt} 次`);
    const statusResult = await checkVideoStatusWithFlow({
      operations: [{ operation: { name: operationName } }],
      bearerToken,
      proxy,
    });

    const operation = statusResult.operations?.[0];
    const status = operation?.status;
    console.log('📦 Flow 图生视频状态:', status);

    if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
      const videoResult = extractFlowVideoData(operation);
      if (!videoResult || !videoResult.videoUrl) {
        throw new Error('Flow 返回缺少视频地址');
      }
      return videoResult;
    }

    if (status === 'MEDIA_GENERATION_STATUS_FAILED') {
      const errorMessage =
        operation?.error ||
        operation?.metadata?.error ||
        operation?.operation?.metadata?.error ||
        'Flow 图生视频生成失败';
      throw new Error(errorMessage);
    }

    await delay(VIDEO_POLL_INTERVAL_MS);
  }

  throw new Error('图生视频生成超时，请稍后重试');
}

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 生成新图片接口 - 集成 Flow API
export async function generateImage(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  count?: number // 生成数量 (1-4)
): Promise<{
  imageUrl: string;
  promptId: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  sessionId?: string;
  images?: Array<{
    imageUrl: string;
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  // 获取 API 配置
  const apiConfig = useCanvasStore.getState().apiConfig;
  
  // 检查是否配置了 Bearer Token
  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('请先在右上角设置中配置 Bearer Token');
  }
  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('请在设置中配置 Flow Project ID');
  }

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = useCanvasStore.getState().regenerateFlowContext();
    sessionId = context.sessionId;
  }
  
  console.log('🚀 使用 Flow API 生成图片:', prompt, aspectRatio, `数量: ${count || apiConfig.generationCount || 1}`);
  const result = await generateImageWithFlow({
    prompt,
    aspectRatio,
    bearerToken: apiConfig.bearerToken,
    projectId: apiConfig.projectId,
    sessionId,
    proxy: apiConfig.proxy,
    count: count ?? apiConfig.generationCount ?? 1, // 使用传入的 count 或配置的 generationCount
  });
  const contextUpdates: Partial<typeof apiConfig> = {};
  if (result.workflowId && result.workflowId !== apiConfig.workflowId) {
    contextUpdates.workflowId = result.workflowId;
  }
  if (result.sessionId && result.sessionId !== apiConfig.sessionId) {
    contextUpdates.sessionId = result.sessionId;
  }
  if (Object.keys(contextUpdates).length > 0) {
    useCanvasStore.getState().setApiConfig(contextUpdates);
  }
  return {
    imageUrl: result.imageUrl,
    promptId: generateId(),
    mediaId: result.mediaId,
    mediaGenerationId: result.mediaGenerationId,
    workflowId: result.workflowId,
    translatedPrompt: result.translatedPrompt,
    sessionId: result.sessionId,
    images: result.images, // 返回所有生成的图片
  };
}

// 上传图片并注册到 Flow，获取 mediaGenerationId 供后续图生图使用
export async function registerUploadedImage(
  imageBase64: string,
  flowAspectRatio?: FlowAspectRatioEnum
): Promise<{
  caption: string;
  mediaGenerationId?: string | null;
  workflowId: string;
  sessionId: string;
}> {
  const apiConfig = useCanvasStore.getState().apiConfig;

  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('上传图片需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('上传图片需要配置 Flow Project ID，请在右上角设置中配置');
  }

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = useCanvasStore.getState().regenerateFlowContext();
    sessionId = context.sessionId;
  }

  console.log('📝 使用 Flow API 上传用户图片');

  const uploadResult = await uploadImageWithFlow({
    imageBase64,
    bearerToken: apiConfig.bearerToken,
    sessionId,
    proxy: apiConfig.proxy,
    aspectRatio: flowAspectRatio,
  });

  const uploadContextUpdates: Partial<typeof apiConfig> = {};
  if (uploadResult.sessionId && uploadResult.sessionId !== apiConfig.sessionId) {
    uploadContextUpdates.sessionId = uploadResult.sessionId;
  }
  if (Object.keys(uploadContextUpdates).length > 0) {
    useCanvasStore.getState().setApiConfig(uploadContextUpdates);
  }

  const finalWorkflowId =
    uploadResult.workflowId || apiConfig.workflowId || '';
  const finalSessionId = uploadResult.sessionId || sessionId;

  return {
    caption: 'Flow Uploaded Image',
    mediaGenerationId: uploadResult.mediaGenerationId,
    workflowId: finalWorkflowId,
    sessionId: finalSessionId,
  };
}

// 多图融合编辑（runImageRecipe） // 行级注释说明函数用途
export async function runImageRecipe(
  instruction: string,
  referenceImages: Array<{
    mediaId?: string; // 优先使用 mediaId // 行级注释说明参数用途
    mediaGenerationId?: string;
    caption?: string;
    mediaCategory?: string;
  }>,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  seed?: number,
  count?: number // 生成数量 (1-4)
): Promise<{
  imageUrl: string;
  promptId: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  images?: Array<{
    imageUrl: string;
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  const apiConfig = useCanvasStore.getState().apiConfig;

  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('多图编辑需要配置 Bearer Token，请在右上角设置中配置'); // 行级注释说明前置校验
  }
  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('多图编辑需要配置 Flow Project ID，请在右上角设置中配置');
  }

  const validReferences = referenceImages
    .filter((ref) => (ref.mediaId && ref.mediaId.trim()) || (ref.mediaGenerationId && ref.mediaGenerationId.trim()))
    .map((ref) => ({
      mediaId: ref.mediaId || ref.mediaGenerationId, // 优先使用 mediaId，Flow 要求传这个 // 行级注释说明用途
    }));

  if (validReferences.length < 2) {
    throw new Error('至少需要两张包含 mediaId 或 mediaGenerationId 的图片才能进行多图编辑'); // 行级注释说明参数要求
  }

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = useCanvasStore.getState().regenerateFlowContext();
    sessionId = context.sessionId;
  }
  
  console.log(
    '🧩 使用 Flow API 进行多图融合编辑:',
    instruction,
    aspectRatio,
    `参考图数量: ${validReferences.length}`,
    `生成数量: ${count || apiConfig.generationCount || 1}`
  );

  const result = await generateImageWithFlow({
    prompt: instruction,
    aspectRatio,
    bearerToken: apiConfig.bearerToken,
    projectId: apiConfig.projectId,
    sessionId,
    proxy: apiConfig.proxy,
    seed,
    references: validReferences,
    count: count ?? apiConfig.generationCount ?? 1, // 使用传入的 count 或配置的 generationCount
  });
  const recipeContextUpdates: Partial<typeof apiConfig> = {};
  if (result.workflowId && result.workflowId !== apiConfig.workflowId) {
    recipeContextUpdates.workflowId = result.workflowId;
  }
  if (result.sessionId && result.sessionId !== apiConfig.sessionId) {
    recipeContextUpdates.sessionId = result.sessionId;
  }
  if (Object.keys(recipeContextUpdates).length > 0) {
    useCanvasStore.getState().setApiConfig(recipeContextUpdates);
  }

  return {
    imageUrl: result.imageUrl,
    promptId: generateId(),
    mediaId: result.mediaId,
    mediaGenerationId: result.mediaGenerationId,
    workflowId: result.workflowId,
    translatedPrompt: result.translatedPrompt,
    images: result.images, // 返回所有生成的图片
  };
}

// 图生图接口 - 使用 Flow 参考图生成
export async function imageToImage(
  prompt: string,
  sourceImageUrl: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  caption: string = '',
  originalMediaId?: string, // 改名：现在接收 mediaId（优先）或 mediaGenerationId // 行级注释说明参数用途
  count?: number // 生成数量 (1-4)
): Promise<{
  imageUrl: string;
  promptId: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  images?: Array<{
    imageUrl: string;
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  const apiConfig = useCanvasStore.getState().apiConfig;
  
  // 检查是否配置了 Cookie（编辑 API 需要 Cookie）
  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('图生图需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('图生图需要配置 Flow Project ID，请在右上角设置中配置');
  }
  if (!originalMediaId || !originalMediaId.trim()) {
    throw new Error('图生图需要提供原始图片的 mediaId 或 mediaGenerationId');
  }

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = useCanvasStore.getState().regenerateFlowContext();
    sessionId = context.sessionId;
  }
  
  console.log('🖼️ 使用 Flow API 图生图:', prompt, aspectRatio, `数量: ${count || apiConfig.generationCount || 1}`);

  const result = await generateImageWithFlow({
    prompt,
    aspectRatio,
    bearerToken: apiConfig.bearerToken,
    projectId: apiConfig.projectId,
    sessionId,
    proxy: apiConfig.proxy,
    references: [{ mediaId: originalMediaId }], // 传 mediaId 给 Flow API // 行级注释说明用途
    count: count ?? apiConfig.generationCount ?? 1, // 使用传入的 count 或配置的 generationCount
  });
  const editContextUpdates: Partial<typeof apiConfig> = {};
  if (result.workflowId && result.workflowId !== apiConfig.workflowId) {
    editContextUpdates.workflowId = result.workflowId;
  }
  if (result.sessionId && result.sessionId !== apiConfig.sessionId) {
    editContextUpdates.sessionId = result.sessionId;
  }
  if (Object.keys(editContextUpdates).length > 0) {
    useCanvasStore.getState().setApiConfig(editContextUpdates);
  }
  
  return {
    imageUrl: result.imageUrl,
    promptId: generateId(),
    mediaId: result.mediaId,
    mediaGenerationId: result.mediaGenerationId,
    workflowId: result.workflowId,
    translatedPrompt: result.translatedPrompt,
    images: result.images, // 返回所有生成的图片
  };
}

// 编辑图片接口（再次生成 / 类似图片）- 保留用于其他功能
export async function editImage(
  prompt: string,
  imageId: string,
  variationType: 'regenerate' | 'similar'
): Promise<{
  imageUrl: string;
  promptId: string;
}> {
  console.log(`🔄 ${variationType === 'regenerate' ? '再次生成' : '生成类似图片'}:`, prompt, imageId);
  await delay(MOCK_LATENCY);
  
  return {
    imageUrl: getRandomImage(),
    promptId: generateId(),
  };
}

// 批量生成接口（基于多张源图）
export async function batchGenerate(
  prompt: string,
  sourceImageUrls: string[],
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  caption: string = '',
  sourceImageMediaIds?: Array<string | undefined>
): Promise<{
  imageUrls: string[];
  promptId: string;
  mediaGenerationIds?: Array<string | undefined>;
  workflowIds?: Array<string | undefined>;
  translatedPrompts?: Array<string | undefined>;
}> {
  const apiConfig = useCanvasStore.getState().apiConfig;
  
  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('批量图生图需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('批量图生图需要配置 Flow Project ID，请在右上角设置中配置');
  }
  
  console.log('🚀 使用 Flow API 批量图生图:', prompt, aspectRatio, sourceImageUrls.length, '张图片');
  
  // 为每个源图生成一张新图
  const imagePromises = sourceImageUrls.map((sourceUrl, index) => 
    imageToImage(
      prompt,
      sourceUrl,
      aspectRatio,
      caption,
      sourceImageMediaIds?.[index]
    )
  );
  
  const results = await Promise.all(imagePromises);
  const imageUrls = results.map(r => r.imageUrl);
  const mediaGenerationIds = results.map((r) => r.mediaGenerationId);
  const workflowIds = results.map((r) => r.workflowId);
  const translatedPrompts = results.map((r) => r.translatedPrompt);
  
  return {
    imageUrls,
    promptId: generateId(),
    mediaGenerationIds,
    workflowIds,
    translatedPrompts,
  };
}

// 生成视频接口（文生视频）
export async function generateVideoFromText(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '9:16',
  seed?: number
): Promise<{
  videoUrl: string;
  thumbnail: string;
  duration: number;
  promptId: string;
  mediaGenerationId?: string;
}> {
  const store = useCanvasStore.getState();
  const apiConfig = store.apiConfig;

  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('文生视频需要配置 Bearer Token，请在右上角设置中配置');
  }

  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('文生视频需要配置 Flow Project ID，请在右上角设置中配置');
  }

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = store.regenerateFlowContext();
    sessionId = context.sessionId;
  }

  const sceneId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  console.log('🎬 使用 Flow 文生视频:', { prompt, aspectRatio, sceneId });

  const generationTask = await generateVideoWithFlow({
    prompt,
    aspectRatio,
    bearerToken: apiConfig.bearerToken,
    projectId: apiConfig.projectId,
    sessionId,
    proxy: apiConfig.proxy,
    seed,
    sceneId,
  });

  console.log('✅ 文生视频任务已提交:', generationTask);

  const videoResult = await pollFlowVideoOperation(
    generationTask.operationName,
    apiConfig.bearerToken,
    apiConfig.proxy
  );

  console.log('🎞️ 文生视频生成完成:', videoResult);

  return {
    videoUrl: videoResult.videoUrl,
    thumbnail: videoResult.thumbnailUrl,
    duration: videoResult.duration,
    promptId: generateId(),
    mediaGenerationId: videoResult.mediaGenerationId,
  };
}

// 生成视频接口（图生视频）
export async function generateVideoFromImage(
  imageId: string,
  prompt?: string
): Promise<{
  videoUrl: string;
  thumbnail: string;
  duration: number;
  promptId: string;
}> {
  console.log('🎬 图生视频:', imageId, prompt);
  await delay(MOCK_LATENCY * 2);
  
  const video = getRandomVideo();
  return {
    videoUrl: video.src,
    thumbnail: video.thumbnail,
    duration: video.duration,
    promptId: generateId(),
  };
}

// 生成视频接口（图到图视频 - 首帧尾帧）
export async function generateVideoFromImages(
  startImageId: string,
  endImageId?: string,
  prompt?: string
): Promise<{
  videoUrl: string;
  thumbnail: string;
  duration: number;
  promptId: string;
  mediaGenerationId?: string;
}> {
  const store = useCanvasStore.getState();
  const apiConfig = store.apiConfig;

  if (!apiConfig.bearerToken || !apiConfig.bearerToken.trim()) {
    throw new Error('图生视频需要配置 Bearer Token，请在右上角设置中配置');
  }

  if (!apiConfig.projectId || !apiConfig.projectId.trim()) {
    throw new Error('图生视频需要配置 Flow Project ID，请在右上角设置中配置');
  }

  const elements = store.elements;
  const startImage = elements.find(
    (el) => el.id === startImageId && el.type === 'image'
  ) as ImageElement | undefined;
  const endImage = endImageId
    ? (elements.find(
        (el) => el.id === endImageId && el.type === 'image'
      ) as ImageElement | undefined)
    : undefined;

  if (!startImage) {
    throw new Error('找不到首帧图片节点，请检查连线是否正确');
  }
  const startMediaId =
    startImage.mediaId?.trim() || startImage.mediaGenerationId?.trim();
  const endMediaId = endImage
    ? endImage.mediaId?.trim() || endImage.mediaGenerationId?.trim()
    : undefined;

  if (!startMediaId) {
    throw new Error('首帧图片缺少 Flow mediaId，请先使用 Flow 生成或上传同步');
  }
  if (endImageId && !endImage) {
    throw new Error('找不到尾帧图片节点，请检查连线是否正确');
  }
  if (endImageId && !endMediaId) {
    throw new Error('尾帧图片缺少 Flow mediaId，请先使用 Flow 生成或上传同步');
  }

  const resolvedEndMediaId = endMediaId || startMediaId;

  let sessionId = apiConfig.sessionId;
  if (!sessionId || !sessionId.trim()) {
    const context = store.regenerateFlowContext();
    sessionId = context.sessionId;
  }

  const aspectRatio = inferVideoAspectRatio(startImage, endImage);
  const promptText = (prompt ?? '').trim() || 'Seamless transition between scenes';
  const sceneId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  console.log('🎬 调用 Flow 图生视频:', {
    startImageId,
    endImageId: endImageId || startImageId,
    aspectRatio,
    sceneId,
  });

  const generationTask = await generateVideoStartEndWithFlow({
    prompt: promptText,
    aspectRatio,
    bearerToken: apiConfig.bearerToken,
    projectId: apiConfig.projectId,
    sessionId,
    proxy: apiConfig.proxy,
    startMediaId,
    endMediaId: resolvedEndMediaId,
    sceneId,
  });

  console.log('✅ Flow 图生视频任务创建成功:', generationTask);

  const videoResult = await pollFlowVideoOperation(
    generationTask.operationName,
    apiConfig.bearerToken,
    apiConfig.proxy
  );

  console.log('🎞️ Flow 图生视频生成完成:', videoResult);

  return {
    videoUrl: videoResult.videoUrl,
    thumbnail: videoResult.thumbnailUrl,
    duration: videoResult.duration,
    promptId: generateId(),
    mediaGenerationId: videoResult.mediaGenerationId,
  };
}

// 通用生成接口（根据模式调用不同方法）
export async function generateByMode(
  mode: GenerationMode,
  prompt: string,
  options?: {
    imageId?: string;
    imageIds?: string[];
    variationType?: 'regenerate' | 'similar';
  }
): Promise<{
  imageUrl?: string;
  imageUrls?: string[];
  promptId: string;
}> {
  switch (mode) {
    case 'generate':
      return await generateImage(prompt);
    
    case 'regenerate':
    case 'similar':
      if (!options?.imageId) {
        throw new Error('imageId is required for regenerate/similar mode');
      }
      return await editImage(prompt, options.imageId, mode);
    
    case 'batch':
      if (!options?.imageIds || options.imageIds.length === 0) {
        throw new Error('imageIds are required for batch mode');
      }
      return await batchGenerate(prompt, options.imageIds);
    
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}

