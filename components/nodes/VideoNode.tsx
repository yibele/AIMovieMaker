'use client';

import { memo, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Handle, Position, type NodeProps, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Play, Pause, Image as ImageIcon, Download, Sparkles, Trash2, RotateCcw, Send, FolderInput, ChevronDown } from 'lucide-react';
import type { VideoElement, VideoModelType, VIDEO_MODEL_CONFIG } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { toast } from 'sonner';
import { ToolbarButton } from './ToolbarButton';
import { VIDEO_NODE_DEFAULT_SIZE } from '@/lib/constants/node-sizes';
import { useVideoOperations } from '@/hooks/canvas';
import { createUpsampleVideoPlaceholder, updateVideoPlaceholders, markPlaceholdersAsError } from '@/lib/services/node-management.service';

// 行级注释：视频节点组件
function VideoNode({ data, selected, id }: NodeProps) {
  const videoData = data as unknown as VideoElement;

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [promptInput, setPromptInput] = useState(videoData.promptText || '');
  // 行级注释：使用本地 state 管理生成数量，避免频繁更新全局 store 导致卡顿
  const [generationCount, setGenerationCount] = useState(videoData.generationCount || 1);
  // 行级注释：视频模型选择（默认 veo3.1）
  const [videoModel, setVideoModel] = useState<VideoModelType>(videoData.videoModel || 'veo3.1');
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  // 行级注释：Sora2 时长选择（10 或 15 秒）
  const [sora2Duration, setSora2Duration] = useState<10 | 15>(videoData.sora2Duration || 10);
  const videoRef = useRef<HTMLVideoElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addElement = useCanvasStore((state) => state.addElement);
  const triggerVideoGeneration = useCanvasStore((state) => state.triggerVideoGeneration);
  const selection = useCanvasStore((state) => state.selection); // 行级注释：获取选中状态，用于判断是否单选
  const { setEdges, getEdges } = useReactFlow(); // 行级注释：用于创建连线和获取连线

  // 行级注释：使用视频操作 Hook（下载、删除、入库）
  const {
    isGenerating,
    canDelete,
    canUpscale,
    handleDownload,
    handleDelete,
    handleArchive,
  } = useVideoOperations(id);

  const generationStatusText = useMemo(() => {
    const hasPrompt = Boolean(videoData.promptText?.trim() || promptInput.trim());
    const hasFrame = Boolean(videoData.startImageId || videoData.endImageId);
    const isReferenceImages = videoData.generatedFrom?.type === 'reference-images';
    const hasReferenceImages = (videoData.referenceImageIds?.length || 0) > 0;
    
    // 行级注释：多图参考视频的提示文本
    if (isReferenceImages) {
      const refCount = videoData.referenceImageIds?.length || 0;
      if (refCount === 0) {
        return '请连接 1-3 张参考图片';
      }
      if (!hasPrompt) {
        return `已连接 ${refCount} 张参考图，输入提示词`;
      }
      return `已就绪：${refCount} 张参考图`;
    }
    
    if (hasPrompt && !hasFrame) {
      return '可选：连接首/尾帧图片';
    }
    if (!hasPrompt && hasFrame) {
      return '可直接发送，AI 自动分析动作';
    }
    return '输入提示词 或 连接图片';
  }, [videoData.promptText, videoData.startImageId, videoData.endImageId, videoData.generatedFrom?.type, videoData.referenceImageIds, promptInput]);
  
  // 行级注释：判断是否可以发送（有提示词 或 有图片连接）
  const canSend = useMemo(() => {
    const hasPrompt = Boolean(promptInput.trim());
    const hasFrame = Boolean(videoData.startImageId || videoData.endImageId);
    const isReferenceImages = videoData.generatedFrom?.type === 'reference-images';
    const hasReferenceImages = (videoData.referenceImageIds?.length || 0) > 0;
    
    // 行级注释：多图参考视频需要有参考图片和提示词
    if (isReferenceImages) {
      return hasReferenceImages && hasPrompt;
    }
    
    return hasPrompt || hasFrame;
  }, [promptInput, videoData.startImageId, videoData.endImageId, videoData.generatedFrom?.type, videoData.referenceImageIds]);

  // 行级注释：提示词显示逻辑（类似 ImageNode）
  const promptDisplayText = videoData.promptText?.trim() || '';
  const hasPromptDisplay = Boolean(promptDisplayText);
  const shouldShowInputPanel = (videoData.status === 'pending' || videoData.status === 'error' || !videoData.src);
  const shouldShowPromptDisplay = hasPromptDisplay && selected && !shouldShowInputPanel;

  // 行级注释：复制提示词到剪贴板
  const [isCopied, setIsCopied] = useState(false);
  const handleCopyPrompt = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (promptDisplayText) {
      try {
        await navigator.clipboard.writeText(promptDisplayText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
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

  // 行级注释：同步外部更新的 videoModel
  useEffect(() => {
    if (videoData.videoModel && videoData.videoModel !== videoModel) {
      setVideoModel(videoData.videoModel);
    }
  }, [videoData.videoModel]);

  // 行级注释：同步外部更新的 sora2Duration
  useEffect(() => {
    if (videoData.sora2Duration && videoData.sora2Duration !== sora2Duration) {
      setSora2Duration(videoData.sora2Duration);
    }
  }, [videoData.sora2Duration]);

  // 行级注释：从 store 获取 API Key 配置
  const hailuoApiKey = useCanvasStore((state) => state.apiConfig.hailuoApiKey);
  const sora2ApiKey = useCanvasStore((state) => state.apiConfig.sora2ApiKey);

  // 行级注释：视频模型配置
  const VIDEO_MODELS: Array<{ id: VideoModelType; name: string; supportsEndFrame: boolean; supportsStartFrame?: boolean; disabled?: boolean; disabledReason?: string }> = [
    { id: 'veo3.1', name: 'Veo 3.1', supportsEndFrame: true, supportsStartFrame: true },
    { id: 'hailuo-2.3', name: '海螺 2.3', supportsEndFrame: false, supportsStartFrame: true, disabled: !hailuoApiKey, disabledReason: '请先在设置中配置海螺 API Key' },
    { id: 'hailuo-2.3-fast', name: '海螺 2.3 Fast', supportsEndFrame: false, supportsStartFrame: true, disabled: !hailuoApiKey, disabledReason: '请先在设置中配置海螺 API Key' },
    { id: 'hailuo-2.0', name: '海螺 2.0', supportsEndFrame: true, supportsStartFrame: true, disabled: !hailuoApiKey, disabledReason: '请先在设置中配置海螺 API Key' },
    { id: 'sora2', name: 'Sora 2', supportsEndFrame: false, supportsStartFrame: true, disabled: !sora2ApiKey, disabledReason: '请先在设置中配置 Sora2 API Key' },
  ];

  // 行级注释：当前模型是否支持尾帧
  const currentModelSupportsEndFrame = VIDEO_MODELS.find(m => m.id === videoModel)?.supportsEndFrame ?? true;
  
  // 行级注释：当前模型是否是海螺模型
  const isHailuoModel = videoModel.startsWith('hailuo');

  // 行级注释：当前模型是否是 Sora2 模型
  const isSora2Model = videoModel === 'sora2';

  // 行级注释：canUpscale 已移至 useVideoOperations Hook

  // 处理视频点击 - 播放/暂停
  const handleVideoClick = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error('❌ 视频播放失败:', err);
          setVideoError(true);
        });
      }
    }
  };

  // 行级注释：从输入框生成视频（支持无提示词智能生成）
  const handleGenerateFromInput = useCallback(() => {
    const hasPrompt = Boolean(promptInput.trim());
    const hasFrame = Boolean(videoData.startImageId || videoData.endImageId);
    
    // 行级注释：必须有提示词或图片连接才能生成
    if (!hasPrompt && !hasFrame) {
      return;
    }



    // 行级注释：生成时同步 promptText、generationCount 和 videoModel 到 store，并设置状态为 queued
    // 如果没有提示词但有图片，promptText 留空，让 Canvas 的 maybeStartVideo 使用 VL 分析
    updateElement(id, {
      promptText: promptInput.trim() || '', // 可以为空，VL 会自动分析
      generationCount: generationCount,
      videoModel: videoModel, // 行级注释：同步视频模型选择
      sora2Duration: sora2Duration, // 行级注释：同步 Sora2 时长选择
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
    const size = videoData.size || VIDEO_NODE_DEFAULT_SIZE;

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
      videoModel: videoData.videoModel || 'veo3.1', // 复制视频模型
      sora2Duration: videoData.sora2Duration || 10, // 复制 Sora2 时长设置
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

  // 行级注释：handleDownload 已移至 useVideoOperations Hook

  // 行级注释：处理超清放大 - 使用节点管理服务创建 placeholder
  const handleUpscale = useCallback(async () => {
    if (!videoData.src || !videoData.mediaGenerationId) {
      alert('无法超清放大：缺少视频源或 mediaGenerationId');
      return;
    }

    // 行级注释：检查视频宽高比，只有 16:9 横屏支持超清
    if (!canUpscale) {
      alert('超清放大仅支持 16:9 横屏视频！\n竖屏（9:16）和方形（1:1）视频暂不支持超清功能。');
      return;
    }

    try {

      // 行级注释：使用节点管理服务创建超清视频 placeholder
      const newVideo = createUpsampleVideoPlaceholder(videoData);
      const addElement = useCanvasStore.getState().addElement;
      addElement(newVideo);

      // 行级注释：创建从原视频到超清视频的连线（连线逻辑保留在组件内）
      const edgeId = `edge-${id}-${newVideo.id}-upsample`;
      setEdges((eds: any[]) => [
        ...eds,
        {
          id: edgeId,
          source: id,
          target: newVideo.id,
          type: 'default',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2 },
        },
      ]);


      // 行级注释：调用超清 API
      const { generateVideoUpsample, pollFlowVideoOperation } = await import('@/lib/api-mock');
      const apiConfig = useCanvasStore.getState().apiConfig;

      const result = await generateVideoUpsample(
        videoData.mediaGenerationId,
        '16:9' // 超清只支持 16:9
      );


      // 行级注释：更新节点状态为 queued
      updateElement(newVideo.id, { status: 'queued' } as any);

      // 行级注释：开始轮询视频生成状态
      pollFlowVideoOperation(
        result.operationName,
        apiConfig.bearerToken,
        result.sceneId,
        apiConfig.proxy
      )
        .then((videoResult) => {

          // 行级注释：使用节点管理服务更新 placeholder 为实际视频
          updateVideoPlaceholders([newVideo.id], [{
            videoUrl: videoResult.videoUrl,
            thumbnailUrl: videoResult.thumbnailUrl,
            duration: videoResult.duration,
            mediaGenerationId: videoResult.mediaGenerationId,
          }]);

          // 行级注释：停止连线动画
          setEdges((eds: any[]) =>
            eds.map((edge: any) =>
              edge.id === edgeId ? { ...edge, animated: false } : edge
            )
          );
        })
        .catch((error) => {
          console.error('❌ 超清视频生成失败:', error);

          // 行级注释：使用节点管理服务标记为错误状态
          markPlaceholdersAsError([newVideo.id], error instanceof Error ? error.message : '未知错误');

          // 行级注释：连线变红色表示错误
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
      // 行级注释：如果在创建节点后发生错误，需要将节点标记为错误状态
      // 这样用户才能删除这个节点
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      // 行级注释：尝试找到刚创建的超清节点并标记为错误
      const elements = useCanvasStore.getState().elements;
      const upsampleNode = elements.find(
        (el) => el.type === 'video' && 
        (el as VideoElement).generatedFrom?.type === 'upsample' && 
        (el as VideoElement).generatedFrom?.sourceIds?.includes(id) &&
        (el as VideoElement).status === 'generating'
      );
      if (upsampleNode) {
        markPlaceholdersAsError([upsampleNode.id], errorMsg);
      }
      alert(`超清放大失败: ${errorMsg}`);
    }
  }, [videoData, canUpscale, id, updateElement, setEdges]);

  // 行级注释：handleArchive 已移至 useVideoOperations Hook

  // 行级注释：handleDelete 已移至 useVideoOperations Hook
  // 行级注释：isGenerating, canDelete 已从 useVideoOperations Hook 获取
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
          : 'shadow-[0_8px_24px_rgba(15,23,42,0.12)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:shadow-lg'
          }`}
        style={{ overflow: 'visible' }}
      >
        <NodeToolbar
          isVisible={selected && selection.length === 1}
          position={Position.Top}
          align="center"
          offset={15}
          className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 px-3 py-2 animate-in fade-in zoom-in-95 duration-200"
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

          {/* 删除 */}
          <ToolbarButton
            icon={<Trash2 className="w-5 h-5" />}
            label="删除"
            title="删除"
            variant="danger"
            disabled={false}
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
        ) : videoData.generatedFrom?.type === 'reference-images' ? (
          // 行级注释：多图参考视频 - 显示 3 个参考图片输入点
          <>
            <Handle
              id="ref-image-1"
              type="target"
              position={Position.Left}
              className="!flex !items-center !justify-center !w-5 !h-5 !bg-emerald-400 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
              style={{ left: '-6px', top: '30%', zIndex: '30' }}
              isConnectable={true}
              title="参考图片 1"
            >
              <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
            </Handle>
            <Handle
              id="ref-image-2"
              type="target"
              position={Position.Left}
              className="!flex !items-center !justify-center !w-5 !h-5 !bg-emerald-500 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
              style={{ left: '-6px', top: '50%', zIndex: '30' }}
              isConnectable={true}
              title="参考图片 2"
            >
              <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
            </Handle>
            <Handle
              id="ref-image-3"
              type="target"
              position={Position.Left}
              className="!flex !items-center !justify-center !w-5 !h-5 !bg-emerald-600 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125"
              style={{ left: '-6px', top: '70%', zIndex: '30' }}
              isConnectable={true}
              title="参考图片 3"
            >
              <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
            </Handle>
          </>
        ) : (
          // 行级注释：普通视频 - 显示首帧和尾帧输入点（根据模型支持情况）
          <>
            <Handle
              id="start-image"
              type="target"
              position={Position.Left}
              className={`!flex !items-center !justify-center !w-5 !h-5 !border-2 !border-white !rounded-full shadow-sm transition-transform hover:scale-125 ${isHailuoModel ? '!bg-cyan-500' : '!bg-blue-400'}`}
              style={{ left: '-6px', top: currentModelSupportsEndFrame ? '46%' : '50%', zIndex: '30' }}
              isConnectable={true}
              title="首帧图片"
            >
              <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
            </Handle>
            {/* 行级注释：只有支持尾帧的模型才显示尾帧连接点 */}
            {currentModelSupportsEndFrame && (
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
            )}
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
                    : 'text-white bg-black dark:bg-slate-900 border-gray-600 dark:border-slate-500 hover:bg-gray-800 shadow-sm cursor-pointer'
                  : 'text-gray-500 dark:text-slate-500 bg-gray-200 dark:bg-slate-600 border-gray-300 dark:border-slate-500 cursor-not-allowed'
                  }`}
                title={isGenerating ? "生成中..." : !promptInput.trim() ? "输入提示词后可复制" : isCopied ? "已复制!" : "复制提示词"}
              >
                {isCopied ? 'Copied!' : 'Copy Prompt'}
              </button>

              {/* 行级注释：背景容器 - 包含输入框和数量选择 */}
              <div className="w-full bg-white dark:bg-slate-700 rounded-lg px-3 py-2 pt-2 shadow-sm transition-shadow hover:shadow-md">
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
                  className={`w-full text-[10px] font-light text-gray-900 dark:text-slate-200 leading-relaxed border-none outline-none bg-transparent placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />

                {/* 行级注释：模型选择和数量选择 - 放在输入框下方 */}
                <div className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t border-gray-100 dark:border-slate-600 ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* 行级注释：模型选择下拉菜单 */}
                  <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsModelMenuOpen(!isModelMenuOpen);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={isGenerating}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all duration-200 ${
                        isHailuoModel 
                          ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400' 
                            : isSora2Model
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-slate-300'
                      } hover:bg-gray-200 dark:hover:bg-slate-500`}
                      title="选择视频模型"
                    >
                      <span className="max-w-[60px] truncate">{VIDEO_MODELS.find(m => m.id === videoModel)?.name || 'Veo 3.1'}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>
                    
                    {/* 行级注释：模型下拉菜单 */}
                    {isModelMenuOpen && (
                      <div 
                        className="absolute left-0 top-full mt-1 w-32 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-gray-200 dark:border-slate-600 py-1 z-50"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {VIDEO_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              // 行级注释：如果模型被禁用，显示提示并不切换
                              if (model.disabled) {
                                toast.error(model.disabledReason || '该模型不可用');
                                return;
                              }
                              setVideoModel(model.id);
                              setIsModelMenuOpen(false);
                            }}
                            disabled={model.disabled}
                            className={`w-full text-left px-2 py-1 text-[9px] font-medium transition-colors ${
                              model.disabled
                                ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                                : videoModel === model.id
                                ? model.id.startsWith('hailuo')
                                  ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
                                    : model.id === 'sora2'
                                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{model.name}</span>
                              <div className="flex items-center gap-1">
                                {model.disabled && (
                                  <span className="text-[7px] text-red-400" title={model.disabledReason}>未配置</span>
                                )}
                                {!model.supportsEndFrame && !model.disabled && (
                                <span className="text-[7px] text-orange-500" title="不支持首尾帧">无尾帧</span>
                              )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                    
                    {/* 行级注释：Sora2 时长选择（仅在选择 Sora2 模型时显示） */}
                    {isSora2Model && (
                      <div className="flex items-center bg-purple-100 dark:bg-purple-900/30 rounded-md p-0.5 gap-0.5">
                        {([10, 15] as const).map((dur) => (
                          <button
                            key={dur}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSora2Duration(dur);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            disabled={isGenerating}
                            className={`
                              px-1.5 py-0.5 flex items-center justify-center rounded text-[8px] font-medium transition-all duration-200
                              ${sora2Duration === dur
                                ? 'bg-purple-500 text-white shadow-sm'
                                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800/50'}
                            `}
                            title={`${dur} 秒视频`}
                          >
                            {dur}s
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 行级注释：数量选择 */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 font-medium select-none">数量</span>
                    <div className="flex items-center bg-gray-100 dark:bg-slate-600 rounded-md p-0.5 gap-0.5">
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
                              ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm scale-105'
                              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-200/50 dark:hover:bg-slate-600/50 hover:scale-105'}
                          `}
                          title={`生成 ${num} 个视频`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
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
                  disabled={!canSend || isGenerating}
                  className={`
                    w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 hover:scale-110
                    ${canSend && !isGenerating
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-400 dark:text-slate-500 cursor-not-allowed'}
                  `}
                  title={isGenerating ? "生成中..." : canSend ? (promptInput.trim() ? "生成视频" : "AI 智能分析生成") : "输入提示词或连接图片"}
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
        </div>
      )}
    </>
  );
}

export default memo(VideoNode);
