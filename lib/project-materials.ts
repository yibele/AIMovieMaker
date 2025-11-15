import { useMaterialsStore } from './materials-store';
import { useCanvasStore } from './store';
import { MaterialItem } from './types-materials';

// Flow 工作流返回的结构
interface FlowWorkflow {
  workflowId: string;
  title?: string;
  createTime?: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaGenerationId?: string;
  mediaId?: string;
  videoData?: {
    fifeUrl?: string;
    thumbnailUrl?: string;
    prompt?: string;
    seed?: number;
    model?: string;
    aspectRatio?: string;
  };
  imageData?: {
    fifeUrl?: string;
    prompt?: string;
    seed?: number;
    model?: string;
    aspectRatio?: string;
  };
}

// 映射 Flow API 的宽高比到我们的格式
function mapFlowAspectRatio(
  flowAspectRatio?: string
): '16:9' | '9:16' | '1:1' | '4:3' | undefined {
  if (!flowAspectRatio) return undefined;

  const value = flowAspectRatio.trim();
  const upperValue = value.toUpperCase();
  const lowerValue = value.toLowerCase();

  // 1. 直接匹配我们使用的比例字符串
  if (value === '16:9') return '16:9';
  if (value === '9:16') return '9:16';
  if (value === '1:1') return '1:1';
  if (value === '4:3') return '4:3';

  // 2. 处理 Flow 的枚举值
  switch (upperValue) {
    case 'VIDEO_ASPECT_RATIO_LANDSCAPE':
    case 'IMAGE_ASPECT_RATIO_LANDSCAPE':
    case 'LANDSCAPE':
      return '16:9';
    case 'VIDEO_ASPECT_RATIO_PORTRAIT':
    case 'IMAGE_ASPECT_RATIO_PORTRAIT':
    case 'PORTRAIT':
      return '9:16';
    case 'IMAGE_ASPECT_RATIO_SQUARE':
    case 'SQUARE':
      return '1:1';
    default:
      break;
  }

  // 3. 兜底模糊匹配
  if (lowerValue.includes('portrait') || lowerValue.includes('vertical')) {
    return '9:16';
  }
  if (lowerValue.includes('landscape') || lowerValue.includes('horizontal')) {
    return '16:9';
  }
  if (lowerValue.includes('square')) {
    return '1:1';
  }

  return undefined;
}

type ProgressUpdater = (message: string) => void;

// 从项目加载素材到素材库
export async function loadMaterialsFromProject(
  projectId: string,
  onProgress?: ProgressUpdater
): Promise<void> {
  const apiConfig = useCanvasStore.getState().apiConfig;
  const materialsStore = useMaterialsStore.getState();

  if (!apiConfig.cookie?.trim()) {
    throw new Error('未配置 Flow API Cookie');
  }

  try {
    materialsStore.setLoading(true);
    materialsStore.setLoadingMessage('正在同步项目素材...');
    onProgress?.('正在同步项目素材...');

    const [images, videos] = await Promise.all([
      loadImagesFromProject(projectId, apiConfig, (message) => {
        materialsStore.setLoadingMessage(message);
        onProgress?.(message);
      }),
      loadVideosFromProject(projectId, apiConfig, (message) => {
        materialsStore.setLoadingMessage(message);
        onProgress?.(message);
      }),
    ]);

    const mergedMaterials = [...images, ...videos];
    materialsStore.setMaterialsForProject(projectId, mergedMaterials);

    materialsStore.setLoadingMessage('素材同步完成');
    onProgress?.('素材同步完成');
  } catch (error) {
    console.error('加载项目素材失败:', error);
    materialsStore.setLoadingMessage('素材同步失败');
    throw error;
  } finally {
    materialsStore.setLoading(false);
    setTimeout(() => {
      useMaterialsStore.getState().setLoadingMessage(undefined);
    }, 1500);
  }
}

// 加载图片素材
async function loadImagesFromProject(
  projectId: string,
  apiConfig: any,
  setMessage?: ProgressUpdater
): Promise<MaterialItem[]> {
  setMessage?.('正在加载图片素材...');

  const params = new URLSearchParams({
    cookie: apiConfig.cookie.trim(),
    projectId,
    mediaType: 'IMAGE',
    pageSize: '50', // 一次加载更多
  });

  if (apiConfig.proxy) {
    params.set('proxy', apiConfig.proxy);
  }

  const response = await fetch(`/api/flow/workflows/search?${params.toString()}`);

  if (!response.ok) {
    console.error('加载图片失败:', response.status);
    return [];
  }

  const data = await response.json();
  const workflows = data?.workflows || [];

  // 转换并添加到素材库
  const imageMaterials = workflows.map((workflow: FlowWorkflow) => ({
    id: `project-image-${workflow.workflowId}`,
    type: 'image' as const,
    name: workflow.mediaId || workflow.mediaGenerationId || workflow.workflowId,
    src: workflow.imageData?.fifeUrl || '',
    thumbnail: workflow.imageData?.fifeUrl || '',
    mediaId: workflow.mediaId, // Flow 图生图要求的 mediaId // 行级注释说明字段用途
    mediaGenerationId:
      workflow.mediaGenerationId ||
      workflow.mediaId ||
      workflow.workflowId,
    metadata: {
      prompt: workflow.imageData?.prompt,
      aspectRatio: mapFlowAspectRatio(workflow.imageData?.aspectRatio),
    },
    createdAt: workflow.createTime || new Date().toISOString(),
    tags: ['项目素材'],
    projectId,
  }));

  // 过滤掉无效的素材
  const validImages = imageMaterials.filter(img => img.src);

  if (validImages.length > 0) {
    setMessage?.(`已加载 ${validImages.length} 个图片素材`);
    console.log('加载的图片素材:', validImages);
  }

  return validImages;
}

// 加载视频素材
async function loadVideosFromProject(
  projectId: string,
  apiConfig: any,
  setMessage?: ProgressUpdater
): Promise<MaterialItem[]> {
  setMessage?.('正在加载视频素材...');

  const params = new URLSearchParams({
    cookie: apiConfig.cookie.trim(),
    projectId,
    mediaType: 'VIDEO',
    pageSize: '50', // 一次加载更多
  });

  if (apiConfig.proxy) {
    params.set('proxy', apiConfig.proxy);
  }

  const response = await fetch(`/api/flow/workflows/search?${params.toString()}`);

  if (!response.ok) {
    console.error('加载视频失败:', response.status);
    return [];
  }

  const data = await response.json();
  const workflows = data?.workflows || [];

  // 转换并添加到素材库
  const videoMaterials = workflows.map((workflow: FlowWorkflow) => {
    const mappedAspectRatio = mapFlowAspectRatio(workflow.videoData?.aspectRatio);
    console.log('视频宽高比映射:', {
      原始值: workflow.videoData?.aspectRatio,
      映射后: mappedAspectRatio,
      工作流ID: workflow.workflowId,
      标题: workflow.title,
    });

    return {
      id: `project-video-${workflow.workflowId}`,
      type: 'video' as const,
      name: workflow.mediaId || workflow.mediaGenerationId || workflow.workflowId,
      src: workflow.videoData?.fifeUrl || '',
      thumbnail: workflow.videoData?.thumbnailUrl || '',
      mediaId: workflow.mediaId, // Flow 返回的 mediaId // 行级注释说明字段用途
      mediaGenerationId:
        workflow.mediaGenerationId ||
        workflow.mediaId ||
        workflow.workflowId,
      metadata: {
        prompt: workflow.videoData?.prompt,
        duration: 5, // 默认5秒
        aspectRatio: mappedAspectRatio,
      },
      createdAt: workflow.createTime || new Date().toISOString(),
      tags: ['项目素材'],
      projectId,
    };
  });

  // 过滤掉无效的素材
  const validVideos = videoMaterials.filter(vid => vid.src);

  if (validVideos.length > 0) {
    setMessage?.(`已加载 ${validVideos.length} 个视频素材`);
    console.log('加载的视频素材:', validVideos);
  }

  return validVideos;
}