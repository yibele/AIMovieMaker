import { GenerationMode, ImageElement } from './types';
import { useCanvasStore } from './store';
import {
  generateImageWithFlow,
  uploadImageWithFlow,
  FlowAspectRatioEnum,
  generateVideoStartEndWithFlow,
  checkVideoStatusWithFlow,
  generateVideoWithFlow,
} from './flow-api';

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
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  sessionId?: string;
  images?: Array<{
    imageUrl: string;
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
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  images?: Array<{
    imageUrl: string;
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
    .filter((ref) => ref.mediaGenerationId && ref.mediaGenerationId.trim())
    .map((ref) => ({
      mediaGenerationId: ref.mediaGenerationId as string,
    }));

  if (validReferences.length < 2) {
    throw new Error('至少需要两张包含 mediaGenerationId 的图片才能进行多图编辑'); // 行级注释说明参数要求
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
  originalMediaGenerationId?: string,
  count?: number // 生成数量 (1-4)
): Promise<{
  imageUrl: string;
  promptId: string;
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  images?: Array<{
    imageUrl: string;
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
  if (!originalMediaGenerationId || !originalMediaGenerationId.trim()) {
    throw new Error('图生图需要提供原始 mediaGenerationId');
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
    references: [{ mediaGenerationId: originalMediaGenerationId }],
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
  endImageId: string,
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
  const endImage = elements.find(
    (el) => el.id === endImageId && el.type === 'image'
  ) as ImageElement | undefined;

  if (!startImage) {
    throw new Error('找不到首帧图片节点，请检查连线是否正确');
  }
  if (!endImage) {
    throw new Error('找不到尾帧图片节点，请检查连线是否正确');
  }

  const startMediaId = startImage.mediaGenerationId?.trim();
  const endMediaId = endImage.mediaGenerationId?.trim();

  if (!startMediaId) {
    throw new Error('首帧图片缺少 Flow mediaGenerationId，请先使用 Flow 生成或上传同步');
  }
  if (!endMediaId) {
    throw new Error('尾帧图片缺少 Flow mediaGenerationId，请先使用 Flow 生成或上传同步');
  }

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
    endImageId,
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
    endMediaId,
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

