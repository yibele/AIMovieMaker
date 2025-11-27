import { GenerationMode, ImageElement, ReshootMotionType } from './types';
import { useCanvasStore } from './store';
// 行级注释：导入服务层函数
import {
  buildFinalPrompt,
  getApiContext,
  updateSessionContext,
} from './services/prompt-builder.service';
import {
  pollVideoOperation,
  pollFlowVideoOperation,  // 内部使用
  type VideoPollingResult,
} from './services/video-polling.service';

// 行级注释：重新导出 pollFlowVideoOperation 以保持向后兼容
export { pollFlowVideoOperation } from './services/video-polling.service';

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

// 行级注释：Flow 返回的图片数据，encodedImage 和 fifeUrl 至少有一个
type FlowGeneratedImage = {
  encodedImage?: string;
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
  prefixPrompt?: string;
}): Promise<{
  imageUrl: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  sessionId?: string;
  translatedPrompt?: string;
  seed?: number;
  base64?: string; // Add base64 to root return type
  images?: Array<{
    imageUrl: string;
    base64?: string;
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
    prefixPrompt,
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
      prefixPrompt,
    }),
  });

  if (!response.ok) {
    await handleFlowError(response);
  }

  const data = await response.json();

  const imagesRaw: FlowGeneratedImage[] = Array.isArray(data?.images)
    ? data.images
    : [];

  // 行级注释：映射图片数据，优先使用 fifeUrl 以减少传输体积
  const mappedImages = imagesRaw
    .map((img) => {
      const encoded =
        img?.encodedImage || img?.base64Image || img?.imageBase64;
      const mime = img?.mimeType || 'image/png';
      const fifeUrl = img?.fifeUrl;

      // 行级注释：如果没有 fifeUrl 也没有 base64，则跳过
      if (!fifeUrl && !encoded) {
        return null;
      }

      return {
        encodedImage: encoded,
        mimeType: mime,
        mediaId: img?.mediaId,
        mediaGenerationId: img?.mediaGenerationId,
        workflowId: img?.workflowId,
        prompt: img?.prompt,
        seed: img?.seed,
        fifeUrl: fifeUrl,
      };
    })
    .filter(Boolean) as Array<{
      encodedImage?: string;
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
    const fifeUrl = data?.fifeUrl;

    // 行级注释：如果既没有 fifeUrl 也没有 base64，则报错
    if (!fifeUrl && !encoded) {
      throw new Error('❌ Flow API 响应中未找到图片数据（缺少 fifeUrl 和 base64）');
    }

    primaryImage = {
      encodedImage: encoded,
      mimeType: data?.mimeType || 'image/png',
      mediaId: data?.mediaId,
      mediaGenerationId: data?.mediaGenerationId,
      workflowId: data?.workflowId,
      prompt: data?.prompt,
      seed: data?.seed,
      fifeUrl: fifeUrl,
    };
  }

  // 行级注释：优先使用 fifeUrl，降级到 base64（减少 Vercel 流量费用）
  const imageUrl = primaryImage.fifeUrl ||
    `data:${primaryImage.mimeType};base64,${primaryImage.encodedImage}`;

  return {
    imageUrl,
    mediaId: primaryImage.mediaId ?? data.mediaId,
    mediaGenerationId:
      primaryImage.mediaGenerationId ?? data.mediaGenerationId,
    workflowId: primaryImage.workflowId ?? data.workflowId,
    sessionId: data.sessionId ?? sessionId,
    translatedPrompt: primaryImage.prompt || prompt,
    seed: primaryImage.seed ?? seed,
    // 行级注释：批量生成的图片列表，优先使用 fifeUrl
    images: mappedImages.map((img) => ({
      imageUrl: img.fifeUrl || `data:${img.mimeType};base64,${img.encodedImage}`,
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

// 行级注释：VIDEO_POLL_INTERVAL_MS 和 VIDEO_MAX_ATTEMPTS 已移至 video-polling.service.ts

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

// 行级注释：pollFlowVideoOperation 已移至 video-polling.service.ts
// 为了向后兼容，从服务层重新导出（见文件顶部 import）

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 生成新图片接口 - 直接调用 Google API，获取 base64
// 绕过 Vercel 服务器，节省 Fast Origin Transfer
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
    base64?: string; // 新增：返回 base64
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('请先在右上角设置中配置 Bearer Token');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('请在设置中配置 Flow Project ID');
  }

  // 行级注释：业务层 - 拼接完整提示词（附加前置提示词）
  const finalPrompt = buildFinalPrompt(prompt);

  console.log('🚀 直接调用 Google API 生成图片（绕过 Vercel）:', finalPrompt, aspectRatio, accountTier, imageModel, `数量: ${count || apiConfig.generationCount || 1}`);

  // 行级注释：调用层 - 调用纯 API 函数
  const { generateImageDirectly } = await import('./direct-google-api');

  const result = await generateImageDirectly(
    finalPrompt,
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    undefined, // references
    undefined, // seed
    count ?? apiConfig.generationCount ?? 1,
    imageModel
  );

  // 行级注释：业务层 - 更新会话上下文
  updateSessionContext(result.sessionId);

  // 转换格式
  const images = result.images.map(img => ({
    imageUrl: img.fifeUrl || '',
    base64: img.encodedImage, // 保存 base64！
    mediaId: img.mediaId,
    mediaGenerationId: img.mediaGenerationId,
    workflowId: img.workflowId,
    prompt: img.prompt,
    seed: img.seed,
    fifeUrl: img.fifeUrl,
  }));

  return {
    imageUrl: images[0]?.imageUrl || '',
    promptId: generateId(),
    mediaId: images[0]?.mediaId,
    mediaGenerationId: images[0]?.mediaGenerationId,
    workflowId: images[0]?.workflowId,
    translatedPrompt: images[0]?.prompt,
    sessionId: result.sessionId,
    images, // 返回所有生成的图片（包含 base64）
  };
}

// 上传图片并注册到 Flow，获取 mediaGenerationId 供后续图生图使用
// 直接调用 Google API，不通过 Vercel 服务器，节省 Fast Origin Transfer
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

  console.log('📝 直接上传用户图片到 Google API（绕过 Vercel）');

  // 直接调用 Google API，不通过 Vercel 服务器
  const { uploadImageDirectly } = await import('./direct-google-api');

  // 转换宽高比类型：FlowAspectRatioEnum -> '16:9' | '9:16' | '1:1'
  const convertedAspectRatio =
    flowAspectRatio === 'IMAGE_ASPECT_RATIO_PORTRAIT' ? '9:16' :
      flowAspectRatio === 'IMAGE_ASPECT_RATIO_SQUARE' ? '1:1' :
        flowAspectRatio === 'IMAGE_ASPECT_RATIO_LANDSCAPE' ? '16:9' :
          undefined;

  const uploadResult = await uploadImageDirectly(
    imageBase64,
    apiConfig.bearerToken,
    sessionId,
    convertedAspectRatio
  );

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

// 多图融合编辑（runImageRecipe） - 直接调用 Google API，获取 base64
// 绕过 Vercel 服务器，节省 Fast Origin Transfer
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
    base64?: string; // 新增：返回 base64
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('多图编辑需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('多图编辑需要配置 Flow Project ID，请在右上角设置中配置');
  }

  // 行级注释：业务层 - 处理参考图列表
  const validReferences = referenceImages
    .filter((ref) => (ref.mediaId?.trim()) || (ref.mediaGenerationId?.trim()))
    .map((ref) => ({
      mediaId: ref.mediaId || ref.mediaGenerationId,
    }));

  if (validReferences.length < 2) {
    throw new Error('至少需要两张包含 mediaId 或 mediaGenerationId 的图片才能进行多图编辑');
  }

  // 行级注释：业务层 - 多图融合不使用前置提示词（风格已由参考图确定）
  console.log(
    '🧩 直接调用 Google API 进行多图融合编辑（绕过 Vercel）:',
    instruction,
    aspectRatio,
    accountTier,
    imageModel,
    `参考图数量: ${validReferences.length}`,
    `生成数量: ${count || apiConfig.generationCount || 1}`
  );

  // 行级注释：调用层 - 调用纯 API 函数（不使用前置提示词）
  const { generateImageDirectly } = await import('./direct-google-api');

  const result = await generateImageDirectly(
    instruction, // 行级注释：多图融合直接使用原始 instruction，不附加前置提示词
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    validReferences,
    seed,
    count ?? apiConfig.generationCount ?? 1,
    imageModel
  );

  // 行级注释：业务层 - 更新会话上下文
  updateSessionContext(result.sessionId);

  // 转换格式 - 行级注释：多图融合使用 fifeUrl，保留 base64 供编辑用
  const images = result.images.map(img => ({
    imageUrl: img.fifeUrl || '', // 行级注释：使用 Google URL 而非 base64，性能更好
    base64: img.encodedImage, // 行级注释：保存 base64 供图片编辑使用
    mediaId: img.mediaId,
    mediaGenerationId: img.mediaGenerationId,
    workflowId: img.workflowId,
    prompt: img.prompt,
    seed: img.seed,
    fifeUrl: img.fifeUrl,
  }));

  return {
    imageUrl: images[0]?.imageUrl || '',
    promptId: generateId(),
    mediaId: images[0]?.mediaId,
    mediaGenerationId: images[0]?.mediaGenerationId,
    workflowId: images[0]?.workflowId,
    translatedPrompt: images[0]?.prompt,
    images, // 返回所有生成的图片（包含 fifeUrl 和 base64）
  };
}

// 图生图接口 - 直接调用 Google API，获取 base64
// 绕过 Vercel 服务器，节省 Fast Origin Transfer
export async function imageToImage(
  prompt: string,
  sourceImageUrl: string,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  caption: string = '',
  originalMediaId?: string, // 改名：现在接收 mediaId（优先）或 mediaGenerationId // 行级注释说明参数用途
  count?: number, // 生成数量 (1-4)
  prompts?: string[] // 新增：支持传入多个不同的 prompt
): Promise<{
  imageUrl: string;
  promptId: string;
  mediaId?: string;
  mediaGenerationId?: string;
  workflowId?: string;
  translatedPrompt?: string;
  base64?: string; // Add base64 to root return type
  images?: Array<{
    imageUrl: string;
    base64?: string;
    mediaId?: string;
    mediaGenerationId?: string;
    workflowId?: string;
    prompt?: string;
    seed?: number;
    fifeUrl?: string;
  }>;
}> {
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('图生图需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('图生图需要配置 Flow Project ID，请在右上角设置中配置');
  }
  if (!originalMediaId?.trim()) {
    throw new Error('图生图需要提供原始图片的 mediaId 或 mediaGenerationId');
  }

  // 行级注释：业务层 - 图生图不使用前置提示词（风格已由参考图确定）
  console.log('🖼️ 直接调用 Google API 图生图（绕过 Vercel）:', prompt, aspectRatio, accountTier, imageModel, `数量: ${count || apiConfig.generationCount || 1}`);

  // 行级注释：调用层 - 调用纯 API 函数（不使用前置提示词）
  const { generateImageDirectly } = await import('./direct-google-api');

  const result = await generateImageDirectly(
    prompt, // 行级注释：图生图直接使用原始 prompt，不附加前置提示词
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    [{ mediaId: originalMediaId }],
    undefined, // seed
    (count ?? apiConfig.generationCount) || 1,
    imageModel,
    prompts // 传递 prompts 数组
  );

  // 行级注释：业务层 - 更新会话上下文
  updateSessionContext(result.sessionId);

  // 转换格式 - 行级注释：图生图使用 fifeUrl，保留 base64 供编辑用
  const images = result.images.map(img => ({
    imageUrl: img.fifeUrl || '', // 行级注释：使用 Google URL 而非 base64，性能更好
    base64: img.encodedImage, // 行级注释：保存 base64 供图片编辑使用
    mediaId: img.mediaId,
    mediaGenerationId: img.mediaGenerationId,
    workflowId: img.workflowId,
    prompt: img.prompt,
    seed: img.seed,
    fifeUrl: img.fifeUrl,
  }));

  return {
    imageUrl: images[0]?.imageUrl || '',
    promptId: generateId(),
    mediaId: images[0]?.mediaId,
    mediaGenerationId: images[0]?.mediaGenerationId,
    workflowId: images[0]?.workflowId,
    translatedPrompt: images[0]?.prompt,
    base64: images[0]?.base64, // Return base64 in root object
    images, // 返回所有生成的图片（包含 fifeUrl 和 base64）
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

// 生成视频接口（文生视频）- 直接调用 Google API
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
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('文生视频需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('文生视频需要配置 Flow Project ID，请在右上角设置中配置');
  }

  // 行级注释：业务层 - 生成场景 ID
  const sceneId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // 行级注释：业务层 - 拼接完整提示词（附加前置提示词）
  const finalPrompt = buildFinalPrompt(prompt);

  console.log('🎬 直接调用 Google API 文生视频:', { prompt: finalPrompt, aspectRatio, accountTier, sceneId });

  // 行级注释：调用层 - 调用纯 API 函数
  const { generateVideoTextDirectly } = await import('./direct-google-api');

  const generationTask = await generateVideoTextDirectly(
    finalPrompt,
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    videoModel,
    seed,
    sceneId
  );

  console.log('✅ 文生视频任务已提交（直接调用）:', generationTask);

  const videoResult = await pollFlowVideoOperation(
    generationTask.operationName,
    apiConfig.bearerToken,
    generationTask.sceneId,
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

// 生成视频接口（图到图视频 - 首帧尾帧）- 直接调用 Google API
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
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('图生视频需要配置 Bearer Token，请在右上角设置中配置');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('图生视频需要配置 Flow Project ID，请在右上角设置中配置');
  }

  const elements = useCanvasStore.getState().elements;
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

  // 行级注释：不要用首帧替代尾帧！没有就是没有
  const resolvedEndMediaId = endMediaId || undefined;

  // 行级注释：业务层 - 推断视频宽高比
  const aspectRatio = inferVideoAspectRatio(startImage, endImage);

  // 行级注释：业务层 - 图生视频不使用前置提示词（风格已由参考图确定）
  const promptText = (prompt ?? '').trim() || 'Seamless transition between scenes';

  // 行级注释：业务层 - 生成场景 ID
  const sceneId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `scene-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  console.log('🎬 直接调用 Google API 图生视频:', {
    startImageId,
    endImageId: endImageId || '无尾帧',
    hasEndImage: !!endMediaId,
    prompt: promptText,
    aspectRatio,
    accountTier,
    sceneId,
  });

  // 行级注释：调用层 - 调用纯 API 函数（不使用前置提示词）
  const { generateVideoImageDirectly } = await import('./direct-google-api');

  const generationTask = await generateVideoImageDirectly(
    promptText, // 行级注释：图生视频直接使用原始 prompt，不附加前置提示词
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    videoModel,
    startMediaId,
    resolvedEndMediaId,
    undefined, // seed
    sceneId
  );

  console.log('✅ 图生视频任务已提交（直接调用）:', generationTask);

  const videoResult = await pollFlowVideoOperation(
    generationTask.operationName,
    apiConfig.bearerToken,
    generationTask.sceneId,
    apiConfig.proxy
  );

  console.log('🎞️ 图生视频生成完成:', videoResult);

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

// 行级注释：视频超清放大（1080p）- 直接调用 Google API
export async function generateVideoUpsample(
  originalMediaId: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  seed?: number
): Promise<{
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('缺少 Bearer Token');
  }
  if (!originalMediaId?.trim()) {
    throw new Error('缺少原始视频的 mediaId');
  }

  console.log('🎬 直接调用 Google API 视频超清（绕过 Vercel）:', originalMediaId, aspectRatio);

  // 行级注释：调用层 - 调用纯 API 函数
  const { generateVideoUpsampleDirectly } = await import('./direct-google-api');

  const result = await generateVideoUpsampleDirectly(
    originalMediaId,
    apiConfig.bearerToken,
    sessionId,
    aspectRatio,
    seed
  );

  // 行级注释：更新积分
  if (result.remainingCredits !== undefined) {
    useCanvasStore.getState().setCredits(result.remainingCredits);
  }

  console.log('✅ 视频超清请求成功:', result);

  return result;
}


// 行级注释：视频镜头控制重拍 - 直接调用 Google API
export async function generateVideoReshoot(
  originalMediaId: string,
  reshootMotionType: ReshootMotionType,
  aspectRatio: '16:9' | '9:16' | '1:1',
  seed?: number
): Promise<{
  videoUrl: string;
  thumbnail: string;
  duration: number;
  mediaGenerationId?: string;
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  // 行级注释：业务层 - 获取上下文和配置
  const { apiConfig, sessionId, accountTier } = getApiContext();

  // 行级注释：业务层 - 验证必要配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('缺少 Bearer Token');
  }
  if (!originalMediaId?.trim()) {
    throw new Error('缺少原始视频的 mediaId');
  }

  console.log('🎬 直接调用 Google API 镜头控制重拍（绕过 Vercel）:', originalMediaId, reshootMotionType);

  // 行级注释：调用层 - 调用纯 API 函数
  const { generateVideoReshootDirectly } = await import('./direct-google-api');

  const generationTask = await generateVideoReshootDirectly(
    originalMediaId,
    reshootMotionType,
    apiConfig.bearerToken,
    sessionId,
    apiConfig.projectId,
    aspectRatio,
    accountTier,
    seed
  );

  console.log('✅ 镜头控制重拍任务已提交:', generationTask);

  const videoResult = await pollFlowVideoOperation(
    generationTask.operationName,
    apiConfig.bearerToken,
    generationTask.sceneId,
    apiConfig.proxy
  );

  console.log('🎞️ 镜头控制重拍生成完成:', videoResult);

  return {
    videoUrl: videoResult.videoUrl,
    thumbnail: videoResult.thumbnailUrl,
    duration: videoResult.duration,
    mediaGenerationId: videoResult.mediaGenerationId,
    operationName: generationTask.operationName,
    sceneId: generationTask.sceneId,
    status: 'COMPLETED',
  };
}

/**
 * 延长视频 - 基于现有视频生成延续内容
 */
export async function generateVideoExtend(
  originalMediaId: string,
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  startFrameIndex?: number,
  endFrameIndex?: number,
  seed?: number
): Promise<{
  videoUrl: string;
  thumbnail: string;
  duration: number;
  mediaGenerationId?: string;
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}> {
  // 行级注释：校验层 - 校验输入参数
  if (!originalMediaId) {
    throw new Error('缺少原始视频 mediaId');
  }
  if (!prompt || !prompt.trim()) {
    throw new Error('缺少延长提示词');
  }

  // 行级注释：配置层 - 获取 API 配置
  const apiConfig = useCanvasStore.getState().apiConfig;
  const sessionId = apiConfig.sessionId;
  const accountTier = apiConfig.accountTier || 'pro';
  const videoModel = apiConfig.videoModel || 'quality';

  if (!apiConfig.bearerToken) {
    throw new Error('缺少 Bearer Token，请在设置中配置');
  }

  // 行级注释：调用层 - 调用纯 API 函数
  const { generateVideoExtendDirectly } = await import('./direct-google-api');

  const generationTask = await generateVideoExtendDirectly(
    originalMediaId,
    prompt,
    apiConfig.bearerToken,
    sessionId,
    apiConfig.projectId,
    aspectRatio,
    accountTier,
    videoModel,
    startFrameIndex,
    endFrameIndex,
    seed
  );

  console.log('✅ 视频延长任务已提交:', generationTask);

  const videoResult = await pollFlowVideoOperation(
    generationTask.operationName,
    apiConfig.bearerToken,
    generationTask.sceneId,
    apiConfig.proxy
  );

  console.log('🎞️ 视频延长生成完成:', videoResult);

  return {
    videoUrl: videoResult.videoUrl,
    thumbnail: videoResult.thumbnailUrl,
    duration: videoResult.duration,
    mediaGenerationId: videoResult.mediaGenerationId,
    operationName: generationTask.operationName,
    sceneId: generationTask.sceneId,
    status: 'COMPLETED',
  };
}
