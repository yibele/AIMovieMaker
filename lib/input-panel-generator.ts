// 行级注释：从输入框生成图片的业务逻辑（从 AIInputPanel 中抽取）
import { useCanvasStore } from './store';
import { ImageElement, ImageData } from './types';
import { generateImage, imageToImage, runImageRecipe, registerUploadedImage } from './api-mock';
import {
  createImagePlaceholders,
  updateImagePlaceholders,
  deletePlaceholders,
  getRightSidePosition,
} from './services/node-management.service';
import { getImageNodeSize } from './constants/node-sizes';
import {
  buildGridPrompt,
  sliceImageGrid,
  extractBase64FromDataUrl,
  GridConfig,
  GRID_PRESETS,
  GridPresetKey,
} from './smart-storyboard';
import { upscaleImage, isUpscaleEnabled } from './services/fal-upscale';
import { STORYBOARD_UPSCALE_RESOLUTION, DEBUG_MODE } from './config/features';

// 行级注释：优先使用 Flow 返回的 mediaId，若缺失则降级为 mediaGenerationId
const resolveMediaId = (mediaId?: string, fallback?: string) =>
  mediaId?.trim() || fallback?.trim() || undefined;

// 行级注释：根据比例计算尺寸（保留向后兼容，但推荐使用 getImageNodeSize）
export function getSizeFromAspectRatio(ratio: '16:9' | '9:16' | '1:1') {
  return getImageNodeSize(ratio);
}

// 行级注释：计算输入框上方的生成位置
export function getPositionAboveInput(
  panelRef: HTMLDivElement | null,
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number }
) {
  if (!panelRef) {
    return { x: 300, y: 200 };
  }

  const rect = panelRef.getBoundingClientRect();
  const screenX = rect.left + rect.width / 2;
  const screenY = rect.top - 450;

  return screenToFlowPosition({ x: screenX, y: screenY });
}

// 行级注释：从输入框生成图片（文生图）
export async function generateFromInput(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  count: number,
  position: { x: number; y: number },
  addElement: (el: ImageElement) => void,  // 保留参数签名，但内部使用节点管理服务
  updateElement: (id: string, updates: Partial<ImageElement>) => void,
  deleteElement: (id: string) => void,
  addPromptHistory: (history: any) => void
) {
  // 行级注释：使用节点管理服务创建 placeholder 节点
  const placeholderIds = createImagePlaceholders(count, position, aspectRatio, {
    prompt,
    generatedFromType: 'input',
  });

  try {
    const result = await generateImage(prompt, aspectRatio, count);

    // 行级注释：使用节点管理服务更新 placeholder 节点
    if (result.images && result.images.length > 0) {
      updateImagePlaceholders(
        placeholderIds.slice(0, result.images.length),
        result.images.map(img => ({
          imageUrl: img.imageUrl,
          base64: img.base64,
          mediaId: resolveMediaId(img.mediaId, img.mediaGenerationId),
          mediaGenerationId: img.mediaGenerationId,
        }))
      );

      // 行级注释：删除多余的 placeholder
      if (result.images.length < placeholderIds.length) {
        deletePlaceholders(placeholderIds.slice(result.images.length));
      }

      // 行级注释：更新 promptId（节点管理服务不处理这个字段）
      result.images.forEach((img, index) => {
        if (index < placeholderIds.length) {
          updateElement(placeholderIds[index], {
            promptId: result.promptId,
          } as Partial<ImageElement>);
        }
      });
    } else {
      // 行级注释：兼容单图返回格式
      updateImagePlaceholders([placeholderIds[0]], [{
        imageUrl: result.imageUrl,
        mediaId: resolveMediaId(result.mediaId, result.mediaGenerationId),
        mediaGenerationId: result.mediaGenerationId,
      }]);
      updateElement(placeholderIds[0], {
        promptId: result.promptId,
      } as Partial<ImageElement>);

      deletePlaceholders(placeholderIds.slice(1));
    }

    addPromptHistory({
      promptId: result.promptId,
      promptText: prompt,
      imageId: placeholderIds[0],
      mode: 'generate',
      createdAt: Date.now(),
    });
  } catch (error: any) {
    // 行级注释：使用节点管理服务删除 placeholder
    deletePlaceholders(placeholderIds);
    throw error;
  }
}

// 行级注释：图生图（单张图片编辑）
export async function imageToImageFromInput(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  count: number,
  selectedImage: ImageElement,
  addElement: (el: ImageElement) => void,  // 保留参数签名
  updateElement: (id: string, updates: Partial<ImageElement>) => void,
  deleteElement: (id: string) => void,
  addPromptHistory: (history: any) => void,
  setEdges: any
) {
  // 行级注释：使用节点管理服务计算位置（源图片右侧）
  const position = getRightSidePosition(
    selectedImage.position,
    selectedImage.size || { width: 400, height: 225 }
  );

  // 行级注释：使用节点管理服务创建 placeholder 节点
  const placeholderIds = createImagePlaceholders(count, position, aspectRatio, {
    prompt,
    generatedFromType: 'image-to-image',
    sourceIds: [selectedImage.id],
  });

  // 行级注释：创建连线（连线逻辑保留在此处，因为涉及 React Flow）
  const edgeIds: string[] = [];
  placeholderIds.forEach(nodeId => {
    const edgeId = `edge-${selectedImage.id}-${nodeId}`;
    edgeIds.push(edgeId);
    setEdges((eds: any) => [
      ...eds,
      {
        id: edgeId,
        source: selectedImage.id,
        target: nodeId,
        type: 'default',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 1 },
      },
    ]);
  });

  try {
    // 如果图片没有 mediaId，需要先上传（比如本地上传的图片）
    let effectiveMediaId = selectedImage.mediaId || selectedImage.mediaGenerationId;
    
    if (!effectiveMediaId) {
      
      let imageDataToUpload = selectedImage.base64 || selectedImage.src;
      if (imageDataToUpload.startsWith('data:')) {
        imageDataToUpload = imageDataToUpload.split(',')[1];
      }
      
      const { registerUploadedImage } = await import('./api-mock');
      const uploadResult = await registerUploadedImage(imageDataToUpload);
      
      if (!uploadResult.mediaGenerationId) {
        throw new Error('上传图片失败：未获取到 mediaGenerationId');
      }
      
      effectiveMediaId = uploadResult.mediaGenerationId;
    }
    
    const result = await imageToImage(
      prompt,
      selectedImage.src,
      aspectRatio,
      '',
      effectiveMediaId,
      count
    );

    // 行级注释：使用节点管理服务更新 placeholder 节点
    if (result.images && result.images.length > 0) {
      updateImagePlaceholders(
        placeholderIds.slice(0, result.images.length),
        result.images.map(img => ({
          imageUrl: img.imageUrl,
          base64: img.base64,
          mediaId: resolveMediaId(img.mediaId, img.mediaGenerationId),
          mediaGenerationId: img.mediaGenerationId,
        }))
      );

      // 行级注释：更新 promptId
      result.images.forEach((img, index) => {
        if (index < placeholderIds.length) {
          updateElement(placeholderIds[index], {
            promptId: result.promptId,
          } as Partial<ImageElement>);
        }
      });

      // 行级注释：删除多余的 placeholder 和连线
      const imageCount = result.images?.length || 0;
      if (imageCount < placeholderIds.length) {
        const extraIds = placeholderIds.slice(imageCount);
        deletePlaceholders(extraIds);
        setEdges((eds: any) => eds.filter((edge: any) => 
          !edgeIds.slice(imageCount).includes(edge.id)
        ));
      }
    } else {
      // 行级注释：兼容单图返回格式
      updateImagePlaceholders([placeholderIds[0]], [{
        imageUrl: result.imageUrl,
        mediaId: resolveMediaId(result.mediaId, result.mediaGenerationId),
        mediaGenerationId: result.mediaGenerationId,
      }]);
      updateElement(placeholderIds[0], {
        promptId: result.promptId,
      } as Partial<ImageElement>);

      deletePlaceholders(placeholderIds.slice(1));
      setEdges((eds: any) => eds.filter((edge: any) => 
        !edgeIds.slice(1).includes(edge.id)
      ));
    }

    // 行级注释：停止连线动画
    setEdges((eds: any) =>
      eds.map((edge: any) =>
        edgeIds.includes(edge.id) ? { ...edge, animated: false } : edge
      )
    );

    addPromptHistory({
      promptId: result.promptId,
      promptText: prompt,
      imageId: placeholderIds[0],
      mode: 'similar',
      createdAt: Date.now(),
    });
  } catch (error: any) {
    deletePlaceholders(placeholderIds);
    setEdges((eds: any) => eds.filter((edge: any) => !edgeIds.includes(edge.id)));
    throw error;
  }
}

// 行级注释：多图融合编辑
export async function multiImageRecipeFromInput(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  count: number,
  selectedImages: ImageElement[],
  addElement: (el: ImageElement) => void,  // 保留参数签名
  updateElement: (id: string, updates: Partial<ImageElement>) => void,
  deleteElement: (id: string) => void,
  addPromptHistory: (history: any) => void,
  setEdges: any
) {
  // 行级注释：检查所有图片是否有 mediaGenerationId
  const missingIds = selectedImages.filter(
    (img) => !img.mediaGenerationId || !img.mediaGenerationId.trim()
  );
  if (missingIds.length > 0) {
    throw new Error(
      '存在未同步到 Flow 的图片，无法进行多图编辑，请先为这些图片获取 mediaGenerationId'
    );
  }

  const references = selectedImages.map((img) => ({
    mediaGenerationId: img.mediaGenerationId as string,
    caption:
      img.caption ||
      img.generatedFrom?.prompt ||
      img.alt ||
      `Reference image ${img.id}`,
    mediaCategory: 'MEDIA_CATEGORY_SUBJECT',
  }));

  const baseImage = selectedImages[0];

  // 行级注释：使用节点管理服务计算位置
  const position = getRightSidePosition(
    baseImage.position,
    baseImage.size || { width: 400, height: 225 }
  );

  // 行级注释：使用节点管理服务创建 placeholder 节点
  const placeholderIds = createImagePlaceholders(count, position, aspectRatio, {
    prompt,
    generatedFromType: 'image-to-image',
    sourceIds: selectedImages.map(img => img.id),
  });

  // 行级注释：创建连线（多图到多个 placeholder）
  const allEdges: any[] = [];
  placeholderIds.forEach(nodeId => {
    selectedImages.forEach(sourceImg => {
      allEdges.push({
        id: `edge-${sourceImg.id}-${nodeId}`,
        source: sourceImg.id,
        target: nodeId,
        type: 'default',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 1 },
      });
    });
  });
  setEdges((eds: any) => [...eds, ...allEdges]);

  try {
    const result = await runImageRecipe(
      prompt,
      references,
      aspectRatio,
      undefined,
      count
    );

    // 行级注释：使用节点管理服务更新 placeholder 节点
    if (result.images && result.images.length > 0) {
      updateImagePlaceholders(
        placeholderIds.slice(0, result.images.length),
        result.images.map(img => ({
          imageUrl: img.imageUrl,
          base64: img.base64,
          mediaId: resolveMediaId(img.mediaId, img.mediaGenerationId),
          mediaGenerationId: img.mediaGenerationId,
        }))
      );

      // 行级注释：更新 promptId
      result.images.forEach((img, index) => {
        if (index < placeholderIds.length) {
          updateElement(placeholderIds[index], {
            promptId: result.promptId,
          } as Partial<ImageElement>);
        }
      });

      // 行级注释：删除多余的 placeholder 和连线
      if (result.images.length < placeholderIds.length) {
        const extraIds = placeholderIds.slice(result.images.length);
        deletePlaceholders(extraIds);
        const edgesToRemove = allEdges.filter(edge => 
          extraIds.includes(edge.target)
        );
        setEdges((eds: any) =>
          eds.filter((edge: any) => !edgesToRemove.some((e: any) => e.id === edge.id))
        );
      }
    } else {
      // 行级注释：兼容单图返回格式
      updateImagePlaceholders([placeholderIds[0]], [{
        imageUrl: result.imageUrl,
        mediaId: resolveMediaId(result.mediaId, result.mediaGenerationId),
        mediaGenerationId: result.mediaGenerationId,
      }]);
      updateElement(placeholderIds[0], {
        promptId: result.promptId,
      } as Partial<ImageElement>);

      const extraIds = placeholderIds.slice(1);
      deletePlaceholders(extraIds);
      const edgesToRemove = allEdges.filter(edge => 
        extraIds.includes(edge.target)
      );
      setEdges((eds: any) =>
        eds.filter((edge: any) => !edgesToRemove.some((e: any) => e.id === edge.id))
      );
    }

    // 行级注释：停止连线动画
    setEdges((eds: any) =>
      eds.map((edge: any) =>
        allEdges.some((e: any) => e.id === edge.id)
          ? { ...edge, animated: false }
          : edge
      )
    );

    addPromptHistory({
      promptId: result.promptId,
      promptText: prompt,
      imageId: placeholderIds[0],
      mode: 'batch',
      createdAt: Date.now(),
    });
  } catch (error) {
    deletePlaceholders(placeholderIds);
    setEdges((eds: any) =>
      eds.filter((edge: any) => !allEdges.some((e: any) => e.id === edge.id))
    );
    throw error;
  }
}

// ============================================================================
// 智能分镜生成
// ============================================================================

/**
 * 智能分镜生成（增强版）
 * 
 * 流程：
 * 1. 构造网格 Prompt
 * 2. 生成 count 张网格图（每张 2×2）
 * 3. 每张网格图切割成 4 张 = count × 4 张分镜
 * 4. 并行上传（每次 2 张）
 * 5. 更新 placeholder 显示
 * 
 * @param prompt 用户输入的提示词
 * @param aspectRatio 宽高比
 * @param gridPreset 网格预设（默认 2x2）
 * @param count 生成多少张网格图（1-4），总分镜数 = count × 4
 * @param position 生成位置
 * @param selectedImages 选中的参考图（可选）
 * @param addElement 添加元素回调
 * @param updateElement 更新元素回调
 * @param deleteElement 删除元素回调
 * @param addPromptHistory 添加历史回调
 * @param setEdges 设置连线回调
 */
export async function generateSmartStoryboard(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  gridPreset: GridPresetKey,
  count: number, // 行级注释：生成多少张网格图
  position: { x: number; y: number },
  selectedImages: ImageElement[],
  addElement: (el: ImageElement) => void,
  updateElement: (id: string, updates: Partial<ImageElement>) => void,
  deleteElement: (id: string) => void,
  addPromptHistory: (history: any) => void,
  setEdges: any
) {
  // 行级注释：并发限制检查（devMode 下跳过）
  const { isGeneratingStoryboard, setIsGeneratingStoryboard, apiConfig: storeConfig } = useCanvasStore.getState();
  if (isGeneratingStoryboard && !storeConfig.devMode) {
    throw new Error('已有分镜生成任务进行中，请等待完成后再试');
  }
  setIsGeneratingStoryboard(true);

  // 行级注释：获取网格配置
  const gridConfig = GRID_PRESETS[gridPreset];
  const { rows, cols } = gridConfig;
  const slicesPerGrid = rows * cols; // 每张网格图切割出的小图数量

  // 行级注释：构造网格 Prompt
  const gridPrompt = buildGridPrompt(prompt, { rows, cols });

  // 行级注释：使用标准图片节点尺寸（Stack 模式）
  const nodeSize = getImageNodeSize(aspectRatio);
  const nodeGap = 30; // Stack 节点间距

  // 行级注释：创建 Stack 节点（每组网格图一个 Stack）
  const placeholderIds: string[] = [];

  for (let g = 0; g < count; g++) {
    const nodeId = `image-${Date.now()}-storyboard-${g}`;
        const nodePosition = {
      x: position.x + g * (nodeSize.width + nodeGap),
      y: position.y,
    };

    // 行级注释：创建空的 images 数组（Stack 模式）
    const emptyImages: ImageData[] = Array.from({ length: slicesPerGrid }, () => ({
      src: '',
      uploadState: 'syncing' as const,
    }));

        const placeholder: ImageElement = {
          id: nodeId,
          type: 'image',
          position: nodePosition,
      size: nodeSize,
          src: '',
          uploadState: 'syncing',
          uploadMessage: `正在生成分镜...`,
          generatedFrom: {
            type: selectedImages.length > 0 ? 'image-to-image' : 'input',
            prompt: prompt,
            sourceIds: selectedImages.map(img => img.id),
          },
      // 行级注释：Stack 模式字段
      images: emptyImages,
      mainIndex: 0,
      expanded: false,
        };

        addElement(placeholder);
        placeholderIds.push(nodeId);
  }

  // 行级注释：如果有参考图，创建连线
  const allEdges: any[] = [];
  if (selectedImages.length > 0) {
    placeholderIds.forEach(nodeId => {
      selectedImages.forEach(sourceImg => {
        allEdges.push({
          id: `edge-${sourceImg.id}-${nodeId}`,
          source: sourceImg.id,
          target: nodeId,
          type: 'default',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 1 },
        });
      });
    });
    setEdges((eds: any) => [...eds, ...allEdges]);
  }

  try {
    // 行级注释：生成 count 张网格图
    // 行级注释：fifeUrl 是 Google 返回的 HTTP URL，用于 fal.ai 放大
    let gridImages: Array<{ url: string; fifeUrl?: string; base64?: string }> = [];

    if (selectedImages.length > 0) {
      // 行级注释：有参考图 - 收集所有参考图的 mediaId 用于多图融合
      const references: Array<{ mediaId?: string; mediaGenerationId?: string }> = [];
      
      for (const sourceImage of selectedImages) {
        let effectiveMediaId = sourceImage.mediaId || sourceImage.mediaGenerationId;

        if (!effectiveMediaId) {
          let imageDataToUpload = sourceImage.base64 || sourceImage.src;
          if (imageDataToUpload.startsWith('data:')) {
            imageDataToUpload = imageDataToUpload.split(',')[1];
          }
          const uploadResult = await registerUploadedImage(imageDataToUpload);
          if (!uploadResult.mediaGenerationId) {
            console.error(`上传参考图失败，跳过该图片`);
            continue;
          }
          effectiveMediaId = uploadResult.mediaGenerationId;
        }
        
        references.push({ mediaId: effectiveMediaId });
      }

      if (references.length === 0) {
        throw new Error('没有有效的参考图');
      }

      // 行级注释：根据参考图数量选择 API
      let result;
      if (references.length === 1) {
        // 行级注释：单张参考图使用 imageToImage
        result = await imageToImage(
          gridPrompt,
          selectedImages[0].src,
          aspectRatio,
          '',
          references[0].mediaId,
          count
        );
      } else {
        // 行级注释：多张参考图使用 runImageRecipe 进行融合
        result = await runImageRecipe(
          gridPrompt,
          references,
          aspectRatio,
          undefined,
          count
        );
      }

      // 行级注释：收集所有生成的网格图
      if (result.images && result.images.length > 0) {
        gridImages = result.images.map(img => ({
          url: img.imageUrl,
          fifeUrl: img.fifeUrl,
          base64: img.base64,
        }));
      } else {
        gridImages = [{ url: result.imageUrl, fifeUrl: (result as any).fifeUrl, base64: (result as any).base64 }];
      }
    } else {
      // 行级注释：无参考图 - 使用文生图
      const result = await generateImage(gridPrompt, aspectRatio, count);

      if (result.images && result.images.length > 0) {
        gridImages = result.images.map(img => ({
          url: img.imageUrl,
          fifeUrl: img.fifeUrl,  // 行级注释：单独保存 fifeUrl，用于高清放大
          base64: img.base64,
        }));
      } else {
        gridImages = [{ url: result.imageUrl, fifeUrl: (result as any).fifeUrl }];
      }
    }

    // 行级注释：对每张网格图进行高清放大（如果启用）和切割
    const allSlicedImages: string[] = [];

    // 行级注释：检查是否启用高清放大
    const upscaleEnabled = isUpscaleEnabled();
    if (upscaleEnabled && DEBUG_MODE) {
      console.log(`🔍 高清放大已启用，将放大到 ${STORYBOARD_UPSCALE_RESOLUTION}`);
    }

    for (let g = 0; g < gridImages.length; g++) {
      const gridImage = gridImages[g];
      
      // 行级注释：切割必须用 base64（fifeUrl 有 CORS 限制，canvas 无法加载）
      let imageSourceForSlicing = gridImage.url;
      if (gridImage.base64) {
        imageSourceForSlicing = gridImage.base64.startsWith('data:')
          ? gridImage.base64
          : `data:image/png;base64,${gridImage.base64}`;
      }

      // 行级注释：如果启用高清放大，用 fifeUrl 放大后再切割
      if (upscaleEnabled) {
        const imageUrlForUpscale = gridImage.fifeUrl || gridImage.url;
        
        if (imageUrlForUpscale && imageUrlForUpscale.startsWith('http')) {
          // 行级注释：更新对应 Stack 节点的消息
          updateElement(placeholderIds[g], {
              uploadMessage: `正在高清放大 (${g + 1}/${gridImages.length})...`,
            } as Partial<ImageElement>);

          console.log(`📸 正在放大网格图 ${g + 1}/${gridImages.length}, URL: ${imageUrlForUpscale}`);

          const upscaleResult = await upscaleImage(imageUrlForUpscale, STORYBOARD_UPSCALE_RESOLUTION);
          console.log(`📦 放大结果:`, upscaleResult);
          
          if (upscaleResult.success && upscaleResult.imageUrl) {
            // 行级注释：fal.ai 返回的 URL 可以跨域访问
            imageSourceForSlicing = upscaleResult.imageUrl;
            console.log(`✅ 网格图 ${g + 1} 放大完成, 使用放大后的 URL: ${imageSourceForSlicing}`);
          } else {
            console.error(`❌ 网格图 ${g + 1} 放大失败: ${upscaleResult.error}，使用原图`);
            console.log(`⚠️ 使用原图进行切割: ${imageSourceForSlicing.substring(0, 100)}...`);
          }
        }
      }

      // 行级注释：切割网格图
      const slicedImages = await sliceImageGrid(imageSourceForSlicing, rows, cols);
      allSlicedImages.push(...slicedImages);
    }

    // 行级注释：根据宽高比转换为 Flow API 需要的格式
    const flowAspectRatioMap: Record<'16:9' | '9:16' | '1:1', 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_PORTRAIT' | 'IMAGE_ASPECT_RATIO_SQUARE'> = {
      '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
      '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
    };
    const flowAspectRatio = flowAspectRatioMap[aspectRatio];

    // 行级注释：按 Stack 节点分组上传切片
    for (let g = 0; g < count; g++) {
      const stackNodeId = placeholderIds[g];
      const stackSlices = allSlicedImages.slice(g * slicesPerGrid, (g + 1) * slicesPerGrid);
      
      // 行级注释：并行上传当前 Stack 的所有切片
      const uploadedImages: ImageData[] = await Promise.all(
        stackSlices.map(async (slicedBase64, index) => {
        try {
          const pureBase64 = extractBase64FromDataUrl(slicedBase64);
          const uploadResult = await registerUploadedImage(pureBase64, flowAspectRatio);

            return {
            src: slicedBase64,
            base64: pureBase64,
            mediaId: uploadResult.mediaId || uploadResult.mediaGenerationId || undefined,
            mediaGenerationId: uploadResult.mediaGenerationId || undefined,
            caption: uploadResult.caption,
              uploadState: 'synced' as const,
            };
          } catch (uploadError) {
            console.error(`上传分镜 ${g * slicesPerGrid + index + 1} 失败:`, uploadError);
            return {
              src: slicedBase64,
              uploadState: 'error' as const,
              uploadMessage: '上传失败',
            };
          }
        })
      );

      // 行级注释：更新 Stack 节点，设置 images 数组和主图属性
      const mainImage = uploadedImages[0];
      updateElement(stackNodeId, {
        src: mainImage.src,
        base64: mainImage.base64,
        mediaId: mainImage.mediaId,
        mediaGenerationId: mainImage.mediaGenerationId,
        caption: mainImage.caption,
            uploadState: 'synced',
            uploadMessage: undefined,
        images: uploadedImages,
        mainIndex: 0,
          } as Partial<ImageElement>);
    }

    // 行级注释：停止连线动画
    if (allEdges.length > 0) {
      setEdges((eds: any) =>
        eds.map((edge: any) =>
          allEdges.some((e: any) => e.id === edge.id)
            ? { ...edge, animated: false }
            : edge
        )
      );
    }

    // 行级注释：记录历史
    addPromptHistory({
      promptId: `storyboard-${Date.now()}`,
      promptText: prompt,
      imageId: placeholderIds[0],
      mode: 'storyboard',
      createdAt: Date.now(),
    });

  } catch (error) {
    deletePlaceholders(placeholderIds);
    if (allEdges.length > 0) {
      setEdges((eds: any) =>
        eds.filter((edge: any) => !allEdges.some((e: any) => e.id === edge.id))
      );
    }
    throw error;
  } finally {
    // 行级注释：无论成功或失败都重置分镜生成状态
    useCanvasStore.getState().setIsGeneratingStoryboard(false);
  }
}

