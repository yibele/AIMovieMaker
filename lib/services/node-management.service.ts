/**
 * 节点管理服务
 * 
 * 职责：统一管理节点的创建、更新、删除
 * - 提供标准化的节点创建函数
 * - 确保节点属性的一致性
 * - 计算节点位置
 */

import { useCanvasStore } from '@/lib/store';
import {
  ImageElement,
  ImageData,
  VideoElement,
  TextElement,
  NoteElement,
  AudioElement,
  CanvasElement,
  AUDIO_VOICES,
} from '@/lib/types';
import {
  TEXT_NODE_DEFAULT_SIZE,
  VIDEO_NODE_DEFAULT_SIZE,
  NOTE_NODE_DEFAULT_SIZE,
  IMAGE_NODE_DEFAULT_SIZE,
  getImageNodeSize,
  getVideoNodeSize,
} from '@/lib/constants/node-sizes';

// 行级注释：节点位置类型
export interface NodePosition {
  x: number;
  y: number;
}

// 行级注释：节点尺寸类型
export interface NodeSize {
  width: number;
  height: number;
}

/**
 * 生成唯一节点 ID
 */
export function generateNodeId(type: CanvasElement['type']): string {
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * 计算屏幕中心对应的画布位置
 * 需要传入 screenToFlowPosition 函数（来自 useReactFlow）
 */
export function getScreenCenterPosition(
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number }
): NodePosition {
  const screenCenter = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
  return screenToFlowPosition(screenCenter);
}

/**
 * 计算节点居中后的位置
 */
export function getCenteredPosition(
  flowPosition: NodePosition,
  size: NodeSize
): NodePosition {
  return {
    x: flowPosition.x - size.width / 2,
    y: flowPosition.y - size.height / 2,
  };
}

/**
 * 计算节点右侧的新位置（用于复制、派生）
 */
export function getRightSidePosition(
  sourcePosition: NodePosition,
  sourceSize: NodeSize,
  gap: number = 50
): NodePosition {
  return {
    x: sourcePosition.x + sourceSize.width + gap,
    y: sourcePosition.y,
  };
}

/**
 * 创建文本节点
 */
export function createTextNode(
  position: NodePosition,
  options?: {
    text?: string;
    fontSize?: number;
    color?: string;
    size?: NodeSize;
  }
): TextElement {
  const size = options?.size || TEXT_NODE_DEFAULT_SIZE;
  
  return {
    id: generateNodeId('text'),
    type: 'text',
    text: options?.text || '双击编辑文字',
    position: getCenteredPosition(position, size),
    size,
    fontSize: options?.fontSize || 16,
    color: options?.color || '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
  };
}

/**
 * 创建记事本节点
 */
export function createNoteNode(
  position: NodePosition,
  options?: {
    content?: string;
    title?: string;
    size?: NodeSize;
  }
): NoteElement {
  const size = options?.size || NOTE_NODE_DEFAULT_SIZE;
  
  return {
    id: generateNodeId('note'),
    type: 'note',
    content: options?.content || '',
    title: options?.title || '新笔记',
    position: getCenteredPosition(position, size),
    size,
  };
}

// 行级注释：图片生成来源类型
export type ImageGeneratedFromType = 'text' | 'input' | 'image-to-image';

/**
 * 创建图片节点（占位符）
 */
export function createImagePlaceholder(
  position: NodePosition,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  options?: {
    prompt?: string;
    generatedFromType?: ImageGeneratedFromType;
    sourceIds?: string[];
  }
): ImageElement {
  const size = getImageNodeSize(aspectRatio);
  
  return {
    id: generateNodeId('image'),
    type: 'image',
    src: '',
    alt: options?.prompt || '生成中的图片',
    position,
    size,
    uploadState: 'syncing',
    generatedFrom: {
      type: options?.generatedFromType || 'input',
      sourceIds: options?.sourceIds,
      prompt: options?.prompt,
    },
  };
}

/**
 * 创建视频节点（空节点，待配置）
 */
export function createEmptyVideoNode(
  position: NodePosition,
  aspectRatio: '16:9' | '9:16' = '16:9'
): VideoElement {
  const size = getVideoNodeSize(aspectRatio);
  
  return {
    id: generateNodeId('video'),
    type: 'video',
    src: '',
    thumbnail: '',
    duration: 0,
    status: 'pending',
    position: getCenteredPosition(position, size),
    size,
    readyForGeneration: false,
    generationCount: 1,
  };
}

// 行级注释：音频节点默认尺寸
const AUDIO_NODE_DEFAULT_SIZE = { width: 280, height: 160 };

/**
 * 创建音频节点（空节点，待配置）
 */
export function createEmptyAudioNode(
  position: NodePosition,
  options?: {
    text?: string;
    voiceId?: string;
  }
): AudioElement {
  const size = AUDIO_NODE_DEFAULT_SIZE;
  
  return {
    id: generateNodeId('audio'),
    type: 'audio',
    src: '',
    duration: 0,
    text: options?.text || '',
    voiceId: options?.voiceId || AUDIO_VOICES[0]?.id || 'hunyin_6',
    status: 'pending',
    position: getCenteredPosition(position, size),
    size,
  };
}

/**
 * 创建视频节点（从图片派生，用于图生视频）
 */
export function createVideoFromImage(
  imageNode: ImageElement,
  flowPosition: NodePosition,
  targetHandleId: 'start-image' | 'end-image' = 'start-image'
): VideoElement {
  // 行级注释：使用图片节点的尺寸作为视频尺寸
  const baseSize = imageNode.size?.width && imageNode.size?.height
    ? imageNode.size
    : VIDEO_NODE_DEFAULT_SIZE;

  const size = {
    width: baseSize.width,
    height: baseSize.height,
  };

  const position = getCenteredPosition(flowPosition, size);

  // 行级注释：根据目标 handle 设置首帧或尾帧信息
  const startImageInfo = targetHandleId === 'start-image'
    ? { startImageId: imageNode.id, startImageUrl: imageNode.src }
    : {};
  const endImageInfo = targetHandleId === 'end-image'
    ? { endImageId: imageNode.id, endImageUrl: imageNode.src }
    : {};

  return {
    id: generateNodeId('video'),
    type: 'video',
    src: '',
    thumbnail: '',
    duration: 0,
    status: 'pending',
    progress: 0,
    position,
    size,
    readyForGeneration: false,
    ...startImageInfo,
    ...endImageInfo,
  };
}

/**
 * 创建首尾帧视频节点
 */
export function createStartEndVideoNode(
  startImage: ImageElement,
  endImage: ImageElement,
  position: NodePosition
): VideoElement {
  // 行级注释：使用首帧图片的尺寸
  const size = startImage.size?.width && startImage.size?.height
    ? { width: startImage.size.width, height: startImage.size.height }
    : VIDEO_NODE_DEFAULT_SIZE;

  return {
    id: generateNodeId('video'),
    type: 'video',
    src: '',
    thumbnail: '',
    duration: 0,
    status: 'pending',
    position,
    size,
    promptText: '',
    startImageId: startImage.id,
    endImageId: endImage.id,
    generationCount: 1,
    generatedFrom: {
      type: 'image-to-image',
      sourceIds: [startImage.id, endImage.id],
    },
  };
}

/**
 * 创建多图参考视频节点
 * 固定使用横屏（16:9）尺寸，最多支持 3 张参考图片
 */
export function createReferenceImagesVideoNode(
  position: NodePosition
): VideoElement {
  // 行级注释：多图参考视频固定使用 16:9 横屏
  const size = getVideoNodeSize('16:9');

  return {
    id: generateNodeId('video'),
    type: 'video',
    src: '',
    thumbnail: '',
    duration: 0,
    status: 'pending',
    position: getCenteredPosition(position, size),
    size,
    promptText: '',
    referenceImageIds: [], // 行级注释：初始为空，用户通过连线添加参考图片
    generationCount: 1,
    readyForGeneration: false,
    generatedFrom: {
      type: 'reference-images',
      sourceIds: [],
    },
  };
}

/**
 * 创建超清放大视频节点（占位符）
 */
export function createUpsampleVideoPlaceholder(
  sourceVideo: VideoElement
): VideoElement {
  const position = getRightSidePosition(
    sourceVideo.position,
    sourceVideo.size || VIDEO_NODE_DEFAULT_SIZE
  );

  return {
    id: generateNodeId('video'),
    type: 'video',
    src: '',
    thumbnail: '',
    duration: 0,
    status: 'generating',
    progress: 0,
    position,
    size: sourceVideo.size || VIDEO_NODE_DEFAULT_SIZE,
    promptText: '超清放大：' + (sourceVideo.promptText || '视频'),
    generatedFrom: {
      type: 'upsample',
      sourceIds: [sourceVideo.id],
      prompt: '超清放大',
    },
  };
}

// ============================================================================
// 批量创建 Placeholder 节点（统一入口）
// ============================================================================

/**
 * 批量创建图片 Placeholder 节点
 * 
 * @param count 创建数量
 * @param centerPosition 中心位置
 * @param aspectRatio 宽高比
 * @param options 额外选项
 * @returns 创建的节点 ID 数组（多图时只返回一个 Stack 节点 ID）
 * 
 * @example
 * // 文生图：创建 1 个 Stack 节点（包含 count 张图片的占位）
 * const ids = createImagePlaceholders(3, position, '16:9', { prompt: '...' });
 * 
 * // 图生图：创建 1 个 placeholder
 * const ids = createImagePlaceholders(1, position, '16:9', { 
 *   prompt: '...', 
 *   sourceIds: [sourceImageId],
 *   generatedFromType: 'image-to-image'
 * });
 */
export function createImagePlaceholders(
  count: number,
  centerPosition: NodePosition,
  aspectRatio: '16:9' | '9:16' | '1:1' = '16:9',
  options?: {
    prompt?: string;
    generatedFromType?: ImageGeneratedFromType;
    sourceIds?: string[];
    spacing?: number; // 节点间距，默认 20（单图水平排列时使用）
    disableStack?: boolean; // 禁用 Stack 模式（分镜等场景）
  }
): string[] {
  const { addElement } = useCanvasStore.getState();
  const size = getImageNodeSize(aspectRatio);
  
  // 行级注释：多图时使用 Stack 模式（一个节点包含多张图）
  const useStack = count > 1 && !options?.disableStack;
  
  if (useStack) {
    // 行级注释：Stack 模式 - 创建一个节点，包含 count 个图片占位
    const nodeId = generateNodeId('image');
    
    // 行级注释：创建空的 images 数组（等待填充）
    const emptyImages: ImageData[] = Array.from({ length: count }, () => ({
      src: '',
      uploadState: 'syncing' as const,
    }));
    
    const stackNode: ImageElement = {
      id: nodeId,
      type: 'image',
      src: '', // 主图 URL（会在 updateImagePlaceholders 时更新）
      alt: options?.prompt || '生成中的图片',
      position: centerPosition,
      size,
      uploadState: 'syncing',
      generatedFrom: {
        type: options?.generatedFromType || 'input',
        sourceIds: options?.sourceIds,
        prompt: options?.prompt,
      },
      // 行级注释：Stack 模式字段
      images: emptyImages,
      mainIndex: 0,
      expanded: false,
    };
    
    addElement(stackNode);
    return [nodeId];
  }
  
  // 行级注释：单图模式 - 保持原有逻辑
  const spacing = options?.spacing ?? 20;
  const totalWidth = count * size.width + (count - 1) * spacing;
  const startX = centerPosition.x - totalWidth / 2;
  
  const placeholderIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const nodeId = generateNodeId('image');
    placeholderIds.push(nodeId);
    
    const placeholderImage: ImageElement = {
      id: nodeId,
      type: 'image',
      src: '',
      alt: options?.prompt || '生成中的图片',
      position: {
        x: startX + i * (size.width + spacing),
        y: centerPosition.y,
      },
      size,
      uploadState: 'syncing',
      generatedFrom: {
        type: options?.generatedFromType || 'input',
        sourceIds: options?.sourceIds,
        prompt: options?.prompt,
      },
    };
    
    addElement(placeholderImage);
  }
  
  return placeholderIds;
}

/**
 * 批量创建视频 Placeholder 节点
 * 
 * @param count 创建数量
 * @param centerPosition 中心位置
 * @param aspectRatio 宽高比
 * @param options 额外选项
 * @returns 创建的节点 ID 数组
 */
export function createVideoPlaceholders(
  count: number,
  centerPosition: NodePosition,
  aspectRatio: '16:9' | '9:16' = '16:9',
  options?: {
    promptText?: string;
    startImageId?: string;
    endImageId?: string;
    status?: VideoElement['status'];
    spacing?: number;
  }
): string[] {
  const { addElement } = useCanvasStore.getState();
  const size = getVideoNodeSize(aspectRatio);
  const spacing = options?.spacing ?? 50;
  
  const totalWidth = count * size.width + (count - 1) * spacing;
  const startX = centerPosition.x - totalWidth / 2;
  
  const placeholderIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const nodeId = generateNodeId('video');
    placeholderIds.push(nodeId);
    
    const placeholderVideo: VideoElement = {
      id: nodeId,
      type: 'video',
      src: '',
      thumbnail: '',
      duration: 0,
      status: options?.status || 'generating',
      progress: 0,
      position: {
        x: startX + i * (size.width + spacing),
        y: centerPosition.y,
      },
      size,
      promptText: options?.promptText,
      startImageId: options?.startImageId,
      endImageId: options?.endImageId,
      generationCount: 1,
    };
    
    addElement(placeholderVideo);
  }
  
  return placeholderIds;
}

/**
 * 更新 Placeholder 节点为实际图片
 * 
 * @param placeholderIds placeholder 节点 ID 数组
 * @param images 图片数据数组
 */
export function updateImagePlaceholders(
  placeholderIds: string[],
  images: Array<{
    imageUrl?: string;
    base64?: string;
    mediaId?: string;
    mediaGenerationId?: string;
  }>
): void {
  const { updateElement, elements } = useCanvasStore.getState();
  
  // 行级注释：检查是否为 Stack 模式（只有一个节点但多张图片）
  if (placeholderIds.length === 1 && images.length > 1) {
    const nodeId = placeholderIds[0];
    const existingNode = elements.find(el => el.id === nodeId) as ImageElement | undefined;
    
    if (existingNode?.images) {
      // 行级注释：Stack 模式 - 更新 images 数组
      // 行级注释：优先使用 base64 作为 src，避免远程 URL 过期导致图片无法加载
      const updatedImages: ImageData[] = images.map(img => ({
        src: img.base64 ? `data:image/png;base64,${img.base64}` : (img.imageUrl || ''),
        base64: img.base64,
        mediaId: img.mediaId,
        mediaGenerationId: img.mediaGenerationId,
        uploadState: 'synced' as const,
      }));
      
      // 行级注释：主图使用第一张图片的数据
      const mainImage = updatedImages[0];
      
      updateElement(nodeId, {
        src: mainImage.src,
        base64: mainImage.base64,
        mediaId: mainImage.mediaId,
        mediaGenerationId: mainImage.mediaGenerationId,
        uploadState: 'synced',
        images: updatedImages,
        mainIndex: 0,
      } as Partial<ImageElement>);
      
      return;
    }
  }
  
  // 行级注释：普通模式 - 每个 placeholder 对应一张图片
  placeholderIds.forEach((id, index) => {
    const imageData = images[index];
    if (!imageData) return;
    
    // 行级注释：优先使用 base64 作为 src，避免远程 URL 过期导致图片无法加载
    updateElement(id, {
      src: imageData.base64 ? `data:image/png;base64,${imageData.base64}` : (imageData.imageUrl || ''),
      base64: imageData.base64,
      mediaId: imageData.mediaId,
      mediaGenerationId: imageData.mediaGenerationId,
      uploadState: 'synced',
    } as Partial<ImageElement>);
  });
}

/**
 * 更新 Placeholder 节点为实际视频
 * 
 * @param placeholderIds placeholder 节点 ID 数组
 * @param videos 视频数据数组
 */
export function updateVideoPlaceholders(
  placeholderIds: string[],
  videos: Array<{
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    mediaGenerationId?: string;
  }>
): void {
  const { updateElement } = useCanvasStore.getState();
  
  placeholderIds.forEach((id, index) => {
    const videoData = videos[index];
    if (!videoData) return;
    
    updateElement(id, {
      src: videoData.videoUrl || '',
      thumbnail: videoData.thumbnailUrl || '',
      duration: videoData.duration || 0,
      mediaGenerationId: videoData.mediaGenerationId,
      status: 'ready',
      progress: 100,
    } as Partial<VideoElement>);
  });
}

/**
 * 删除 Placeholder 节点（生成失败时调用）
 * 
 * @param placeholderIds placeholder 节点 ID 数组
 */
export function deletePlaceholders(placeholderIds: string[]): void {
  const { deleteElement } = useCanvasStore.getState();
  placeholderIds.forEach(id => deleteElement(id));
}

/**
 * 标记 Placeholder 为错误状态
 * 
 * @param placeholderIds placeholder 节点 ID 数组
 * @param errorMessage 错误信息
 */
export function markPlaceholdersAsError(
  placeholderIds: string[],
  errorMessage?: string
): void {
  const { updateElement } = useCanvasStore.getState();
  
  placeholderIds.forEach(id => {
    // 行级注释：尝试更新图片节点
    updateElement(id, {
      uploadState: 'error',
      uploadMessage: errorMessage,
    } as Partial<ImageElement>);
    
    // 行级注释：尝试更新视频节点
    updateElement(id, {
      status: 'error',
    } as Partial<VideoElement>);
  });
}

// ============================================================================
// 节点复制函数
// ============================================================================

/**
 * 复制图片节点
 */
export function duplicateImageNode(
  sourceImage: ImageElement
): ImageElement {
  const position = getRightSidePosition(
    sourceImage.position,
    sourceImage.size || IMAGE_NODE_DEFAULT_SIZE,
    30
  );

  return {
    ...sourceImage,
    id: generateNodeId('image'),
    position,
  };
}

/**
 * 复制视频节点
 */
export function duplicateVideoNode(
  sourceVideo: VideoElement
): VideoElement {
  const position = getRightSidePosition(
    sourceVideo.position,
    sourceVideo.size || VIDEO_NODE_DEFAULT_SIZE
  );

  return {
    ...sourceVideo,
    id: generateNodeId('video'),
    position,
  };
}

/**
 * 批量添加节点到画布
 */
export function addNodesToCanvas(nodes: CanvasElement[]): void {
  const { addElement } = useCanvasStore.getState();
  nodes.forEach(node => addElement(node));
}

/**
 * 获取节点（按 ID）
 */
export function getNodeById<T extends CanvasElement>(
  nodeId: string
): T | undefined {
  const { elements } = useCanvasStore.getState();
  return elements.find(el => el.id === nodeId) as T | undefined;
}

/**
 * 获取所有图片节点
 */
export function getAllImageNodes(): ImageElement[] {
  const { elements } = useCanvasStore.getState();
  return elements.filter(el => el.type === 'image') as ImageElement[];
}

/**
 * 获取所有视频节点
 */
export function getAllVideoNodes(): VideoElement[] {
  const { elements } = useCanvasStore.getState();
  return elements.filter(el => el.type === 'video') as VideoElement[];
}

