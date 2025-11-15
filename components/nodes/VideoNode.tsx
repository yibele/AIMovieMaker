'use client';

import { memo, useState, useRef, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, NodeResizer, NodeToolbar } from '@xyflow/react';
import { Play, Pause, Image as ImageIcon, Type, Download, Sparkles, Trash2, RotateCcw } from 'lucide-react';
import type { VideoElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { useNodeResize } from '@/lib/node-resize-helpers';

// 行级注释：视频节点组件
function VideoNode({ data, selected, id }: NodeProps) {
  const videoData = data as unknown as VideoElement;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const triggerVideoGeneration = useCanvasStore((state) => state.triggerVideoGeneration);

  const generationStatusText = useMemo(() => {
    const hasPrompt = Boolean(videoData.promptText?.trim());
    const hasFrame = Boolean(videoData.startImageId || videoData.endImageId);
    if (hasPrompt && !hasFrame) {
      return '等待首/尾帧';
    }
    if (!hasPrompt && hasFrame) {
      return '等待提示词';
    }
    return '等待首尾帧与提示词';
  }, [videoData.promptText, videoData.startImageId, videoData.endImageId]);

  const canGenerate =
    Boolean(videoData.readyForGeneration) &&
    videoData.status !== 'generating' &&
    videoData.status !== 'queued';
  const generateButtonLabel =
    videoData.status === 'ready' || videoData.status === 'error' ? '重新生成' : '生成视频';

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

  // 行级注释：使用共享的 resize 逻辑
  const { handleResizeStart, handleResize, handleResizeEnd } = useNodeResize(id);

  const handleGenerateClick = useCallback(() => {
    if (!canGenerate) {
      return;
    }
    setIsPlaying(false);
    setVideoError(false);
    updateElement(id, {
      status: 'queued',
      progress: 0,
      src: '',
      thumbnail: '',
      duration: 0,
    } as Partial<VideoElement>);
    triggerVideoGeneration?.(id);
  }, [canGenerate, id, triggerVideoGeneration, updateElement]);

  // 处理重新生成
  const handleRegenerate = useCallback(() => {
    setIsPlaying(false);
    setVideoError(false);
    updateElement(id, {
      status: 'queued',
      progress: 0,
      src: '',
      thumbnail: '',
      duration: 0,
    } as Partial<VideoElement>);
    triggerVideoGeneration?.(id);
  }, [id, triggerVideoGeneration, updateElement]);

  // 处理下载视频
  const handleDownload = useCallback(() => {
    if (videoData.src) {
      const link = document.createElement('a');
      link.href = videoData.src;
      link.download = `morpheus-video-${id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [videoData.src, id]);

  // 处理超清放大
  const handleUpscale = useCallback(() => {
    if (videoData.src && videoData.mediaGenerationId) {
      // TODO: 实现超清放大功能
      console.log('开始超清放大:', { mediaGenerationId: videoData.mediaGenerationId });
      alert('超清放大功能开发中...');
    }
  }, [videoData.src, videoData.mediaGenerationId]);

  // 处理删除
  const handleDelete = useCallback(() => {
    // TODO: 实现删除功能
    console.log('删除视频节点:', id);
    alert('删除功能开发中...');
  }, [id]);

  const renderLoadingOverlay = useCallback(
    () => (
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="loading-glow w-full h-full rounded-2xl" />
      </div>
    ),
    []
  );

  return (
    <>
      {/* NodeResizer - 极简风格 */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        maxWidth={800}
        maxHeight={600}
        keepAspectRatio={true}
        isVisible={selected}
        color="#3b82f6"
        handleStyle={{
          width: '8px',
          height: '8px',
          borderRadius: '1px',
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
            ? 'ring-2 ring-blue-500/80 shadow-[0_10px_40px_rgba(59,130,246,0.25)]'
            : 'border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.12)]'
        }`}
        style={{ overflow: 'visible', backgroundColor: '#fff' }}
      >
        <NodeToolbar
          isVisible={selected}
          position={Position.Top}
          align="center"
          offset={15}
          className="flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200 px-3 py-2"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* 重新生成 - 只在 ready 或 error 状态时可用 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRegenerate();
            }}
            disabled={videoData.status === 'generating' || videoData.status === 'queued'}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={videoData.status === 'ready' ? '重新生成' : '生成/重新生成'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>重新生成</span>
          </button>

          {/* 下载视频 - 只在有视频源时可用 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            disabled={!videoData.src}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="下载视频"
          >
            <Download className="w-3 h-3" />
            <span>下载</span>
          </button>

          {/* 超清放大 - 只在有视频源时可用 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpscale();
            }}
            disabled={!videoData.src}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="超清放大"
          >
            <Sparkles className="w-3 h-3" />
            <span>超清放大</span>
          </button>

          {/* 删除 - 始终可用 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="删除"
          >
            <Trash2 className="w-3 h-3" />
            <span>删除</span>
          </button>
        </NodeToolbar>

        {/* 生成按钮 - 只在准备就绪时显示 */}
        {videoData.readyForGeneration && !selected && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            <button
              onClick={handleGenerateClick}
              disabled={!canGenerate}
              className={`px-4 py-1.5 backdrop-blur-xl rounded-xl shadow-2xl border text-xs font-medium transition-all ${
                canGenerate
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'bg-gray-700 text-gray-300 cursor-not-allowed'
              }`}
            >
              {generateButtonLabel}
            </button>
          </div>
        )}

        {/* 输入连接点 - 首帧 / 提示词 / 尾帧（左侧竖排） */}
        <Handle
          id="start-image"
          type="target"
          position={Position.Left}
          className="!flex !items-center !justify-center !w-5 !h-5 !bg-blue-300 !border-2 !border-white !rounded-full shadow-sm"
          style={{ left: '-6px', top: '44%' ,zIndex:'30'}}
          isConnectable={true}
          title="首帧图片" // 行级注释：提供鼠标悬浮提示
        >
           <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />
        </Handle>
        <Handle
          id="prompt-text"
          type="target"
          position={Position.Left}
          className="!flex !items-center !justify-center !w-6 !h-6 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm"
          style={{ left: '-6px', top: '50%' ,zIndex:'30'}}
          isConnectable={true}
          title="提示词文本" // 行级注释：提示该连接点接受文字
        >
          <Type className="w-3 h-3 text-white" strokeWidth={2.5} />{/* 行级注释：使用文字图标替代手写 T */}
        </Handle>
        <Handle
          id="end-image"
          type="target"
          position={Position.Left}
          className="!flex !items-center !justify-center !w-5 !h-5 !bg-blue-700 !border-2 !border-white !rounded-full shadow-sm"
          style={{ left: '-6px', top: '56%' ,zIndex:'30'}}
          isConnectable={true}
          title="尾帧图片" // 行级注释：说明该连接点用于尾帧
        >
          <ImageIcon className="w-2 h-2 text-white" strokeWidth={2.5} />{/* 行级注释：复用图片图标表示尾帧 */}
        </Handle>

        <div
          className={`absolute inset-0 rounded-lg overflow-hidden ${
            videoData.status === 'ready' && !videoError ? 'bg-transparent' : 'bg-black'
          }`}
        >
          {/* 待配置状态 */}
          {videoData.status === 'pending' && !videoData.readyForGeneration && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <div className="text-gray-400 text-xs tracking-wide">{generationStatusText}</div>
            </div>
          )}

          {videoData.status === 'pending' && videoData.readyForGeneration && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <div className="text-gray-300 text-xs tracking-wide">准备就绪，点击上方生成</div>
            </div>
          )}

          {(videoData.status === 'queued' || videoData.status === 'generating') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="loading-glow w-[85%] h-[85%] rounded-[24px]" data-variant="compact" />
            </div>
          )}

          {/* 已完成 - 显示封面，点击播放视频 */}
          {videoData.status === 'ready' && (
            <div
              className="w-full h-full cursor-pointer relative bg-black"
              onClick={handleVideoClick}
            >
              {!isPlaying && videoData.thumbnail && (
                <img
                  src={videoData.thumbnail}
                  alt="视频封面"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}
              <video
                ref={videoRef}
                src={videoData.src}
                className={`w-full h-full object-contain ${isPlaying ? 'block' : 'hidden'}`}
                loop
                playsInline
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error('❌ 视频加载失败:', e);
                  console.error('视频 URL:', videoData.src);
                  setVideoError(true);
                }}
                onLoadedData={() => {
                  console.log('✅ 视频加载完成');
                }}
              />
              {!videoError && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div 
                    className={`
                      w-16 h-16 rounded-full flex items-center justify-center
                      bg-black/50 backdrop-blur-sm 
                      transition-all duration-200
                      ${isPlaying ? 'opacity-0' : 'opacity-100'}
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
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-gray-500 text-xs">视频加载失败</div>
                </div>
              )}
            </div>
          )}

          {videoData.status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-gray-500 text-xs">生成失败</div>
            </div>
          )}

          {/* 输出连接点（右侧） */}
          <Handle
            type="source"
            position={Position.Right}
            className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm"
            style={{ right: '-6px', top: '50%' }}
            isConnectable={true}
          />
        </div>
      </div>
    </>
  );
}

export default memo(VideoNode);
