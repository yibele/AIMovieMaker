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

import { useCanvasStore } from '@/lib/store';
import ImageNode from './nodes/ImageNode';
import TextNode from './nodes/TextNode';
import VideoNode from './nodes/VideoNode';
import CanvasNavigation from './CanvasNavigation';
import RightToolbar from './RightToolbar';
import AIInputPanel from './AIInputPanel';
import Toolbar from './Toolbar';
import SelectionToolbar from './SelectionToolbar';
import ConnectionMenuRoot from './canvas/connection-menu/ConnectionMenuRoot';
import ImageAnnotatorModal, { ImageAnnotatorResult } from './ImageAnnotatorModal';
import { CanvasElement, VideoElement, ImageElement, TextElement } from '@/lib/types';
import { generateVideoFromText, generateVideoFromImages, generateImage, imageToImage, registerUploadedImage } from '@/lib/api-mock';
import { loadMaterialsFromProject } from '@/lib/project-materials';
import {
  getPositionAboveInput,
  generateFromInput,
  imageToImageFromInput,
  multiImageRecipeFromInput,
} from '@/lib/input-panel-generator';
import { useConnectionMenu } from '@/hooks/canvas/useConnectionMenu';
import { ConnectionMenuCallbacks } from '@/types/connection-menu';
import { useTextToImage } from '@/hooks/canvas/useTextToImage';
import { useImageToImage } from '@/hooks/canvas/useImageToImage';
import { ImageAspectRatio } from '@/types/image-generation';

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  image: ImageNode,
  text: TextNode,
  video: VideoNode,
};

const VIDEO_NODE_DEFAULT_SIZE = { width: 400, height: 300 };
const EDGE_DEFAULT_STYLE = { stroke: '#64748b', strokeWidth: 1 };

function CanvasContent({ projectId }: { projectId?: string }) {
  const elements = useCanvasStore((state) => state.elements);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addElement = useCanvasStore((state) => state.addElement);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const uiState = useCanvasStore((state) => state.uiState);
  const loadProjectPrefixPrompt = useCanvasStore((state) => state.loadProjectPrefixPrompt);

  // 图片编辑器状态 - 使用响应式 hooks
  const annotatorTarget = useCanvasStore((state) => state.annotatorTarget);
  const isLoadingAnnotatorImage = useCanvasStore((state) => state.isLoadingAnnotatorImage);
  const setAnnotatorTarget = useCanvasStore((state) => state.setAnnotatorTarget);
  const setIsLoadingAnnotatorImage = useCanvasStore((state) => state.setIsLoadingAnnotatorImage);
  
  // 行级注释：多图编辑 - 主图和参考图
  const [mainImageForEdit, setMainImageForEdit] = useState<ImageElement | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageElement[]>([]);

  // 行级注释：React Flow 节点和边缘状态（需要在 Hooks 之前声明）
  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(elements.map(el => ({
    id: el.id,
    type: el.type,
    position: el.position,
    data: el as any,
    draggable: true,
    style: el.size ? {
      width: el.size.width,
      height: el.size.height,
    } : undefined,
  })));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const reactFlowInstance = useReactFlow();

  // 行级注释：使用连线菜单 Hook 管理菜单状态
  const {
    connectionMenu,
    promptMenuInputRef,
    resetConnectionMenu,
    showConnectionMenu,
    showImageSubmenu,
    showVideoSubmenu,
    showImagePromptInput,
    updateImagePrompt,
    backToMain,
    backToImageSubmenu,
    prepareConnectionMenu,
  } = useConnectionMenu();

  // 行级注释：使用图片生成 Hooks
  const { handleTextToImage } = useTextToImage({
    addElement,
    updateElement,
    setEdges,
    resetConnectionMenu,
  });

  const { handleImageToImage } = useImageToImage({
    addElement,
    setEdges,
    resetConnectionMenu,
  });

  // 行级注释：同步 elements 到 React Flow 节点状态（性能优化：只在元素数量或 ID 变化时完全重建）
  const elementsIdsRef = useRef<string>('');
  const previousElementsRef = useRef<CanvasElement[]>(elements);
  
  useEffect(() => {
    const newIdsString = elements.map(el => el.id).sort().join(',');
    
    // 行级注释：只有元素数量/ID 变化时才完全重建节点列表（新增/删除节点）
    if (elementsIdsRef.current !== newIdsString) {
      elementsIdsRef.current = newIdsString;
      setNodes(elements.map(el => ({
        id: el.id,
        type: el.type,
        position: el.position,
        data: el as any,
        draggable: true,
        style: el.size ? {
          width: el.size.width,
          height: el.size.height,
        } : undefined,
      })));
      previousElementsRef.current = elements;
    } else {
      // 行级注释：元素数量不变时，只更新节点的 data 和 style（避免重建整个列表）
      setNodes((currentNodes) =>
        currentNodes.map((node) => {
          const element = elements.find((el) => el.id === node.id);
          const prevElement = previousElementsRef.current.find((el) => el.id === node.id);
          if (!element) return node;
          
          // 行级注释：检查 position 是否真的变化了，避免不必要的位置更新（修复视频生成时的跳动问题）
          const positionChanged = !prevElement || 
            prevElement.position.x !== element.position.x || 
            prevElement.position.y !== element.position.y;
          
          return {
            ...node,
            data: element as any,
            // 行级注释：只在位置真的变化时才更新 position，否则保持 React Flow 内部的位置不变
            position: positionChanged ? element.position : node.position,
            style: element.size ? {
              width: element.size.width,
              height: element.size.height,
            } : undefined,
          };
        })
      );
      previousElementsRef.current = elements;
    }
  }, [elements, setNodes]);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    // 设置 projectId 到 store 的 apiConfig 中
    useCanvasStore.setState((state) => ({
      apiConfig: {
        ...state.apiConfig,
        projectId,
      },
    }));
    // 加载项目的前置提示词
    loadProjectPrefixPrompt(projectId);
    // 行级注释：素材库改为手动加载，不自动加载
  }, [projectId, loadProjectPrefixPrompt]);

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
      const startImageId = videoElement.startImageId;
      const endImageId = videoElement.endImageId;
      const generationCount = videoElement.generationCount || 1; // 行级注释：获取生成数量

      const hasAtLeastOneImage = Boolean(startImageId || endImageId);
      // 行级注释：支持纯文本生成视频 - 只要有提示词就可以生成
      const ready = Boolean(promptText);

      if (!ready) {
        updateElement(videoId, {
          status: 'pending',
          readyForGeneration: ready,
        } as Partial<VideoElement>);
        return;
      }

      console.log('🎬 maybeStartVideo: 开始生成视频', { videoId, generationCount, promptText });

      // 行级注释：如果 generationCount > 1，创建额外的视频节点
      if (generationCount > 1) {
        const basePosition = videoElement.position;
        const size = videoElement.size || { width: 640, height: 360 };
        const spacing = 50; // 行级注释：节点之间的间距

        for (let i = 1; i < generationCount; i++) {
          const newVideoId = `video-${Date.now()}-${i}`;
          const newPosition = {
            x: basePosition.x + (size.width + spacing) * i,
            y: basePosition.y,
          };

          const newVideo: VideoElement = {
            id: newVideoId,
            type: 'video',
            src: '',
            thumbnail: '',
            duration: 0,
            status: 'queued',
            progress: 0,
            position: newPosition,
            size: size,
            promptText: promptText,
            startImageId: startImageId,
            endImageId: endImageId,
            generationCount: 1, // 行级注释：每个节点只生成一个视频
            generatedFrom: videoElement.generatedFrom,
          };

          const addElement = useCanvasStore.getState().addElement;
          addElement(newVideo);

          // 行级注释：创建连线到图片节点
          if (startImageId) {
            const edgeId = `edge-${startImageId}-${newVideoId}-start`;
            setEdges((eds: any[]) => [
              ...eds,
              {
                id: edgeId,
                source: startImageId,
                sourceHandle: null,
                target: newVideoId,
                targetHandle: 'start-image',
                type: 'default',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
              },
            ]);
          }
          if (endImageId && endImageId !== startImageId) {
            const edgeId = `edge-${endImageId}-${newVideoId}-end`;
            setEdges((eds: any[]) => [
              ...eds,
              {
                id: edgeId,
                source: endImageId,
                sourceHandle: null,
                target: newVideoId,
                targetHandle: 'end-image',
                type: 'default',
                animated: true,
                style: { stroke: '#3b82f6', strokeWidth: 2 },
              },
            ]);
          }

          console.log('✅ 创建额外视频节点:', newVideoId);

          // 行级注释：延迟触发生成，避免同时发起太多请求
          setTimeout(() => {
            maybeStartVideo(newVideoId);
          }, i * 500); // 每个视频间隔 0.5 秒
        }
      }

      activeGenerationRef.current.add(videoId);

      updateElement(videoId, {
        status: 'generating',
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

      try {
        let result;
        let generationType: 'text-to-video' | 'image-to-image' = 'text-to-video';
        const combinedSourceIds = new Set<string>(videoElement.generatedFrom?.sourceIds ?? []);

        // 行级注释：判断是图生视频还是文生视频
        if (hasAtLeastOneImage) {
          // 行级注释：图生视频 - 使用首尾帧
          const actualStartId = startImageId || endImageId!;
          const actualEndId = startImageId && endImageId ? endImageId : undefined;

          result = await generateVideoFromImages(actualStartId, actualEndId, promptText);
          
          if (startImageId) combinedSourceIds.add(startImageId);
          if (endImageId) combinedSourceIds.add(endImageId);
          generationType = 'image-to-image';
        } else {
          // 行级注释：纯文本生成视频
          const aspectRatio = videoElement.size?.width && videoElement.size?.height 
            ? (Math.abs(videoElement.size.width / videoElement.size.height - 16/9) < 0.1 ? '16:9'
              : Math.abs(videoElement.size.width / videoElement.size.height - 9/16) < 0.1 ? '9:16'
              : '1:1')
            : '9:16'; // 行级注释：默认竖屏（与 Google 官方默认一致）
          
          console.log('🎬 调用文生视频:', { promptText, aspectRatio });
          result = await generateVideoFromText(promptText || '', aspectRatio as '16:9' | '9:16' | '1:1');
          generationType = 'text-to-video';
        }

        updateElement(videoId, {
          status: 'ready',
          src: result.videoUrl,
          thumbnail: result.thumbnail,
          duration: result.duration,
          mediaGenerationId: result.mediaGenerationId,
          progress: 100,
          readyForGeneration: true,
          generatedFrom: {
            type: generationType,
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

  // 行级注释：注册从输入框生成图片的回调
  const handleGenerateFromInput = useCallback(
    async (
      prompt: string,
      aspectRatio: '16:9' | '9:16' | '1:1',
      count: number,
      panelRef: HTMLDivElement | null
    ) => {
      const { elements: storeElements, selection, addPromptHistory } = useCanvasStore.getState();
      const position = getPositionAboveInput(panelRef, reactFlowInstance.screenToFlowPosition);

      // 行级注释：获取选中的图片
      const selectedImages = storeElements
        .filter((el) => selection.includes(el.id) && el.type === 'image')
        .map((el) => el as ImageElement);

      try {
        if (selectedImages.length === 0) {
          // 行级注释：文生图
          await generateFromInput(
            prompt,
            aspectRatio,
            count,
            position,
            addElement,
            updateElement,
            useCanvasStore.getState().deleteElement,
            addPromptHistory
          );
        } else if (selectedImages.length === 1) {
          // 行级注释：图生图
          await imageToImageFromInput(
            prompt,
            aspectRatio,
            count,
            selectedImages[0],
            addElement,
            updateElement,
            useCanvasStore.getState().deleteElement,
            addPromptHistory,
            setEdges
          );
        } else {
          // 行级注释：多图融合
          await multiImageRecipeFromInput(
            prompt,
            aspectRatio,
            count,
            selectedImages,
            addElement,
            updateElement,
            useCanvasStore.getState().deleteElement,
            addPromptHistory,
            setEdges
          );
        }
      } catch (error: any) {
        console.error('生成失败:', error);
      }
    },
    [addElement, updateElement, setEdges, reactFlowInstance]
  );

  useEffect(() => {
    useCanvasStore.setState({
      onGenerateFromInput: handleGenerateFromInput,
    });
    return () => {
      useCanvasStore.setState({ onGenerateFromInput: undefined });
    };
  }, [handleGenerateFromInput]);

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

  // 行级注释：将 store 中的元素转换为 React Flow 节点
  // @ts-ignore - React Flow 类型推断问题
  const nodes: Node[] = useMemo(() => {
    return elements.map((el: CanvasElement) => ({
      id: el.id,
      type: el.type,
      position: el.position,
      data: el,
      draggable: true,
      style: el.size ? {
        width: el.size.width,
        height: el.size.height,
      } : undefined,
    }));
  }, [elements]);

  // 行级注释：移除此 useEffect，避免重复渲染（已经在上面的 useEffect 中处理了节点同步）

  // 行级注释：移除指向已删除节点的连线
  useEffect(() => {
    // @ts-ignore
    setEdges((currentEdges: any[]) =>
      currentEdges.filter((edge: any) => {
        const sourceExists = elements.some((el) => el.id === edge.source);
        const targetExists = elements.some((el) => el.id === edge.target);
        return sourceExists && targetExists;
      })
    );
  }, [elements, setEdges]);

  // 拦截 onNodesChange，处理删除事件并同步到 store
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      // 行级注释：过滤掉正在生成/处理中的节点删除操作
      const filteredChanges = changes.filter((change) => {
        if (change.type === 'remove') {
          const element = elements.find((el) => el.id === change.id);
          
          if (element) {
            // 行级注释：检查视频节点是否正在生成
            if (element.type === 'video') {
              const videoElement = element as VideoElement;
              if (videoElement.status === 'queued' || videoElement.status === 'generating') {
                alert('视频正在生成中，无法删除');
                return false; // 阻止删除
              }
            }
            
            // 行级注释：检查图片节点是否正在处理
            if (element.type === 'image') {
              const imageElement = element as ImageElement;
              const isSyncing = imageElement.uploadState === 'syncing';
              const hasMediaId = Boolean(imageElement.mediaGenerationId);
              const isError = imageElement.uploadState === 'error';
              const isProcessing = !isError && (isSyncing || !hasMediaId);
              
              if (isProcessing) {
                alert('图片正在生成/处理中，无法删除');
                return false; // 阻止删除
              }
            }
          }
          
          // 行级注释：允许删除，从 store 中删除元素
          useCanvasStore.getState().deleteElement(change.id);
        }
        
        return true; // 保留这个变化
      });

      // 行级注释：传递过滤后的变化给 React Flow
      onNodesChange(filteredChanges);
    },
    [onNodesChange, elements]
  );

  // 行级注释：拖动过程中的节点位置缓存（避免频繁更新 store）
  const draggedNodesRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  
  // 行级注释：拖动过程中只更新本地状态，不触发 store 更新（性能优化）
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      draggedNodesRef.current.set(node.id, { x: node.position.x, y: node.position.y });
    },
    []
  );

  // 行级注释：拖动结束后批量更新 store（减少渲染次数）
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node, nodes: Node[]) => {
      // 找到所有被拖动的节点（包括多选）
      const selectedNodes = nodes.filter(n => n.selected);
      const nodesToUpdate = selectedNodes.length > 1 ? selectedNodes : [node];

      // 行级注释：批量更新位置到 store（一次性更新，避免多次触发 elements 变化）
      const { elements: currentElements } = useCanvasStore.getState();
      const updatedElements = currentElements.map((el) => {
        const draggedNode = nodesToUpdate.find((n) => n.id === el.id);
        if (draggedNode) {
          return { ...el, position: draggedNode.position };
        }
        return el;
      });
      
      // 行级注释：直接替换整个 elements 数组（一次性更新，而非多次调用 updateElement）
      useCanvasStore.setState({ elements: updatedElements });
      
      // 清空拖动缓存
      draggedNodesRef.current.clear();
    },
    []
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

      prepareConnectionMenu(sourceNode.id, sourceNode.type as CanvasElement['type']);
    },
    [elements, prepareConnectionMenu, resetConnectionMenu]
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

        showConnectionMenu(
          { x: mouseEvent.clientX, y: mouseEvent.clientY },
          sourceNode.id,
          'text'
        );
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
        const sourceNode = elements.find((el) => el.id === startInfo.sourceId) as ImageElement | undefined;
        if (!sourceNode) {
          resetConnectionMenu();
          return;
        }

        // 行级注释：图片节点拉线时也显示菜单，让用户选择生成图片还是视频
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

  // 处理选择生成图片（带比例参数）
  const handleGenerateImage = useCallback(
    async (aspectRatio: ImageAspectRatio) => {
      const sourceNodeId = connectionMenu.sourceNodeId;
      const sourceNodeType = connectionMenu.sourceNodeType;
      if (!sourceNodeId || !sourceNodeType) return;

      const sourceNode = elements.find((el) => el.id === sourceNodeId);
      if (!sourceNode) return;

      // 行级注释：从文字节点生成图片（文生图）
      if (sourceNodeType === 'text' && sourceNode.type === 'text') {
        handleTextToImage(sourceNode as TextElement, aspectRatio);
        return;
      }

      // 行级注释：从图片节点生成图片（图生图）
      if (sourceNodeType === 'image' && sourceNode.type === 'image') {
        showImagePromptInput(aspectRatio);
        return;
      }
    },
    [connectionMenu.sourceNodeId, connectionMenu.sourceNodeType, elements, handleTextToImage, showImagePromptInput]
  );

  // 行级注释：图生图提示词输入变化处理（现在由 Hook 管理）
  const handleImagePromptInputChange = useCallback(
    (value: string) => {
      updateImagePrompt(value);
    },
    [updateImagePrompt]
  );

  const handleConfirmImagePrompt = useCallback(() => {
    const config = connectionMenu.pendingImageConfig;
    const sourceNodeId = connectionMenu.sourceNodeId;
    if (!config || !sourceNodeId) {
      return;
    }

    const promptText = config.prompt.trim();
    if (!promptText) {
      alert('请输入提示词');
      return;
    }

    const sourceNode = elements.find(
      (el) => el.id === sourceNodeId && el.type === 'image'
    ) as ImageElement | undefined;

    if (!sourceNode) {
      resetConnectionMenu();
      return;
    }

    handleImageToImage(sourceNode, config.aspectRatio, promptText);
  }, [
    connectionMenu.pendingImageConfig,
    connectionMenu.sourceNodeId,
    elements,
    handleImageToImage,
    resetConnectionMenu,
  ]);

  // 处理选择生成视频
  const handleGenerateVideo = useCallback(
    async (aspectRatio: '9:16' | '16:9') => {
      const sourceNodeId = connectionMenu.sourceNodeId;
      const sourceNodeType = connectionMenu.sourceNodeType;
      if (!sourceNodeId || !sourceNodeType) return;

      const sourceNode = elements.find((el) => el.id === sourceNodeId);
      if (!sourceNode) return;

      // 行级注释：从文字节点生成视频
      if (sourceNodeType === 'text' && sourceNode.type === 'text') {
        handleTextToVideo(sourceNode as TextElement, aspectRatio);
        return;
      }

      // 行级注释：从图片节点生成视频
      if (sourceNodeType === 'image' && sourceNode.type === 'image') {
        handleImageToVideo(sourceNode as ImageElement, aspectRatio);
        return;
      }
    },
    [connectionMenu.sourceNodeId, connectionMenu.sourceNodeType, elements]
  );

  // 图片编辑器回调函数 - 使用 useCallback 避免不必要的重新渲染
  const handleAnnotatorClose = useCallback(() => {
    setAnnotatorTarget(null);
    setMainImageForEdit(null); // 清空主图
    setReferenceImages([]); // 清空参考图
  }, [setAnnotatorTarget]);

  // 行级注释：多图编辑 - 用户从画布选中多张图片后点击"图片编辑"
  const handleMultiImageEdit = useCallback(async () => {
    const selection = useCanvasStore.getState().selection;
    const selectedImages = elements
      .filter((el) => selection.includes(el.id) && el.type === 'image')
      .map((el) => el as ImageElement);

    if (selectedImages.length < 2 || selectedImages.length > 6) {
      console.error('多图编辑需要 2-6 张图片');
      return;
    }

    // 第1张作为主图，其他作为参考图
    const mainImage = selectedImages[0];
    const refImages = selectedImages.slice(1);

    // 加载主图
    setIsLoadingAnnotatorImage(true);

    try {
      const apiConfig = useCanvasStore.getState().apiConfig;
      
      // 行级注释：将 API 配置暴露到 window，供 ImageAnnotatorModal 使用
      if (typeof window !== 'undefined') {
        (window as any).__API_KEY__ = apiConfig.apiKey || '';
        (window as any).__PROXY__ = apiConfig.proxy || '';
        (window as any).__BEARER_TOKEN__ = apiConfig.bearerToken || '';
      }
      
      // 行级注释：加载主图的 base64 数据
      let mainImageBase64Src: string;
      
      // 如果主图有 base64，直接使用
      if (mainImage.base64) {
        mainImageBase64Src = mainImage.base64.startsWith('data:')
          ? mainImage.base64
          : `data:image/png;base64,${mainImage.base64}`;
      } else {
        // 如果没有 base64，通过 API 获取
        const effectiveMediaId = mainImage.mediaId || mainImage.mediaGenerationId;
        
        if (!effectiveMediaId) {
          throw new Error('主图缺少 mediaId，无法编辑');
        }
        
        if (!apiConfig.bearerToken) {
          throw new Error('请先在设置中配置 Bearer Token');
        }

        const mediaResponse = await fetch(
          `/api/flow/media/${effectiveMediaId}?key=${apiConfig.apiKey}&returnUriOnly=false&proxy=${apiConfig.proxy || ''}`,
          {
            headers: apiConfig.bearerToken ? {
              'Authorization': `Bearer ${apiConfig.bearerToken}`
            } : {}
          }
        );

        if (!mediaResponse.ok) {
          throw new Error('获取图片失败');
        }

        const mediaData = await mediaResponse.json();
        const encodedImage = mediaData?.image?.encodedImage ||
          mediaData?.userUploadedImage?.image ||
          mediaData?.userUploadedImage?.encodedImage;

        if (!encodedImage) {
          throw new Error('未获取到图片数据');
        }
        
        mainImageBase64Src = encodedImage.startsWith('data:')
          ? encodedImage
          : `data:image/png;base64,${encodedImage}`;
      }
      
      // 行级注释：确保参考图也包含 base64（如果有的话），用于切换主图
      const refImagesWithBase64 = refImages.map(img => {
        if (img.base64) {
          const base64Src = img.base64.startsWith('data:')
            ? img.base64
            : `data:image/png;base64,${img.base64}`;
          return { ...img, base64: base64Src };
        }
        return img;
      });

      setAnnotatorTarget({
        ...mainImage,
        src: mainImageBase64Src,
        base64: mainImageBase64Src,
      });
      setMainImageForEdit({
        ...mainImage,
        base64: mainImageBase64Src,
      });
      setReferenceImages(refImagesWithBase64);
      setIsLoadingAnnotatorImage(false);

    } catch (error) {
      console.error('❌ 加载主图失败:', error);
      setAnnotatorTarget(null);
      setMainImageForEdit(null);
      setReferenceImages([]);
      setIsLoadingAnnotatorImage(false);
    }
  }, [elements, setAnnotatorTarget, setIsLoadingAnnotatorImage]);

  const handleAnnotatorConfirm = useCallback(async (
    result: ImageAnnotatorResult, 
    annotatedImageDataUrl: string,
    finalMainImage?: ImageElement,
    finalReferenceImages?: ImageElement[]
  ) => {
    // 行级注释：使用用户最终确认的主图和参考图（可能被切换过）
    const currentMainImage = finalMainImage || annotatorTarget;
    const currentReferenceImages = finalReferenceImages || referenceImages;
    
    if (!currentMainImage || !result.promptText?.trim()) return;

    const newImageId = `image-${Date.now()}`;
    const hasReferenceImages = currentReferenceImages.length > 0;
    const allSourceImages = [currentMainImage, ...currentReferenceImages];

    try {
      const aspectRatio = (() => {
        const width = currentMainImage.size?.width || 640;
        const height = currentMainImage.size?.height || 360;
        const ratio = width / height;
        if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
        if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
        return '1:1';
      })() as '16:9' | '9:16' | '1:1';

      const size = aspectRatio === '9:16' ? { width: 360, height: 640 }
        : aspectRatio === '1:1' ? { width: 512, height: 512 }
          : { width: 640, height: 360 };

      const newImage: ImageElement = {
        id: newImageId,
        type: 'image',
        src: '',
        position: {
          x: currentMainImage.position.x + (currentMainImage.size?.width || 640) + 50,
          y: currentMainImage.position.y,
        },
        size,
        sourceImageIds: allSourceImages.map(img => img.id),
        generatedFrom: {
          type: 'image-to-image',
          sourceIds: allSourceImages.map(img => img.id),
          prompt: result.promptText,
        },
      };

      addElement(newImage);

      // 行级注释：为所有源图片创建连线（主图 + 参考图）
      const edgeIds: string[] = [];
      // @ts-ignore
      setEdges((eds: any[]) => {
        const newEdges = allSourceImages.map(sourceImg => {
          const edgeId = `edge-${sourceImg.id}-${newImageId}-edit`;
          edgeIds.push(edgeId);
          return {
            id: edgeId,
            source: sourceImg.id,
            sourceHandle: null,
            target: newImageId,
            targetHandle: null,
            type: 'default',
            animated: true,
            style: { stroke: '#a855f7', strokeWidth: 1 },
          };
        });
        return [...eds, ...newEdges];
      });

      // 上传标注图
      const base64Data = annotatedImageDataUrl.split(',')[1];
      const uploadResult = await registerUploadedImage(base64Data);
      if (!uploadResult.mediaGenerationId) throw new Error('上传标注图失败');

      let imageResult;

      if (hasReferenceImages) {
        // 行级注释：多图编辑 - 使用 runImageRecipe（不使用前置提示词）
        console.log('🧩 多图融合模式，参考图数量:', referenceImages.length);

        const { runImageRecipe } = await import('@/lib/api-mock');

        // 构建参考图列表
        const references = [
          // 主图（标注后）
          {
            mediaId: uploadResult.mediaGenerationId,
          caption: '标注后的主图',
          mediaCategory: 'MEDIA_CATEGORY_BOARD',
        },
        // 参考图
        ...currentReferenceImages.map((ref, index) => ({
            mediaId: ref.mediaId || ref.mediaGenerationId,
            caption: ref.caption || `参考图${index + 1}`,
            mediaCategory: 'MEDIA_CATEGORY_SUBJECT',
          }))
        ];

        // 检查所有图片是否有 mediaId
        for (const ref of references) {
          if (!ref.mediaId) {
            throw new Error('存在未同步到 Flow 的参考图，请稍后重试');
          }
        }

        imageResult = await runImageRecipe(
          result.promptText,
          references,
          aspectRatio,
          undefined,
          1
        );

      } else {
        // 行级注释：单图编辑 - 使用 imageToImage（不使用前置提示词）
        console.log('🎨 单图编辑模式');

        imageResult = await imageToImage(
          result.promptText,
          annotatedImageDataUrl,
          aspectRatio,
          '',
          uploadResult.mediaGenerationId,
          1
        );
      }

      // 更新图片
      updateElement(newImageId, {
        src: imageResult.imageUrl,
        base64: imageResult.images?.[0]?.base64,
        promptId: imageResult.promptId,
        mediaId: imageResult.mediaId,
        mediaGenerationId: imageResult.mediaGenerationId,
        uploadState: 'synced',
      } as Partial<ImageElement>);

      // 生成成功后，停止所有连线动画
      // @ts-ignore
      setEdges((eds: any[]) =>
        eds.map((edge: any) =>
          edgeIds.includes(edge.id)
            ? { ...edge, animated: false, style: { stroke: '#10b981', strokeWidth: 1 } }
            : edge
        )
      );

      console.log('✅ 图片编辑完成！');

    } catch (error) {
      console.error('❌ 图片编辑失败:', error);
      
      // 如果失败，将所有连线标记为错误状态
      // @ts-ignore
      setEdges((eds: any[]) =>
        eds.map((edge: any) =>
          edge.target === newImageId
            ? { ...edge, animated: false, style: { stroke: '#ef4444', strokeWidth: 1 } }
            : edge
        )
      );
    }
  }, [annotatorTarget, addElement, updateElement, setEdges]);

  // 行级注释：文生视频处理函数
  const handleTextToVideo = useCallback(
    async (sourceNode: TextElement, aspectRatio: '9:16' | '16:9') => {
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
    [addElement, updateElement, setEdges, resetConnectionMenu]
  );

  // 行级注释：图生视频处理函数
  const handleImageToVideo = useCallback(
    async (sourceNode: ImageElement, aspectRatio: '9:16' | '16:9') => {
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

      const flowPosition = {
        x: sourceNode.position.x + (sourceNode.size?.width || 320) + 100,
        y: sourceNode.position.y,
      };

      // 行级注释：直接调用现有的 createVideoNodeFromImage 函数
      createVideoNodeFromImage(sourceNode, flowPosition, 'start-image', 'right');

      console.log('✅ 从图片节点创建视频节点:', sourceNode.id);
    },
    [createVideoNodeFromImage, resetConnectionMenu]
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

      // 只允许连接到视频节点的自定义输入（只支持图片连接，不支持文本连接）
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
    <div ref={reactFlowWrapperRef} className="w-full h-full bg-gray-50 relative">
      {/* 顶部导航 */}
      <CanvasNavigation />

      {/* 左侧工具栏 - 节点创建 */}
      <Toolbar />

      {/* 右侧工具栏 - 功能按钮 */}
      <RightToolbar />

      <ReactFlow
        className="custom-theme absolute inset-0"
        nodes={reactFlowNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={handleNodeDrag}
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
        minZoom={0.1}
        maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        connectionLineStyle={{ stroke: '#a855f7', strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.Bezier}
        proOptions={{ hideAttribution: true }}
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

        {/* AI 输入面板 - 放在 React Flow 内部以使用 useReactFlow */}
        <AIInputPanel />
      </ReactFlow>

      {/* 行级注释：连线选项菜单组件 */}
      <ConnectionMenuRoot
        state={connectionMenu}
        callbacks={{
          onShowImageSubmenu: showImageSubmenu,
          onShowVideoSubmenu: showVideoSubmenu,
          onGenerateImage: handleGenerateImage,
          onGenerateVideo: handleGenerateVideo,
          onImagePromptInputChange: handleImagePromptInputChange,
          onConfirmImagePrompt: handleConfirmImagePrompt,
          onBackToMain: backToMain,
          onBackToImageSubmenu: backToImageSubmenu,
          onClose: resetConnectionMenu,
        }}
        promptInputRef={promptMenuInputRef}
      />

      {/* 多选工具栏 */}
      <SelectionToolbar onMultiImageEdit={handleMultiImageEdit} />

      {/* 图片编辑器 Modal - 全局渲染 */}
      <ImageAnnotatorModal
        open={Boolean(annotatorTarget)}
        imageSrc={annotatorTarget?.src || null}
        isLoadingImage={isLoadingAnnotatorImage}
        mainImage={mainImageForEdit}
        referenceImages={referenceImages}
        onClose={handleAnnotatorClose}
        onConfirm={handleAnnotatorConfirm}
      />
    </div>
  );
}

export default function Canvas({ projectId }: { projectId?: string }) {
  return (
    <ReactFlowProvider>
      <CanvasContent projectId={projectId} />
    </ReactFlowProvider>
  );
}