// 画布元素类型定义
export type ElementType = 'image' | 'text' | 'video' | 'note';

// 宽高比类型（统一定义，避免多处重复）
export type AspectRatio = '16:9' | '9:16' | '1:1';

// 视频宽高比（只支持 16:9 和 9:16）
export type VideoAspectRatio = '16:9' | '9:16';

// 生成模式
export type GenerationMode = 'generate' | 'regenerate' | 'similar' | 'batch' | 'edit' | 'next-shot';

// 画布元素基础接口
export interface CanvasElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  promptId?: string; // 关联的提示词 ID
  sourceImageIds?: string[]; // 多图生成时的源图片 ID
}

// 图片元素
export interface ImageElement extends CanvasElement {
  type: 'image';
  src: string; // 图片 URL
  base64?: string; // 图片 base64 数据（用于图片编辑，避免重新下载）
  alt?: string;
  caption?: string; // 上传图片时保存的 Caption 描述 // 行级注释说明字段用途
  mediaId?: string; // Flow 返回的 mediaId，图生图时用作 imageInputs.name // 行级注释说明字段用途
  mediaGenerationId?: string; // Flow 返回的 mediaGenerationId，用于后续编辑 // 行级注释说明字段用途
  uploadState?: 'local' | 'syncing' | 'synced' | 'error'; // 上传到远端的同步状态 // 行级注释说明字段用途
  uploadMessage?: string; // 同步状态的提示信息（如错误原因） // 行级注释说明字段用途
  pendingConnectionGeneration?: boolean; // 行级注释：连线菜单自动生成的占位符标记
  generatedFrom?: {
    type: 'text' | 'input' | 'image-to-image'; // 来源类型：文本节点、输入框、图生图
    sourceIds?: string[]; // 源节点 ID（文本节点或图片节点）
    prompt?: string; // 生成提示词
  };
}

// 文本元素
export interface TextElement extends CanvasElement {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
}

// 记事本元素（长文本，Markdown 格式）
export interface NoteElement extends CanvasElement {
  type: 'note';
  content: string; // Markdown 内容
  title?: string; // 标题
}

// 视频元素
export interface VideoElement extends CanvasElement {
  type: 'video';
  src: string; // 视频 URL
  thumbnail: string; // 缩略图
  duration: number; // 时长（秒）
  mediaGenerationId?: string; // Flow 返回的 mediaGenerationId，便于后续编辑 // 行级注释说明字段用途
  status: 'pending' | 'queued' | 'generating' | 'ready' | 'error';
  progress?: number; // 生成进度 0-100
  startImageId?: string; // 首帧对应的图片节点 ID // 行级注释说明字段用途
  startImageUrl?: string; // 首帧缩略图 URL // 行级注释说明字段用途
  endImageId?: string; // 尾帧对应的图片节点 ID // 行级注释说明字段用途
  endImageUrl?: string; // 尾帧缩略图 URL // 行级注释说明字段用途
  promptText?: string; // 视频生成使用的提示词 // 行级注释说明字段用途
  readyForGeneration?: boolean; // 当前是否满足生成条件（提示词 + 首尾帧至少一个） // 行级注释说明字段用途
  generatedFrom?: {
    type: 'text' | 'image' | 'image-to-image' | 'upsample' | 'reshoot' | 'extend' | 'reference-images'; // 行级注释：reference-images 表示多图参考视频
    sourceIds: string[]; // 源节点 ID（文本/图片/视频）
    prompt?: string;
  };
  generationCount?: number; // 行级注释：生成数量 (1-4)
  // 行级注释：多图参考视频的参考图片 ID（最多 3 张）
  referenceImageIds?: string[];
}

// 提示词历史记录
export interface PromptHistory {
  promptId: string;
  promptText: string;
  imageId: string;
  mode: GenerationMode;
  createdAt: number;
}

// 批量生成上下文
export interface BatchGenerationContext {
  selectionIds: string[];
  promptDraft: string;
  lastResultIds: string[];
}

// UI 状态
export interface UIState {
  zoom: number;
  showGrid: boolean;
  activeTool: 'select' | 'text' | 'upload';
}

// 虚拟数据 API 配置
export interface ApiMockConfig {
  latency: number; // 模拟延迟（毫秒）
  fixtures: {
    images: string[]; // 预设图片 URL 列表
  };
}


// 镜头控制类型
export type ReshootMotionType =
  // Camera Control
  | 'RESHOOT_MOTION_TYPE_UP'
  | 'RESHOOT_MOTION_TYPE_DOWN'
  | 'RESHOOT_MOTION_TYPE_LEFT_TO_RIGHT'
  | 'RESHOOT_MOTION_TYPE_RIGHT_TO_LEFT'
  | 'RESHOOT_MOTION_TYPE_FORWARD'
  | 'RESHOOT_MOTION_TYPE_BACKWARD'
  | 'RESHOOT_MOTION_TYPE_DOLLY_IN_ZOOM_OUT'
  | 'RESHOOT_MOTION_TYPE_DOLLY_OUT_ZOOM_IN_LARGE'
  // Camera Position
  | 'RESHOOT_MOTION_TYPE_STATIONARY_UP'
  | 'RESHOOT_MOTION_TYPE_STATIONARY_DOWN'
  | 'RESHOOT_MOTION_TYPE_STATIONARY_LEFT_LARGE'
  | 'RESHOOT_MOTION_TYPE_STATIONARY_RIGHT_LARGE'
  | 'RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_IN_ZOOM_OUT'
  | 'RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_OUT_ZOOM_IN_LARGE';
