// 行级注释：从输入框生成图片的业务逻辑（从 AIInputPanel 中抽取）
import { useCanvasStore } from './store';
import { ImageElement } from './types';
import { generateImage, imageToImage, runImageRecipe } from './api-mock';

// 行级注释：优先使用 Flow 返回的 mediaId，若缺失则降级为 mediaGenerationId
const resolveMediaId = (mediaId?: string, fallback?: string) =>
  mediaId?.trim() || fallback?.trim() || undefined;

// 行级注释：根据比例计算尺寸
export function getSizeFromAspectRatio(ratio: '16:9' | '9:16' | '1:1') {
  switch (ratio) {
    case '9:16':
      return { width: 360, height: 640 };
    case '16:9':
      return { width: 640, height: 360 };
    case '1:1':
      return { width: 512, height: 512 };
  }
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
  addElement: (el: ImageElement) => void,
  updateElement: (id: string, updates: Partial<ImageElement>) => void,
  deleteElement: (id: string) => void,
  addPromptHistory: (history: any) => void
) {
  const size = getSizeFromAspectRatio(aspectRatio);
  const placeholderIds: string[] = [];
  const horizontalSpacing = 20;
  const totalWidth = count * size.width + (count - 1) * horizontalSpacing;
  const startX = position.x - totalWidth / 2;

  // 行级注释：创建 placeholder 节点
  for (let i = 0; i < count; i++) {
    const newImageId = `image-${Date.now()}-${i}`;
    placeholderIds.push(newImageId);

    const placeholderImage: ImageElement = {
      id: newImageId,
      type: 'image',
      src: '',
      position: {
        x: startX + i * (size.width + horizontalSpacing),
        y: position.y,
      },
      size: size,
      generatedFrom: {
        type: 'input',
        prompt: prompt,
      },
    };

    addElement(placeholderImage);
  }

  try {
    const result = await generateImage(prompt, aspectRatio, count);

    // 行级注释：更新 placeholder 节点
    if (result.images && result.images.length > 0) {
      result.images.forEach((img, index) => {
        if (index < placeholderIds.length) {
          updateElement(placeholderIds[index], {
            src: img.imageUrl,
            base64: img.base64, // 保存 base64，用于后续编辑
            promptId: result.promptId,
            mediaId: resolveMediaId(img.mediaId, img.mediaGenerationId),
            mediaGenerationId: img.mediaGenerationId,
          } as Partial<ImageElement>);
        }
      });

      if (result.images.length < placeholderIds.length) {
        for (let i = result.images.length; i < placeholderIds.length; i++) {
          deleteElement(placeholderIds[i]);
        }
      }
    } else {
      updateElement(placeholderIds[0], {
        src: result.imageUrl,
        promptId: result.promptId,
        mediaId: resolveMediaId(result.mediaId, result.mediaGenerationId),
        mediaGenerationId: result.mediaGenerationId,
      } as Partial<ImageElement>);

      for (let i = 1; i < placeholderIds.length; i++) {
        deleteElement(placeholderIds[i]);
      }
    }

    addPromptHistory({
      promptId: result.promptId,
      promptText: prompt,
      imageId: placeholderIds[0],
      mode: 'generate',
      createdAt: Date.now(),
    });
  } catch (error: any) {
    placeholderIds.forEach((id) => deleteElement(id));
    throw error;
  }
}

// 行级注释：图生图（单张图片编辑）
export async function imageToImageFromInput(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  count: number,
  selectedImage: ImageElement,
  addElement: (el: ImageElement) => void,
  updateElement: (id: string, updates: Partial<ImageElement>) => void,
  deleteElement: (id: string) => void,
  addPromptHistory: (history: any) => void,
  setEdges: any
) {
  const size = getSizeFromAspectRatio(aspectRatio);
  const placeholderIds: string[] = [];
  const edgeIds: string[] = [];
  const horizontalSpacing = 20;
  const startX = selectedImage.position.x + (selectedImage.size?.width || 400) + 50;

  // 行级注释：创建 placeholder 节点和连线
  for (let i = 0; i < count; i++) {
    const newImageId = `image-${Date.now()}-${i}`;
    placeholderIds.push(newImageId);

    const placeholderImage: ImageElement = {
      id: newImageId,
      type: 'image',
      src: '',
      position: {
        x: startX + i * (size.width + horizontalSpacing),
        y: selectedImage.position.y,
      },
      size: size,
      sourceImageIds: [selectedImage.id],
      generatedFrom: {
        type: 'image-to-image',
        sourceIds: [selectedImage.id],
        prompt: prompt,
      },
    };

    addElement(placeholderImage);

    const edgeId = `edge-${selectedImage.id}-${newImageId}`;
    edgeIds.push(edgeId);
    setEdges((eds: any) => [
      ...eds,
      {
        id: edgeId,
        source: selectedImage.id,
        target: newImageId,
        type: 'default',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 1 },
      },
    ]);
  }

  try {
    const result = await imageToImage(
      prompt,
      selectedImage.src,
      aspectRatio,
      '',
      selectedImage.mediaId || selectedImage.mediaGenerationId,
      count
    );

    // 行级注释：更新 placeholder 节点
    if (result.images && result.images.length > 0) {
      result.images.forEach((img, index) => {
        if (index < placeholderIds.length) {
          updateElement(placeholderIds[index], {
            src: img.imageUrl,
            base64: img.base64, // 保存 base64，用于后续编辑
            promptId: result.promptId,
            mediaId: resolveMediaId(img.mediaId, img.mediaGenerationId),
            mediaGenerationId: img.mediaGenerationId,
          } as Partial<ImageElement>);
        }
      });

      if (result.images.length < placeholderIds.length) {
        for (let i = result.images.length; i < placeholderIds.length; i++) {
          deleteElement(placeholderIds[i]);
          setEdges((eds: any) => eds.filter((edge: any) => edge.id !== edgeIds[i]));
        }
      }
    } else {
      updateElement(placeholderIds[0], {
        src: result.imageUrl,
        promptId: result.promptId,
        mediaId: resolveMediaId(result.mediaId, result.mediaGenerationId),
        mediaGenerationId: result.mediaGenerationId,
      } as Partial<ImageElement>);

      for (let i = 1; i < placeholderIds.length; i++) {
        deleteElement(placeholderIds[i]);
        setEdges((eds: any) => eds.filter((edge: any) => edge.id !== edgeIds[i]));
      }
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
    placeholderIds.forEach((id) => deleteElement(id));
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
  addElement: (el: ImageElement) => void,
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
  const size = getSizeFromAspectRatio(aspectRatio);
  const placeholderIds: string[] = [];
  const allEdges: any[] = [];
  const horizontalSpacing = 20;
  const startX = baseImage.position.x + (baseImage.size?.width || 400) + 50;

  // 行级注释：创建 placeholder 节点和连线
  for (let i = 0; i < count; i++) {
    const newImageId = `image-${Date.now()}-${i}`;
    placeholderIds.push(newImageId);

    const placeholderImage: ImageElement = {
      id: newImageId,
      type: 'image',
      src: '',
      position: {
        x: startX + i * (size.width + horizontalSpacing),
        y: baseImage.position.y,
      },
      size,
      sourceImageIds: selectedImages.map((img) => img.id),
      generatedFrom: {
        type: 'image-to-image',
        sourceIds: selectedImages.map((img) => img.id),
        prompt: prompt,
      },
    };

    addElement(placeholderImage);

    const edgesForThisPlaceholder = selectedImages.map((sourceImg) => ({
      id: `edge-${sourceImg.id}-${newImageId}`,
      source: sourceImg.id,
      target: newImageId,
      type: 'default',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 1 },
    }));

    allEdges.push(...edgesForThisPlaceholder);
  }

  setEdges((eds: any) => [...eds, ...allEdges]);

  try {
    const result = await runImageRecipe(
      prompt,
      references,
      aspectRatio,
      undefined,
      count
    );

    // 行级注释：更新 placeholder 节点
    if (result.images && result.images.length > 0) {
      result.images.forEach((img, index) => {
        if (index < placeholderIds.length) {
          updateElement(placeholderIds[index], {
            src: img.imageUrl,
            base64: img.base64, // 保存 base64，用于后续编辑
            promptId: result.promptId,
            mediaId: resolveMediaId(img.mediaId, img.mediaGenerationId),
            mediaGenerationId: img.mediaGenerationId,
          } as Partial<ImageElement>);
        }
      });

      if (result.images.length < placeholderIds.length) {
        for (let i = result.images.length; i < placeholderIds.length; i++) {
          deleteElement(placeholderIds[i]);
          const edgesToRemove = allEdges.filter(
            (edge) => edge.target === placeholderIds[i]
          );
          setEdges((eds: any) =>
            eds.filter((edge: any) => !edgesToRemove.some((e) => e.id === edge.id))
          );
        }
      }
    } else {
      updateElement(placeholderIds[0], {
        src: result.imageUrl,
        promptId: result.promptId,
        mediaId: resolveMediaId(result.mediaId, result.mediaGenerationId),
        mediaGenerationId: result.mediaGenerationId,
      } as Partial<ImageElement>);

      for (let i = 1; i < placeholderIds.length; i++) {
        deleteElement(placeholderIds[i]);
        const edgesToRemove = allEdges.filter(
          (edge) => edge.target === placeholderIds[i]
        );
        setEdges((eds: any) =>
          eds.filter((edge: any) => !edgesToRemove.some((e) => e.id === edge.id))
        );
      }
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
    placeholderIds.forEach((id) => deleteElement(id));
    setEdges((eds: any) =>
      eds.filter((edge: any) => !allEdges.some((e: any) => e.id === edge.id))
    );
    throw error;
  }
}

