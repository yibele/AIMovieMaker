'use client';

import { useCallback, useRef } from 'react';
import { Connection, OnConnectStart, OnConnectEnd } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { CanvasElement, ImageElement, VideoElement } from '@/lib/types';

// 行级注释：边缘样式常量
const EDGE_DEFAULT_STYLE = { stroke: '#64748b', strokeWidth: 1 };

/**
 * 连接处理 Hook
 * 
 * 职责：处理 React Flow 连接相关逻辑
 * - handleConnectStart: 连线开始
 * - handleConnectEnd: 连线结束
 * - handleConnect: 连接建立
 */
export interface UseConnectionHandlerOptions {
  setEdges: (updater: (edges: any[]) => any[]) => void;
  resetConnectionMenu: () => void;
  prepareConnectionMenu: (nodeId: string, nodeType: CanvasElement['type']) => void;
  showConnectionMenu: (position: { x: number; y: number }, nodeId: string, nodeType: CanvasElement['type']) => void;
  createTextNodeForVideo: (videoNode: VideoElement, flowPosition: { x: number; y: number }) => void;
  reactFlowInstance: any;
}

export interface ConnectionStartInfo {
  sourceId: string;
  sourceType: CanvasElement['type'];
  handleId?: string | null;
  didConnect: boolean;
}

export interface UseConnectionHandlerReturn {
  connectionStartRef: React.MutableRefObject<ConnectionStartInfo | null>;
  handleConnectStart: OnConnectStart;
  handleConnectEnd: OnConnectEnd;
  handleConnect: (connection: Connection) => void;
}

export function useConnectionHandler(options: UseConnectionHandlerOptions): UseConnectionHandlerReturn {
  const {
    setEdges,
    resetConnectionMenu,
    prepareConnectionMenu,
    showConnectionMenu,
    createTextNodeForVideo,
    reactFlowInstance,
  } = options;

  const elements = useCanvasStore(state => state.elements);
  const updateElement = useCanvasStore(state => state.updateElement);

  // 行级注释：追踪连线开始信息
  const connectionStartRef = useRef<ConnectionStartInfo | null>(null);

  /**
   * 连线开始 - 记录源节点信息
   */
  const handleConnectStart = useCallback<OnConnectStart>(
    (_event, params) => {
      const sourceNode = elements.find((el) => el.id === params.nodeId);

      if (!sourceNode) {
        connectionStartRef.current = null;
        resetConnectionMenu();
        return;
      }

      connectionStartRef.current = {
        sourceId: sourceNode.id,
        sourceType: sourceNode.type,
        handleId: params.handleId,
        didConnect: false,
      };

      prepareConnectionMenu(sourceNode.id, sourceNode.type as CanvasElement['type']);
    },
    [elements, prepareConnectionMenu, resetConnectionMenu]
  );

  /**
   * 连线结束 - 显示选项菜单
   */
  const handleConnectEnd = useCallback<OnConnectEnd>(
    (event) => {
      const startInfo = connectionStartRef.current;
      connectionStartRef.current = null;

      const mouseEvent = event as MouseEvent;
      const targetElement = mouseEvent?.target as HTMLElement | null;
      const droppedOnPane = targetElement?.classList?.contains('react-flow__pane');

      if (!startInfo) {
        resetConnectionMenu();
        return;
      }

      if (startInfo.didConnect) {
        resetConnectionMenu();
        return;
      }

      if (!droppedOnPane) {
        resetConnectionMenu();
        return;
      }

      if (startInfo.sourceType === 'text') {
        const sourceNode = elements.find((el) => el.id === startInfo.sourceId);
        if (!sourceNode || sourceNode.type !== 'text') {
          resetConnectionMenu();
          return;
        }

        showConnectionMenu(
          { x: mouseEvent.clientX, y: mouseEvent.clientY },
          sourceNode.id,
          'text'
        );
        return;
      }

      if (startInfo.sourceType === 'video') {
        const videoNode = elements.find((el) => el.id === startInfo.sourceId) as VideoElement | undefined;
        if (!videoNode) {
          resetConnectionMenu();
          return;
        }

        if (startInfo.handleId === 'prompt-text') {
          const flowPosition = reactFlowInstance.screenToFlowPosition({
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
          });

          createTextNodeForVideo(videoNode, flowPosition);
          resetConnectionMenu();
          return;
        }

        // 行级注释：视频节点拉出连线，显示镜头控制菜单
        showConnectionMenu(
          { x: mouseEvent.clientX, y: mouseEvent.clientY },
          videoNode.id,
          'video'
        );
        return;
      }

      if (startInfo.sourceType === 'image') {
        const sourceNode = elements.find((el) => el.id === startInfo.sourceId) as ImageElement | undefined;
        if (!sourceNode) {
          resetConnectionMenu();
          return;
        }

        // 行级注释：图片节点拉线，显示菜单选择生成图片还是视频
        showConnectionMenu(
          { x: mouseEvent.clientX, y: mouseEvent.clientY },
          sourceNode.id,
          'image'
        );
        return;
      }
    },
    [elements, createTextNodeForVideo, reactFlowInstance, resetConnectionMenu, showConnectionMenu]
  );

  /**
   * 连接建立 - 处理节点连接
   */
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connectionStartRef.current) {
        connectionStartRef.current.didConnect = true;
      }

      const sourceId = connection.source;
      const targetId = connection.target;

      if (!sourceId || !targetId) {
        return;
      }

      const sourceNode = elements.find((el) => el.id === sourceId);
      const targetNode = elements.find((el) => el.id === targetId);

      if (!sourceNode || !targetNode) {
        return;
      }

      const edgeId = `edge-${sourceId}-${targetId}-${connection.targetHandle || 'default'}`;
      const upsertEdge = (animated = false, style = EDGE_DEFAULT_STYLE) => {
        setEdges((eds: any[]) => {
          const filtered = (eds as any[]).filter((edge: any) => edge.id !== edgeId);
          return [
            ...filtered,
            {
              id: edgeId,
              source: sourceId,
              target: targetId,
              sourceHandle: connection.sourceHandle,
              targetHandle: connection.targetHandle,
              type: (connection as any).type || 'default',
              animated,
              style,
            },
          ];
        });
      };

      // 只允许连接到视频节点的自定义输入（只支持图片连接）
      if (targetNode.type === 'video') {
        const targetHandle = connection.targetHandle;
        let handled = false;

        if (sourceNode.type === 'image' && targetHandle === 'start-image') {
          const imageNode = sourceNode as ImageElement;
          const videoData = targetNode as VideoElement;
          const sourceIds = new Set<string>(videoData.generatedFrom?.sourceIds ?? []);
          sourceIds.add(imageNode.id);
          if (videoData.endImageId) {
            sourceIds.add(videoData.endImageId);
          }
          const updates: Partial<VideoElement> = {
            startImageId: imageNode.id,
            startImageUrl: imageNode.src,
            generatedFrom: {
              type: 'image-to-image',
              sourceIds: Array.from(sourceIds),
              prompt: videoData.promptText,
            },
          };
          if (videoData.status === 'ready') {
            updates.status = 'pending';
            updates.progress = 0;
            updates.src = '';
            updates.thumbnail = '';
          }
          updateElement(targetId, updates);
          handled = true;
        } else if (sourceNode.type === 'image' && targetHandle === 'end-image') {
          const imageNode = sourceNode as ImageElement;
          const videoData = targetNode as VideoElement;
          const sourceIds = new Set<string>(videoData.generatedFrom?.sourceIds ?? []);
          if (videoData.startImageId) {
            sourceIds.add(videoData.startImageId);
          }
          sourceIds.add(imageNode.id);
          const updates: Partial<VideoElement> = {
            endImageId: imageNode.id,
            endImageUrl: imageNode.src,
            generatedFrom: {
              type: 'image-to-image',
              sourceIds: Array.from(sourceIds),
              prompt: videoData.promptText,
            },
          };
          if (videoData.status === 'ready') {
            updates.status = 'pending';
            updates.progress = 0;
            updates.src = '';
            updates.thumbnail = '';
          }
          updateElement(targetId, updates);
          handled = true;
        } else if (
          // 行级注释：处理多图参考视频的连接
          sourceNode.type === 'image' &&
          (targetHandle === 'ref-image-1' || targetHandle === 'ref-image-2' || targetHandle === 'ref-image-3')
        ) {
          const imageNode = sourceNode as ImageElement;
          const videoData = targetNode as VideoElement;
          
          // 行级注释：获取当前的参考图片 ID 列表
          const currentReferenceIds = [...(videoData.referenceImageIds || [])];
          
          // 行级注释：根据连接的端口确定索引
          const portIndex = targetHandle === 'ref-image-1' ? 0 : targetHandle === 'ref-image-2' ? 1 : 2;
          
          // 行级注释：更新对应位置的参考图片 ID
          currentReferenceIds[portIndex] = imageNode.id;
          
          // 行级注释：移除空值，保持数组紧凑
          const filteredReferenceIds = currentReferenceIds.filter((id): id is string => Boolean(id));
          
          // 行级注释：更新 sourceIds
          const sourceIds = new Set<string>(filteredReferenceIds);
          
          const updates: Partial<VideoElement> = {
            referenceImageIds: currentReferenceIds, // 行级注释：保留位置信息
            generatedFrom: {
              type: 'reference-images',
              sourceIds: Array.from(sourceIds),
              prompt: videoData.promptText,
            },
          };
          
          // 行级注释：如果视频已生成，重置为 pending 状态
          if (videoData.status === 'ready') {
            updates.status = 'pending';
            updates.progress = 0;
            updates.src = '';
            updates.thumbnail = '';
          }
          
          updateElement(targetId, updates);
          handled = true;
        }

        if (!handled) {
          return;
        }

        upsertEdge();
        return;
      }

      // 其他节点连接，直接创建连线
      upsertEdge();
    },
    [elements, setEdges, updateElement]
  );

  return {
    connectionStartRef,
    handleConnectStart,
    handleConnectEnd,
    handleConnect,
  };
}

