// 行级注释：从输入框生成图片的业务逻辑（从 AIInputPanel 中抽取）
import { useCanvasStore } from './store';
import { ImageElement } from './types';
import { generateImage, imageToImage, runImageRecipe } from './api-mock';
import {
  createImagePlaceholders,
  updateImagePlaceholders,
  deletePlaceholders,
  getRightSidePosition,
} from './services/node-management.service';
import { getImageNodeSize } from './constants/node-sizes';

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

