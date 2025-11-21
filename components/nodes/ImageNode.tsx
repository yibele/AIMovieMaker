'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, NodeResizer, NodeToolbar } from '@xyflow/react';
import { RefreshCw, Copy, Download, Trash2, Square, Edit3 } from 'lucide-react';
import type { ImageElement } from '@/lib/types';
import { useNodeResize } from '@/lib/node-resize-helpers';
import { useCanvasStore } from '@/lib/store';
import { imageToImage, registerUploadedImage, editImage } from '@/lib/api-mock';
import { generateFromInput } from '@/lib/input-panel-generator';
import { ToolbarButton, ToolbarDivider } from './ToolbarButton';
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

  // 行级注释：使用共享的 resize 逻辑
  const { handleResizeStart, handleResize, handleResizeEnd } = useNodeResize(id);

  // 行级注释：图生图状态
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
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
  const handleDownload = useCallback(async () => {
    if (!imageData.src) return;

    try {
      let blob: Blob;

      if (imageData.base64) {
        const dataUrl = imageData.base64.startsWith('data:')
          ? imageData.base64
          : `data:image/png;base64,${imageData.base64}`;
        const base64Data = dataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/png' });
      } else if (imageData.src.startsWith('data:')) {
        const base64Data = imageData.src.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/png' });
      } else {
        const response = await fetch(imageData.src);
        if (!response.ok) throw new Error(`下载失败: ${response.status}`);
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${id}.png`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('下载失败:', error);
      toast.error('下载失败');
    }
  }, [imageData.src, imageData.base64, id]);

  // 删除
  const handleDelete = useCallback(() => {
    deleteElement(id);
  }, [deleteElement, id]);

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

  // 行级注释：计算图片和Loading的透明度，用于 Cross-Fade
  // Loading 只有在处理中时完全不透明，处理完（有图）后透明度为 0
  const loadingOpacity = isProcessing ? 1 : 0;
  // 图片只有在有 src 时完全不透明，否则透明度为 0
  const imageOpacity = showBaseImage ? 1 : 0;
  // Empty State (等待内容)
  const emptyOpacity = !isProcessing && !showBaseImage ? 1 : 0;

  return (
    <>
      {/* NodeResizer - 统一风格 */}
      <NodeResizer
        minWidth={100}
        minHeight={75}
        maxWidth={1080}
        maxHeight={1920}
        keepAspectRatio={true}
        isVisible={selected}
        color="#3b82f6"
        handleStyle={{
          width: '10px',
          height: '10px',
          borderRadius: '4px',
          backgroundColor: '#3b82f6',
          border: '1px solid white',
        }}
        lineStyle={{
          borderWidth: '1px',
          borderColor: '#3b82f6',
        }}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />

      {/* NodeToolbar - 图片工具栏 */}
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        align="center"
        offset={15}
        className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 px-3 py-2 animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <ToolbarButton icon={<RefreshCw className="w-3 h-3" />} label="再次生成" onClick={handleRegenerate} />
        <ToolbarButton icon={<Edit3 className="w-3 h-3" />} label="图片编辑" onClick={handleAnnotate} />
        <ToolbarButton icon={<Square className="w-3 h-3" />} label="复制" onClick={handleDuplicate} />
        <ToolbarDivider />
        <ToolbarButton icon={<Download className="w-3 h-3" />} label="下载" onClick={handleDownload} />
        <ToolbarButton icon={<Trash2 className="w-3 h-3" />} label="删除" variant="danger" onClick={handleDelete} />
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
                    className="text-[10px] font-light text-gray-1000 leading-relaxed text-left whitespace-pre-wrap break-words"
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
    </>
  );
}

export default memo(ImageNode);
