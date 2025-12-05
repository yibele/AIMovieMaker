/**
 * 视频操作 Hook
 * 
 * 职责：处理视频节点的各种操作
 * - 超清放大、镜头控制、视频延长
 * - 复制、删除、入库、下载
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { VideoElement, ReshootMotionType } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import {
  upsampleVideo,
  reshootVideo,
  extendVideo,
} from '@/lib/services/video-generation.service';
import { getVideoNodeSize, detectAspectRatio } from '@/lib/constants/node-sizes';
import { toast } from 'sonner';

/**
 * 视频操作 Hook 返回值
 */
export interface UseVideoOperationsReturn {
  // 状态
  videoData: VideoElement | undefined;
  isGenerating: boolean;
  canDelete: boolean;
  canUpscale: boolean;
  
  // 操作
  handleUpscale: () => Promise<void>;
  handleReshoot: (motionType: ReshootMotionType) => Promise<void>;
  handleExtend: (prompt: string) => Promise<void>;
  handleDuplicate: () => void;
  handleDelete: () => void;
  handleArchive: () => Promise<void>;
  handleDownload: () => void;
}

/**
 * 视频操作 Hook
 * 
 * @param videoId 视频节点 ID
 * @returns 视频操作函数和状态
 */
export function useVideoOperations(videoId: string): UseVideoOperationsReturn {
  // 获取视频数据
  const videoData = useCanvasStore(state =>
    state.elements.find(el => el.id === videoId && el.type === 'video') as VideoElement | undefined
  );

  const { addElement, updateElement, deleteElement, setSelection } = useCanvasStore(
    useShallow(state => ({
      addElement: state.addElement,
      updateElement: state.updateElement,
      deleteElement: state.deleteElement,
      setSelection: state.setSelection,
    }))
  );

  // 计算状态
  const isGenerating = useMemo(() => {
    if (!videoData) return false;
    return videoData.status === 'generating' || videoData.status === 'queued';
  }, [videoData]);

  const canDelete = useMemo(() => {
    return !isGenerating;
  }, [isGenerating]);

  // 是否可以超清（只有 16:9 支持）
  const canUpscale = useMemo(() => {
    if (!videoData?.src || !videoData?.mediaGenerationId) return false;

    const width = videoData.size?.width || 640;
    const height = videoData.size?.height || 360;
    const ratio = width / height;

    return Math.abs(ratio - 16 / 9) < 0.1;
  }, [videoData]);

  // 创建新视频节点的辅助函数
  const createNewVideoNode = useCallback((
    status: VideoElement['status'],
    promptText?: string,
    generatedFrom?: VideoElement['generatedFrom']
  ): string => {
    if (!videoData) return '';

    const aspectRatio = detectAspectRatio(
      videoData.size?.width || 640,
      videoData.size?.height || 360
    ) as '16:9' | '9:16';

    const size = getVideoNodeSize(aspectRatio);
    const newNodeId = `video-${Date.now()}`;

    const newNode: VideoElement = {
      id: newNodeId,
      type: 'video',
      src: '',
      thumbnail: '',
      duration: 0,
      status,
      position: {
        x: videoData.position.x + (videoData.size?.width || 640) + 50,
        y: videoData.position.y,
      },
      size,
      promptText,
      generatedFrom,
    };

    addElement(newNode);
    return newNodeId;
  }, [videoData, addElement]);

  // 超清放大
  const handleUpscale = useCallback(async () => {
    if (!videoData || !canUpscale) {
      toast.error('超清放大仅支持 16:9 横屏视频');
      return;
    }

    const newNodeId = createNewVideoNode(
      'generating',
      '超清放大：' + (videoData.promptText || '视频'),
      {
        type: 'upsample',
        sourceIds: [videoId],
        prompt: '超清放大',
      }
    );

    try {
      const result = await upsampleVideo(videoData);

      updateElement(newNodeId, {
        status: 'ready',
        src: result.videoUrl,
        thumbnail: result.thumbnailUrl,
        duration: result.duration,
        mediaGenerationId: result.mediaGenerationId,
        progress: 100,
      } as Partial<VideoElement>);

      toast.success('超清放大完成');
    } catch (error) {
      updateElement(newNodeId, { status: 'error' } as Partial<VideoElement>);
      toast.error(error instanceof Error ? error.message : '超清放大失败');
    }
  }, [videoData, videoId, canUpscale, createNewVideoNode, updateElement]);

  // 镜头控制重拍
  const handleReshoot = useCallback(async (motionType: ReshootMotionType) => {
    if (!videoData) return;

    const newNodeId = createNewVideoNode(
      'generating',
      `镜头控制：${motionType}`,
      {
        type: 'reshoot',
        sourceIds: [videoId],
      }
    );

    try {
      const result = await reshootVideo(videoData, motionType);

      updateElement(newNodeId, {
        status: 'ready',
        src: result.videoUrl,
        thumbnail: result.thumbnailUrl,
        duration: result.duration,
        mediaGenerationId: result.mediaGenerationId,
        progress: 100,
      } as Partial<VideoElement>);

      toast.success('镜头控制完成');
    } catch (error) {
      updateElement(newNodeId, { status: 'error' } as Partial<VideoElement>);
      toast.error(error instanceof Error ? error.message : '镜头控制失败');
    }
  }, [videoData, videoId, createNewVideoNode, updateElement]);

  // 视频延长
  const handleExtend = useCallback(async (prompt: string) => {
    if (!videoData) return;

    const newNodeId = createNewVideoNode(
      'generating',
      prompt,
      {
        type: 'extend',
        sourceIds: [videoId],
        prompt,
      }
    );

    try {
      const result = await extendVideo(videoData, prompt);

      updateElement(newNodeId, {
        status: 'ready',
        src: result.videoUrl,
        thumbnail: result.thumbnailUrl,
        duration: result.duration,
        mediaGenerationId: result.mediaGenerationId,
        progress: 100,
      } as Partial<VideoElement>);

      toast.success('视频延长完成');
    } catch (error) {
      updateElement(newNodeId, { status: 'error' } as Partial<VideoElement>);
      toast.error(error instanceof Error ? error.message : '视频延长失败');
    }
  }, [videoData, videoId, createNewVideoNode, updateElement]);

  // 复制
  const handleDuplicate = useCallback(() => {
    if (!videoData) return;

    const newNodeId = `video-${Date.now()}`;
    const newNode: VideoElement = {
      ...videoData,
      id: newNodeId,
      position: {
        x: videoData.position.x + (videoData.size?.width || 640) + 50,
        y: videoData.position.y,
      },
    };

    addElement(newNode);
    setSelection([newNodeId]);
    toast.success('视频已复制');
  }, [videoData, addElement, setSelection]);

  // 删除
  const handleDelete = useCallback(() => {
    if (!canDelete) {
      toast.error('视频正在生成中，无法删除');
      return;
    }
    deleteElement(videoId);
  }, [videoId, canDelete, deleteElement]);

  // 入库
  const handleArchive = useCallback(async () => {
    if (!videoData?.src) {
      toast.error('视频未生成，无法入库');
      return;
    }

    try {
      const { useMaterialsStore } = await import('@/lib/materials-store');
      const { addMaterial } = useMaterialsStore.getState();
      const { apiConfig } = useCanvasStore.getState();

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
        },
        projectId: apiConfig.projectId,
      });

      toast.success('已添加到精选素材库');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '入库失败');
    }
  }, [videoData]);

  // 下载
  const handleDownload = useCallback(() => {
    if (!videoData?.src) {
      toast.error('视频未生成，无法下载');
      return;
    }
    // 行级注释：视频直接在新页面打开（避免跨域问题）
    window.open(videoData.src, '_blank');
  }, [videoData?.src]);

  return {
    videoData,
    isGenerating,
    canDelete,
    canUpscale,
    handleUpscale,
    handleReshoot,
    handleExtend,
    handleDuplicate,
    handleDelete,
    handleArchive,
    handleDownload,
  };
}

