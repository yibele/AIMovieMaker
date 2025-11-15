// 画布元素类型定义
export type ElementType = 'image' | 'text' | 'video';

// 生成模式
export type GenerationMode = 'generate' | 'regenerate' | 'similar' | 'batch';

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
  alt?: string;
  caption?: string; // 上传图片时保存的 Caption 描述 // 行级注释说明字段用途
  mediaId?: string; // Flow 返回的 mediaId，图生图时用作 imageInputs.name // 行级注释说明字段用途
  mediaGenerationId?: string; // Flow 返回的 mediaGenerationId，用于后续编辑 // 行级注释说明字段用途
  uploadState?: 'local' | 'syncing' | 'synced' | 'error'; // 上传到远端的同步状态 // 行级注释说明字段用途
  uploadMessage?: string; // 同步状态的提示信息（如错误原因） // 行级注释说明字段用途
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
    type: 'text' | 'image' | 'image-to-image';
    sourceIds: string[]; // 源节点 ID（文本/图片）
    prompt?: string;
  };
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

