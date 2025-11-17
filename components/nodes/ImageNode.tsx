'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react';
import type { ImageElement } from '@/lib/types';
import { useNodeResize } from '@/lib/node-resize-helpers';
import { useCanvasStore } from '@/lib/store';
import { imageToImage } from '@/lib/api-mock';

// 行级注释：图片节点组件
function ImageNode({ data, selected, id }: NodeProps) {
  const imageData = data as unknown as ImageElement;
  const uploadState = imageData.uploadState ?? 'synced';
  const isSyncing = uploadState === 'syncing';
  const isError = uploadState === 'error';
  const hasMediaId = Boolean(imageData.mediaGenerationId);
  const showBaseImage = Boolean(imageData.src);
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
    if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
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

      <div
        className={`relative rounded-xl transition-all w-full h-full ${
          selected
            ? 'ring-1 ring-blue-500/80 shadow-[0_10px_40px_rgba(59,130,246,0.25)]'
            : 'shadow-[0_8px_24px_rgba(15,23,42,0.12)]'
        }`}
        style={{ overflow: 'visible', backgroundColor: '#fff' }}
      >
        {/* 输入连接点（左侧） - 条件显示 */}
        {shouldShowInputHandle && (
          <Handle
            type="target"
            position={Position.Left}
            className="!flex !items-center !justify-center !w-4 !h-4 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm"
            style={{ left: '-6px', top: '50%' }}
            isConnectable={true}
          />
        )}

        <div className="absolute inset-0 rounded-xl overflow-hidden">
          {isProcessing ? (
            <div className="flex h-full w-full items-center justify-center bg-white">
              <div className="loading-glow w-[85%] h-[85%] rounded-xl" data-variant="compact" />
            </div>
          ) : showBaseImage ? (
            <img
              src={imageData.src}
              alt={imageData.alt || '生成的图片'}
              className="h-full w-full object-cover pointer-events-none select-none"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-xs font-medium text-gray-500">
              等待图片内容
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50/80 backdrop-blur-sm text-red-500">
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
          type="source"
          position={Position.Right}
          className="!flex !items-center !justify-center !w-3.5 !h-3.5 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm"
          style={{ right: '-6px', top: '50%' }}
          isConnectable={true}
        />
      </div>

      {shouldRenderBelowPanel && (
        <div
          className="absolute left-0 right-0 flex flex-col gap-2 items-start"
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
              <div className="relative">
              <button
                onClick={handleCopyPrompt}
                className={`absolute -top-1.5 left-2 text-[6px] font-semibold uppercase tracking-wider leading-none px-2 py-0.5 z-10 border rounded cursor-pointer transition-all transform active:scale-95 ${
                  isCopied
                    ? 'text-gray-400 bg-gray-600 border-gray-600'
                    : 'text-white bg-black border-gray-600 hover:bg-gray-800'
                }`}
                title={isCopied ? "已复制!" : "复制提示词"}
              >
                {isCopied ? 'Copied!' : 'Copy Prompt'}
              </button>
              <div className="w-full bg-white rounded-lg px-3 py-2 pt-2">
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

