# AIMovieMaker 代码重构指南

## 一、现状分析

### 1.1 当前架构问题

经过对代码库的深入分析，发现以下核心问题：

#### 1.1.1 业务逻辑分散严重

| 位置 | 包含的业务逻辑 | 问题 |
|------|---------------|------|
| `ImageNode.tsx` (687行) | 图生图、复制、下载、入库、视觉分析、图片编辑 | 节点组件包含过多业务逻辑 |
| `VideoNode.tsx` (840行) | 视频生成、超清放大、入库、重新生成 | 同上 |
| `Canvas.tsx` (2459行) | 视频生成、连线处理、分镜生成、VL分析 | 核心组件过于臃肿 |
| `api-mock.ts` (1395行) | 混合了业务逻辑和API调用 | 职责不清 |
| `input-panel-generator.ts` (427行) | 文生图、图生图、多图融合 | 独立的业务逻辑文件 |

#### 1.1.2 层级混乱

```
当前架构（混乱）：
┌────────────────────────────────────────────────────────────┐
│  UI 组件层 (ImageNode, VideoNode, Canvas, AIInputPanel)    │
│  ↓ 直接调用                                                │
│  api-mock.ts (混合层 - 业务逻辑 + API调用)                 │
│  ↓ 调用                                                    │
│  direct-google-api.ts (纯API层 - 设计较好)                 │
└────────────────────────────────────────────────────────────┘
```

#### 1.1.3 代码重复

- 节点添加逻辑在 `Canvas.tsx`、`Toolbar.tsx`、`ImageNode.tsx` 中都有
- 宽高比计算在多处重复实现
- 错误处理逻辑分散且不统一

#### 1.1.4 ⚠️ 套餐配置差异分散（严重问题）

**这是最容易出错的问题！** Pro 和 Ultra 套餐在以下方面存在差异，但代码分散处理：

| 差异点 | Pro | Ultra | 当前代码位置 |
|--------|-----|-------|-------------|
| 视频模式 | 只支持 `fast` | 支持 `quality` 和 `fast` | `api-mock.ts:50` |
| PaygateTier | `PAYGATE_TIER_ONE` | `PAYGATE_TIER_TWO` | `direct-google-api.ts:350,509,830,978` |
| 文生视频模型 | `veo_3_1_t2v_fast` | `veo_3_1_t2v` / `veo_3_1_t2v_fast_ultra` | `direct-google-api.ts:328-347` |
| 图生视频模型 | `veo_3_1_i2v_s_fast` | `veo_3_1_i2v_s` / `veo_3_1_i2v_s_fast_ultra` | `direct-google-api.ts:469-506` |
| 首尾帧模型 | 加 `_fl` 后缀 | 同上 + `_ultra_fl` | `direct-google-api.ts:474-505` |
| 延长视频模型 | `veo_3_1_extend_fast_*` | `veo_3_1_extend_*` / `*_ultra` | `direct-google-api.ts:955-957` |

**问题严重性**：
- 模型命名规则复杂，分散在 5+ 处代码中
- 新增功能时极易遗漏某个套餐的处理
- 测试覆盖不全时，Pro/Ultra 用户会遇到不同的 bug

### 1.2 现有代码结构

```
lib/
├── api-mock.ts              # 混合层：业务逻辑 + API调用（需拆分）
├── direct-google-api.ts     # 纯API调用层（设计较好，可复用）
├── direct-google-api-extend.ts
├── input-panel-generator.ts # 输入面板生成逻辑（需整合）
├── store.ts                 # Zustand 状态管理
├── types.ts                 # 类型定义
└── constants/
    └── node-sizes.ts        # 节点尺寸常量

hooks/canvas/
├── useConnectionMenu.ts     # 连线菜单状态管理
├── useTextToImage.ts        # 文生图 Hook（设计较好）
└── useImageToImage.ts       # 图生图 Hook（需补全逻辑）

components/
├── Canvas.tsx               # 核心画布组件（过于臃肿）
├── nodes/
│   ├── ImageNode.tsx        # 图片节点（业务逻辑过多）
│   ├── VideoNode.tsx        # 视频节点（业务逻辑过多）
│   ├── TextNode.tsx
│   └── NoteNode.tsx
└── canvas/
    └── connection-menu/     # 连线菜单组件
```

---

## 二、重构目标架构

### 2.1 三层架构设计

```
目标架构（清晰分层）：
┌──────────────────────────────────────────────────────────────────┐
│                        UI 层 (Presentation)                       │
│  components/nodes/   - 纯UI渲染，无业务逻辑                       │
│  hooks/canvas/       - 用户交互处理，调用业务层                    │
├──────────────────────────────────────────────────────────────────┤
│                        业务服务层 (Services)                       │
│  lib/services/       - 业务逻辑处理，调用工具层                    │
├──────────────────────────────────────────────────────────────────┤
│                        工具层 (Tools)                             │
│  lib/tools/          - 纯API调用，无业务逻辑                       │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 目标文件结构

```
lib/
├── tools/                          # 工具层 - 纯API调用
│   ├── index.ts                    # 统一导出
│   ├── image-api.ts                # 图片API（文生图、图生图、上传）
│   ├── video-api.ts                # 视频API（文生视频、图生视频、超清、延长、镜头控制）
│   ├── media-api.ts                # 媒体通用API（获取、下载）
│   └── vision-api.ts               # VL分析API
│
├── services/                       # 业务服务层 - 业务逻辑
│   ├── index.ts                    # 统一导出
│   ├── image-generation.service.ts # 图片生成服务
│   ├── video-generation.service.ts # 视频生成服务
│   ├── node-management.service.ts  # 节点管理服务
│   ├── material-archive.service.ts # 素材入库服务
│   └── prompt-builder.service.ts   # 提示词构建服务
│
├── store.ts                        # 保持不变
├── types.ts                        # 保持不变
└── constants/
    └── node-sizes.ts               # 保持不变

hooks/canvas/
├── index.ts                        # 统一导出
├── useConnectionMenu.ts            # 保持不变
├── useTextToImage.ts               # 重构：调用服务层
├── useImageToImage.ts              # 重构：调用服务层
├── useVideoGeneration.ts           # 新增：视频生成Hook
├── useNodeOperations.ts            # 新增：节点操作Hook
├── useImageOperations.ts           # 新增：图片操作Hook（复制、删除、入库等）
├── useVideoOperations.ts           # 新增：视频操作Hook（超清、延长等）
└── useNextShotGeneration.ts        # 新增：自动分镜Hook

components/nodes/
├── ImageNode.tsx                   # 重构：纯UI，调用hooks
├── VideoNode.tsx                   # 重构：纯UI，调用hooks
├── TextNode.tsx                    # 保持不变
└── NoteNode.tsx                    # 保持不变
```

---

## 三、详细重构方案

### 3.1 工具层 (Tools Layer)

#### 3.1.1 `lib/tools/image-api.ts`

```typescript
/**
 * 图片API工具层
 * 职责：纯API调用，不包含任何业务逻辑
 * 特点：
 * - 只接收必要的参数，不从 store 读取
 * - 只返回 API 原始结果，不做业务转换
 * - 统一错误处理格式
 */

// 从 direct-google-api.ts 导出的纯API函数
export { 
  uploadImageDirectly,
  generateImageDirectly 
} from '../direct-google-api';

// 类型定义
export interface ImageGenerationParams {
  prompt: string;
  bearerToken: string;
  projectId: string;
  sessionId: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  accountTier: 'pro' | 'ultra';
  model: 'nanobanana' | 'nanobananapro';
  references?: Array<{ mediaId?: string }>;
  seed?: number;
  count?: number;
  prompts?: string[];
}

export interface ImageGenerationResult {
  images: Array<{
    encodedImage?: string;
    fifeUrl?: string;
    mediaId?: string;
    mediaGenerationId?: string;
    prompt?: string;
    seed?: number;
  }>;
  sessionId: string;
}

export interface ImageUploadParams {
  imageBase64: string;
  bearerToken: string;
  sessionId: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface ImageUploadResult {
  mediaGenerationId?: string;
  width?: number;
  height?: number;
  sessionId: string;
}
```

#### 3.1.2 `lib/tools/video-api.ts`

```typescript
/**
 * 视频API工具层
 * 职责：纯API调用，不包含任何业务逻辑
 */

// 从 direct-google-api.ts 导出的纯API函数
export {
  generateVideoTextDirectly,
  generateVideoImageDirectly,
  generateVideoUpsampleDirectly,
  generateVideoReshootDirectly,
  generateVideoExtendDirectly,
  checkVideoStatusDirectly,
} from '../direct-google-api';

// 类型定义
export interface TextToVideoParams {
  prompt: string;
  bearerToken: string;
  projectId: string;
  sessionId: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  accountTier: 'pro' | 'ultra';
  videoModel: 'quality' | 'fast';
  seed?: number;
  sceneId?: string;
}

export interface ImageToVideoParams extends TextToVideoParams {
  startMediaId: string;
  endMediaId?: string;
}

export interface VideoOperationResult {
  operationName: string;
  sceneId: string;
  status: string;
  remainingCredits?: number;
}

export interface VideoStatusResult {
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  mediaGenerationId?: string;
  error?: string;
  remainingCredits?: number;
}
```

#### 3.1.3 `lib/tools/vision-api.ts`

```typescript
/**
 * VL视觉分析API工具层
 */

export interface VisionAnalysisParams {
  imageUrl: string;
  endImageUrl?: string;
  apiKey: string;
  prompt: string;
}

export interface VisionAnalysisResult {
  content: string;
}

/**
 * 调用 Qwen VL 分析图片
 */
export async function analyzeImage(params: VisionAnalysisParams): Promise<VisionAnalysisResult> {
  const { imageUrl, endImageUrl, apiKey, prompt } = params;
  
  const messages = [{
    role: 'user',
    content: endImageUrl
      ? [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'image_url', image_url: { url: endImageUrl } },
          { type: 'text', text: prompt }
        ]
      : [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt }
        ]
  }];

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model: 'qwen-vl-max', messages })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'VL API request failed');
  }

  const data = await response.json();
  return { content: data.choices[0]?.message?.content?.trim() || '' };
}
```

### 3.2 业务服务层 (Services Layer)

#### 3.2.1 `lib/services/prompt-builder.service.ts`

```typescript
/**
 * 提示词构建服务
 * 职责：处理提示词相关的业务逻辑
 */

import { useCanvasStore } from '../store';

/**
 * 构建最终提示词（附加前置提示词）
 */
export function buildFinalPrompt(userPrompt: string, prefixPrompt?: string): string {
  const store = useCanvasStore.getState();
  const isEnabled = store.prefixPromptEnabled;
  
  if (!isEnabled) return userPrompt;
  
  const prefix = prefixPrompt ?? store.currentPrefixPrompt;
  if (!prefix?.trim()) return userPrompt;
  
  return `${userPrompt}, ${prefix.trim()}`;
}

/**
 * 获取API上下文（配置和会话信息）
 */
export function getApiContext() {
  const apiConfig = useCanvasStore.getState().apiConfig;
  
  let sessionId = apiConfig.sessionId;
  if (!sessionId?.trim()) {
    const context = useCanvasStore.getState().regenerateFlowContext();
    sessionId = context.sessionId;
  }
  
  const accountTier = apiConfig.accountTier || 'pro';
  const imageModel = apiConfig.imageModel || 'nanobanana';
  const videoModel = accountTier === 'pro' ? 'fast' : (apiConfig.videoModel || 'quality');
  
  return { apiConfig, sessionId, accountTier, imageModel, videoModel };
}

/**
 * 更新会话上下文
 */
export function updateSessionContext(newSessionId?: string) {
  if (!newSessionId) return;
  
  const apiConfig = useCanvasStore.getState().apiConfig;
  if (newSessionId !== apiConfig.sessionId) {
    useCanvasStore.getState().setApiConfig({ sessionId: newSessionId });
  }
}
```

#### 3.2.2 `lib/services/image-generation.service.ts`

```typescript
/**
 * 图片生成服务
 * 职责：处理图片生成相关的业务逻辑
 */

import { ImageElement } from '../types';
import { useCanvasStore } from '../store';
import { generateImageDirectly, uploadImageDirectly } from '../tools/image-api';
import { buildFinalPrompt, getApiContext, updateSessionContext } from './prompt-builder.service';
import { getImageNodeSize } from '../constants/node-sizes';

// ============================================================================
// 类型定义
// ============================================================================

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  count?: number;
  position: { x: number; y: number };
  sourceImageId?: string;  // 图生图时的源图片ID
  usePrefixPrompt?: boolean;  // 是否使用前置提示词（图生图默认不用）
}

export interface GenerateImageResult {
  nodeIds: string[];
  images: Array<{
    imageUrl: string;
    base64?: string;
    mediaId?: string;
    mediaGenerationId?: string;
  }>;
}

// ============================================================================
// 服务函数
// ============================================================================

/**
 * 文生图服务
 */
export async function generateImages(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const { prompt, aspectRatio, count = 1, position, usePrefixPrompt = true } = options;
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();
  
  // 验证配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('请先在右上角设置中配置 Bearer Token');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('请在设置中配置 Flow Project ID');
  }
  
  // 构建最终提示词
  const finalPrompt = usePrefixPrompt ? buildFinalPrompt(prompt) : prompt;
  
  // 计算节点尺寸
  const size = getImageNodeSize(aspectRatio);
  
  // 创建占位符节点
  const placeholderIds = createPlaceholderNodes(count, position, size, prompt);
  
  try {
    // 调用API生成图片
    const result = await generateImageDirectly(
      finalPrompt,
      apiConfig.bearerToken,
      apiConfig.projectId,
      sessionId,
      aspectRatio,
      accountTier,
      undefined, // references
      undefined, // seed
      count,
      imageModel
    );
    
    // 更新会话上下文
    updateSessionContext(result.sessionId);
    
    // 更新占位符节点
    updatePlaceholderNodes(placeholderIds, result.images);
    
    return {
      nodeIds: placeholderIds,
      images: result.images.map(img => ({
        imageUrl: img.fifeUrl || '',
        base64: img.encodedImage,
        mediaId: img.mediaId,
        mediaGenerationId: img.mediaGenerationId,
      })),
    };
  } catch (error) {
    // 删除占位符节点
    placeholderIds.forEach(id => useCanvasStore.getState().deleteElement(id));
    throw error;
  }
}

/**
 * 图生图服务
 */
export async function generateImageFromImage(
  sourceImage: ImageElement,
  options: Omit<GenerateImageOptions, 'position' | 'sourceImageId'>
): Promise<GenerateImageResult> {
  const { prompt, aspectRatio, count = 1 } = options;
  const { apiConfig, sessionId, accountTier, imageModel } = getApiContext();
  
  // 验证配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('图生图需要配置 Bearer Token');
  }
  
  // 获取或上传源图片的mediaId
  let effectiveMediaId = sourceImage.mediaId || sourceImage.mediaGenerationId;
  if (!effectiveMediaId) {
    const base64 = sourceImage.base64 || extractBase64FromDataUrl(sourceImage.src);
    const uploadResult = await uploadImageDirectly(base64, apiConfig.bearerToken, sessionId);
    effectiveMediaId = uploadResult.mediaGenerationId;
    
    if (!effectiveMediaId) {
      throw new Error('上传图片失败：未获取到 mediaGenerationId');
    }
  }
  
  // 计算位置（源图片右侧）
  const position = {
    x: sourceImage.position.x + (sourceImage.size?.width || 400) + 50,
    y: sourceImage.position.y,
  };
  
  // 计算节点尺寸
  const size = getImageNodeSize(aspectRatio);
  
  // 创建占位符节点
  const placeholderIds = createPlaceholderNodes(count, position, size, prompt, sourceImage.id);
  
  try {
    // 调用API（图生图不使用前置提示词）
    const result = await generateImageDirectly(
      prompt,
      apiConfig.bearerToken,
      apiConfig.projectId,
      sessionId,
      aspectRatio,
      accountTier,
      [{ mediaId: effectiveMediaId }],
      undefined, // seed
      count,
      imageModel
    );
    
    // 更新会话上下文
    updateSessionContext(result.sessionId);
    
    // 更新占位符节点
    updatePlaceholderNodes(placeholderIds, result.images);
    
    return {
      nodeIds: placeholderIds,
      images: result.images.map(img => ({
        imageUrl: img.fifeUrl || '',
        base64: img.encodedImage,
        mediaId: img.mediaId,
        mediaGenerationId: img.mediaGenerationId,
      })),
    };
  } catch (error) {
    placeholderIds.forEach(id => useCanvasStore.getState().deleteElement(id));
    throw error;
  }
}

/**
 * 上传图片服务
 */
export async function uploadImage(imageBase64: string, aspectRatio?: '16:9' | '9:16' | '1:1') {
  const { apiConfig, sessionId } = getApiContext();
  
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('上传图片需要配置 Bearer Token');
  }
  
  const result = await uploadImageDirectly(imageBase64, apiConfig.bearerToken, sessionId, aspectRatio);
  updateSessionContext(result.sessionId);
  
  return result;
}

// ============================================================================
// 私有辅助函数
// ============================================================================

function createPlaceholderNodes(
  count: number,
  position: { x: number; y: number },
  size: { width: number; height: number },
  prompt: string,
  sourceImageId?: string
): string[] {
  const { addElement } = useCanvasStore.getState();
  const placeholderIds: string[] = [];
  const spacing = 20;
  const totalWidth = count * size.width + (count - 1) * spacing;
  const startX = position.x - totalWidth / 2;
  
  for (let i = 0; i < count; i++) {
    const newImageId = `image-${Date.now()}-${i}`;
    placeholderIds.push(newImageId);
    
    const placeholderImage: ImageElement = {
      id: newImageId,
      type: 'image',
      src: '',
      position: {
        x: startX + i * (size.width + spacing),
        y: position.y,
      },
      size,
      generatedFrom: {
        type: sourceImageId ? 'image-to-image' : 'input',
        sourceIds: sourceImageId ? [sourceImageId] : undefined,
        prompt,
      },
    };
    
    addElement(placeholderImage);
  }
  
  return placeholderIds;
}

function updatePlaceholderNodes(
  placeholderIds: string[],
  images: Array<{ fifeUrl?: string; encodedImage?: string; mediaId?: string; mediaGenerationId?: string }>
) {
  const { updateElement, deleteElement } = useCanvasStore.getState();
  
  images.forEach((img, index) => {
    if (index < placeholderIds.length) {
      updateElement(placeholderIds[index], {
        src: img.fifeUrl || '',
        base64: img.encodedImage,
        mediaId: img.mediaId || img.mediaGenerationId,
        mediaGenerationId: img.mediaGenerationId,
      } as Partial<ImageElement>);
    }
  });
  
  // 删除多余的占位符
  if (images.length < placeholderIds.length) {
    for (let i = images.length; i < placeholderIds.length; i++) {
      deleteElement(placeholderIds[i]);
    }
  }
}

function extractBase64FromDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}
```

#### 3.2.3 `lib/services/video-generation.service.ts`

```typescript
/**
 * 视频生成服务
 * 职责：处理视频生成相关的业务逻辑
 */

import { VideoElement, ImageElement, ReshootMotionType } from '../types';
import { useCanvasStore } from '../store';
import {
  generateVideoTextDirectly,
  generateVideoImageDirectly,
  generateVideoUpsampleDirectly,
  generateVideoReshootDirectly,
  generateVideoExtendDirectly,
  checkVideoStatusDirectly,
} from '../tools/video-api';
import { buildFinalPrompt, getApiContext } from './prompt-builder.service';
import { getVideoNodeSize, VIDEO_NODE_DEFAULT_SIZE } from '../constants/node-sizes';

// ============================================================================
// 类型定义
// ============================================================================

export interface TextToVideoOptions {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  seed?: number;
}

export interface ImageToVideoOptions {
  startImageId: string;
  endImageId?: string;
  prompt?: string;
}

export interface VideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  mediaGenerationId?: string;
}

// ============================================================================
// 服务函数
// ============================================================================

/**
 * 文生视频服务
 */
export async function generateTextToVideo(options: TextToVideoOptions): Promise<VideoResult> {
  const { prompt, aspectRatio, seed } = options;
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();
  
  // 验证配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('文生视频需要配置 Bearer Token');
  }
  if (!apiConfig.projectId?.trim()) {
    throw new Error('文生视频需要配置 Flow Project ID');
  }
  
  // 构建最终提示词（使用前置提示词）
  const finalPrompt = buildFinalPrompt(prompt);
  
  // 生成场景ID
  const sceneId = crypto.randomUUID();
  
  // 调用API
  const task = await generateVideoTextDirectly(
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
  
  // 轮询等待结果
  return await pollVideoResult(task.operationName, apiConfig.bearerToken, task.sceneId);
}

/**
 * 图生视频服务
 */
export async function generateImageToVideo(options: ImageToVideoOptions): Promise<VideoResult> {
  const { startImageId, endImageId, prompt } = options;
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();
  const { elements } = useCanvasStore.getState();
  
  // 验证配置
  if (!apiConfig.bearerToken?.trim()) {
    throw new Error('图生视频需要配置 Bearer Token');
  }
  
  // 获取图片元素
  const startImage = elements.find(el => el.id === startImageId && el.type === 'image') as ImageElement | undefined;
  const endImage = endImageId 
    ? elements.find(el => el.id === endImageId && el.type === 'image') as ImageElement | undefined
    : undefined;
  
  if (!startImage) {
    throw new Error('找不到首帧图片节点');
  }
  
  const startMediaId = startImage.mediaId?.trim() || startImage.mediaGenerationId?.trim();
  const endMediaId = endImage ? (endImage.mediaId?.trim() || endImage.mediaGenerationId?.trim()) : undefined;
  
  if (!startMediaId) {
    throw new Error('首帧图片缺少 Flow mediaId');
  }
  
  // 推断宽高比
  const aspectRatio = inferAspectRatio(startImage, endImage);
  
  // 提示词（图生视频不使用前置提示词）
  const finalPrompt = prompt?.trim() || 'Seamless transition between scenes';
  
  const sceneId = crypto.randomUUID();
  
  // 调用API
  const task = await generateVideoImageDirectly(
    finalPrompt,
    apiConfig.bearerToken,
    apiConfig.projectId,
    sessionId,
    aspectRatio,
    accountTier,
    videoModel,
    startMediaId,
    endMediaId,
    undefined, // seed
    sceneId
  );
  
  return await pollVideoResult(task.operationName, apiConfig.bearerToken, task.sceneId);
}

/**
 * 视频超清放大服务
 */
export async function upsampleVideo(videoElement: VideoElement): Promise<VideoResult> {
  const { apiConfig, sessionId } = getApiContext();
  
  if (!videoElement.mediaGenerationId) {
    throw new Error('视频缺少 mediaGenerationId');
  }
  
  // 检查是否支持超清（只有16:9支持）
  const aspectRatio = inferVideoAspectRatio(videoElement);
  if (aspectRatio !== '16:9') {
    throw new Error('超清放大仅支持 16:9 横屏视频');
  }
  
  const task = await generateVideoUpsampleDirectly(
    videoElement.mediaGenerationId,
    apiConfig.bearerToken,
    sessionId,
    aspectRatio
  );
  
  return await pollVideoResult(task.operationName, apiConfig.bearerToken, task.sceneId);
}

/**
 * 视频镜头控制重拍服务
 */
export async function reshootVideo(
  videoElement: VideoElement,
  motionType: ReshootMotionType
): Promise<VideoResult> {
  const { apiConfig, sessionId, accountTier } = getApiContext();
  
  if (!videoElement.mediaGenerationId) {
    throw new Error('视频缺少 mediaGenerationId');
  }
  
  const aspectRatio = inferVideoAspectRatio(videoElement);
  
  const task = await generateVideoReshootDirectly(
    videoElement.mediaGenerationId,
    motionType,
    apiConfig.bearerToken,
    sessionId,
    apiConfig.projectId,
    aspectRatio,
    accountTier
  );
  
  return await pollVideoResult(task.operationName, apiConfig.bearerToken, task.sceneId);
}

/**
 * 视频延长服务
 */
export async function extendVideo(
  videoElement: VideoElement,
  prompt: string
): Promise<VideoResult> {
  const { apiConfig, sessionId, accountTier, videoModel } = getApiContext();
  
  if (!videoElement.mediaGenerationId) {
    throw new Error('视频缺少 mediaGenerationId');
  }
  
  const aspectRatio = inferVideoAspectRatio(videoElement);
  
  const task = await generateVideoExtendDirectly(
    videoElement.mediaGenerationId,
    prompt,
    apiConfig.bearerToken,
    sessionId,
    apiConfig.projectId,
    aspectRatio,
    accountTier,
    videoModel
  );
  
  return await pollVideoResult(task.operationName, apiConfig.bearerToken, task.sceneId);
}

// ============================================================================
// 私有辅助函数
// ============================================================================

const VIDEO_POLL_INTERVAL_MS = 15000;
const VIDEO_MAX_ATTEMPTS = 60;

async function pollVideoResult(
  operationName: string,
  bearerToken: string,
  sceneId: string
): Promise<VideoResult> {
  for (let attempt = 1; attempt <= VIDEO_MAX_ATTEMPTS; attempt++) {
    console.log(`🔁 视频生成轮询第 ${attempt} 次`);
    
    const result = await checkVideoStatusDirectly(operationName, bearerToken, sceneId);
    
    if (result.status === 'MEDIA_GENERATION_STATUS_FAILED') {
      throw new Error(result.error || 'Flow 视频生成失败');
    }
    
    if (result.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
      if (!result.videoUrl) {
        throw new Error('Flow 返回缺少视频地址');
      }
      
      // 更新积分
      if (typeof result.remainingCredits === 'number') {
        useCanvasStore.getState().setCredits(result.remainingCredits);
      }
      
      return {
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl || '',
        duration: result.duration || 8,
        mediaGenerationId: result.mediaGenerationId,
      };
    }
    
    await new Promise(resolve => setTimeout(resolve, VIDEO_POLL_INTERVAL_MS));
  }
  
  throw new Error('视频生成超时，请稍后重试');
}

function inferAspectRatio(
  startImage?: ImageElement,
  endImage?: ImageElement
): '16:9' | '9:16' | '1:1' {
  const candidate = startImage?.size || endImage?.size || { width: 400, height: 300 };
  const { width, height } = candidate;
  if (!width || !height) return '9:16';
  
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.1) return '1:1';
  return ratio >= 1 ? '16:9' : '9:16';
}

function inferVideoAspectRatio(video: VideoElement): '16:9' | '9:16' | '1:1' {
  const width = video.size?.width || 640;
  const height = video.size?.height || 360;
  const ratio = width / height;
  
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  return '1:1';
}
```

#### 3.2.4 `lib/services/node-management.service.ts`

```typescript
/**
 * 节点管理服务
 * 职责：处理节点的创建、复制、删除等操作
 */

import { CanvasElement, ImageElement, VideoElement, TextElement } from '../types';
import { useCanvasStore } from '../store';
import { useMaterialsStore } from '../materials-store';
import { getImageNodeSize, getVideoNodeSize, TEXT_NODE_DEFAULT_SIZE } from '../constants/node-sizes';

// ============================================================================
// 节点创建服务
// ============================================================================

/**
 * 创建图片节点
 */
export function createImageNode(
  position: { x: number; y: number },
  aspectRatio: '16:9' | '9:16' | '1:1',
  options?: {
    src?: string;
    base64?: string;
    mediaId?: string;
    mediaGenerationId?: string;
    prompt?: string;
    sourceImageId?: string;
  }
): string {
  const { addElement } = useCanvasStore.getState();
  const size = getImageNodeSize(aspectRatio);
  const nodeId = `image-${Date.now()}`;
  
  const node: ImageElement = {
    id: nodeId,
    type: 'image',
    src: options?.src || '',
    base64: options?.base64,
    mediaId: options?.mediaId,
    mediaGenerationId: options?.mediaGenerationId,
    position,
    size,
    generatedFrom: options?.prompt ? {
      type: options?.sourceImageId ? 'image-to-image' : 'input',
      sourceIds: options?.sourceImageId ? [options.sourceImageId] : undefined,
      prompt: options.prompt,
    } : undefined,
  };
  
  addElement(node);
  return nodeId;
}

/**
 * 创建视频节点
 */
export function createVideoNode(
  position: { x: number; y: number },
  aspectRatio: '16:9' | '9:16' | '1:1',
  options?: {
    status?: VideoElement['status'];
    promptText?: string;
    startImageId?: string;
    endImageId?: string;
    generatedFrom?: VideoElement['generatedFrom'];
  }
): string {
  const { addElement } = useCanvasStore.getState();
  const size = getVideoNodeSize(aspectRatio);
  const nodeId = `video-${Date.now()}`;
  
  const node: VideoElement = {
    id: nodeId,
    type: 'video',
    src: '',
    thumbnail: '',
    duration: 0,
    status: options?.status || 'pending',
    position,
    size,
    promptText: options?.promptText,
    startImageId: options?.startImageId,
    endImageId: options?.endImageId,
    generatedFrom: options?.generatedFrom,
  };
  
  addElement(node);
  return nodeId;
}

/**
 * 创建文本节点
 */
export function createTextNode(
  position: { x: number; y: number },
  text: string = '双击编辑文字'
): string {
  const { addElement } = useCanvasStore.getState();
  const nodeId = `text-${Date.now()}`;
  
  const node: TextElement = {
    id: nodeId,
    type: 'text',
    text,
    position,
    size: TEXT_NODE_DEFAULT_SIZE,
  };
  
  addElement(node);
  return nodeId;
}

// ============================================================================
// 节点操作服务
// ============================================================================

/**
 * 复制节点
 */
export function duplicateNode(nodeId: string, offset: { x: number; y: number } = { x: 50, y: 0 }): string | null {
  const { elements, addElement, setSelection } = useCanvasStore.getState();
  const node = elements.find(el => el.id === nodeId);
  
  if (!node) return null;
  
  const newNodeId = `${node.type}-${Date.now()}`;
  const newNode: CanvasElement = {
    ...node,
    id: newNodeId,
    position: {
      x: node.position.x + (node.size?.width || 400) + offset.x,
      y: node.position.y + offset.y,
    },
  };
  
  addElement(newNode);
  setSelection([newNodeId]);
  return newNodeId;
}

/**
 * 删除节点（检查是否可删除）
 */
export function deleteNode(nodeId: string): boolean {
  const { elements, deleteElement } = useCanvasStore.getState();
  const node = elements.find(el => el.id === nodeId);
  
  if (!node) return false;
  
  // 检查视频是否正在生成
  if (node.type === 'video') {
    const video = node as VideoElement;
    if (video.status === 'queued' || video.status === 'generating') {
      return false; // 不允许删除
    }
  }
  
  // 检查图片是否正在处理
  if (node.type === 'image') {
    const image = node as ImageElement;
    const isProcessing = image.uploadState === 'syncing' || 
      (!image.uploadState && !image.mediaGenerationId && !image.src);
    if (isProcessing) {
      return false;
    }
  }
  
  deleteElement(nodeId);
  return true;
}

// ============================================================================
// 入库服务
// ============================================================================

/**
 * 将节点保存到素材库
 */
export async function archiveToMaterials(nodeId: string): Promise<void> {
  const { elements, apiConfig } = useCanvasStore.getState();
  const { addMaterial } = useMaterialsStore.getState();
  const node = elements.find(el => el.id === nodeId);
  
  if (!node) {
    throw new Error('找不到节点');
  }
  
  if (node.type === 'image') {
    const image = node as ImageElement;
    if (!image.src) {
      throw new Error('图片未生成，无法入库');
    }
    
    await addMaterial({
      type: 'image',
      name: image.generatedFrom?.prompt || 'Untitled Image',
      src: image.src,
      thumbnail: image.src,
      mediaId: image.mediaId,
      mediaGenerationId: image.mediaGenerationId || '',
      metadata: {
        prompt: image.generatedFrom?.prompt,
        width: image.size?.width,
        height: image.size?.height,
      },
      projectId: apiConfig.projectId,
    });
  } else if (node.type === 'video') {
    const video = node as VideoElement;
    if (!video.src) {
      throw new Error('视频未生成，无法入库');
    }
    
    await addMaterial({
      type: 'video',
      name: video.promptText || 'Untitled Video',
      src: video.src,
      thumbnail: video.thumbnail || video.src,
      mediaGenerationId: video.mediaGenerationId || '',
      metadata: {
        prompt: video.promptText,
        width: video.size?.width,
        height: video.size?.height,
        duration: video.duration,
      },
      projectId: apiConfig.projectId,
    });
  }
}
```

### 3.3 Hooks 层

#### 3.3.1 `hooks/canvas/useImageOperations.ts`

```typescript
/**
 * 图片操作 Hook
 * 职责：处理图片节点的各种操作（复制、删除、入库、下载等）
 */

import { useCallback } from 'react';
import { ImageElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { 
  duplicateNode, 
  deleteNode, 
  archiveToMaterials 
} from '@/lib/services/node-management.service';
import { generateImageFromImage } from '@/lib/services/image-generation.service';
import { toast } from 'sonner';

export function useImageOperations(imageId: string) {
  const imageData = useCanvasStore(state => 
    state.elements.find(el => el.id === imageId) as ImageElement | undefined
  );
  
  // 复制图片
  const handleDuplicate = useCallback(() => {
    if (!imageData) return;
    const newId = duplicateNode(imageId);
    if (newId) {
      toast.success('图片已复制');
    }
  }, [imageId, imageData]);
  
  // 删除图片
  const handleDelete = useCallback(() => {
    const success = deleteNode(imageId);
    if (!success) {
      toast.error('图片正在生成/处理中，无法删除');
    }
  }, [imageId]);
  
  // 入库
  const handleArchive = useCallback(async () => {
    try {
      await archiveToMaterials(imageId);
      toast.success('已添加到精选素材库');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '入库失败');
    }
  }, [imageId]);
  
  // 下载
  const handleDownload = useCallback(() => {
    if (!imageData?.src) return;
    window.open(imageData.src, '_blank');
  }, [imageData?.src]);
  
  // 再次生成
  const handleRegenerate = useCallback(async () => {
    if (!imageData) return;
    
    const prompt = imageData.generatedFrom?.prompt || '生成图片';
    const aspectRatio = inferAspectRatio(imageData);
    
    try {
      await generateImageFromImage(imageData, {
        prompt,
        aspectRatio,
        count: 1,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    }
  }, [imageData]);
  
  return {
    handleDuplicate,
    handleDelete,
    handleArchive,
    handleDownload,
    handleRegenerate,
  };
}

function inferAspectRatio(image: ImageElement): '16:9' | '9:16' | '1:1' {
  const width = image.size?.width || 320;
  const height = image.size?.height || 180;
  const ratio = width / height;
  
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  return '1:1';
}
```

#### 3.3.2 `hooks/canvas/useVideoOperations.ts`

```typescript
/**
 * 视频操作 Hook
 * 职责：处理视频节点的各种操作（超清、延长、镜头控制等）
 */

import { useCallback, useMemo } from 'react';
import { VideoElement, ReshootMotionType } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { 
  upsampleVideo, 
  reshootVideo, 
  extendVideo 
} from '@/lib/services/video-generation.service';
import { 
  deleteNode, 
  archiveToMaterials,
  createVideoNode 
} from '@/lib/services/node-management.service';
import { toast } from 'sonner';

export function useVideoOperations(videoId: string) {
  const videoData = useCanvasStore(state => 
    state.elements.find(el => el.id === videoId) as VideoElement | undefined
  );
  const updateElement = useCanvasStore(state => state.updateElement);
  
  // 是否可以超清（只有16:9支持）
  const canUpscale = useMemo(() => {
    if (!videoData?.src || !videoData?.mediaGenerationId) return false;
    
    const width = videoData.size?.width || 640;
    const height = videoData.size?.height || 360;
    const ratio = width / height;
    
    return Math.abs(ratio - 16 / 9) < 0.1;
  }, [videoData]);
  
  // 超清放大
  const handleUpscale = useCallback(async () => {
    if (!videoData || !canUpscale) {
      toast.error('超清放大仅支持 16:9 横屏视频');
      return;
    }
    
    // 创建新的占位符节点
    const newNodeId = createVideoNode(
      {
        x: videoData.position.x + (videoData.size?.width || 640) + 50,
        y: videoData.position.y,
      },
      '16:9',
      {
        status: 'generating',
        promptText: '超清放大：' + (videoData.promptText || '视频'),
        generatedFrom: {
          type: 'upsample',
          sourceIds: [videoId],
          prompt: '超清放大',
        },
      }
    );
    
    try {
      const result = await upsampleVideo(videoData);
      
      updateElement(newNodeId, {
        status: 'ready',
        src: result.videoUrl,
        thumbnail: result.thumbnailUrl,
        duration: result.duration,
        mediaGenerationId: result.mediaGenerationId,
        progress: 100,
      } as Partial<VideoElement>);
      
      toast.success('超清放大完成');
    } catch (error) {
      updateElement(newNodeId, { status: 'error' } as Partial<VideoElement>);
      toast.error(error instanceof Error ? error.message : '超清放大失败');
    }
  }, [videoData, videoId, canUpscale, updateElement]);
  
  // 镜头控制重拍
  const handleReshoot = useCallback(async (motionType: ReshootMotionType) => {
    if (!videoData) return;
    
    const newNodeId = createVideoNode(
      {
        x: videoData.position.x + (videoData.size?.width || 640) + 50,
        y: videoData.position.y,
      },
      inferAspectRatio(videoData),
      {
        status: 'generating',
        generatedFrom: {
          type: 'reshoot',
          sourceIds: [videoId],
        },
      }
    );
    
    try {
      const result = await reshootVideo(videoData, motionType);
      
      updateElement(newNodeId, {
        status: 'ready',
        src: result.videoUrl,
        thumbnail: result.thumbnailUrl,
        duration: result.duration,
        mediaGenerationId: result.mediaGenerationId,
        progress: 100,
      } as Partial<VideoElement>);
      
      toast.success('镜头控制完成');
    } catch (error) {
      updateElement(newNodeId, { status: 'error' } as Partial<VideoElement>);
      toast.error(error instanceof Error ? error.message : '镜头控制失败');
    }
  }, [videoData, videoId, updateElement]);
  
  // 延长视频
  const handleExtend = useCallback(async (prompt: string) => {
    if (!videoData) return;
    
    const newNodeId = createVideoNode(
      {
        x: videoData.position.x + (videoData.size?.width || 640) + 50,
        y: videoData.position.y,
      },
      inferAspectRatio(videoData),
      {
        status: 'generating',
        promptText: prompt,
        generatedFrom: {
          type: 'extend',
          sourceIds: [videoId],
          prompt,
        },
      }
    );
    
    try {
      const result = await extendVideo(videoData, prompt);
      
      updateElement(newNodeId, {
        status: 'ready',
        src: result.videoUrl,
        thumbnail: result.thumbnailUrl,
        duration: result.duration,
        mediaGenerationId: result.mediaGenerationId,
        progress: 100,
      } as Partial<VideoElement>);
      
      toast.success('视频延长完成');
    } catch (error) {
      updateElement(newNodeId, { status: 'error' } as Partial<VideoElement>);
      toast.error(error instanceof Error ? error.message : '视频延长失败');
    }
  }, [videoData, videoId, updateElement]);
  
  // 删除
  const handleDelete = useCallback(() => {
    const success = deleteNode(videoId);
    if (!success) {
      toast.error('视频正在生成中，无法删除');
    }
  }, [videoId]);
  
  // 入库
  const handleArchive = useCallback(async () => {
    try {
      await archiveToMaterials(videoId);
      toast.success('已添加到精选素材库');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '入库失败');
    }
  }, [videoId]);
  
  // 下载
  const handleDownload = useCallback(() => {
    if (!videoData?.src) return;
    window.open(videoData.src, '_blank');
  }, [videoData?.src]);
  
  return {
    canUpscale,
    handleUpscale,
    handleReshoot,
    handleExtend,
    handleDelete,
    handleArchive,
    handleDownload,
  };
}

function inferAspectRatio(video: VideoElement): '16:9' | '9:16' | '1:1' {
  const width = video.size?.width || 640;
  const height = video.size?.height || 360;
  const ratio = width / height;
  
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  return '1:1';
}
```

### 3.4 重构后的节点组件示例

#### 3.4.1 `components/nodes/ImageNode.tsx`（重构后）

```typescript
/**
 * 图片节点组件（重构后）
 * 职责：纯UI渲染，业务逻辑通过 hooks 处理
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps, NodeToolbar } from '@xyflow/react';
import { RefreshCw, Copy, Download, Trash2, Edit3, Eye, FolderInput } from 'lucide-react';
import type { ImageElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { useImageOperations } from '@/hooks/canvas/useImageOperations';
import { ToolbarButton, ToolbarDivider } from './ToolbarButton';

function ImageNode({ data, selected, id }: NodeProps) {
  const imageData = data as unknown as ImageElement;
  const selection = useCanvasStore((state) => state.selection);
  
  // 使用业务 Hook
  const {
    handleDuplicate,
    handleDelete,
    handleArchive,
    handleDownload,
    handleRegenerate,
  } = useImageOperations(id);
  
  // 计算显示状态
  const uploadState = imageData.uploadState ?? 'synced';
  const isSyncing = uploadState === 'syncing';
  const isError = uploadState === 'error';
  const hasMediaId = Boolean(imageData.mediaGenerationId);
  const showBaseImage = Boolean(imageData.src);
  const isProcessing = !isError && (isSyncing || !hasMediaId || !showBaseImage);
  
  // 只有从文本节点生成或图生图时才显示输入点
  const shouldShowInputHandle = imageData.generatedFrom?.type !== 'input';
  
  return (
    <>
      {/* NodeToolbar - 图片工具栏，只在单选时显示 */}
      <NodeToolbar
        isVisible={selected && selection.length === 1}
        position={Position.Top}
        align="center"
        offset={15}
        className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 px-3 py-2"
      >
        <ToolbarButton icon={<RefreshCw className="w-5 h-5" />} label="再次生成" onClick={handleRegenerate} />
        <ToolbarButton icon={<Edit3 className="w-5 h-5" />} label="图片编辑" onClick={() => {/* 打开编辑器 */}} />
        <ToolbarButton icon={<Eye className="w-5 h-5" />} label="视觉识别" onClick={() => {/* 打开识别 */}} />
        <ToolbarButton icon={<Copy className="w-5 h-5" />} label="复制" onClick={handleDuplicate} />
        <ToolbarButton icon={<FolderInput className="w-5 h-5" />} label="入库" onClick={handleArchive} />
        <ToolbarDivider />
        <ToolbarButton icon={<Download className="w-5 h-5" />} label="下载" onClick={handleDownload} />
        <ToolbarButton 
          icon={<Trash2 className="w-5 h-5" />} 
          label="删除" 
          variant="danger" 
          disabled={isProcessing}
          onClick={handleDelete} 
        />
      </NodeToolbar>

      {/* 图片容器 */}
      <div className={`relative rounded-xl transition-all duration-300 w-full h-full bg-slate-200 dark:bg-slate-700 ${
        selected ? 'ring-2 ring-blue-500' : ''
      }`}>
        {/* 输入连接点 */}
        {shouldShowInputHandle && (
          <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-blue-500" />
        )}

        {/* 图片内容区域 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          {/* Loading 状态 */}
          {isProcessing && <div className="loading-glow w-full h-full" />}
          
          {/* 图片显示 */}
          {showBaseImage && imageData.src && (
            <img src={imageData.src} alt="" className="h-full w-full object-cover" />
          )}
          
          {/* 错误状态 */}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 text-red-500">
              同步失败
            </div>
          )}
        </div>

        {/* 输出连接点 */}
        <Handle id="right" type="source" position={Position.Right} className="!w-3.5 !h-3.5 !bg-blue-500" />
      </div>
    </>
  );
}

export default memo(ImageNode);
```

---

## 四、重构步骤

### 阶段一：创建工具层（1-2天）

1. 创建 `lib/tools/` 目录
2. 从 `direct-google-api.ts` 导出必要函数到工具层
3. 创建统一的类型定义

```bash
# 目录结构
lib/tools/
├── index.ts
├── image-api.ts
├── video-api.ts
├── media-api.ts
└── vision-api.ts
```

### 阶段二：创建业务服务层（2-3天）

1. 创建 `lib/services/` 目录
2. 从 `api-mock.ts` 提取业务逻辑到服务层
3. 从 `input-panel-generator.ts` 提取业务逻辑

```bash
# 目录结构
lib/services/
├── index.ts
├── prompt-builder.service.ts
├── image-generation.service.ts
├── video-generation.service.ts
├── node-management.service.ts
└── material-archive.service.ts
```

### 阶段三：创建 Hooks 层（2-3天）

1. 创建新的 hooks 文件
2. 重构现有 hooks，调用服务层
3. 确保向后兼容

```bash
# 目录结构
hooks/canvas/
├── index.ts
├── useConnectionMenu.ts       # 保持
├── useTextToImage.ts          # 重构
├── useImageToImage.ts         # 重构
├── useVideoGeneration.ts      # 新增
├── useImageOperations.ts      # 新增
├── useVideoOperations.ts      # 新增
└── useNextShotGeneration.ts   # 新增
```

### 阶段四：重构节点组件（2-3天）

1. 重构 `ImageNode.tsx`，移除业务逻辑
2. 重构 `VideoNode.tsx`，移除业务逻辑
3. 使用 hooks 替代内联逻辑

### 阶段五：重构 Canvas.tsx（3-4天）

1. 将视频生成逻辑移至 hooks
2. 将连线处理逻辑移至 hooks
3. 将 VL 分析逻辑移至服务层
4. 简化 Canvas 组件

### 阶段六：清理和测试（2天）

1. 删除已迁移的旧代码
2. 更新导入路径
3. 全面测试各功能

---

## 五、重构收益

### 5.1 代码可维护性

| 指标 | 重构前 | 重构后 |
|------|-------|-------|
| Canvas.tsx 行数 | 2459 | ~800 |
| ImageNode.tsx 行数 | 687 | ~150 |
| VideoNode.tsx 行数 | 840 | ~200 |
| 业务逻辑复用率 | 低 | 高 |

### 5.2 职责清晰度

- **UI层**：只负责渲染和用户交互
- **业务层**：处理业务逻辑
- **工具层**：纯API调用

### 5.3 测试友好

- 服务层可以独立进行单元测试
- UI 层可以使用 mock 服务进行测试
- 减少端到端测试的需求

---

## 六、兼容性保障

为确保重构过程中不影响现有功能，采用以下策略：

1. **渐进式重构**：每个阶段完成后进行完整测试
2. **保留旧接口**：在 `api-mock.ts` 中保留旧函数，内部调用新服务
3. **功能开关**：必要时使用 feature flag 控制新旧实现切换

```typescript
// 示例：兼容性包装
// lib/api-mock.ts (过渡期保留)
import { generateImages as newGenerateImages } from './services/image-generation.service';

// 保留旧接口，内部调用新服务
export async function generateImage(prompt: string, aspectRatio: '16:9' | '9:16' | '1:1' = '16:9', count?: number) {
  const result = await newGenerateImages({
    prompt,
    aspectRatio,
    count,
    position: { x: 0, y: 0 }, // 外部调用需要自己处理位置
  });
  
  // 转换为旧格式
  return {
    imageUrl: result.images[0]?.imageUrl || '',
    promptId: `${Date.now()}`,
    mediaId: result.images[0]?.mediaId,
    mediaGenerationId: result.images[0]?.mediaGenerationId,
    images: result.images,
  };
}
```

---

## 七、⚠️ 套餐配置适配器（核心重构）

这是解决 Pro/Ultra 数据不一致问题的 **核心方案**。

### 7.1 问题分析

当前代码中 Pro/Ultra 的差异处理分散在 **6+ 个文件、20+ 处代码** 中：

```typescript
// 问题1：视频模式判断分散
// api-mock.ts
const videoModel = accountTier === 'pro' ? 'fast' : (apiConfig.videoModel || 'quality');

// 问题2：模型名称计算复杂且分散
// direct-google-api.ts:328-347
if (accountTier === 'ultra') {
  const baseModel = videoModel === 'fast' ? 'veo_3_1_t2v_fast_ultra' : 'veo_3_1_t2v';
  videoModelKey = aspectRatio === '9:16' ? baseModel : baseModel;
} else {
  videoModelKey = aspectRatio === '9:16' ? 'veo_3_1_t2v_fast_portrait' : 'veo_3_1_t2v_fast';
}

// 问题3：PaygateTier 判断重复
// 出现在 direct-google-api.ts:350, 509, 830, 978
const userPaygateTier = accountTier === 'ultra' ? 'PAYGATE_TIER_TWO' : 'PAYGATE_TIER_ONE';
```

### 7.2 解决方案：统一配置适配器

创建 `lib/config/tier-config.ts`，**集中管理所有套餐差异**：

```typescript
/**
 * 套餐配置适配器
 * 
 * 核心原则：
 * 1. 所有 Pro/Ultra 差异只在此文件定义
 * 2. 其他代码通过适配器获取配置，不做条件判断
 * 3. 新增功能时只需在此文件添加配置
 */

// ============================================================================
// 类型定义
// ============================================================================

export type AccountTier = 'pro' | 'ultra';
export type VideoMode = 'quality' | 'fast';
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type ImageModel = 'nanobanana' | 'nanobananapro';

// 视频生成类型
export type VideoGenerationType = 
  | 'text-to-video'        // 文生视频
  | 'image-to-video'       // 图生视频（仅首帧）
  | 'image-to-video-fl'    // 图生视频（首尾帧）
  | 'extend'               // 视频延长
  | 'reshoot'              // 镜头控制重拍
  | 'upsample';            // 超清放大

// 套餐能力定义
export interface TierCapabilities {
  // 支持的视频模式
  supportedVideoModes: VideoMode[];
  // 默认视频模式
  defaultVideoMode: VideoMode;
  // PaygateTier
  paygateTier: 'PAYGATE_TIER_ONE' | 'PAYGATE_TIER_TWO';
  // 是否支持超清放大
  supportsUpsample: boolean;
  // 是否支持 Quality 模式
  supportsQualityMode: boolean;
}

// 视频模型配置
export interface VideoModelConfig {
  modelKey: string;
  // 某些功能可能需要的额外参数
  extraParams?: Record<string, any>;
}

// ============================================================================
// 套餐能力配置（单一数据源）
// ============================================================================

const TIER_CAPABILITIES: Record<AccountTier, TierCapabilities> = {
  pro: {
    supportedVideoModes: ['fast'],
    defaultVideoMode: 'fast',
    paygateTier: 'PAYGATE_TIER_ONE',
    supportsUpsample: true,
    supportsQualityMode: false,
  },
  ultra: {
    supportedVideoModes: ['quality', 'fast'],
    defaultVideoMode: 'quality',
    paygateTier: 'PAYGATE_TIER_TWO',
    supportsUpsample: true,
    supportsQualityMode: true,
  },
};

// ============================================================================
// 视频模型命名规则（单一数据源）
// ============================================================================

/**
 * 视频模型命名规则表
 * 
 * 命名模式：{base}_{mode}_{aspect}_{tier}_{feature}
 * - base: veo_3_1_t2v / veo_3_1_i2v_s / veo_3_1_extend
 * - mode: quality 时省略，fast 时加 _fast
 * - aspect: landscape 省略，portrait 加 _portrait，square 加 _square
 * - tier: pro 省略，ultra 加 _ultra
 * - feature: 首尾帧加 _fl
 */

interface VideoModelRule {
  base: string;
  // Pro 是否只支持 fast
  proOnlyFast: boolean;
  // 是否支持竖屏
  supportsPortrait: boolean;
  // 是否支持方形
  supportsSquare: boolean;
  // 是否有 _fl 变体（首尾帧）
  hasFlVariant: boolean;
}

const VIDEO_MODEL_RULES: Record<VideoGenerationType, VideoModelRule> = {
  'text-to-video': {
    base: 'veo_3_1_t2v',
    proOnlyFast: true,
    supportsPortrait: true,
    supportsSquare: true,
    hasFlVariant: false,
  },
  'image-to-video': {
    base: 'veo_3_1_i2v_s',
    proOnlyFast: true,
    supportsPortrait: true,
    supportsSquare: false,  // 图生视频可能不支持方形
    hasFlVariant: false,
  },
  'image-to-video-fl': {
    base: 'veo_3_1_i2v_s',
    proOnlyFast: true,
    supportsPortrait: true,
    supportsSquare: false,
    hasFlVariant: true,
  },
  'extend': {
    base: 'veo_3_1_extend',
    proOnlyFast: false,  // 延长视频也支持 quality
    supportsPortrait: true,
    supportsSquare: true,
    hasFlVariant: false,
  },
  'reshoot': {
    base: 'veo_3_0_reshoot',
    proOnlyFast: false,  // 镜头控制没有 fast 变体
    supportsPortrait: true,
    supportsSquare: true,
    hasFlVariant: false,
  },
  'upsample': {
    base: 'veo_2_1080p_upsampler_8s',
    proOnlyFast: false,  // 超清放大没有 fast 变体
    supportsPortrait: false,  // 只支持 16:9
    supportsSquare: false,
    hasFlVariant: false,
  },
};

// ============================================================================
// 适配器函数（对外接口）
// ============================================================================

/**
 * 获取套餐能力
 */
export function getTierCapabilities(tier: AccountTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

/**
 * 获取有效的视频模式（Pro 强制 fast，Ultra 可选）
 */
export function getEffectiveVideoMode(tier: AccountTier, requestedMode?: VideoMode): VideoMode {
  const capabilities = TIER_CAPABILITIES[tier];
  
  // 如果请求的模式不支持，使用默认模式
  if (!requestedMode || !capabilities.supportedVideoModes.includes(requestedMode)) {
    return capabilities.defaultVideoMode;
  }
  
  return requestedMode;
}

/**
 * 获取 PaygateTier
 */
export function getPaygateTier(tier: AccountTier): string {
  return TIER_CAPABILITIES[tier].paygateTier;
}

/**
 * 获取视频模型 Key（核心函数）
 * 
 * @param type 视频生成类型
 * @param tier 账号套餐
 * @param aspectRatio 宽高比
 * @param videoMode 视频模式（quality/fast）
 * @returns 完整的 videoModelKey
 * 
 * @example
 * // Pro + 文生视频 + 横屏
 * getVideoModelKey('text-to-video', 'pro', '16:9', 'fast') // => 'veo_3_1_t2v_fast'
 * 
 * // Ultra + 文生视频 + 横屏 + quality
 * getVideoModelKey('text-to-video', 'ultra', '16:9', 'quality') // => 'veo_3_1_t2v'
 * 
 * // Ultra + 图生视频 + 竖屏 + 首尾帧 + fast
 * getVideoModelKey('image-to-video-fl', 'ultra', '9:16', 'fast') // => 'veo_3_1_i2v_s_fast_portrait_ultra_fl'
 */
export function getVideoModelKey(
  type: VideoGenerationType,
  tier: AccountTier,
  aspectRatio: AspectRatio,
  videoMode?: VideoMode
): string {
  const rule = VIDEO_MODEL_RULES[type];
  
  // 超清放大是固定模型，直接返回
  if (type === 'upsample') {
    return rule.base;
  }
  
  // 镜头控制重拍有特殊的命名规则
  if (type === 'reshoot') {
    const aspectSuffix = aspectRatio === '9:16' 
      ? '_portrait' 
      : aspectRatio === '1:1' 
        ? '_square' 
        : '_landscape';
    return `${rule.base}${aspectSuffix}`;
  }
  
  // 获取有效的视频模式
  const effectiveMode = getEffectiveVideoMode(tier, videoMode);
  
  // 构建模型名称
  let modelKey = rule.base;
  
  // 添加模式后缀
  if (effectiveMode === 'fast') {
    modelKey += '_fast';
  }
  
  // 添加宽高比后缀
  if (aspectRatio === '9:16' && rule.supportsPortrait) {
    modelKey += '_portrait';
  } else if (aspectRatio === '1:1' && rule.supportsSquare) {
    modelKey += '_square';
  }
  // 16:9 (landscape) 不加后缀
  
  // 添加 Ultra 后缀
  if (tier === 'ultra') {
    // 特殊处理：quality 模式下，Ultra 不需要后缀（因为 quality 是 Ultra 独有的）
    // fast 模式下，Ultra 需要 _ultra 后缀
    if (effectiveMode === 'fast') {
      modelKey += '_ultra';
    }
    // 注意：有些模型在 quality 模式下也可能需要处理，需要根据实际 API 行为调整
  }
  
  // 添加首尾帧后缀
  if (rule.hasFlVariant) {
    modelKey += '_fl';
  }
  
  return modelKey;
}

/**
 * 验证功能是否支持当前套餐
 */
export function isFeatureSupported(
  feature: 'upsample' | 'quality_mode' | 'extend' | 'reshoot',
  tier: AccountTier,
  aspectRatio?: AspectRatio
): { supported: boolean; reason?: string } {
  const capabilities = TIER_CAPABILITIES[tier];
  
  switch (feature) {
    case 'upsample':
      // 超清放大只支持 16:9
      if (aspectRatio && aspectRatio !== '16:9') {
        return { supported: false, reason: '超清放大仅支持 16:9 横屏视频' };
      }
      return { supported: capabilities.supportsUpsample };
      
    case 'quality_mode':
      return { 
        supported: capabilities.supportsQualityMode,
        reason: capabilities.supportsQualityMode ? undefined : 'Pro 账号只支持 Fast 模式'
      };
      
    case 'extend':
    case 'reshoot':
      return { supported: true };
      
    default:
      return { supported: true };
  }
}

/**
 * 获取完整的 API 请求配置
 * 
 * 这是最核心的函数，统一生成 API 请求所需的所有配置参数
 */
export interface ApiRequestConfig {
  videoModelKey: string;
  userPaygateTier: string;
  effectiveVideoMode: VideoMode;
  aspectRatioEnum: string;  // VIDEO_ASPECT_RATIO_* 或 IMAGE_ASPECT_RATIO_*
}

export function getVideoApiConfig(
  type: VideoGenerationType,
  tier: AccountTier,
  aspectRatio: AspectRatio,
  videoMode?: VideoMode
): ApiRequestConfig {
  const effectiveMode = getEffectiveVideoMode(tier, videoMode);
  
  // 视频宽高比枚举
  const aspectRatioEnum = aspectRatio === '9:16'
    ? 'VIDEO_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
      ? 'VIDEO_ASPECT_RATIO_SQUARE'
      : 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  
  return {
    videoModelKey: getVideoModelKey(type, tier, aspectRatio, effectiveMode),
    userPaygateTier: getPaygateTier(tier),
    effectiveVideoMode: effectiveMode,
    aspectRatioEnum,
  };
}

export function getImageApiConfig(
  tier: AccountTier,
  aspectRatio: AspectRatio,
  model?: ImageModel
): {
  imageModelName: string;
  aspectRatioEnum: string;
} {
  return {
    imageModelName: model === 'nanobananapro' ? 'GEM_PIX_2' : 'GEM_PIX',
    aspectRatioEnum: aspectRatio === '9:16'
      ? 'IMAGE_ASPECT_RATIO_PORTRAIT'
      : aspectRatio === '1:1'
        ? 'IMAGE_ASPECT_RATIO_SQUARE'
        : 'IMAGE_ASPECT_RATIO_LANDSCAPE',
  };
}
```

### 7.3 使用示例

#### 7.3.1 重构前（分散的条件判断）

```typescript
// direct-google-api.ts - 重构前
export async function generateVideoTextDirectly(
  prompt: string,
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  accountTier: 'pro' | 'ultra',
  videoModel: 'quality' | 'fast' = 'quality',
  // ...
) {
  // ❌ 复杂的条件判断，容易出错
  let videoModelKey: string;
  if (accountTier === 'ultra') {
    const baseModel = videoModel === 'fast' ? 'veo_3_1_t2v_fast_ultra' : 'veo_3_1_t2v';
    videoModelKey = aspectRatio === '9:16' ? baseModel : baseModel;
  } else {
    videoModelKey = aspectRatio === '9:16' ? 'veo_3_1_t2v_fast_portrait' : 'veo_3_1_t2v_fast';
  }

  // ❌ 重复的 PaygateTier 判断
  const userPaygateTier = accountTier === 'ultra' ? 'PAYGATE_TIER_TWO' : 'PAYGATE_TIER_ONE';

  // ❌ 重复的宽高比转换
  const normalizedAspect = aspectRatio === '9:16'
    ? 'VIDEO_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
      ? 'VIDEO_ASPECT_RATIO_SQUARE'
      : 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  
  // ... 使用这些变量
}
```

#### 7.3.2 重构后（使用适配器）

```typescript
// direct-google-api.ts - 重构后
import { getVideoApiConfig, type AccountTier, type AspectRatio, type VideoMode } from './config/tier-config';

export async function generateVideoTextDirectly(
  prompt: string,
  bearerToken: string,
  projectId: string,
  sessionId: string,
  aspectRatio: AspectRatio,
  accountTier: AccountTier,
  videoMode?: VideoMode,
  // ...
) {
  // ✅ 一行代码获取所有配置，无条件判断
  const config = getVideoApiConfig('text-to-video', accountTier, aspectRatio, videoMode);

  // ✅ 直接使用配置
  const payload = {
    clientContext: {
      sessionId,
      projectId,
      tool: 'PINHOLE',
      userPaygateTier: config.userPaygateTier,  // ✅ 统一获取
    },
    requests: [{
      aspectRatio: config.aspectRatioEnum,  // ✅ 统一获取
      videoModelKey: config.videoModelKey,  // ✅ 统一获取
      // ...
    }],
  };
}
```

### 7.4 重构步骤

#### 阶段 0（优先执行）：创建套餐配置适配器

1. 创建 `lib/config/tier-config.ts`
2. 定义所有套餐差异的配置
3. 实现适配器函数

```bash
# 新建文件
lib/config/
├── index.ts           # 统一导出
├── tier-config.ts     # 套餐配置适配器
└── tier-config.test.ts # 单元测试（重要！）
```

#### 阶段 1：重构 direct-google-api.ts

1. 导入适配器
2. 删除所有 if-else 条件判断
3. 使用 `getVideoApiConfig()` 获取配置

#### 阶段 2：重构 api-mock.ts

1. 删除 `getApiContext()` 中的条件判断
2. 使用 `getEffectiveVideoMode()` 获取有效模式

#### 阶段 3：添加单元测试

```typescript
// lib/config/tier-config.test.ts
import { getVideoModelKey, getEffectiveVideoMode, getPaygateTier } from './tier-config';

describe('TierConfig', () => {
  describe('getVideoModelKey', () => {
    // 文生视频测试
    it('Pro + 文生视频 + 横屏 => veo_3_1_t2v_fast', () => {
      expect(getVideoModelKey('text-to-video', 'pro', '16:9', 'fast'))
        .toBe('veo_3_1_t2v_fast');
    });

    it('Ultra + 文生视频 + 横屏 + quality => veo_3_1_t2v', () => {
      expect(getVideoModelKey('text-to-video', 'ultra', '16:9', 'quality'))
        .toBe('veo_3_1_t2v');
    });

    it('Ultra + 文生视频 + 横屏 + fast => veo_3_1_t2v_fast_ultra', () => {
      expect(getVideoModelKey('text-to-video', 'ultra', '16:9', 'fast'))
        .toBe('veo_3_1_t2v_fast_ultra');
    });

    // 图生视频测试
    it('Pro + 图生视频 + 竖屏 => veo_3_1_i2v_s_fast_portrait', () => {
      expect(getVideoModelKey('image-to-video', 'pro', '9:16', 'fast'))
        .toBe('veo_3_1_i2v_s_fast_portrait');
    });

    // 首尾帧测试
    it('Ultra + 首尾帧 + 竖屏 + fast => veo_3_1_i2v_s_fast_portrait_ultra_fl', () => {
      expect(getVideoModelKey('image-to-video-fl', 'ultra', '9:16', 'fast'))
        .toBe('veo_3_1_i2v_s_fast_portrait_ultra_fl');
    });

    // 更多测试用例...
  });

  describe('getEffectiveVideoMode', () => {
    it('Pro 请求 quality 应该返回 fast', () => {
      expect(getEffectiveVideoMode('pro', 'quality')).toBe('fast');
    });

    it('Ultra 请求 quality 应该返回 quality', () => {
      expect(getEffectiveVideoMode('ultra', 'quality')).toBe('quality');
    });
  });
});
```

### 7.5 验证清单

重构完成后，确保以下场景全部通过测试：

| 场景 | Pro 预期 | Ultra 预期 |
|------|----------|-----------|
| 文生视频 + 横屏 | `veo_3_1_t2v_fast` | `veo_3_1_t2v` (quality) / `veo_3_1_t2v_fast_ultra` (fast) |
| 文生视频 + 竖屏 | `veo_3_1_t2v_fast_portrait` | `veo_3_1_t2v_portrait` / `veo_3_1_t2v_fast_portrait_ultra` |
| 图生视频 + 横屏 | `veo_3_1_i2v_s_fast` | `veo_3_1_i2v_s` / `veo_3_1_i2v_s_fast_ultra` |
| 首尾帧 + 横屏 | `veo_3_1_i2v_s_fast_fl` | `veo_3_1_i2v_s_fl` / `veo_3_1_i2v_s_fast_ultra_fl` |
| 视频延长 | `veo_3_1_extend_fast_landscape` | `veo_3_1_extend_landscape_ultra` |
| 超清放大 | `veo_2_1080p_upsampler_8s` | `veo_2_1080p_upsampler_8s` |
| PaygateTier | `PAYGATE_TIER_ONE` | `PAYGATE_TIER_TWO` |

---

## 八、总结

本次重构的核心目标是：

1. **分离关注点**：UI、业务、API 三层分离
2. **提高复用性**：业务逻辑可在多处复用
3. **便于测试**：每层可独立测试
4. **降低耦合**：组件间通过服务层通信
5. **⚠️ 统一套餐配置**：所有 Pro/Ultra 差异集中管理，杜绝分散的条件判断

预计总工作量：**12-17 个工作日**（增加套餐配置重构）

**建议执行顺序**：
1. **优先**：完成套餐配置适配器（阶段 0）+ 单元测试
2. 按原计划执行阶段 1-6

这样可以在早期就解决最容易出错的套餐差异问题，后续的服务层重构可以直接使用适配器。

