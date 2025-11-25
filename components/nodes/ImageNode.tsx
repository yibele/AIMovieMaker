'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, NodeToolbar, useReactFlow } from '@xyflow/react';
import { RefreshCw, Copy, Download, Trash2, Square, Edit3, Eye, Loader2, FolderInput, Clapperboard } from 'lucide-react';
import type { ImageElement, TextElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { useMaterialsStore } from '@/lib/materials-store'; // 引入素材库
import { imageToImage, registerUploadedImage, editImage } from '@/lib/api-mock';
import { generateFromInput, imageToImageFromInput } from '@/lib/input-panel-generator';
import { ToolbarButton, ToolbarDivider } from './ToolbarButton';
import { VisionAnalysisModal } from '../VisionAnalysisModal';
import { toast } from 'sonner';

// 行级注释：图片节点组件
function ImageNode({ data, selected, id }: NodeProps) {
  const imageData = data as unknown as ImageElement;
  const uploadState = imageData.uploadState ?? 'synced';
  const isSyncing = uploadState === 'syncing';
  const isError = uploadState === 'error';
  const hasMediaId = Boolean(imageData.mediaGenerationId);
  const showBaseImage = Boolean(imageData.src);
  // isProcessing 状态下显示 Loading，否则显示图片或 Empty 状态
  const isProcessing = !isError && (isSyncing || !hasMediaId || !showBaseImage);

  // 行级注释：只有从文本节点生成或图生图时才显示输入点，从输入框直接生成的图片不显示
  const shouldShowInputHandle = imageData.generatedFrom?.type !== 'input';

  const reactFlowInstance = useReactFlow();

  // 行级注释：图生图状态
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const selection = useCanvasStore((state) => state.selection); // 行级注释：获取选中状态，用于判断是否单选
  const isImageToImage = imageData.generatedFrom?.type === 'image-to-image'; // 行级注释：标记当前节点是否用于图生图
  const imageToImagePrompt = isImageToImage
    ? (imageData.generatedFrom?.prompt?.trim() || '')
    : '';
  const autoGenerateTriggeredRef = useRef(false); // 行级注释：防止自动触发多次

  // 行级注释：获取宽高比
  const getAspectRatio = (): '16:9' | '9:16' | '1:1' => {
    const width = imageData.size?.width || 320;
    const height = imageData.size?.height || 180;
    const ratio = width / height;
    if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
    return '1:1';
  };

  // 行级注释：处理图生图
  const handleImageToImage = useCallback(async () => {
    const prompt = imageToImagePrompt;
    if (!prompt) {
      alert('请输入提示词');
      return;
    }

    // 行级注释：优先使用当前节点的 mediaId，否则回溯到源图片
    const baseImageInfo = (() => {
      if ((imageData.mediaId && imageData.mediaId.trim()) || (imageData.mediaGenerationId && imageData.mediaGenerationId.trim())) {
        return {
          mediaReference: imageData.mediaId?.trim() || imageData.mediaGenerationId?.trim() || '',
          src: imageData.src,
          caption: imageData.caption || '',
        };
      }

      const sourceIds = imageData.generatedFrom?.sourceIds ?? [];
      if (sourceIds.length === 0) {
        return null;
      }

      const { elements } = useCanvasStore.getState();
      for (const sourceId of sourceIds) {
        const sourceElement = elements.find(
          (el) => el.id === sourceId && el.type === 'image'
        ) as ImageElement | undefined;

        if (!sourceElement) {
          continue;
        }

        const mediaReference =
          sourceElement.mediaId?.trim() || sourceElement.mediaGenerationId?.trim();
        if (mediaReference) {
          return {
            mediaReference,
            src: sourceElement.src,
            caption: sourceElement.caption || '',
          };
        }
      }

      return null;
    })();

    if (!baseImageInfo || !baseImageInfo.mediaReference || !baseImageInfo.src) {
      alert('图片未上传到服务器，无法进行图生图');
      return;
    }

    try {
      const aspectRatio = getAspectRatio();
      const result = await imageToImage(
        prompt,
        baseImageInfo.src,
        aspectRatio,
        baseImageInfo.caption,
        baseImageInfo.mediaReference,
        1
      );

      // 行级注释：更新当前图片节点
      updateElement(id, {
        src: result.imageUrl,
        mediaId: result.mediaId,
        mediaGenerationId: result.mediaGenerationId,
        generatedFrom: {
          ...(imageData.generatedFrom ?? { type: 'image-to-image' }),
          type: 'image-to-image',
          prompt,
        },
        pendingConnectionGeneration: false,
      } as Partial<ImageElement>);

      console.log('✅ 图生图完成:', prompt);
    } catch (error: any) {
      console.error('❌ 图生图失败:', error);
      alert(error?.message || '图生图失败，请重试');
      deleteElement(id);
    } finally {
      // no-op
    }
  }, [deleteElement, imageToImagePrompt, imageData, id, updateElement, getAspectRatio]);

  useEffect(() => {
    if (
      isImageToImage &&
      imageData.pendingConnectionGeneration &&
      !imageData.src &&
      imageToImagePrompt &&
      !autoGenerateTriggeredRef.current
    ) {
      autoGenerateTriggeredRef.current = true;
      updateElement(id, { pendingConnectionGeneration: false } as Partial<ImageElement>);
      void handleImageToImage();
    }
  }, [
    handleImageToImage,
    id,
    imageData.pendingConnectionGeneration,
    imageData.src,
    imageToImagePrompt,
    isImageToImage,
    updateElement,
  ]);

  const promptDisplayText = imageData.generatedFrom?.prompt?.trim() || '';
  const hasPromptDisplay = Boolean(promptDisplayText);
  const shouldRenderBelowPanel = hasPromptDisplay && selected;

  // 行级注释：复制提示词到剪贴板
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyPrompt = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (promptDisplayText) {
      try {
        await navigator.clipboard.writeText(promptDisplayText);
        console.log('✅ 提示词已复制到剪贴板');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 1500); // 1.5秒后恢复
      } catch (error) {
        console.error('❌ 复制失败:', error);
        alert('复制失败，请重试');
      }
    }
  }, [promptDisplayText]);

  // ===== Toolbar Handlers =====
  const addElement = useCanvasStore((state) => state.addElement);
  const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const promptsHistory = useCanvasStore((state) => state.promptsHistory);
  const addPromptHistory = useCanvasStore((state) => state.addPromptHistory);

  // 使用全局图片编辑器状态
  const setAnnotatorTarget = useCanvasStore((state) => state.setAnnotatorTarget);
  const setIsLoadingAnnotatorImage = useCanvasStore((state) => state.setIsLoadingAnnotatorImage);
  const [mediaBase64Cache] = useState<Map<string, string>>(new Map());


  // 打开图片编辑
  const handleAnnotate = useCallback(async () => {
    if (!imageData.src) {
      toast.error('当前图片暂无可编辑内容');
      return;
    }

    // 如果图片已有 base64，直接使用
    if (imageData.base64) {
      const imageDataUrl = imageData.base64.startsWith('data:')
        ? imageData.base64
        : `data:image/png;base64,${imageData.base64}`;

      setAnnotatorTarget({
        ...imageData,
        src: imageDataUrl,
      });
      setIsLoadingAnnotatorImage(false);
      return;
    }

    const effectiveMediaId = imageData.mediaId || imageData.mediaGenerationId;
    if (!effectiveMediaId) {
      toast.error('当前图片缺少 mediaId，无法编辑');
      return;
    }

    setAnnotatorTarget(imageData);
    setIsLoadingAnnotatorImage(true);

    try {
      if (mediaBase64Cache.has(effectiveMediaId)) {
        const cachedDataUrl = mediaBase64Cache.get(effectiveMediaId)!;
        setAnnotatorTarget({
          ...imageData,
          src: cachedDataUrl,
        });
        setIsLoadingAnnotatorImage(false);
        return;
      }

      const apiConfig = useCanvasStore.getState().apiConfig;
      if (!apiConfig.bearerToken) {
        toast.error('请先配置 Bearer Token');
        setAnnotatorTarget(null);
        setIsLoadingAnnotatorImage(false);
        return;
      }

      const mediaResponse = await fetch(
        `/api/flow/media/${effectiveMediaId}?key=${apiConfig.apiKey}&returnUriOnly=false&proxy=${apiConfig.proxy || ''}`,
        {
          headers: {
            'Authorization': `Bearer ${apiConfig.bearerToken}`
          }
        }
      );

      if (!mediaResponse.ok) throw new Error('Media API 调用失败');

      const mediaData = await mediaResponse.json();
      const encodedImage = mediaData?.image?.encodedImage ||
        mediaData?.userUploadedImage?.image ||
        mediaData?.userUploadedImage?.encodedImage;

      if (!encodedImage) throw new Error('未获取到图片数据');

      const imageDataUrl = `data:image/png;base64,${encodedImage}`;
      mediaBase64Cache.set(effectiveMediaId, imageDataUrl);

      setAnnotatorTarget({
        ...imageData,
        src: imageDataUrl,
      });
      setIsLoadingAnnotatorImage(false);
    } catch (error) {
      console.error('获取原图失败:', error);
      toast.error(`无法打开编辑器: ${error instanceof Error ? error.message : '未知错误'}`);
      setAnnotatorTarget(null);
      setIsLoadingAnnotatorImage(false);
    }
  }, [imageData, mediaBase64Cache]);

  // 下载图片
  // 下载图片 - 直接打开 URL
  const handleDownload = useCallback(() => {
    if (!imageData.src) return;
    window.open(imageData.src, '_blank');
  }, [imageData.src]);

  // 删除 - 生成/处理中不允许删除
  const handleDelete = useCallback(() => {
    // 行级注释：如果正在处理（syncing 或没有 mediaId 且没有错误），禁止删除
    if (isProcessing) {
      alert('图片正在生成/处理中，无法删除');
      return;
    }

    deleteElement(id);
  }, [deleteElement, id, isProcessing]);

  // 复制
  const handleDuplicate = useCallback(() => {
    const newImage: ImageElement = {
      ...imageData,
      id: `image-${Date.now()}`,
      position: {
        x: imageData.position.x + (imageData.size?.width || 400) + 30,
        y: imageData.position.y,
      },
    };
    addElement(newImage);
    setSelection([newImage.id]);
  }, [imageData, addElement, setSelection]);

  // 再次生成
  const handleRegenerate = useCallback(async () => {
    let originalPrompt = '';
    if (imageData.generatedFrom?.prompt) {
      originalPrompt = imageData.generatedFrom.prompt;
    } else if (imageData.promptId) {
      const history = promptsHistory.find(h => h.promptId === imageData.promptId);
      if (history) {
        originalPrompt = history.promptText;
      }
    }
    if (!originalPrompt) {
      originalPrompt = '生成图片';
    }

    let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
    if (imageData.size) {
      const { width = 400, height = 300 } = imageData.size;
      const ratio = width / height;
      if (Math.abs(ratio - 16 / 9) < 0.1) aspectRatio = '16:9';
      else if (Math.abs(ratio - 9 / 16) < 0.1) aspectRatio = '9:16';
      else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
    }

    const newPosition = {
      x: imageData.position.x + (imageData.size?.width || 640) + 50,
      y: imageData.position.y,
    };

    await generateFromInput(
      originalPrompt,
      aspectRatio,
      1,
      newPosition,
      addElement,
      updateElement,
      deleteElement,
      addPromptHistory
    );
  }, [imageData, promptsHistory, addElement, updateElement, deleteElement, addPromptHistory]);

  // 入库（归档到精选素材）
  const handleArchive = useCallback(async () => {
    if (!imageData.src) {
      toast.error('图片未生成，无法入库');
      return;
    }

    // 获取 userId (实际应从 auth store 获取，这里假设 context 或 store 中有)
    // 这里做一个简单的 mock 或从 store 获取
    // const userId = useUserStore.getState().user?.id; 

    try {
      const { addMaterial } = useMaterialsStore.getState();
      const apiConfig = useCanvasStore.getState().apiConfig;

      await addMaterial({
        type: 'image',
        name: imageData.generatedFrom?.prompt || 'Untitled Image',
        src: imageData.src,
        thumbnail: imageData.src,
        mediaId: imageData.mediaId,
        mediaGenerationId: imageData.mediaGenerationId || '',
        metadata: {
          prompt: imageData.generatedFrom?.prompt,
          width: imageData.size?.width,
          height: imageData.size?.height,
        },
        projectId: apiConfig.projectId, // 关联当前项目
      });
      toast.success('已添加到精选素材库');
    } catch (error) {
      console.error('入库失败:', error);
      toast.error('入库失败，请重试');
    }
  }, [imageData]);

  // 视觉识别
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);

  const openVisionModal = useCallback(() => {
    if (!imageData.src) {
      toast.error('图片内容为空，无法识别');
      return;
    }
    const apiConfig = useCanvasStore.getState().apiConfig;
    if (!apiConfig.dashScopeApiKey) {
      toast.error('请先在设置中配置 DashScope API Key');
      return;
    }
    setIsVisionModalOpen(true);
  }, [imageData.src]);

  const executeVisionAnalysis = useCallback(async (prompt: string) => {
    const apiConfig = useCanvasStore.getState().apiConfig;

    setIsAnalyzing(true);
    const toastId = toast.loading('正在分析图片...');

    try {
      let imageUrlForApi = '';

      // 1. 优先使用 base64 字段 (避免重复下载)
      if (imageData.base64) {
        if (imageData.base64.startsWith('data:')) {
          imageUrlForApi = imageData.base64;
        } else {
          // 默认假设为 jpeg，或者根据 src 后缀判断
          imageUrlForApi = `data:image/jpeg;base64,${imageData.base64}`;
        }
      }
      // 2. 如果 src 已经是 Data URL
      else if (imageData.src && imageData.src.startsWith('data:')) {
        imageUrlForApi = imageData.src;
      }
      // 3. 如果是 URL，尝试 fetch 并转换
      else if (imageData.src) {
        try {
          const response = await fetch(imageData.src);
          const blob = await response.blob();
          imageUrlForApi = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Fetch image failed:', error);
          throw new Error('无法加载图片数据，请确保图片可访问');
        }
      }

      if (!imageUrlForApi) {
        throw new Error('无法获取有效的图片数据');
      }

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
              { type: 'text', text: prompt }
            ]
          }]
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) throw new Error('未获取到分析结果');

      // 创建 TextNode
      const textId = `text-${Date.now()}`;
      const newTextNode: TextElement = {
        id: textId,
        type: 'text',
        text: content,
        position: {
          x: imageData.position.x + (imageData.size?.width || 400) + 50,
          y: imageData.position.y
        },
        size: { width: 300, height: 200 }
      };

      addElement(newTextNode);

      // 连接 ImageNode -> TextNode
      // 使用 setTimeout 确保节点添加后再连线
      setTimeout(() => {
        const edgeId = `edge-${id}-${textId}-vision`;
        reactFlowInstance.addEdges({
          id: edgeId,
          source: id,
          sourceHandle: 'right', // 明确指定 source handle
          target: textId,
          type: 'default',
          style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '5,5' }, // 紫色线条
          animated: true,
          label: '视觉分析'
        });
      }, 200);

      toast.success('分析完成', { id: toastId });
      setIsVisionModalOpen(false); // 成功后关闭 Modal

    } catch (error) {
      console.error('Vision analysis failed:', error);
      toast.error('识别失败，请检查 API Key 或重试', { id: toastId });
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageData.src, imageData.base64, imageData.position, imageData.size, id, addElement, reactFlowInstance]);

  // 下一个分镜 (Next Shot)
  const handleNextShot = useCallback(async () => {
    if (!imageData.src) {
      toast.error('图片内容为空，无法生成下一分镜');
      return;
    }
    const apiConfig = useCanvasStore.getState().apiConfig;
    if (!apiConfig.dashScopeApiKey) {
      toast.error('请先配置 DashScope API Key');
      return;
    }

    // 1. 立即创建 Placeholder 节点和连线
    const newImageId = `image-${Date.now()}-next`;
    const size = imageData.size || { width: 400, height: 225 }; // Default or current size
    const horizontalSpacing = 50;

    const placeholderImage: ImageElement = {
      id: newImageId,
      type: 'image',
      src: '', // Empty src shows loading/empty state
      position: {
        x: imageData.position.x + (size.width) + horizontalSpacing,
        y: imageData.position.y,
      },
      size: size,
      sourceImageIds: [id],
      generatedFrom: {
        type: 'image-to-image',
        sourceIds: [id],
        prompt: '正在构思下一分镜...', // Temporary prompt
      },
      uploadState: 'syncing', // Show loading state
    };

    // Add Node
    addElement(placeholderImage);

    // Add Edge
    const edgeId = `edge-${id}-${newImageId}`;
    reactFlowInstance.setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: id,
        target: newImageId,
        type: 'default',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 1 },
      },
    ]);

    // 2. 后台执行分析和生成
    (async () => {
      try {
        // --- A. 准备图片数据 ---
        let imageUrlForApi = '';
        if (imageData.base64) {
          imageUrlForApi = imageData.base64.startsWith('data:')
            ? imageData.base64
            : `data:image/jpeg;base64,${imageData.base64}`;
        } else if (imageData.src && imageData.src.startsWith('data:')) {
          imageUrlForApi = imageData.src;
        } else if (imageData.src) {
          const response = await fetch(imageData.src);
          const blob = await response.blob();
          imageUrlForApi = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
        if (!imageUrlForApi) throw new Error('无法获取有效的图片数据');

        // --- B. Qwen VL 分析 ---
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
                { type: 'image_url', image_url: { url: imageUrlForApi } },
                { type: 'text', text: "Analyze this movie shot. Describe the visual content of the IMMEDIATE NEXT SHOT in the sequence to create a coherent narrative flow. The output must be a detailed image generation prompt (English). Do not include any conversational text, just the prompt." }
              ]
            }]
          })
        });

        if (!response.ok) throw new Error(`Vision API Error: ${response.status}`);
        const data = await response.json();
        const nextShotPrompt = data.choices?.[0]?.message?.content;
        if (!nextShotPrompt) throw new Error('未获取到下一分镜的提示词');

        console.log('Next Shot Prompt:', nextShotPrompt);

        // 更新 Placeholder 的提示词
        updateElement(newImageId, {
          generatedFrom: {
            type: 'image-to-image',
            sourceIds: [id],
            prompt: nextShotPrompt
          }
        } as Partial<ImageElement>);

        // --- C. 准备图生图 (Media ID Check) ---
        let effectiveMediaId = imageData.mediaId || imageData.mediaGenerationId;
        if (!effectiveMediaId) {
          // 需要上传
          let imageDataToUpload = imageUrlForApi;
          if (imageDataToUpload.startsWith('data:')) {
            imageDataToUpload = imageDataToUpload.split(',')[1];
          }
          const { registerUploadedImage } = await import('@/lib/api-mock');
          const uploadResult = await registerUploadedImage(imageDataToUpload);
          if (!uploadResult.mediaGenerationId) throw new Error('上传图片失败');
          effectiveMediaId = uploadResult.mediaGenerationId;
        }

        // --- D. 执行图生图 ---
        const result = await imageToImage(
          nextShotPrompt,
          imageData.src,
          getAspectRatio(),
          imageData.caption || '',
          effectiveMediaId,
          1
        );

        // --- E. 更新结果 ---
        updateElement(newImageId, {
          src: result.imageUrl,
          base64: result.base64,
          promptId: result.promptId,
          mediaId: result.mediaId || result.mediaGenerationId, // Simple resolve
          mediaGenerationId: result.mediaGenerationId,
          uploadState: 'synced', // Done
        } as Partial<ImageElement>);

        // 停止连线动画
        reactFlowInstance.setEdges((eds) =>
          eds.map((e) => e.id === edgeId ? { ...e, animated: false } : e)
        );

        // 添加历史
        addPromptHistory({
          promptId: result.promptId,
          promptText: nextShotPrompt,
          imageId: newImageId,
          mode: 'next-shot',
          createdAt: Date.now(),
        });

        toast.success('下一分镜生成完成');

      } catch (error) {
        console.error('Next shot generation failed:', error);
        toast.error(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        // 删除占位节点
        deleteElement(newImageId);
        // 删除连线
        reactFlowInstance.setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      }
    })();

  }, [imageData, addElement, updateElement, deleteElement, addPromptHistory, reactFlowInstance, getAspectRatio, id]);

  // 行级注释：计算图片和Loading的透明度，用于 Cross-Fade
  // Loading 只有在处理中时完全不透明，处理完（有图）后透明度为 0
  const loadingOpacity = isProcessing ? 1 : 0;
  // 图片只有在有 src 时完全不透明，否则透明度为 0
  const imageOpacity = showBaseImage ? 1 : 0;
  // Empty State (等待内容)
  const emptyOpacity = !isProcessing && !showBaseImage ? 1 : 0;

  return (
    <>
      {/* NodeToolbar - 图片工具栏，只在单选时显示 */}
      <NodeToolbar
        isVisible={selected && selection.length === 1}
        position={Position.Top}
        align="center"
        offset={15}
        className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 px-3 py-2 animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <ToolbarButton icon={<RefreshCw className="w-3 h-3" />} label="再次生成" onClick={handleRegenerate} />
        <ToolbarButton icon={<Clapperboard className="w-3 h-3" />} label="下一分镜" onClick={handleNextShot} disabled={isAnalyzing} />
        <ToolbarButton icon={<Edit3 className="w-3 h-3" />} label="图片编辑" onClick={handleAnnotate} />
        <ToolbarButton icon={isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} label="视觉识别" onClick={openVisionModal} disabled={isAnalyzing} />
        <ToolbarButton icon={<Square className="w-3 h-3" />} label="复制" onClick={handleDuplicate} />
        <ToolbarButton icon={<FolderInput className="w-3 h-3" />} label="入库" onClick={handleArchive} title="保存到精选素材库" />
        <ToolbarDivider />
        <ToolbarButton icon={<Download className="w-3 h-3" />} label="下载" onClick={handleDownload} />
        <ToolbarButton icon={<Trash2 className="w-3 h-3" />} label="删除" variant="danger" disabled={isProcessing} title={isProcessing ? "生成/处理中无法删除" : "删除"} onClick={handleDelete} />
      </NodeToolbar>

      <div
        className={`relative rounded-xl transition-all duration-300 ease-out w-full h-full ${selected
          ? 'ring-2 ring-blue-500 shadow-[0_10px_40px_rgba(59,130,246,0.25)] scale-[1.01]'
          : 'shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:shadow-lg'
          }`}
        style={{ overflow: 'visible', backgroundColor: '#fff' }}
      >
        {/* 输入连接点（左侧） - 条件显示 */}
        {shouldShowInputHandle && (
          <Handle
            type="target"
            position={Position.Left}
            className="!flex !items-center !justify-center !w-4 !h-4 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
            style={{ left: '-6px', top: '50%' }}
            isConnectable={true}
          />
        )}

        <div className="absolute inset-0 rounded-xl overflow-hidden bg-gray-50">

          {/* 1. Loading Layer - 绝对定位，通过 opacity 控制显示 */}
          <div
            className="absolute inset-0 z-20 transition-opacity duration-700 ease-in-out"
            style={{ opacity: loadingOpacity, pointerEvents: loadingOpacity > 0.5 ? 'auto' : 'none' }}
          >
            <div className="flex h-full w-full items-center justify-center bg-white">
              <div className="loading-glow w-full h-full rounded-xl" />
            </div>
          </div>

          {/* 2. Image Layer - 绝对定位，通过 opacity 控制显示 */}
          <div
            className="absolute inset-0 z-10 transition-all duration-700 ease-out transform origin-center"
            style={{
              opacity: imageOpacity,
              transform: showBaseImage ? 'scale(1)' : 'scale(1.05)', // 图片出现时轻微缩小归位
              pointerEvents: imageOpacity > 0.5 ? 'auto' : 'none'
            }}
          >
            {imageData.src && (
              <img
                src={imageData.src}
                alt={imageData.alt || '生成的图片'}
                loading="lazy"
                className="h-full w-full object-cover pointer-events-none select-none animate-in fade-in zoom-in-95 duration-500"
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          {/* 3. Empty State Layer - 等待内容 */}
          <div
            className="absolute inset-0 z-0 flex flex-col items-center justify-center text-xs font-medium text-gray-400 transition-opacity duration-500"
            style={{ opacity: emptyOpacity }}
          >
            等待图片内容
          </div>

          {/* 4. Error Overlay - 只有出错时显示 */}
          {isError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 bg-red-50/90 backdrop-blur-sm text-red-500 animate-in fade-in duration-300">
              <span className="text-xs font-medium">同步失败</span>
              {imageData.uploadMessage && (
                <span className="text-[10px] leading-tight px-6 text-center opacity-75">
                  {imageData.uploadMessage}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 输出连接点（右侧） - 用于连接到视频节点 */}
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          className="!flex !items-center !justify-center !w-3.5 !h-3.5 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
          style={{ right: '-6px', top: '50%' }}
          isConnectable={true}
        />
      </div>

      {shouldRenderBelowPanel && (
        <div
          className="absolute left-0 right-0 flex flex-col gap-2 items-start animate-in slide-in-from-top-2 fade-in duration-300"
          style={{
            top: '100%',
            marginTop: '12px',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          {hasPromptDisplay && (
            <div
              className="w-full relative"
              style={{ pointerEvents: 'auto' }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="relative group">
                <button
                  onClick={handleCopyPrompt}
                  className={`absolute -top-1.5 left-2 text-[6px] font-semibold uppercase tracking-wider leading-none px-2 py-0.5 z-10 border rounded cursor-pointer transition-all duration-200 transform active:scale-95 ${isCopied
                    ? 'text-gray-400 bg-gray-600 border-gray-600'
                    : 'text-white bg-black border-gray-600 hover:bg-gray-800 shadow-sm'
                    }`}
                  title={isCopied ? "已复制!" : "复制提示词"}
                >
                  {isCopied ? 'Copied!' : 'Copy Prompt'}
                </button>
                <div className="w-full bg-white rounded-lg px-3 py-2 pt-2 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                  <p
                    className="text-[10px] font-light text-gray-1000 leading-relaxed text-left whitespace-pre-wrap break-words line-clamp-5"
                    title={promptDisplayText}
                  >
                    {promptDisplayText}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <VisionAnalysisModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        onAnalyze={executeVisionAnalysis}
        isAnalyzing={isAnalyzing}
      />
    </>
  );
}

export default memo(ImageNode);
