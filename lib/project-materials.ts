import { useMaterialsStore } from './materials-store';
import { useCanvasStore } from './store';

// Flow 工作流返回的结构
interface FlowWorkflow {
  workflowId: string;
  title?: string;
  createTime?: string;
  mediaType: 'IMAGE' | 'VIDEO';
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
function mapFlowAspectRatio(flowAspectRatio?: string): '16:9' | '9:16' | '1:1' | '4:3' | undefined {
  if (!flowAspectRatio) return undefined;

  switch (flowAspectRatio) {
    case 'VIDEO_ASPECT_RATIO_LANDSCAPE':
      return '16:9';
    case 'VIDEO_ASPECT_RATIO_PORTRAIT':
      return '9:16';
    case 'IMAGE_ASPECT_RATIO_LANDSCAPE':
      return '16:9';
    case 'IMAGE_ASPECT_RATIO_PORTRAIT':
      return '9:16';
    case 'IMAGE_ASPECT_RATIO_SQUARE':
      return '1:1';
    default:
      return undefined;
  }
}

// 从项目加载素材到素材库
export async function loadMaterialsFromProject(
  projectId: string,
  onProgress?: (message: string) => void
): Promise<void> {
  const apiConfig = useCanvasStore.getState().apiConfig;
  const materialsStore = useMaterialsStore.getState();

  if (!apiConfig.cookie?.trim()) {
    throw new Error('未配置 Flow API Cookie');
  }

  try {
    onProgress?.('正在加载项目素材...');

    // 加载图片素材
    await loadImagesFromProject(projectId, apiConfig, materialsStore, onProgress);

    // 加载视频素材
    await loadVideosFromProject(projectId, apiConfig, materialsStore, onProgress);

    onProgress?.('素材加载完成');
  } catch (error) {
    console.error('加载项目素材失败:', error);
    throw error;
  }
}

// 加载图片素材
async function loadImagesFromProject(
  projectId: string,
  apiConfig: any,
  materialsStore: any,
  onProgress?: (message: string) => void
) {
  onProgress?.('正在加载图片素材...');

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
    return;
  }

  const data = await response.json();
  const workflows = data?.workflows || [];

  // 转换并添加到素材库
  const imageMaterials = workflows.map((workflow: FlowWorkflow) => ({
    id: `project-image-${workflow.workflowId}`,
    type: 'image' as const,
    name: workflow.title || '未命名图片',
    src: workflow.imageData?.fifeUrl || '',
    thumbnail: workflow.imageData?.fifeUrl || '',
    mediaGenerationId: workflow.workflowId,
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
    materialsStore.addMaterials(validImages);
    onProgress?.(`已加载 ${validImages.length} 个图片素材`);
    console.log('加载的图片素材:', validImages);
  }
}

// 加载视频素材
async function loadVideosFromProject(
  projectId: string,
  apiConfig: any,
  materialsStore: any,
  onProgress?: (message: string) => void
) {
  onProgress?.('正在加载视频素材...');

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
    return;
  }

  const data = await response.json();
  const workflows = data?.workflows || [];

  // 转换并添加到素材库
  const videoMaterials = workflows.map((workflow: FlowWorkflow) => ({
    id: `project-video-${workflow.workflowId}`,
    type: 'video' as const,
    name: workflow.title || '未命名视频',
    src: workflow.videoData?.fifeUrl || '',
    thumbnail: workflow.videoData?.thumbnailUrl || '',
    mediaGenerationId: workflow.workflowId,
    metadata: {
      prompt: workflow.videoData?.prompt,
      duration: 5, // 默认5秒
      aspectRatio: mapFlowAspectRatio(workflow.videoData?.aspectRatio),
    },
    createdAt: workflow.createTime || new Date().toISOString(),
    tags: ['项目素材'],
    projectId,
  }));

  // 过滤掉无效的素材
  const validVideos = videoMaterials.filter(vid => vid.src);

  if (validVideos.length > 0) {
    materialsStore.addMaterials(validVideos);
    onProgress?.(`已加载 ${validVideos.length} 个视频素材`);
    console.log('加载的视频素材:', validVideos);
  }
}