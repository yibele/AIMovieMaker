'use client';

import { useCallback } from 'react';
import { useCanvasStore } from '@/lib/store';
import { TextElement, ImageElement, VideoElement } from '@/lib/types';
import {
  TEXT_NODE_DEFAULT_SIZE,
  IMAGE_NODE_DEFAULT_SIZE,
  VIDEO_NODE_DEFAULT_SIZE,
  getVideoNodeSize,
  detectVideoAspectRatio,
} from '@/lib/constants/node-sizes';
import { generateNodeId, createReferenceImagesVideoNode } from '@/lib/services/node-management.service';
import { generateVideoFromText } from '@/lib/api-mock';
import type { ReshootMotionType } from '@/lib/types';

// 行级注释：边缘样式常量
const EDGE_GENERATING_STYLE = { stroke: '#a855f7', strokeWidth: 1 };
const EDGE_DEFAULT_STYLE = { stroke: '#64748b', strokeWidth: 1 };
const EDGE_ERROR_STYLE = { stroke: '#ef4444', strokeWidth: 1 };

/**
 * 视频操作 Hook
 * 
 * 职责：处理各种视频创建和操作
 * - 文生视频
 * - 图生视频
 * - 镜头控制重拍
 * - 延长视频
 */
export interface UseVideoActionsOptions {
  setEdges: (updater: (edges: any[]) => any[]) => void;
  resetConnectionMenu: () => void;
  createVideoNodeFromImage: (
    sourceImage: ImageElement,
    flowPosition: { x: number; y: number },
    targetHandle: 'start-image' | 'end-image',
    placementDirection: 'right' | 'below'
  ) => void;
  connectionMenu: {
    sourceNodeId: string | null;
    position: { x: number; y: number };
  };
  reactFlowInstance: any;
}

export interface UseVideoActionsReturn {
  handleTextToVideo: (sourceNode: TextElement, aspectRatio: '9:16' | '16:9') => Promise<void>;
  handleImageToVideo: (sourceNode: ImageElement, aspectRatio: '9:16' | '16:9') => void;
  handleGenerateVideoFromImage: () => void;
  handleGenerateReshoot: (motionType: ReshootMotionType) => Promise<void>;
  handleShowExtendVideo: () => void;
  handleCreateReferenceImagesVideo: () => void; // 行级注释：创建多图参考视频节点
}

export function useVideoActions(options: UseVideoActionsOptions): UseVideoActionsReturn {
  const {
    setEdges,
    resetConnectionMenu,
    createVideoNodeFromImage,
    connectionMenu,
    reactFlowInstance,
  } = options;

  const elements = useCanvasStore(state => state.elements);
  const addElement = useCanvasStore(state => state.addElement);
  const updateElement = useCanvasStore(state => state.updateElement);

  /**
   * 文生视频
   */
  const handleTextToVideo = useCallback(
    async (sourceNode: TextElement, aspectRatio: '9:16' | '16:9') => {
      resetConnectionMenu();

      const videoSize = getVideoNodeSize(aspectRatio);

      const newVideoId = generateNodeId('video');
      const newVideo: VideoElement = {
        id: newVideoId,
        type: 'video',
        src: '',
        thumbnail: '',
        duration: 0,
        status: 'generating',
        progress: 0,
        position: {
          x: sourceNode.position.x + (sourceNode.size?.width || TEXT_NODE_DEFAULT_SIZE.width) + 100,
          y: sourceNode.position.y,
        },
        size: videoSize,
        promptText: sourceNode.text,
        generatedFrom: {
          type: 'text',
          sourceIds: [sourceNode.id],
          prompt: sourceNode.text,
        },
      };

      addElement(newVideo);

      // 创建连线
      setEdges((eds: any[]) => [
        ...eds,
        {
          id: `edge-${sourceNode.id}-${newVideoId}-prompt-text`,
          source: sourceNode.id,
          target: newVideoId,
          targetHandle: 'prompt-text',
          type: 'default',
          animated: true,
          style: EDGE_GENERATING_STYLE,
        },
      ]);

      try {
        const result = await generateVideoFromText(sourceNode.text, aspectRatio);

        updateElement(newVideoId, {
          status: 'ready',
          src: result.videoUrl,
          thumbnail: result.thumbnail,
          duration: result.duration,
          progress: 100,
          mediaGenerationId: result.mediaGenerationId,
          promptText: sourceNode.text,
          generatedFrom: {
            type: 'text',
            sourceIds: [sourceNode.id],
            prompt: sourceNode.text,
          },
        } as Partial<VideoElement>);

        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === `edge-${sourceNode.id}-${newVideoId}-prompt-text`
              ? { ...edge, animated: false, style: EDGE_DEFAULT_STYLE }
              : edge
          )
        );

      } catch (error) {
        console.error('❌ 生成视频失败:', error);
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === `edge-${sourceNode.id}-${newVideoId}-prompt-text`
              ? { ...edge, animated: false, style: EDGE_ERROR_STYLE }
              : edge
          )
        );
        alert('生成视频失败，请重试');
      }
    },
    [addElement, updateElement, setEdges, resetConnectionMenu]
  );

  /**
   * 图生视频
   */
  const handleImageToVideo = useCallback(
    (sourceNode: ImageElement, aspectRatio: '9:16' | '16:9') => {
      resetConnectionMenu();

      const flowPosition = {
        x: sourceNode.position.x + (sourceNode.size?.width || IMAGE_NODE_DEFAULT_SIZE.width) + 100,
        y: sourceNode.position.y,
      };

      createVideoNodeFromImage(sourceNode, flowPosition, 'start-image', 'right');
    },
    [createVideoNodeFromImage, resetConnectionMenu]
  );

  /**
   * 从图片生成视频（自动根据图片比例）
   */
  const handleGenerateVideoFromImage = useCallback(() => {
    const sourceNodeId = connectionMenu.sourceNodeId;
    if (!sourceNodeId) return;

    const sourceNode = elements.find(
      (el) => el.id === sourceNodeId && el.type === 'image'
    ) as ImageElement | undefined;

    if (!sourceNode) {
      resetConnectionMenu();
      return;
    }

    const aspectRatio = detectVideoAspectRatio(
      sourceNode.size?.width || 320,
      sourceNode.size?.height || 180
    );

    handleImageToVideo(sourceNode, aspectRatio);
  }, [connectionMenu.sourceNodeId, elements, handleImageToVideo, resetConnectionMenu]);

  /**
   * 镜头控制重拍
   */
  const handleGenerateReshoot = useCallback(
    async (motionType: ReshootMotionType) => {
      const sourceNodeId = connectionMenu.sourceNodeId;
      if (!sourceNodeId) return;

      const sourceNode = elements.find((el) => el.id === sourceNodeId) as VideoElement | undefined;
      if (!sourceNode) return;

      resetConnectionMenu();

      // 1. 创建新的视频节点
      const newVideoId = generateNodeId('video');
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: connectionMenu.position.x,
        y: connectionMenu.position.y,
      });

      const newVideo: VideoElement = {
        id: newVideoId,
        type: 'video',
        src: '',
        thumbnail: '',
        duration: 0,
        status: 'generating',
        progress: 0,
        position: { x: flowPosition.x, y: flowPosition.y },
        size: sourceNode.size || VIDEO_NODE_DEFAULT_SIZE,
        generatedFrom: {
          type: 'reshoot',
          sourceIds: [sourceNode.id],
        },
      };

      addElement(newVideo);

      // 2. 创建连线
      const edgeId = `edge-${sourceNode.id}-${newVideoId}-reshoot`;
      setEdges((eds: any[]) => [
        ...eds,
        {
          id: edgeId,
          source: sourceNode.id,
          target: newVideoId,
          type: 'default',
          animated: true,
          style: EDGE_GENERATING_STYLE,
          label: '镜头控制',
        },
      ]);

      // 3. 调用 API 生成
      try {
        const effectiveMediaId = sourceNode.mediaGenerationId;

        if (!effectiveMediaId) {
          throw new Error('源视频缺少 mediaGenerationId');
        }

        const aspectRatio = detectVideoAspectRatio(
          sourceNode.size?.width || 640,
          sourceNode.size?.height || 360
        );

        const { generateVideoReshoot } = await import('@/lib/api-mock');
        const result = await generateVideoReshoot(
          effectiveMediaId,
          motionType,
          aspectRatio as any
        );

        updateElement(newVideoId, {
          status: 'ready',
          src: result.videoUrl,
          thumbnail: result.thumbnail,
          duration: result.duration,
          mediaGenerationId: result.mediaGenerationId,
          progress: 100,
          readyForGeneration: true,
        } as Partial<VideoElement>);

        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === edgeId
              ? { ...edge, animated: false, style: EDGE_DEFAULT_STYLE }
              : edge
          )
        );

      } catch (error) {
        console.error('❌ 镜头控制视频生成失败:', error);
        updateElement(newVideoId, { status: 'error' } as Partial<VideoElement>);
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === edgeId
              ? { ...edge, animated: false, style: EDGE_ERROR_STYLE }
              : edge
          )
        );
      }
    },
    [connectionMenu.sourceNodeId, connectionMenu.position, elements, addElement, setEdges, updateElement, reactFlowInstance, resetConnectionMenu]
  );

  /**
   * 延长视频 - 创建 pending 节点
   */
  const handleShowExtendVideo = useCallback(() => {
    const sourceNodeId = connectionMenu.sourceNodeId;
    if (!sourceNodeId) return;

    const sourceNode = elements.find((el) => el.id === sourceNodeId) as VideoElement | undefined;
    if (!sourceNode) return;

    resetConnectionMenu();

    // 1. 创建 pending 状态的视频节点
    const newVideoId = generateNodeId('video');
    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: connectionMenu.position.x,
      y: connectionMenu.position.y,
    });

    const newVideo: VideoElement = {
      id: newVideoId,
      type: 'video',
      src: '',
      thumbnail: '',
      duration: 0,
      status: 'pending',
      progress: 0,
      position: { x: flowPosition.x, y: flowPosition.y },
      size: sourceNode.size || VIDEO_NODE_DEFAULT_SIZE,
      readyForGeneration: false,
      generatedFrom: {
        type: 'extend',
        sourceIds: [sourceNode.id],
      },
    };

    addElement(newVideo);

    // 2. 创建连线
    const edgeId = `edge-${sourceNode.id}-${newVideoId}-extend`;
    setEdges((eds: any[]) => [
      ...eds,
      {
        id: edgeId,
        source: sourceNode.id,
        target: newVideoId,
        type: 'default',
        animated: false,
        style: EDGE_GENERATING_STYLE,
        label: '延长',
      },
    ]);

  }, [connectionMenu.sourceNodeId, connectionMenu.position, elements, addElement, setEdges, reactFlowInstance, resetConnectionMenu]);

  /**
   * 创建多图参考视频节点
   * 从图片节点连出，创建一个带 3 个输入端口的视频节点
   */
  const handleCreateReferenceImagesVideo = useCallback(() => {
    const sourceNodeId = connectionMenu.sourceNodeId;
    if (!sourceNodeId) return;

    const sourceNode = elements.find(
      (el) => el.id === sourceNodeId && el.type === 'image'
    ) as ImageElement | undefined;

    if (!sourceNode) {
      resetConnectionMenu();
      return;
    }

    resetConnectionMenu();

    // 行级注释：计算视频节点位置（在源图片节点右侧）
    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: connectionMenu.position.x,
      y: connectionMenu.position.y,
    });

    // 行级注释：创建多图参考视频节点
    const newVideo = createReferenceImagesVideoNode(flowPosition);

    // 行级注释：更新视频节点，添加第一个参考图片
    newVideo.referenceImageIds = [sourceNode.id];
    newVideo.generatedFrom = {
      type: 'reference-images',
      sourceIds: [sourceNode.id],
    };

    addElement(newVideo);

    // 行级注释：创建从源图片到视频节点的连线
    const edgeId = `edge-${sourceNode.id}-${newVideo.id}-ref-1`;
    setEdges((eds: any[]) => [
      ...eds,
      {
        id: edgeId,
        source: sourceNode.id,
        target: newVideo.id,
        targetHandle: 'ref-image-1', // 行级注释：连接到第一个参考图片端口
        type: 'default',
        animated: false,
        style: { stroke: '#10b981', strokeWidth: 2 }, // 行级注释：绿色表示参考图
      },
    ]);

  }, [connectionMenu.sourceNodeId, connectionMenu.position, elements, addElement, setEdges, reactFlowInstance, resetConnectionMenu]);

  return {
    handleTextToVideo,
    handleImageToVideo,
    handleGenerateVideoFromImage,
    handleGenerateReshoot,
    handleShowExtendVideo,
    handleCreateReferenceImagesVideo,
  };
}

