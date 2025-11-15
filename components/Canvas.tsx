'use client';

import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeTypes,
  SelectionMode,
  OnSelectionChangeParams,
  ConnectionLineType,
  OnConnectStart,
  OnConnectEnd,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

import { useCanvasStore } from '@/lib/store';
import ImageNode from './nodes/ImageNode';
import TextNode from './nodes/TextNode';
import VideoNode from './nodes/VideoNode';
import FloatingToolbar from './FloatingToolbar';
import CanvasNavigation from './CanvasNavigation';
import RightToolbar from './RightToolbar';
import AIInputPanel from './AIInputPanel';
import Toolbar from './Toolbar';
import { CanvasElement, VideoElement, ImageElement, TextElement } from '@/lib/types';
import { generateVideoFromText, generateVideoFromImages, generateImage } from '@/lib/api-mock';

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  image: ImageNode,
  text: TextNode,
  video: VideoNode,
};

const VIDEO_NODE_DEFAULT_SIZE = { width: 400, height: 300 };
const EDGE_DEFAULT_STYLE = { stroke: '#64748b', strokeWidth: 1 };

type ConnectionMenuState = {
  visible: boolean;
  position: { x: number; y: number };
  sourceNodeId: string | null;
  sourceNodeType: CanvasElement['type'] | null;
  activeSubmenu: 'image' | 'video' | null;
};

function CanvasContent() {
  const elements = useCanvasStore((state) => state.elements);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addElement = useCanvasStore((state) => state.addElement);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const uiState = useCanvasStore((state) => state.uiState);

  const createConnectionMenuState = (): ConnectionMenuState => ({
    visible: false,
    position: { x: 0, y: 0 },
    sourceNodeId: null,
    sourceNodeType: null,
    activeSubmenu: null,
  });

  // 连线菜单状态
  const [connectionMenu, setConnectionMenu] = useState<ConnectionMenuState>(
    createConnectionMenuState
  );
  const resetConnectionMenu = useCallback(() => {
    setConnectionMenu(createConnectionMenuState());
  }, []);

  // 将 store 中的元素转换为 React Flow 节点
  // @ts-ignore - React Flow 类型推断问题
  const nodes: Node[] = useMemo(() => {
    return elements.map((el: CanvasElement) => ({
      id: el.id,
      type: el.type,
      position: el.position,
      data: el,
      draggable: true,
      // 添加 style 设置初始尺寸，让 NodeResizer 可以实时调整
      style: el.size ? {
        width: el.size.width,
        height: el.size.height,
      } : undefined,
    }));
  }, [elements]);

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const reactFlowInstance = useReactFlow();
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const connectionStartRef = useRef<{
    sourceId: string;
    sourceType: CanvasElement['type'];
    handleId?: string | null;
    didConnect: boolean;
  } | null>(null);
  const activeGenerationRef = useRef<Set<string>>(new Set());

  const maybeStartVideo = useCallback(
    async (videoId: string) => {
      if (activeGenerationRef.current.has(videoId)) {
        return;
      }

      const { elements: storeElements } = useCanvasStore.getState();
      const videoElement = storeElements.find((el) => el.id === videoId) as VideoElement | undefined;

      if (!videoElement) return;

      if (videoElement.status !== 'queued') {
        return;
      }

      const promptText = videoElement.promptText?.trim();
      const effectiveStartId = videoElement.startImageId ?? videoElement.endImageId;
      const effectiveEndId = videoElement.endImageId ?? videoElement.startImageId;

      const ready = Boolean(promptText && effectiveStartId && effectiveEndId);

      if (!ready) {
        updateElement(videoId, {
          status: 'pending',
          readyForGeneration: ready,
        } as Partial<VideoElement>);
        return;
      }

      const startImageId = effectiveStartId!;
      const endImageId = effectiveEndId!;

      activeGenerationRef.current.add(videoId);

      updateElement(videoId, {
        status: 'generating',
        progress: 0,
        readyForGeneration: true,
        src: '',
        thumbnail: '',
      } as Partial<VideoElement>);

      // @ts-ignore
      setEdges((eds: any[]) =>
        eds.map((edge: any) =>
          edge.target === videoId
            ? {
                ...edge,
                animated: true,
                style: { stroke: '#a855f7', strokeWidth: 1 },
              }
            : edge
        )
      );

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) {
          updateElement(videoId, { progress } as Partial<VideoElement>);
        } else {
          clearInterval(progressInterval);
        }
      }, 300);

      try {
        const result = await generateVideoFromImages(startImageId, endImageId, promptText);

        clearInterval(progressInterval);

        const combinedSourceIds = new Set<string>(videoElement.generatedFrom?.sourceIds ?? []);
        combinedSourceIds.add(startImageId);
        combinedSourceIds.add(endImageId);

        updateElement(videoId, {
          status: 'ready',
          src: result.videoUrl,
          thumbnail: result.thumbnail,
          duration: result.duration,
          mediaGenerationId: result.mediaGenerationId,
          progress: 100,
          readyForGeneration: true,
          generatedFrom: {
            type: 'image-to-image',
            sourceIds: Array.from(combinedSourceIds),
            prompt: promptText,
          },
        } as Partial<VideoElement>);

        // @ts-ignore
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.target === videoId
              ? {
                  ...edge,
                  animated: false,
                  style: EDGE_DEFAULT_STYLE,
                }
              : edge
          )
        );
      } catch (error) {
        clearInterval(progressInterval);
        console.error('❌ 图生视频生成失败:', error);
        updateElement(videoId, {
          status: 'error',
          readyForGeneration: true,
        } as Partial<VideoElement>);

        // @ts-ignore
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.target === videoId
              ? {
                  ...edge,
                  animated: false,
                  style: { stroke: '#ef4444', strokeWidth: 1 },
                }
              : edge
          )
        );
      } finally {
        activeGenerationRef.current.delete(videoId);
      }
    },
    [setEdges, updateElement]
  );

  useEffect(() => {
    useCanvasStore.setState({
      triggerVideoGeneration: (videoId: string) => {
        void maybeStartVideo(videoId);
      },
    });
    return () => {
      useCanvasStore.setState({ triggerVideoGeneration: undefined });
    };
  }, [maybeStartVideo]);

  const createVideoNodeFromImage = useCallback(
    (
      imageNode: ImageElement,
      flowPosition: { x: number; y: number },
      targetHandleId: 'start-image' | 'end-image' = 'start-image',
      sourceHandleId?: string | null
    ) => {
      const videoId = `video-${Date.now()}`;
      const baseSize = imageNode.size && imageNode.size.width && imageNode.size.height
        ? imageNode.size
        : VIDEO_NODE_DEFAULT_SIZE;

      const nextVideoSize = {
        width: baseSize.width,
        height: baseSize.height,
      };

      const position = {
        x: flowPosition.x - nextVideoSize.width / 2,
        y: flowPosition.y - nextVideoSize.height / 2,
      };

      const startImageInfo =
        targetHandleId === 'start-image'
          ? { startImageId: imageNode.id, startImageUrl: imageNode.src }
          : {};
      const endImageInfo =
        targetHandleId === 'end-image'
          ? { endImageId: imageNode.id, endImageUrl: imageNode.src }
          : {};

      const newVideo: VideoElement = {
        id: videoId,
        type: 'video',
        src: '',
        thumbnail: '',
        duration: 0,
        status: 'pending',
        progress: 0,
        position,
        size: { ...nextVideoSize },
        readyForGeneration: false,
        ...startImageInfo,
        ...endImageInfo,
      };

      addElement(newVideo);

      const edgeId = `edge-${imageNode.id}-${videoId}-${targetHandleId}`;
      // @ts-ignore
      setEdges((eds: any[]) => {
        const filtered = (eds as any[]).filter((edge: any) => edge.id !== edgeId);
        return [
          ...filtered,
          {
            id: edgeId,
            source: imageNode.id,
            target: videoId,
            sourceHandle: sourceHandleId ?? undefined,
            targetHandle: targetHandleId,
            type: 'default',
            animated: false,
            style: EDGE_DEFAULT_STYLE,
          },
        ];
      });
    },
    [addElement, setEdges]
  );

  const createTextNodeForVideo = useCallback(
    (videoNode: VideoElement, flowPosition: { x: number; y: number }) => {
      const textId = `text-${Date.now()}`;
      const textContent = videoNode.promptText || '双击编辑文字';
      
      // 根据文字内容计算节点尺寸
      const fontSize = 24;
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.fontSize = `${fontSize}px`;
      tempDiv.style.fontWeight = 'normal';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.lineHeight = '1.4';
      tempDiv.style.maxWidth = '600px';
      tempDiv.textContent = textContent;
      
      document.body.appendChild(tempDiv);
      const width = Math.ceil(tempDiv.offsetWidth);
      const height = Math.ceil(tempDiv.offsetHeight);
      document.body.removeChild(tempDiv);
      
      // 添加内边距
      const padding = 24;
      const calculatedSize = {
        width: Math.max(100, Math.min(600, width + padding * 2)),
        height: Math.max(60, Math.min(400, height + padding * 2)),
      };
      
      const position = {
        x: flowPosition.x - calculatedSize.width / 2,
        y: flowPosition.y - calculatedSize.height / 2,
      };

      const newText: TextElement = {
        id: textId,
        type: 'text',
        text: textContent,
        position,
        size: calculatedSize,
        fontSize,
      };

      addElement(newText);

      const edgeId = `edge-${textId}-${videoNode.id}-prompt-text`;
      // @ts-ignore
      setEdges((eds: any[]) => {
        const filtered = (eds as any[]).filter((edge: any) => edge.id !== edgeId);
        return [
          ...filtered,
          {
            id: edgeId,
            source: textId,
            target: videoNode.id,
            targetHandle: 'prompt-text',
            type: 'default',
            animated: false,
            style: EDGE_DEFAULT_STYLE,
          },
        ];
      });

      const promptText = videoNode.promptText ?? '';
      const sourceIds = new Set<string>(videoNode.generatedFrom?.sourceIds ?? []);
      if (videoNode.startImageId) {
        sourceIds.add(videoNode.startImageId);
      }
      if (videoNode.endImageId) {
        sourceIds.add(videoNode.endImageId);
      }
      sourceIds.add(textId);

      updateElement(videoNode.id, {
        promptText,
        readyForGeneration: Boolean(promptText.trim() && (videoNode.startImageId || videoNode.endImageId)),
        generatedFrom: {
          type: 'image-to-image',
          sourceIds: Array.from(sourceIds),
          prompt: promptText,
        },
      } as Partial<VideoElement>);
    },
    [addElement, setEdges, updateElement]
  );

  // 同步 store 的元素到 React Flow 节点，保留选中状态
  useEffect(() => {
    // @ts-ignore
    setNodes((currentNodes: any) => {
      // 保留当前节点的选中状态
      return nodes.map((node) => {
        const currentNode = currentNodes.find((n: any) => n.id === node.id);
        return {
          ...node,
          // 保留 selected 状态
          selected: currentNode?.selected || false,
        };
      });
    });
  }, [nodes, setNodes]);

  // 拦截 onNodesChange，处理删除事件并同步到 store
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // 处理删除事件
      changes.forEach((change) => {
        if (change.type === 'remove') {
          // 从 store 中删除元素
          useCanvasStore.getState().deleteElement(change.id);
        }
      });
      
      // 传递所有变化给 React Flow
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // 同步 React Flow 节点拖拽到 store
  // 注意：当多选拖动时，需要保存所有拖动的节点
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, nodes: Node[]) => {
      // 找到所有被选中的节点
      const selectedNodes = nodes.filter(n => n.selected);
      
      if (selectedNodes.length > 1) {
        // 多选：保存所有选中节点的位置
        selectedNodes.forEach((n) => {
          updateElement(n.id, { position: n.position });
        });
      } else {
        // 单选：只保存当前节点
        updateElement(node.id, { position: node.position });
      }
    },
    [updateElement]
  );

  // 处理选中变化
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const selectedIds = params.nodes.map((node) => node.id);
      setSelection(selectedIds);
    },
    [setSelection]
  );

  // 处理连线开始 - 记录源节点信息
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

      setConnectionMenu({
        visible: false,
        position: { x: 0, y: 0 },
        sourceNodeId: sourceNode.id,
        sourceNodeType: sourceNode.type as CanvasElement['type'],
        activeSubmenu: null,
      });
    },
    [elements, resetConnectionMenu]
  );

  // 处理连线结束 - 显示选项菜单
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

        setConnectionMenu({
          visible: true,
          position: { x: mouseEvent.clientX, y: mouseEvent.clientY },
          sourceNodeId: sourceNode.id,
          sourceNodeType: 'text',
          activeSubmenu: null,
        });
        return;
      }

      if (startInfo.sourceType === 'video' && startInfo.handleId === 'prompt-text') {
        const videoNode = elements.find((el) => el.id === startInfo.sourceId) as VideoElement | undefined;
        if (!videoNode) {
          resetConnectionMenu();
          return;
        }

        const flowPosition = reactFlowInstance.screenToFlowPosition({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
        });

        createTextNodeForVideo(videoNode, flowPosition);
        resetConnectionMenu();
        return;
      }

      if (startInfo.sourceType === 'image') {
        const imageNode = elements.find((el) => el.id === startInfo.sourceId) as ImageElement | undefined;
        if (!imageNode) {
          return;
        }

        const flowPosition = reactFlowInstance.screenToFlowPosition({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
        });

        createVideoNodeFromImage(imageNode, flowPosition, 'start-image', startInfo.handleId);
        resetConnectionMenu();
      }
    },
    [elements, createVideoNodeFromImage, createTextNodeForVideo, reactFlowInstance, resetConnectionMenu]
  );

  // 显示图片比例或视频比例子菜单
  const handleShowImageSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'image',
    }));
  }, []);

  const handleShowVideoSubmenu = useCallback(() => {
    setConnectionMenu((prev) => ({
      ...prev,
      activeSubmenu: 'video',
    }));
  }, []);

  // 处理选择生成图片（带比例参数）
  const handleGenerateImage = useCallback(
    async (aspectRatio: '9:16' | '16:9' | '1:1') => {
      const sourceNodeId = connectionMenu.sourceNodeId;
      if (!sourceNodeId) return;

      const sourceNode = elements.find((el) => el.id === sourceNodeId) as TextElement;
      if (!sourceNode || sourceNode.type !== 'text') return;

      resetConnectionMenu();

      // 根据比例计算尺寸
      let width: number, height: number;
      switch (aspectRatio) {
        case '9:16': // 竖图
          width = 180;
          height = 320;
          break;
        case '16:9': // 横图
          width = 320;
          height = 180;
          break;
        case '1:1': // 方图
          width = 180;
          height = 180;
          break;
      }

      // 在文本节点右侧位置
      const targetPosition = {
        x: sourceNode.position.x + (sourceNode.size?.width || 200) + 100,
        y: sourceNode.position.y,
      };

      // 创建一个临时 ID
      const newImageId = `image-${Date.now()}`;

      // 立即创建占位符图片节点（生成中状态）
      const placeholderImage: ImageElement = {
        id: newImageId,
        type: 'image',
        src: '', // 空 src，触发"加载中"显示
        position: targetPosition,
        size: { width, height },
        generatedFrom: {
          type: 'text', // 从文本节点生成
          sourceIds: [sourceNode.id],
          prompt: sourceNode.text,
        },
      };
      
      addElement(placeholderImage);

      // 创建连线
      // @ts-ignore
      setEdges((eds: any) => [
        ...eds,
        {
          id: `edge-${sourceNode.id}-${newImageId}`,
          source: sourceNode.id,
          target: newImageId,
          type: 'default',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 1 },
        },
      ]);

      // 关闭菜单
      resetConnectionMenu();

      try {
        // 使用文本节点的文字作为提示词生成图片（传入选中的比例）
        const result = await generateImage(sourceNode.text, aspectRatio);
        
        // 更新图片节点，替换为真实图片
        updateElement(newImageId, {
          src: result.imageUrl,
          promptId: result.promptId,
          mediaGenerationId: result.mediaGenerationId, // 保存 Flow 返回的 mediaGenerationId，便于后续图生图 // 行级注释说明用途
        } as Partial<ImageElement>);
        
        // 停止连线动画（生成完成后变为普通线）
        // @ts-ignore
        setEdges((eds: any) => 
          eds.map((edge: any) => 
            edge.id === `edge-${sourceNode.id}-${newImageId}` 
              ? { ...edge, animated: false }
              : edge
          )
        );
        
        console.log('✅ 从文本节点生成图片:', sourceNode.text, '比例:', aspectRatio);
      } catch (error: any) {
        console.error('❌ 生成图片失败:', error);
        // 删除失败的占位符和连线
        useCanvasStore.getState().deleteElement(newImageId);
        // @ts-ignore
        setEdges((eds: any) => eds.filter((edge: any) => edge.id !== `edge-${sourceNode.id}-${newImageId}`));
        // 显示详细的错误信息
        const errorMessage = error?.message || '生成图片失败，请重试';
        alert(errorMessage);
      }
    },
    [connectionMenu.sourceNodeId, elements, addElement, updateElement, setEdges, resetConnectionMenu]
  );

  // 处理选择生成视频
  const handleGenerateVideo = useCallback(
    async (aspectRatio: '9:16' | '16:9') => {
      const sourceNodeId = connectionMenu.sourceNodeId;
      if (!sourceNodeId) return;

      const sourceNode = elements.find((el) => el.id === sourceNodeId) as TextElement;
      if (!sourceNode || sourceNode.type !== 'text') return;

      resetConnectionMenu();

      let width: number;
      let height: number;
      if (aspectRatio === '9:16') {
        width = 270;
        height = 480;
      } else {
        width = 480;
        height = 270;
      }

      const newVideoId = `video-${Date.now()}`;
      const newVideo: VideoElement = {
        id: newVideoId,
        type: 'video',
        src: '',
        thumbnail: '',
        duration: 0,
        status: 'generating',
        progress: 0,
        position: {
          x: sourceNode.position.x + (sourceNode.size?.width || 200) + 100,
          y: sourceNode.position.y,
        },
        size: { width, height },
        promptText: sourceNode.text,
        generatedFrom: {
          type: 'text',
          sourceIds: [sourceNode.id],
          prompt: sourceNode.text,
        },
      };

      addElement(newVideo);

      // 创建连线
      // @ts-ignore
      setEdges((eds: any[]) => [
        ...eds,
        {
          id: `edge-${sourceNode.id}-${newVideoId}-prompt-text`,
          source: sourceNode.id,
          target: newVideoId,
          targetHandle: 'prompt-text',
          type: 'default',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 1 },
        },
      ]);

      try {
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 10;
          if (progress <= 90) {
            updateElement(newVideoId, { progress } as Partial<VideoElement>);
          }
        }, 300);

        const result = await generateVideoFromText(sourceNode.text, aspectRatio);

        clearInterval(progressInterval);

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

        // @ts-ignore
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === `edge-${sourceNode.id}-${newVideoId}-prompt-text`
              ? { ...edge, animated: false }
              : edge
          )
        );

        console.log('✅ 从文本节点生成视频:', sourceNode.text);
      } catch (error) {
        console.error('❌ 生成视频失败:', error);
        // @ts-ignore
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === `edge-${sourceNode.id}-${newVideoId}-prompt-text`
              ? { ...edge, animated: false, style: { stroke: '#ef4444', strokeWidth: 1 } }
              : edge
          )
        );
        alert('生成视频失败，请重试');
      }
    },
    [connectionMenu.sourceNodeId, elements, addElement, updateElement, setEdges, resetConnectionMenu]
  );

  // 处理连线连接（生成视频）
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
        // @ts-ignore
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

      // 只允许连接到视频节点的自定义输入
      if (targetNode.type === 'video') {
        const targetHandle = connection.targetHandle;
        let handled = false;

        if (sourceNode.type === 'text' && targetHandle === 'prompt-text') {
          const textNode = sourceNode as TextElement;
          const videoData = targetNode as VideoElement;
          const sourceIds = new Set<string>(videoData.generatedFrom?.sourceIds ?? []);
          if (videoData.startImageId) {
            sourceIds.add(videoData.startImageId);
          }
          if (videoData.endImageId) {
            sourceIds.add(videoData.endImageId);
          }
          sourceIds.add(textNode.id);

          const updates: Partial<VideoElement> = {
            promptText: textNode.text,
            generatedFrom: {
              type: 'image-to-image',
              sourceIds: Array.from(sourceIds),
              prompt: textNode.text,
            },
            readyForGeneration: Boolean(textNode.text.trim() && (videoData.startImageId || videoData.endImageId)),
          };
          if (videoData.status === 'ready') {
            updates.status = 'pending';
            updates.progress = 0;
            updates.src = '';
            updates.thumbnail = '';
          }
          updateElement(targetId, updates);
          handled = true;
        } else if (sourceNode.type === 'image' && targetHandle === 'start-image') {
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
            readyForGeneration: Boolean((videoData.promptText ?? '').trim() && (imageNode.id || videoData.endImageId)),
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
            readyForGeneration: Boolean((videoData.promptText ?? '').trim() && (videoData.startImageId || imageNode.id)),
          };
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

  return (
    <div ref={reactFlowWrapperRef} className="w-full h-full bg-gray-50">
      {/* 顶部导航 */}
      <CanvasNavigation />

      {/* 左侧工具栏 - 节点创建 */}
      <Toolbar />

      {/* 右侧工具栏 - 功能按钮 */}
      <RightToolbar />

      <ReactFlow
        className="custom-theme"
        nodes={reactFlowNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={handleSelectionChange}
        onConnect={handleConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        nodeTypes={nodeTypes}
        fitView
        selectNodesOnDrag={false}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnScroll
        panOnDrag={[1, 2]} // 中键和右键拖拽
        zoomOnScroll
        minZoom={0.5}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 1 }}
        connectionLineType={ConnectionLineType.Bezier}
      >
        {/* 控制器 */}
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="!bottom-24"
        />
        
        {/* 背景网格 */}
        {uiState.showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={40}
            size={4}
            color="#dddddd"
            bgColor="#f0f0f0"
          />
        )}
        
        {/* 悬浮工具栏 - 放在 React Flow 内部 */}
        <FloatingToolbar />
        
        {/* 左侧工具栏 - 放在 React Flow 内部以使用 useReactFlow */}
        <Toolbar />
        
        {/* AI 输入面板 - 放在 React Flow 内部以使用 useReactFlow */}
        <AIInputPanel />
      </ReactFlow>

      {/* 连线选项菜单 */}
      {connectionMenu.visible && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
          style={{
            left: `${connectionMenu.position.x}px`,
            top: `${connectionMenu.position.y}px`,
          }}
        >
          {connectionMenu.activeSubmenu === null ? (
            <div>
              <button
                onClick={handleShowImageSubmenu}
                className="w-full px-8 py-2 flex items-center justify-between hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">图片</div>
              </button>
              <button
                onClick={handleShowVideoSubmenu}
                className="w-full px-8 py-2 flex items-center justify-between hover:bg-purple-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">视频</div>
              </button>
            </div>
          ) : connectionMenu.activeSubmenu === 'image' ? (
            <div className="min-w-[140px]">
              <button
                onClick={() =>
                  setConnectionMenu((prev) => ({
                    ...prev,
                    activeSubmenu: null,
                  }))
                }
                className="w-full px-6 py-2 text-sm text-gray-500 hover:bg-gray-100 text-left"
              >
                ← 返回
              </button>
              <button
                onClick={() => handleGenerateImage('9:16')}
                className="w-full px-6 py-2 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">竖图 9:16</div>
              </button>
              <button
                onClick={() => handleGenerateImage('16:9')}
                className="w-full px-6 py-2 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">横图 16:9</div>
              </button>
              <button
                onClick={() => handleGenerateImage('1:1')}
                className="w-full px-6 py-2 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">方图 1:1</div>
              </button>
            </div>
          ) : (
            <div className="min-w-[140px]">
              <button
                onClick={() =>
                  setConnectionMenu((prev) => ({
                    ...prev,
                    activeSubmenu: null,
                  }))
                }
                className="w-full px-6 py-2 text-sm text-gray-500 hover:bg-gray-100 text-left"
              >
                ← 返回
              </button>
              <button
                onClick={() => handleGenerateVideo('9:16')}
                className="w-full px-6 py-2 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">竖屏 9:16</div>
              </button>
              <button
                onClick={() => handleGenerateVideo('16:9')}
                className="w-full px-6 py-2 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900">横屏 16:9</div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {connectionMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={resetConnectionMenu}
        />
      )}
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasContent />
    </ReactFlowProvider>
  );
}