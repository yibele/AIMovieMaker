'use client';

import { memo, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Handle, Position, type NodeProps, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Play, Pause, Image as ImageIcon, Download, Sparkles, Trash2, RotateCcw, Send, FolderInput } from 'lucide-react';
import type { VideoElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { useMaterialsStore } from '@/lib/materials-store';
import { toast } from 'sonner';
import { ToolbarButton } from './ToolbarButton';

// 行级注释：视频节点组件
function VideoNode({ data, selected, id }: NodeProps) {
  const videoData = data as unknown as VideoElement;

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // const [isDownloading, setIsDownloading] = useState(false); // Removed
  // const [downloadProgress, setDownloadProgress] = useState(0); // Removed
  const [promptInput, setPromptInput] = useState(videoData.promptText || '');
  // 行级注释：使用本地 state 管理生成数量，避免频繁更新全局 store 导致卡顿
  const [generationCount, setGenerationCount] = useState(videoData.generationCount || 1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addElement = useCanvasStore((state) => state.addElement);
  const triggerVideoGeneration = useCanvasStore((state) => state.triggerVideoGeneration);
  const selection = useCanvasStore((state) => state.selection); // 行级注释：获取选中状态，用于判断是否单选
  const { setEdges, getEdges } = useReactFlow(); // 行级注释：用于创建连线和获取连线

  const generationStatusText = useMemo(() => {
    const hasPrompt = Boolean(videoData.promptText?.trim() || promptInput.trim());
    const hasFrame = Boolean(videoData.startImageId || videoData.endImageId);
    if (hasPrompt && !hasFrame) {
      return '可选：连接首/尾帧图片';
    }
    if (!hasPrompt && hasFrame) {
      return '输入提示词后生成';
    }
    return '在下方输入框输入提示词';
  }, [videoData.promptText, videoData.startImageId, videoData.endImageId, promptInput]);

  // 行级注释：提示词显示逻辑（类似 ImageNode）
  const promptDisplayText = videoData.promptText?.trim() || '';
  const hasPromptDisplay = Boolean(promptDisplayText);
  const shouldShowInputPanel = (videoData.status === 'pending' || videoData.status === 'error' || !videoData.src);
  const shouldShowPromptDisplay = hasPromptDisplay && selected && !shouldShowInputPanel;

  // 行级注释：复制提示词到剪贴板
  const [isCopied, setIsCopied] = useState(false);
  const handleCopyPrompt = useCallback(() => {
    if (promptDisplayText) {
      navigator.clipboard.writeText(promptDisplayText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [promptDisplayText]);


  // 行级注释：同步外部更新的 promptText
  useEffect(() => {
    if (videoData.promptText && videoData.promptText !== promptInput) {
      setPromptInput(videoData.promptText);
    }
  }, [videoData.promptText]);

  // 行级注释：同步外部更新的 generationCount
  useEffect(() => {
    if (videoData.generationCount && videoData.generationCount !== generationCount) {
      setGenerationCount(videoData.generationCount);
    }
  }, [videoData.generationCount]);

  // 行级注释：检查是否支持超清（只有 16:9 横屏支持）
  const canUpscale = useMemo(() => {
    if (!videoData.src || !videoData.mediaGenerationId) return false;

    const width = videoData.size?.width || 640;
    const height = videoData.size?.height || 360;
    const ratio = width / height;

    // 行级注释：只有 16:9 横屏视频支持超清（竖屏 9:16 和方形 1:1 不支持）
    return Math.abs(ratio - 16 / 9) < 0.1;
  }, [videoData.src, videoData.mediaGenerationId, videoData.size]);

  // 处理视频点击 - 播放/暂停
  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        console.log('🎬 尝试播放视频:', videoData.src);
        videoRef.current.play().then(() => {
          console.log('✅ 视频播放成功');
          setIsPlaying(true);
        }).catch((err) => {
          console.error('❌ 视频播放失败:', err);
          setVideoError(true);
        });
      }
    }
  };

  // 行级注释：从输入框生成视频
  const handleGenerateFromInput = useCallback(() => {
    if (!promptInput.trim()) {
      return;
    }

    console.log('🎬 VideoNode: 开始生成视频', {
      promptInput: promptInput.trim(),
      generationCount,
      videoData
    });

    // 行级注释：生成时同步 promptText 和 generationCount 到 store，并设置状态为 queued
    updateElement(id, {
      promptText: promptInput.trim(),
      generationCount: generationCount,
      status: 'queued' // 行级注释：设置为 queued 状态，触发生成流程
    } as any);

    // 行级注释：触发生成（延迟以确保状态已更新）
    setTimeout(() => {
      triggerVideoGeneration?.(id);
    }, 100);
  }, [id, promptInput, generationCount, videoData, updateElement, triggerVideoGeneration]);

  // 处理重新生成 - 创建新节点并复制配置和连线
  const handleRegenerate = useCallback(() => {
    const newVideoId = `video-${Date.now()}`;
    const size = videoData.size || { width: 480, height: 270 };

    // 行级注释：新节点位置在原节点右侧
    const newPosition = {
      x: videoData.position.x + size.width + 50,
      y: videoData.position.y,
    };

    // 行级注释：创建新视频节点，复制原节点的配置
    const newVideo: VideoElement = {
      id: newVideoId,
      type: 'video',
      src: '',
      thumbnail: '',
      duration: 0,
      status: 'queued', // 直接设置为 queued，自动开始生成
      position: newPosition,
      size: size,
      promptText: videoData.promptText || '', // 复制提示词
      startImageId: videoData.startImageId, // 复制首帧图片 ID
      endImageId: videoData.endImageId, // 复制尾帧图片 ID
      generationCount: 1, // 重新生成默认 1 个
      readyForGeneration: true,
      generatedFrom: videoData.generatedFrom, // 复制生成来源信息
    };

    addElement(newVideo);

    // 行级注释：复制连线 - 查找原节点的输入连线
    const currentEdges = getEdges();
    const incomingEdges = currentEdges.filter((edge: any) => edge.target === id);

    // 行级注释：为新节点创建相同的连线
    if (incomingEdges.length > 0) {
      setEdges((eds: any[]) => [
        ...eds,
        ...incomingEdges.map((edge: any) => ({
          ...edge,
          id: `${edge.id}-regen-${Date.now()}`, // 新的连线 ID
          target: newVideoId, // 指向新节点
        })),
      ]);
    }

    // 行级注释：触发新节点的生成
    setTimeout(() => {
      triggerVideoGeneration?.(newVideoId);
    }, 100);
  }, [id, videoData, addElement, getEdges, setEdges, triggerVideoGeneration]);

  // 行级注释：处理下载视频 - 直接打开 URL
  const handleDownload = useCallback(() => {
    if (!videoData.src) {
      console.error('没有可下载的视频源');
      return;
    }
    window.open(videoData.src, '_blank');
  }, [videoData.src]);

  // 行级注释：处理超清放大 - 创建新视频节点并生成超清版本
  const handleUpscale = useCallback(async () => {
    if (!videoData.src || !videoData.mediaGenerationId) {
      alert('无法超清放大：缺少视频源或 mediaGenerationId');
      return;
    }

    // 行级注释：检查视频宽高比，只有 16:9 横屏支持超清
    const width = videoData.size?.width || 640;
    const height = videoData.size?.height || 360;
    const ratio = width / height;

    if (Math.abs(ratio - 16 / 9) >= 0.1) {
      alert('超清放大仅支持 16:9 横屏视频！\n竖屏（9:16）和方形（1:1）视频暂不支持超清功能。');
      return;
    }

    try {
      console.log('🎬 开始超清放大:', { mediaGenerationId: videoData.mediaGenerationId });

      // 行级注释：获取原视频的宽高比
      const getAspectRatio = (): '16:9' | '9:16' | '1:1' => {
        const width = videoData.size?.width || 640;
        const height = videoData.size?.height || 360;
        const ratio = width / height;
        if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
        if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
        return '1:1';
      };

      const aspectRatio = getAspectRatio();

      // 行级注释：计算新视频节点位置（在原视频右侧）
      const newPosition = {
        x: videoData.position.x + (videoData.size?.width || 640) + 50,
        y: videoData.position.y,
      };

      // 行级注释：创建新视频节点尺寸（与原视频相同）
      const size = videoData.size || { width: 640, height: 360 };

      // 行级注释：创建新的超清视频节点（placeholder）
      const newVideoId = `video-${Date.now()}`;
      const newVideo: import('@/lib/types').VideoElement = {
        id: newVideoId,
        type: 'video',
        src: '',
        thumbnail: '',
        duration: 0,
        status: 'generating',
        progress: 0,
        position: newPosition,
        size: size,
        promptText: '超清放大：' + (videoData.promptText || '视频'),
        generatedFrom: {
          type: 'upsample', // 行级注释：标记为超清放大类型
          sourceIds: [id],
          prompt: '超清放大',
        },
      };

      // 行级注释：添加节点到画布
      updateElement(id, {} as any); // 行级注释：触发 re-render
      const addElement = useCanvasStore.getState().addElement;
      addElement(newVideo);

      // 行级注释：创建从原视频到超清视频的连线
      const edgeId = `edge-${id}-${newVideoId}-upsample`;
      setEdges((eds: any[]) => [
        ...eds,
        {
          id: edgeId,
          source: id,
          target: newVideoId,
          type: 'default',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 }, // 行级注释：紫色表示超清
        },
      ]);

      console.log('✅ 创建超清视频 placeholder 和连线:', newVideoId);

      // 行级注释：调用超清 API
      const { generateVideoUpsample, pollFlowVideoOperation } = await import('@/lib/api-mock');
      const apiConfig = useCanvasStore.getState().apiConfig;

      const result = await generateVideoUpsample(
        videoData.mediaGenerationId,
        aspectRatio
      );

      console.log('✅ 超清请求已发起:', result);

      // 行级注释：更新节点状态为 queued
      updateElement(newVideoId, {
        status: 'queued',
      } as any);

      // 行级注释：开始轮询视频生成状态
      pollFlowVideoOperation(
        result.operationName,
        apiConfig.bearerToken,
        result.sceneId,
        apiConfig.proxy
      )
        .then((videoResult) => {
          console.log('✅ 超清视频生成完成:', videoResult);

          // 行级注释：更新节点为完成状态
          updateElement(newVideoId, {
            src: videoResult.videoUrl,
            thumbnail: videoResult.thumbnailUrl,
            duration: videoResult.duration,
            mediaGenerationId: videoResult.mediaGenerationId,
            status: 'ready',
            progress: 100,
          } as any);

          // 行级注释：停止连线动画
          const edgeId = `edge-${id}-${newVideoId}-upsample`;
          setEdges((eds: any[]) =>
            eds.map((edge: any) =>
              edge.id === edgeId
                ? { ...edge, animated: false }
                : edge
            )
          );
        })
        .catch((error) => {
          console.error('❌ 超清视频生成失败:', error);

          // 行级注释：更新节点为错误状态
          updateElement(newVideoId, {
            status: 'error',
            progress: 0,
          } as any);

          // 行级注释：连线变红色表示错误
          const edgeId = `edge-${id}-${newVideoId}-upsample`;
          setEdges((eds: any[]) =>
            eds.map((edge: any) =>
              edge.id === edgeId
                ? { ...edge, animated: false, style: { stroke: '#ef4444', strokeWidth: 2 } }
                : edge
            )
          );

          alert(`超清放大失败: ${error instanceof Error ? error.message : '未知错误'}`);
        });

    } catch (error) {
      console.error('❌ 超清放大失败:', error);
      alert(`超清放大失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [videoData.src, videoData.mediaGenerationId, videoData.size, videoData.position, videoData.promptText, id, updateElement]);

  // 入库（归档到精选素材）
  const handleArchive = useCallback(async () => {
    if (!videoData.src) {
      toast.error('视频未生成，无法入库');
      return;
    }

    try {
      const { addMaterial } = useMaterialsStore.getState();
      const apiConfig = useCanvasStore.getState().apiConfig;

      // Calculate aspect ratio
      let aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' = '16:9';
      if (videoData.size) {
        const { width = 640, height = 360 } = videoData.size;
        const ratio = width / height;
        if (Math.abs(ratio - 16 / 9) < 0.1) aspectRatio = '16:9';
        else if (Math.abs(ratio - 9 / 16) < 0.1) aspectRatio = '9:16';
        else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
        else if (Math.abs(ratio - 4 / 3) < 0.1) aspectRatio = '4:3';
      }

      await addMaterial({
        type: 'video',
        name: videoData.promptText || 'Untitled Video',
        src: videoData.src,
        thumbnail: videoData.thumbnail || videoData.src,
        mediaGenerationId: videoData.mediaGenerationId || '',
        metadata: {
          prompt: videoData.promptText,
          width: videoData.size?.width,
          height: videoData.size?.height,
          duration: videoData.duration,
          aspectRatio: aspectRatio,
        },
        projectId: apiConfig.projectId,
      });
      toast.success('已添加到精选素材库');
    } catch (error) {
      console.error('入库失败:', error);
      toast.error('入库失败，请重试');
    }
  }, [videoData]);

  // 处理删除 - 生成中不允许删除
  const handleDelete = useCallback(() => {
    // 行级注释：如果正在生成，禁止删除
    if (videoData.status === 'queued' || videoData.status === 'generating') {
      alert('视频正在生成中，无法删除');
      return;
    }

    const deleteElement = useCanvasStore.getState().deleteElement;
    deleteElement(id);
  }, [id, videoData.status]);

  // 状态判断
  const isGenerating = videoData.status === 'queued' || videoData.status === 'generating';
  const isReady = videoData.status === 'ready';
  const hasSource = Boolean(videoData.src);

  // 动画控制透明度
  const loadingOpacity = isGenerating ? 1 : 0;
  const contentOpacity = isReady && hasSource ? 1 : 0;
  const pendingOpacity = videoData.status === 'pending' ? 1 : 0;

  return (
    <>
      <div
        className={`relative rounded-xl transition-all duration-300 ease-out w-full h-full ${selected
          ? 'ring-2 ring-blue-500 shadow-[0_10px_40px_rgba(59,130,246,0.25)] scale-[1.01]'
          : 'shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:shadow-lg'
          }`}
        style={{ overflow: 'visible', backgroundColor: '#fff' }}
      >
        <NodeToolbar
          isVisible={selected && selection.length === 1}
          position={Position.Top}
          align="center"
          offset={15}
          className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 px-3 py-2 animate-in fade-in zoom-in-95 duration-200"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* 重新生成 - 只在 ready 或 error 状态时可用 */}
          <ToolbarButton
            icon={<RotateCcw className="w-5 h-5" />}
            label="重新生成"
            title={videoData.status === 'ready' ? '重新生成' : '生成/重新生成'}
            disabled={videoData.status === 'generating' || videoData.status === 'queued'}
            onClick={() => handleRegenerate()}
          />

          {/* 入库 - 保存到精选素材库 */}
          <ToolbarButton
            icon={<FolderInput className="w-5 h-5" />}
            label="入库"
            title="保存到精选素材库"
            disabled={!videoData.src}
            onClick={() => handleArchive()}
          />

          {/* 下载视频 - 只在有视频源时可用 */}
          <ToolbarButton
            icon={<Download className="w-5 h-5" />}
            label="下载"
            title="下载视频"
            disabled={!videoData.src}
            onClick={() => handleDownload()}
          />

          {/* 超清放大 - 只有 16:9 横屏视频支持 */}
          <ToolbarButton
            icon={<Sparkles className="w-5 h-5" />}
            label="超清放大"
            title={canUpscale ? "超清放大 (1080p)" : "超清放大仅支持 16:9 横屏视频"}
            disabled={!canUpscale}
            onClick={() => handleUpscale()}
          />

          {/* 删除 - 生成中禁用 */}
          <ToolbarButton
            icon={<Trash2 className="w-5 h-5" />}
            label="删除"
            title={isGenerating ? "生成中无法删除" : "删除"}
            variant="danger"
            disabled={isGenerating}
            onClick={() => handleDelete()}
          />
        </NodeToolbar>


        {/* 行级注释：根据视频类型显示不同的输入连接点 */}
        {videoData.generatedFrom?.type === 'upsample' ? (
          // 行级注释：超清放大视频 - 只显示一个输入点
          <Handle
            type="target"
            position={Position.Left}
            className="!flex !items-center !justify-center !w-5 !h-5 !bg-purple-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
            style={{ left: '-6px', top: '50%', zIndex: '30' }}
            isConnectable={true}
            title="原始视频"
          >
            <Sparkles className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
          </Handle>
        ) : videoData.generatedFrom?.type === 'extend' ? (
          // 行级注释：延长视频 - 只显示一个简单的输入点
          <Handle
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
            style={{ left: '-6px', top: '50%', zIndex: '30' }}
            isConnectable={true}
            title="原始视频"
          />
        ) : videoData.generatedFrom?.type === 'reshoot' ? (
          // 行级注释：镜头控制重拍 - 只显示一个简单的输入点
          <Handle
            type="target"
            position={Position.Left}
            className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
            style={{ left: '-6px', top: '50%', zIndex: '30' }}
            isConnectable={true}
            title="原始视频"
          />
        ) : (
          // 行级注释：普通视频 - 显示首帧和尾帧输入点
          <>
            <Handle
              id="start-image"
              type="target"
              position={Position.Left}
              className="!flex !items-center !justify-center !w-5 !h-5 !bg-blue-400 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
              style={{ left: '-6px', top: '46%', zIndex: '30' }}
              isConnectable={true}
              title="首帧图片"
            >
              <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
            </Handle>
            <Handle
              id="end-image"
              type="target"
              position={Position.Left}
              className="!flex !items-center !justify-center !w-5 !h-5 !bg-blue-600 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
              style={{ left: '-6px', top: '54%', zIndex: '30' }}
              isConnectable={true}
              title="尾帧图片"
            >
              <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
            </Handle>
          </>
        )}

        <div
          className={`absolute inset-0 rounded-xl overflow-hidden bg-black`}
        >
          {/* 1. 待配置状态 (Pending) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 transition-opacity duration-500"
            style={{ opacity: pendingOpacity, pointerEvents: pendingOpacity > 0.5 ? 'auto' : 'none' }}
          >
            <div className="text-gray-400 text-xs tracking-wide">{generationStatusText}</div>
          </div>

          {/* 2. 加载状态 (Loading) */}
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 transition-opacity duration-700 ease-in-out"
            style={{ opacity: loadingOpacity, pointerEvents: loadingOpacity > 0.5 ? 'auto' : 'none' }}
          >
            <div className="loading-glow w-[85%] h-[85%] rounded-[24px]" data-variant="compact" />
          </div>

          {/* 3. 已完成状态 (Content) - 视频/封面 */}
          <div
            className="w-full h-full absolute inset-0 z-10 transition-all duration-700 ease-out"
            style={{
              opacity: contentOpacity,
              transform: isReady ? 'scale(1)' : 'scale(1.05)',
              pointerEvents: contentOpacity > 0.5 ? 'auto' : 'none'
            }}
          >
            <div className="relative w-full h-full cursor-pointer" onClick={handleVideoClick}>
              {/* 缩略图 */}
              {!isPlaying && videoData.thumbnail && (
                <img
                  src={videoData.thumbnail}
                  alt="视频封面"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 animate-in fade-in duration-500"
                />
              )}

              {/* Video 元素 */}
              {videoData.src && (
                <video
                  ref={videoRef}
                  src={videoData.src}
                  preload="metadata"
                  className={`w-full h-full object-cover transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                  loop
                  playsInline
                  onEnded={() => setIsPlaying(false)}
                  onError={(e) => {
                    console.error('❌ 视频加载失败:', e);
                    console.error('视频 URL:', videoData.src);
                    setVideoError(true);
                  }}
                />
              )}

              {/* 播放按钮遮罩 */}
              {!videoError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center
                      bg-black/50 backdrop-blur-sm
                      transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
                      ${isPlaying ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}
                      group-hover:scale-110
                    `}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-0.5" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>



          {/* 错误状态 */}
          {videoData.status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-30 animate-in fade-in">
              <div className="text-gray-500 text-xs">生成失败</div>
            </div>
          )}

        </div>

        {/* 输出连接点（右侧） - 移到 overflow-hidden 容器外 */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
          style={{ right: '-6px', top: '50%', zIndex: 30 }}
          isConnectable={true}
        />
      </div>

      {/* 行级注释：视频生成输入面板 - 只在 pending 或 error 状态显示 */}
      {shouldShowInputPanel && (
        <div
          className="absolute left-0 right-0 flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in duration-300"
          style={{
            top: '100%',
            marginTop: '12px',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          <div
            className="w-full relative"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="relative">
              {/* 行级注释：顶部标签 - 可点击复制提示词 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (promptInput.trim() && !isGenerating) {
                    navigator.clipboard.writeText(promptInput.trim());
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={!promptInput.trim() || isGenerating}
                className={`absolute -top-1.5 left-2 text-[6px] font-semibold uppercase tracking-wider leading-none px-2 py-0.5 z-10 border rounded transition-all duration-200 transform active:scale-95 ${promptInput.trim() && !isGenerating
                  ? isCopied
                    ? 'text-gray-400 bg-gray-600 border-gray-600 cursor-pointer'
                    : 'text-white bg-black border-gray-600 hover:bg-gray-800 shadow-sm cursor-pointer'
                  : 'text-gray-500 bg-gray-200 border-gray-300 cursor-not-allowed'
                  }`}
                title={isGenerating ? "生成中..." : !promptInput.trim() ? "输入提示词后可复制" : isCopied ? "已复制!" : "复制提示词"}
              >
                {isCopied ? 'Copied!' : 'Copy Prompt'}
              </button>

              {/* 行级注释：白色背景容器 - 包含输入框和数量选择 */}
              <div className="w-full bg-white rounded-lg px-3 py-2 pt-2 shadow-sm transition-shadow hover:shadow-md">
                {/* 行级注释：输入框 */}
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && promptInput.trim() && !isGenerating) {
                      handleGenerateFromInput();
                    }
                    e.stopPropagation();
                  }}
                  placeholder="输入视频描述，按 Enter 生成..."
                  disabled={isGenerating}
                  className={`w-full text-[10px] font-light text-gray-1000 leading-relaxed border-none outline-none bg-transparent placeholder:text-gray-400 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />

                {/* 行级注释：数量选择 - 放在输入框下方，只更新本地状态，不频繁触发全局更新 */}
                <div className={`flex items-center gap-2 mt-2 pt-1 border-t border-gray-100 ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span className="text-[9px] text-gray-400 font-medium select-none">生成数量</span>
                  <div className="flex items-center bg-gray-100 rounded-md p-0.5 gap-0.5">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // 行级注释：只更新本地 state，避免频繁更新全局 store 导致卡顿
                          setGenerationCount(num);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        disabled={isGenerating}
                        className={`
                          w-5 h-4 flex items-center justify-center rounded text-[9px] font-medium transition-all duration-200
                          ${generationCount === num
                            ? 'bg-white text-blue-600 shadow-sm scale-105'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 hover:scale-105'}
                        `}
                        title={`生成 ${num} 个视频`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 行级注释：纸飞机生成按钮 - 飘在输入框右侧 */}
              <div className="absolute -right-8 top-0 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateFromInput();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={!promptInput.trim() || isGenerating}
                  className={`
                    w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 hover:scale-110
                    ${promptInput.trim() && !isGenerating
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                  `}
                  title={isGenerating ? "生成中..." : "生成视频"}
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 行级注释：提示词显示面板 - 选中且已生成时显示（类似 ImageNode） */}
      {shouldShowPromptDisplay && (
        <div
          className="absolute left-0 right-0 flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in duration-300"
          style={{
            top: '100%',
            marginTop: '12px',
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          <div
            className="w-full relative"
            style={{ pointerEvents: 'auto' }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="relative group">
              <button
                onClick={handleCopyPrompt}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
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
        </div>
      )}
    </>
  );
}

export default memo(VideoNode);
