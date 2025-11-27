'use client';

import { useCallback } from 'react';
import { useCanvasStore } from '@/lib/store';
import { ImageElement } from '@/lib/types';
import { IMAGE_NODE_DEFAULT_SIZE, getImageNodeSize, detectAspectRatio } from '@/lib/constants/node-sizes';
import { generateNodeId } from '@/lib/services/node-management.service';
import { toast } from 'sonner';

// 行级注释：Next Shot 边缘样式
const EDGE_NEXT_SHOT_STYLE = { stroke: '#f59e0b', strokeWidth: 2 };
const EDGE_SUCCESS_STYLE = { stroke: '#10b981', strokeWidth: 1 };
const EDGE_ERROR_STYLE = { stroke: '#ef4444', strokeWidth: 1 };

/**
 * Next Shot 生成 Hook
 * 
 * 职责：处理分镜续写相关逻辑
 * - 自动分镜（VL 分析生成）
 * - 自定义分镜指令
 * - 衔接镜头生成
 */
export interface UseNextShotOptions {
  setEdges: (updater: (edges: any[]) => any[]) => void;
  resetConnectionMenu: () => void;
}

export interface UseNextShotReturn {
  handleNextShotGeneration: (sourceNodeId: string, userInstruction?: string, count?: number) => Promise<void>;
  handleTransitionShotsGeneration: (startImage: ImageElement, endImage: ImageElement) => Promise<void>;
}

export function useNextShot(options: UseNextShotOptions): UseNextShotReturn {
  const { setEdges, resetConnectionMenu } = options;

  const addElement = useCanvasStore(state => state.addElement);
  const updateElement = useCanvasStore(state => state.updateElement);
  const deleteElement = useCanvasStore(state => state.deleteElement);

  /**
   * Next Shot 生成
   * 分析当前图片，生成下一分镜
   */
  const handleNextShotGeneration = useCallback(async (
    sourceNodeId: string,
    userInstruction?: string,
    count: number = 1
  ) => {
    const { elements: storeElements, apiConfig } = useCanvasStore.getState();
    const sourceNode = storeElements.find(el => el.id === sourceNodeId) as ImageElement | undefined;

    if (!sourceNode || !sourceNode.src) {
      toast.error('找不到源图片');
      return;
    }

    if (!apiConfig.dashScopeApiKey) {
      toast.error('请先在设置中配置 DashScope API Key (用于 Qwen VL)');
      return;
    }

    // 1. 创建占位节点
    const newImageIds: string[] = [];
    const offset = { x: 450, y: 0 };
    const size = sourceNode.size || IMAGE_NODE_DEFAULT_SIZE;

    for (let i = 0; i < count; i++) {
      const newImageId = generateNodeId('image');
      newImageIds.push(newImageId);

      const position = {
        x: sourceNode.position.x + offset.x + (i * (size.width + 50)),
        y: sourceNode.position.y,
      };

      const placeholderImage: ImageElement = {
        id: newImageId,
        type: 'image',
        position,
        size,
        src: '',
        uploadState: 'syncing',
        uploadMessage: count > 1 ? `正在构思分镜 ${i + 1}/${count}...` : '正在构思下一分镜...',
        generatedFrom: {
          type: 'image-to-image',
          sourceIds: [sourceNode.id],
          prompt: userInstruction || 'Next Shot',
        },
      };

      addElement(placeholderImage);

      // 创建连线
      const edgeId = `edge-${sourceNode.id}-${newImageId}`;
      setEdges((eds) => [
        ...eds,
        {
          id: edgeId,
          source: sourceNode.id,
          target: newImageId,
          animated: true,
          style: EDGE_NEXT_SHOT_STYLE,
        },
      ]);
    }

    resetConnectionMenu();

    // 2. 后台处理
    (async () => {
      try {
        // A. Qwen VL 分析
        let imageUrlForApi = sourceNode.src;
        if (sourceNode.base64) {
          imageUrlForApi = sourceNode.base64.startsWith('data:') 
            ? sourceNode.base64 
            : `data:image/png;base64,${sourceNode.base64}`;
        }

        const systemPrompt = `You are a professional storyboard artist. Analyze this image as "Frame 0" (the starting point).

TASK: Generate ${count} NEW sequential shots that happen AFTER this image. Each prompt describes what happens NEXT, not what's currently shown.

CRITICAL RULES:
1. Frame 1 must show ACTION or CHANGE from Frame 0 - different angle, character movement, time progression, or new element
2. Never describe the current image - only what comes AFTER it
3. Maintain visual consistency: same characters, style, lighting mood, color palette
4. Each shot should advance the narrative or camera position

PROMPT FORMAT: Focus on action + camera + mood. Be concise (under 60 words each).

OUTPUT: Return ONLY a JSON array of ${count} strings. No markdown, no explanation.
Example: ["Medium shot, character turns head toward the door, tension building, same warm lighting", "Close-up of door handle slowly turning, shallow depth of field, suspenseful"]`;
        
        const userPrompt = userInstruction
          ? `Based on this image (Frame 0), generate ${count} prompts for what happens NEXT following this direction: "${userInstruction}". 
Each prompt must describe a NEW shot (not the current image). Maintain visual style consistency.
Return ONLY a JSON array of ${count} strings.`
          : systemPrompt;

        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.dashScopeApiKey}`
          },
          body: JSON.stringify({
            model: 'qwen3-vl-flash',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrlForApi } },
                { type: 'text', text: userPrompt }
              ]
            }]
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || 'Qwen VL API request failed');
        }

        const data = await response.json();
        let content = data.choices[0]?.message?.content || '';

        // 清理 markdown 代码块
        content = content.replace(/```json\n?|\n?```/g, '').trim();

        let nextShotPrompts: string[] = [];
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            nextShotPrompts = parsed.map(p => String(p));
          } else if (typeof parsed === 'string') {
            nextShotPrompts = [parsed];
          }
        } catch (e) {
          console.warn('Failed to parse VL response as JSON, using raw text', e);
          nextShotPrompts = [content];
        }

        // B. 图片生成
        let effectiveMediaId = sourceNode.mediaId || sourceNode.mediaGenerationId;

        if (!effectiveMediaId) {
          if (!sourceNode.base64 && !sourceNode.src.startsWith('data:')) {
            throw new Error('Source image not ready for generation (missing mediaId)');
          }

          const { registerUploadedImage } = await import('@/lib/api-mock');
          let base64Data = sourceNode.base64;
          if (!base64Data) {
            const resp = await fetch(sourceNode.src);
            const blob = await resp.blob();
            const reader = new FileReader();
            base64Data = await new Promise<string>((resolve) => {
              reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            });
          } else if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }

          const uploadResult = await registerUploadedImage(base64Data);
          if (!uploadResult.mediaGenerationId) {
            throw new Error('Failed to get mediaId for source image');
          }
          effectiveMediaId = uploadResult.mediaGenerationId;

          useCanvasStore.getState().updateElement(sourceNode.id, {
            mediaGenerationId: effectiveMediaId
          } as Partial<ImageElement>);
        }

        // C. 为每个提示词生成图片
        const { imageToImage } = await import('@/lib/api-mock');
        const aspectRatio = detectAspectRatio(
          sourceNode.size?.width || 640,
          sourceNode.size?.height || 360
        );

        let successCount = 0;

        for (let i = 0; i < newImageIds.length; i++) {
          const imageId = newImageIds[i];
          const promptForThisShot = nextShotPrompts[i] || nextShotPrompts[nextShotPrompts.length - 1] || 'Next shot';

          updateElement(imageId, {
            uploadMessage: `正在生成分镜 ${i + 1}/${count}...`,
          } as Partial<ImageElement>);

          try {
            const result = await imageToImage(
              promptForThisShot,
              sourceNode.src,
              aspectRatio,
              '',
              effectiveMediaId!,
              1
            );

            if (result.imageUrl) {
              updateElement(imageId, {
                src: result.imageUrl,
                base64: result.images?.[0]?.base64,
                promptId: result.promptId,
                mediaId: result.mediaId,
                mediaGenerationId: result.mediaGenerationId,
                uploadState: 'synced',
                uploadMessage: undefined,
                generatedFrom: {
                  type: 'image-to-image',
                  sourceIds: [sourceNode.id],
                  prompt: promptForThisShot,
                },
              } as Partial<ImageElement>);

              const edgeId = `edge-${sourceNode.id}-${imageId}`;
              setEdges((eds) =>
                eds.map((edge) =>
                  edge.id === edgeId
                    ? { ...edge, animated: false, style: EDGE_SUCCESS_STYLE }
                    : edge
                )
              );

              successCount++;
            } else {
              throw new Error('No image returned');
            }
          } catch (imgError) {
            console.error(`Error generating image ${i + 1}:`, imgError);
            updateElement(imageId, {
              uploadState: 'error',
              uploadMessage: `生成失败: ${imgError instanceof Error ? imgError.message : '未知错误'}`,
            } as Partial<ImageElement>);

            const edgeId = `edge-${sourceNode.id}-${imageId}`;
            setEdges((eds) =>
              eds.map((edge) =>
                edge.id === edgeId
                  ? { ...edge, animated: false, style: EDGE_ERROR_STYLE }
                  : edge
              )
            );
          }
        }

        if (successCount > 0) {
          toast.success(`成功生成 ${successCount}/${count} 个分镜`);
        } else {
          throw new Error('No images generated');
        }

      } catch (error) {
        console.error('Next shot generation failed:', error);
        toast.error(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        newImageIds.forEach(id => deleteElement(id));
      }
    })();

  }, [addElement, updateElement, deleteElement, setEdges, resetConnectionMenu]);

  /**
   * 衔接镜头生成
   * 分析两张图片，生成中间过渡的分镜
   */
  const handleTransitionShotsGeneration = useCallback(async (
    startImage: ImageElement,
    endImage: ImageElement
  ) => {
    const { apiConfig } = useCanvasStore.getState();

    if (!apiConfig.dashScopeApiKey) {
      toast.error('请先在设置中配置 DashScope API Key (用于 Qwen VL)');
      return;
    }

    if (!startImage.src || !endImage.src) {
      toast.error('图片内容无效');
      return;
    }

    toast.info('正在分析两张图片，生成衔接分镜...');

    // 1. 计算占位节点位置
    const midX = (startImage.position.x + endImage.position.x) / 2;
    const midY = (startImage.position.y + endImage.position.y) / 2;
    const size = startImage.size || IMAGE_NODE_DEFAULT_SIZE;

    // 2. 创建占位节点
    const placeholderId = generateNodeId('image');

    const placeholderImage: ImageElement = {
      id: placeholderId,
      type: 'image',
      position: { x: midX, y: midY },
      size,
      src: '',
      uploadState: 'syncing',
      uploadMessage: '正在分析衔接镜头...',
      generatedFrom: {
        type: 'image-to-image',
        sourceIds: [startImage.id, endImage.id],
        prompt: '衔接镜头',
      },
    };

    addElement(placeholderImage);

    // 创建连线
    setEdges((eds) => [
      ...eds,
      {
        id: `edge-${startImage.id}-${placeholderId}`,
        source: startImage.id,
        target: placeholderId,
        animated: true,
        style: EDGE_NEXT_SHOT_STYLE,
      },
      {
        id: `edge-${placeholderId}-${endImage.id}`,
        source: placeholderId,
        target: endImage.id,
        animated: true,
        style: EDGE_NEXT_SHOT_STYLE,
      },
    ]);

    // 3. 后台处理
    (async () => {
      try {
        // 准备图片数据
        let startImageData = startImage.src;
        if (startImage.base64) {
          startImageData = startImage.base64.startsWith('data:')
            ? startImage.base64
            : `data:image/png;base64,${startImage.base64}`;
        }

        let endImageData = endImage.src;
        if (endImage.base64) {
          endImageData = endImage.base64.startsWith('data:')
            ? endImage.base64
            : `data:image/png;base64,${endImage.base64}`;
        }

        // VL 分析
        const systemPrompt = `Analyze these two images:
- Image 1 (Frame A): The STARTING frame
- Image 2 (Frame B): The ENDING frame

Generate ONE transition shot prompt that bridges Frame A to Frame B. This shot should:
1. Show the midpoint of action/movement between A and B
2. Maintain visual consistency (same style, lighting, characters)
3. Create natural narrative flow

OUTPUT: Return ONLY the prompt text (under 60 words), no JSON, no explanation.`;

        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.dashScopeApiKey}`
          },
          body: JSON.stringify({
            model: 'qwen-vl-max',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: startImageData } },
                { type: 'image_url', image_url: { url: endImageData } },
                { type: 'text', text: systemPrompt }
              ]
            }]
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || 'Qwen VL API request failed');
        }

        const data = await response.json();
        const transitionPrompt = (data.choices[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');

        updateElement(placeholderId, {
          uploadMessage: '正在生成衔接镜头...',
        } as Partial<ImageElement>);

        // 准备 mediaId
        let effectiveMediaId = startImage.mediaId || startImage.mediaGenerationId;

        if (!effectiveMediaId) {
          const { registerUploadedImage } = await import('@/lib/api-mock');
          let base64Data = startImage.base64;
          if (!base64Data) {
            const resp = await fetch(startImage.src);
            const blob = await resp.blob();
            const reader = new FileReader();
            base64Data = await new Promise<string>((resolve) => {
              reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
              };
              reader.readAsDataURL(blob);
            });
          } else if (base64Data.startsWith('data:')) {
            base64Data = base64Data.split(',')[1];
          }

          const uploadResult = await registerUploadedImage(base64Data);
          if (!uploadResult.mediaGenerationId) {
            throw new Error('Failed to get mediaId for source image');
          }
          effectiveMediaId = uploadResult.mediaGenerationId;
        }

        // 生成图片
        const { imageToImage } = await import('@/lib/api-mock');
        const aspectRatio = detectAspectRatio(
          startImage.size?.width || 640,
          startImage.size?.height || 360
        );

        const result = await imageToImage(
          transitionPrompt,
          startImage.src,
          aspectRatio,
          '',
          effectiveMediaId,
          1
        );

        if (result.imageUrl) {
          updateElement(placeholderId, {
            src: result.imageUrl,
            base64: result.images?.[0]?.base64,
            promptId: result.promptId,
            mediaId: result.mediaId,
            mediaGenerationId: result.mediaGenerationId,
            uploadState: 'synced',
            uploadMessage: undefined,
            generatedFrom: {
              type: 'image-to-image',
              sourceIds: [startImage.id, endImage.id],
              prompt: transitionPrompt,
            },
          } as Partial<ImageElement>);

          // 停止动画
          setEdges((eds) =>
            eds.map((edge) =>
              edge.source === startImage.id && edge.target === placeholderId ||
              edge.source === placeholderId && edge.target === endImage.id
                ? { ...edge, animated: false, style: EDGE_SUCCESS_STYLE }
                : edge
            )
          );

          toast.success('衔接镜头生成成功');
        } else {
          throw new Error('No image returned');
        }

      } catch (error) {
        console.error('Transition shot generation failed:', error);
        toast.error(`衔接镜头生成失败: ${error instanceof Error ? error.message : '未知错误'}`);

        deleteElement(placeholderId);

        setEdges((eds) =>
          eds.filter((edge) =>
            !(edge.source === startImage.id && edge.target === placeholderId) &&
            !(edge.source === placeholderId && edge.target === endImage.id)
          )
        );
      }
    })();

  }, [addElement, updateElement, deleteElement, setEdges]);

  return {
    handleNextShotGeneration,
    handleTransitionShotsGeneration,
  };
}

