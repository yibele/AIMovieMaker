'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, NodeToolbar, useReactFlow } from '@xyflow/react';
import { RefreshCw, Copy, Download, Trash2, Square, Edit3, Eye, Loader2, FolderInput, Clapperboard } from 'lucide-react';
import type { ImageElement, ImageData, TextElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { imageToImage, registerUploadedImage, editImage } from '@/lib/api-mock';
import { generateFromInput, imageToImageFromInput } from '@/lib/input-panel-generator';
import { ToolbarButton, ToolbarDivider } from './ToolbarButton';
import { VisionAnalysisModal } from '../VisionAnalysisModal';
import { toast } from 'sonner';
import { IMAGE_NODE_DEFAULT_SIZE, TEXT_NODE_DEFAULT_SIZE, detectAspectRatio } from '@/lib/constants/node-sizes';
import { useImageOperations } from '@/hooks/canvas';

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

  // 行级注释：Stack 模式相关状态
  const isStackMode = Array.isArray(imageData.images) && imageData.images.length > 1;
  const stackImages = isStackMode ? imageData.images! : [];
  const mainIndex = imageData.mainIndex ?? 0;
  const isExpanded = imageData.expanded ?? false;
  
  // 行级注释：获取当前主图数据（Stack 模式下使用）
  const currentMainImage: ImageData | null = isStackMode ? stackImages[mainIndex] : null;

  // 行级注释：预加载 Stack 中的所有图片，避免展开时才加载
  useEffect(() => {
    if (isStackMode && stackImages.length > 0) {
      stackImages.forEach((img) => {
        if (img.src) {
          const preloadImg = new Image();
          preloadImg.src = img.src;
        }
      });
    }
  }, [isStackMode, stackImages]);

  const reactFlowInstance = useReactFlow();

  // 行级注释：使用图片操作 Hook（复制、删除、下载、入库）
  const {
    handleDuplicate,
    handleDelete,
    handleArchive,
    handleDownload,
  } = useImageOperations(id);

  // 行级注释：图生图状态
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const selection = useCanvasStore((state) => state.selection); // 行级注释：获取选中状态，用于判断是否单选
  const isImageToImage = imageData.generatedFrom?.type === 'image-to-image'; // 行级注释：标记当前节点是否用于图生图
  const imageToImagePrompt = isImageToImage
    ? (imageData.generatedFrom?.prompt?.trim() || '')
    : '';
  const autoGenerateTriggeredRef = useRef(false); // 行级注释：防止自动触发多次

  // 行级注释：获取宽高比 - 使用统一的 detectAspectRatio 函数
  const getAspectRatio = useCallback((): '16:9' | '9:16' | '1:1' => {
    return detectAspectRatio(
      imageData.size?.width || 320,
      imageData.size?.height || 180
    );
  }, [imageData.size]);

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

    } catch (error: any) {
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
        toast.error('请先同步 API 授权');
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

  // 行级注释：handleDownload, handleDelete, handleDuplicate 已移至 useImageOperations Hook

  // 行级注释：Stack 模式 - 切换展开/收起状态（生成中禁止展开）
  const handleToggleExpand = useCallback(() => {
    if (isProcessing) {
      toast.info('图片生成中，请稍候...');
      return;
    }
    updateElement(id, { expanded: !isExpanded } as Partial<ImageElement>);
  }, [id, isExpanded, isProcessing, updateElement]);

  // 行级注释：Stack 模式 - 设置主图或收起
  const handleSetMainImage = useCallback((index: number) => {
    if (!isStackMode) return;
    
    // 行级注释：点击当前主图则收起
    if (index === mainIndex) {
      updateElement(id, { expanded: false } as Partial<ImageElement>);
      return;
    }
    
    const newMainImage = stackImages[index];
    if (!newMainImage) return;
    
    // 行级注释：更新主图索引和顶层属性
    updateElement(id, {
      mainIndex: index,
      src: newMainImage.src,
      base64: newMainImage.base64,
      mediaId: newMainImage.mediaId,
      mediaGenerationId: newMainImage.mediaGenerationId,
      expanded: false, // 选择后自动收起
    } as Partial<ImageElement>);
    
    toast.success('已设为主图');
  }, [id, isStackMode, mainIndex, stackImages, updateElement]);

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

  // 行级注释：handleArchive 已移至 useImageOperations Hook

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
          x: imageData.position.x + (imageData.size?.width || IMAGE_NODE_DEFAULT_SIZE.width) + 50,
          y: imageData.position.y
        },
        size: TEXT_NODE_DEFAULT_SIZE
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
        className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 px-3 py-2 animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <ToolbarButton icon={<RefreshCw className="w-5 h-5" />} label="再次生成" onClick={handleRegenerate} disabled={isAnalyzing} />
        <ToolbarButton icon={<Clapperboard className="w-5 h-5" />} label="下一分镜" onClick={() => { }} disabled={true} className="hidden" /> {/* Hidden/Removed */}
        <ToolbarButton icon={<Edit3 className="w-5 h-5" />} label="图片编辑" onClick={handleAnnotate} disabled={isAnalyzing} />
        <ToolbarButton icon={isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />} label="视觉识别" onClick={openVisionModal} disabled={isAnalyzing} />
        <ToolbarButton icon={<Square className="w-5 h-5" />} label="复制" onClick={handleDuplicate} />
        <ToolbarButton icon={<FolderInput className="w-5 h-5" />} label="入库" onClick={handleArchive} title="保存到精选素材库" />
        <ToolbarDivider />
        <ToolbarButton icon={<Download className="w-5 h-5" />} label="下载" onClick={handleDownload} />
        <ToolbarButton icon={<Trash2 className="w-5 h-5" />} label="删除" variant="danger" onClick={handleDelete} />
      </NodeToolbar>

      {/* 行级注释：外层容器需要背景色，避免圆角处露出白边 */}
      <div
        className={`relative rounded-xl transition-all duration-300 ease-out w-full h-full bg-slate-200 dark:bg-slate-700 ${selected
          ? 'ring-2 ring-blue-500 shadow-[0_10px_40px_rgba(59,130,246,0.25)] scale-[1.01]'
          : 'shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-lg'
          }`}
        style={{ overflow: 'visible' }}
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

        <div className={`absolute inset-0 rounded-xl bg-slate-200 dark:bg-slate-700 ${isStackMode && isExpanded ? '' : 'overflow-hidden'}`}>

          {/* 1. Loading Layer - 绝对定位，通过 opacity 控制显示 */}
          <div
            className="absolute inset-0 z-20 transition-opacity duration-700 ease-in-out"
            style={{ opacity: loadingOpacity, pointerEvents: loadingOpacity > 0.5 ? 'auto' : 'none' }}
          >
            <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-700">
              <div className="loading-glow w-full h-full rounded-xl" />
            </div>
          </div>

          {/* 2. Image Layer - Stack 模式：所有图片绝对定位，通过 transform 控制位置 */}
          {isStackMode ? (
            <>
              {/* 行级注释：Stack 模式 - 渲染所有图片，通过 transform 控制展开/收起 */}
              {/* 行级注释：收起时只渲染主图，展开时渲染所有图片 */}
              {isExpanded ? (
                // 展开状态：渲染所有图片
                stackImages.map((img, index) => {
                  const col = index % 2;
                  const row = Math.floor(index / 2);
                  const nodeWidth = imageData.size?.width || 320;
                  const nodeHeight = imageData.size?.height || 180;
                  const gap = 10;
                  
                  const offsetX = col * (nodeWidth + gap);
                  const offsetY = row * (nodeHeight + gap);
                  const isMain = index === mainIndex;
                  
                  return (
                    <div
                      key={index}
                      className="absolute inset-0 rounded-xl overflow-hidden cursor-pointer"
                      style={{
                        transform: `translate(${offsetX}px, ${offsetY}px)`,
                        transition: 'transform 0.3s ease-out, box-shadow 0.2s',
                        zIndex: 1,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        border: isMain ? '3px solid #22c55e' : '2px solid #555',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetMainImage(index);
                      }}
                    >
                      <img
                        src={img.src}
                        alt={`图片 ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="eager"
                        draggable={false}
                      />
                      {isMain && (
                        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-medium shadow">
                          主图
                        </div>
                      )}
                      {!isMain && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors">
                          <span className="text-white text-sm font-medium opacity-0 hover:opacity-100 bg-black/60 px-3 py-1.5 rounded transition-opacity">
                            设为主图
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // 收起状态：只渲染主图（无动画，直接显示）
                imageData.src && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <img
                      src={imageData.src}
                      alt={imageData.alt || '生成的图片'}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                )
              )}
            </>
          ) : (
            // 行级注释：普通单图模式
            <div
              className="absolute inset-0 z-10 transition-all duration-700 ease-out transform origin-center"
              style={{
                opacity: imageOpacity,
                transform: showBaseImage ? 'scale(1)' : 'scale(1.05)',
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
          )}
          
          {/* 行级注释：Stack 模式数量徽章已移到外层容器 */}

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
        
        {/* 行级注释：Stack 模式数量徽章（放在外层容器内，placeholder 时也显示） */}
        {isStackMode && !isExpanded && (
          <div
            className="absolute z-[100] flex items-center gap-1 bg-black/80 hover:bg-black text-white text-base font-semibold rounded-lg cursor-pointer transition-all shadow-lg backdrop-blur-sm border border-white/20 hover:scale-105"
            style={{
              top: 12,
              right: 12,
              padding: '6px 12px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
          >
            <span>{stackImages.length}</span>
            <span className="text-sm opacity-80">张</span>
          </div>
        )}
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
                    : 'text-white bg-black dark:bg-slate-900 border-gray-600 dark:border-slate-500 hover:bg-gray-800 shadow-sm'
                    }`}
                  title={isCopied ? "已复制!" : "复制提示词"}
                >
                  {isCopied ? 'Copied!' : 'Copy Prompt'}
                </button>
                <div className="w-full bg-white dark:bg-slate-700 rounded-lg px-3 py-2 pt-2 shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                  <p
                    className="text-[10px] font-light text-gray-900 dark:text-slate-200 leading-relaxed text-left whitespace-pre-wrap break-words"
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
