/**
 * 通用节点操作 Hook
 * 
 * 职责：提供通用的节点添加操作
 * - 添加文本节点
 * - 添加视频节点
 * - 添加记事本节点
 * - 添加图片节点（占位符）
 */

'use client';

import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import {
  createTextNode,
  createNoteNode,
  createEmptyVideoNode,
  createImagePlaceholder,
  createVideoFromImage,
  createStartEndVideoNode,
  getScreenCenterPosition,
  NodePosition,
} from '@/lib/services/node-management.service';
import { ImageElement, VideoElement } from '@/lib/types';

/**
 * 通用节点操作 Hook 返回值
 */
export interface UseNodeOperationsReturn {
  // 添加节点
  addTextNode: (options?: { text?: string; position?: NodePosition }) => string;
  addNoteNode: (options?: { content?: string; title?: string; position?: NodePosition }) => string;
  addVideoNode: (options?: { aspectRatio?: '16:9' | '9:16'; position?: NodePosition }) => string;
  addImagePlaceholder: (options: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    position: NodePosition;
    prompt?: string;
  }) => string;
  
  // 从图片创建视频
  createVideoFromImageNode: (
    imageNode: ImageElement,
    flowPosition: NodePosition,
    targetHandleId?: 'start-image' | 'end-image'
  ) => string;
  
  // 创建首尾帧视频
  createStartEndVideo: (
    startImage: ImageElement,
    endImage: ImageElement,
    position: NodePosition
  ) => string;
}

/**
 * 通用节点操作 Hook
 * 
 * @returns 节点操作函数
 * 
 * @example
 * const { addTextNode, addVideoNode } = useNodeOperations();
 * addTextNode({ text: '标题' });
 * addVideoNode({ aspectRatio: '9:16' });
 */
export function useNodeOperations(): UseNodeOperationsReturn {
  const addElement = useCanvasStore(state => state.addElement);
  const { screenToFlowPosition } = useReactFlow();

  // 行级注释：添加文本节点
  const addTextNode = useCallback((options?: {
    text?: string;
    position?: NodePosition;
  }): string => {
    const position = options?.position || getScreenCenterPosition(screenToFlowPosition);
    const node = createTextNode(position, { text: options?.text });
    addElement(node);
    return node.id;
  }, [addElement, screenToFlowPosition]);

  // 行级注释：添加记事本节点
  const addNoteNode = useCallback((options?: {
    content?: string;
    title?: string;
    position?: NodePosition;
  }): string => {
    const position = options?.position || getScreenCenterPosition(screenToFlowPosition);
    const node = createNoteNode(position, {
      content: options?.content,
      title: options?.title,
    });
    addElement(node);
    return node.id;
  }, [addElement, screenToFlowPosition]);

  // 行级注释：添加空视频节点
  const addVideoNode = useCallback((options?: {
    aspectRatio?: '16:9' | '9:16';
    position?: NodePosition;
  }): string => {
    const position = options?.position || getScreenCenterPosition(screenToFlowPosition);
    const node = createEmptyVideoNode(position, options?.aspectRatio || '16:9');
    addElement(node);
    return node.id;
  }, [addElement, screenToFlowPosition]);

  // 行级注释：添加图片占位符节点
  const addImagePlaceholder = useCallback((options: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    position: NodePosition;
    prompt?: string;
  }): string => {
    const node = createImagePlaceholder(
      options.position,
      options.aspectRatio || '16:9',
      { prompt: options.prompt }
    );
    addElement(node);
    return node.id;
  }, [addElement]);

  // 行级注释：从图片节点创建视频节点
  const createVideoFromImageNode = useCallback((
    imageNode: ImageElement,
    flowPosition: NodePosition,
    targetHandleId: 'start-image' | 'end-image' = 'start-image'
  ): string => {
    const node = createVideoFromImage(imageNode, flowPosition, targetHandleId);
    addElement(node);
    return node.id;
  }, [addElement]);

  // 行级注释：创建首尾帧视频节点
  const createStartEndVideo = useCallback((
    startImage: ImageElement,
    endImage: ImageElement,
    position: NodePosition
  ): string => {
    const node = createStartEndVideoNode(startImage, endImage, position);
    addElement(node);
    return node.id;
  }, [addElement]);

  return {
    addTextNode,
    addNoteNode,
    addVideoNode,
    addImagePlaceholder,
    createVideoFromImageNode,
    createStartEndVideo,
  };
}

