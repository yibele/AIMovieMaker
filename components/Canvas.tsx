'use client';

import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeTypes,
  SelectionMode,
  OnSelectionChangeParams,
  ConnectionLineType,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { toast } from 'sonner';
import { useCanvasStore } from '@/lib/store';
import ImageNode from './nodes/ImageNode';
import TextNode from './nodes/TextNode';
import VideoNode from './nodes/VideoNode';
import NoteNode from './nodes/NoteNode';
import CanvasNavigation from './CanvasNavigation';
import RightToolbar from './RightToolbar';
import AIInputPanel from './AIInputPanel';
import Toolbar from './Toolbar';
import SelectionToolbar from './SelectionToolbar';
import ConnectionMenuRoot from './canvas/connection-menu/ConnectionMenuRoot';
import ImageAnnotatorModal, { ImageAnnotatorResult } from './ImageAnnotatorModal';
import ImageCropperModal, { AspectRatioOption, CroppedImageResult } from './ImageCropperModal';
import ThemeToggle from './ThemeToggle';
import { useThemeStore } from '@/lib/theme-store';
import { CanvasElement, VideoElement, ImageElement, TextElement, NoteElement } from '@/lib/types';
import { imageToImage, registerUploadedImage } from '@/lib/api-mock';
import type { FlowAspectRatioEnum } from '@/lib/api-mock';
import { loadMaterialsFromProject } from '@/lib/project-materials';
import {
  getPositionAboveInput,
  generateFromInput,
  imageToImageFromInput,
  multiImageRecipeFromInput,
  generateSmartStoryboard,
} from '@/lib/input-panel-generator';
import type { GridPresetKey } from '@/lib/smart-storyboard';
import { useConnectionMenu } from '@/hooks/canvas/useConnectionMenu';
import { useVideoGeneration } from '@/hooks/canvas/useVideoGeneration';
import { useNextShot } from '@/hooks/canvas/useNextShot';
import { useVideoActions } from '@/hooks/canvas/useVideoActions';
import { useConnectionHandler } from '@/hooks/canvas/useConnectionHandler';
import { ConnectionMenuCallbacks } from '@/types/connection-menu';
import { useTextToImage } from '@/hooks/canvas/useTextToImage';
import { useImageToImage } from '@/hooks/canvas/useImageToImage';
import { ImageAspectRatio } from '@/types/image-generation';
import {
  VIDEO_NODE_DEFAULT_SIZE,
  IMAGE_NODE_DEFAULT_SIZE,
  TEXT_NODE_DEFAULT_SIZE,
  getVideoNodeSize,
  getImageNodeSize,
  detectVideoAspectRatio,
  detectAspectRatio,
} from '@/lib/constants/node-sizes';
import { createVideoFromImage, generateNodeId } from '@/lib/services/node-management.service';
import { analyzeImageForVideoPrompt } from '@/lib/tools/vision-api';

// 注册自定义节点类型
const nodeTypes: NodeTypes = {
  image: ImageNode,
  text: TextNode,
  video: VideoNode,
  note: NoteNode, // 行级注释：记事本节点（剧本、分镜等长文本）
};

// 行级注释：统一的边缘样式常量
const EDGE_DEFAULT_STYLE = { stroke: '#64748b', strokeWidth: 1 };
const EDGE_GENERATING_STYLE = { stroke: '#a855f7', strokeWidth: 1 };
const EDGE_ERROR_STYLE = { stroke: '#ef4444', strokeWidth: 1 };
const EDGE_NEXT_SHOT_STYLE = { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '5,5' };

function CanvasContent({ projectId }: { projectId?: string }) {
  const elements = useCanvasStore((state) => state.elements);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addElement = useCanvasStore((state) => state.addElement);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const uiState = useCanvasStore((state) => state.uiState);
  const loadProjectPrefixPrompt = useCanvasStore((state) => state.loadProjectPrefixPrompt);
  
  // 主题状态
  const theme = useThemeStore((state) => state.theme);

  // 图片编辑器状态 - 使用响应式 hooks
  const annotatorTarget = useCanvasStore((state) => state.annotatorTarget);
  const isLoadingAnnotatorImage = useCanvasStore((state) => state.isLoadingAnnotatorImage);
  const setAnnotatorTarget = useCanvasStore((state) => state.setAnnotatorTarget);
  const setIsLoadingAnnotatorImage = useCanvasStore((state) => state.setIsLoadingAnnotatorImage);

  // 行级注释：多图编辑 - 主图和参考图
  const [mainImageForEdit, setMainImageForEdit] = useState<ImageElement | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageElement[]>([]);

  // 行级注释：拖拽上传图片 - 裁剪器状态
  type CropperState = {
    open: boolean;
    imageSrc: string | null;
    aspect: AspectRatioOption;
    dropPosition: { x: number; y: number } | null; // 拖拽位置
  };
  const [cropperState, setCropperState] = useState<CropperState>({
    open: false,
    imageSrc: null,
    aspect: '16:9',
    dropPosition: null,
  });

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
    showCameraControlSubmenu,
    showCameraPositionSubmenu,
    showCustomNextShotInput,
    showAutoNextShotCountSubmenu,
  } = useConnectionMenu();

  // 行级注释：使用视频生成 Hook（从 Canvas.tsx 提取 ~340 行代码）
  const { maybeStartVideo, activeGenerationRef } = useVideoGeneration({
    setEdges: setEdges as any,
  });

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

  // 行级注释：使用 Next Shot Hook（从 Canvas.tsx 提取 ~320 行代码）
  const { handleNextShotGeneration, handleTransitionShotsGeneration } = useNextShot({
    setEdges: setEdges as any,
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
  // 行级注释：connectionStartRef 已移动到 useConnectionHandler Hook

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

  // 行级注释：注册智能分镜生成的回调
  const handleGenerateSmartStoryboard = useCallback(
    async (
      prompt: string,
      aspectRatio: '16:9' | '9:16' | '1:1',
      gridPreset: GridPresetKey,
      count: number, // 行级注释：生成多少张网格图
      panelRef: HTMLDivElement | null
    ) => {
      const { elements: storeElements, selection, addPromptHistory } = useCanvasStore.getState();
      const position = getPositionAboveInput(panelRef, reactFlowInstance.screenToFlowPosition);

      // 行级注释：获取选中的图片（作为参考图）
      const selectedImages = storeElements
        .filter((el) => selection.includes(el.id) && el.type === 'image')
        .map((el) => el as ImageElement);

      // 行级注释：如果有选中图片，使用第一张图片的比例；否则使用传入的比例
      let effectiveAspectRatio = aspectRatio;
      if (selectedImages.length > 0 && selectedImages[0].size) {
        effectiveAspectRatio = detectAspectRatio(
          selectedImages[0].size.width,
          selectedImages[0].size.height
        );
      }

      try {
        await generateSmartStoryboard(
          prompt,
          effectiveAspectRatio, // 行级注释：使用检测到的比例
          gridPreset,
          count,
          position,
          selectedImages,
          addElement,
          updateElement,
          useCanvasStore.getState().deleteElement,
          addPromptHistory,
          setEdges
        );
      } catch (error: any) {
        console.error('分镜生成失败:', error);
        toast.error(`生成失败: ${error.message || '未知错误'}`);
      }
    },
    [addElement, updateElement, setEdges, reactFlowInstance]
  );

  useEffect(() => {
    useCanvasStore.setState({
      onGenerateSmartStoryboard: handleGenerateSmartStoryboard,
    });
    return () => {
      useCanvasStore.setState({ onGenerateSmartStoryboard: undefined });
    };
  }, [handleGenerateSmartStoryboard]);

  // 行级注释：使用节点管理服务创建视频节点（从图片派生）
  const createVideoNodeFromImage = useCallback(
    (
      imageNode: ImageElement,
      flowPosition: { x: number; y: number },
      targetHandleId: 'start-image' | 'end-image' = 'start-image',
      sourceHandleId?: string | null
    ) => {
      // 行级注释：使用节点管理服务创建视频节点
      const newVideo = createVideoFromImage(imageNode, flowPosition, targetHandleId);
      addElement(newVideo);

      // 行级注释：创建连线（连线逻辑保留在组件内，因为涉及 React Flow）
      const edgeId = `edge-${imageNode.id}-${newVideo.id}-${targetHandleId}`;
      setEdges((eds: any[]) => {
        const filtered = (eds as any[]).filter((edge: any) => edge.id !== edgeId);
        return [
          ...filtered,
          {
            id: edgeId,
            source: imageNode.id,
            target: newVideo.id,
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

  // 行级注释：使用视频操作 Hook（从 Canvas.tsx 提取 ~200 行代码）
  const {
    handleTextToVideo,
    handleImageToVideo,
    handleGenerateVideoFromImage,
    handleGenerateReshoot,
    handleShowExtendVideo,
  } = useVideoActions({
    setEdges: setEdges as any,
    resetConnectionMenu,
    createVideoNodeFromImage,
    connectionMenu: {
      sourceNodeId: connectionMenu.sourceNodeId,
      position: connectionMenu.position,
    },
    reactFlowInstance,
  });

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

  // 行级注释：使用连接处理 Hook（从 Canvas.tsx 提取 ~215 行代码）
  const {
    connectionStartRef,
    handleConnectStart,
    handleConnectEnd,
    handleConnect,
  } = useConnectionHandler({
    setEdges: setEdges as any,
    resetConnectionMenu,
    prepareConnectionMenu,
    showConnectionMenu,
    createTextNodeForVideo,
    reactFlowInstance,
  });

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
      // 注意：这里不需要手动调用 onNodesChange，因为 React Flow 会自动处理 remove
      // 但是我们需要确保 store 同步。
      // 如果我们在这里调用了 deleteElement，store 会更新，elements 会变，useEffect 会更新 nodes。
      // 所以其实我们不需要把 remove 变化传递给 onNodesChange，否则可能会导致冲突？
      // 不，React Flow 的 onNodesChange 是为了让非受控模式工作，或者通知父组件。
      // 在受控模式下（我们使用了 nodes 属性），我们需要更新 nodes。
      // 但是我们的 nodes 是从 elements 派生的。
      // 所以，当 deleteElement 被调用，elements 更新，nodes 也会更新。
      // 如果我们把 remove change 传给 onNodesChange，它可能会试图更新本地 nodes state。
      // 但我们的 setNodes 是在 useEffect 中被 elements 覆盖的。
      // 关键问题是：deleteElement 会调用 moveToTrash。
      // 如果 onNodesChange 被触发（例如按 Backspace），我们调用 deleteElement。
      // 如果我们同时让 React Flow 处理这个 change，它可能会在 UI 上移除节点。
      // 但最终 source of truth 是 elements。

      // 这里的逻辑看起来是正确的：拦截 remove，调用 store delete，然后让 React Flow 做它的事（或者忽略，因为 store 会更新）。
      // 为了安全起见，我们可以只调用 deleteElement，不传递 remove change 给 onNodesChange，
      // 因为 store 更新会触发 useEffect 更新 nodes。
      // 但是，drag 等其他 changes 需要传递。

      const nonRemoveChanges = changes.filter(c => c.type !== 'remove');
      if (nonRemoveChanges.length > 0) {
        onNodesChange(nonRemoveChanges);
      }
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

  // 行级注释：拖拽上传图片 - aspectRatio 映射
  const flowAspectMap: Record<AspectRatioOption, FlowAspectRatioEnum> = {
    '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  };

  // 行级注释：拖拽上传图片 - onDragOver 处理
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // 行级注释：拖拽上传图片 - onDrop 处理
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // 行级注释：只接受图片文件
    if (!file.type.startsWith('image/')) {
      toast.error('只支持上传图片文件');
      return;
    }
    
    // 行级注释：检查文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }
    
    // 行级注释：记录拖拽位置
    const dropPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    // 行级注释：读取文件
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      if (!imageUrl) {
        toast.error('读取图片失败，请重试');
        return;
      }
      
      // 行级注释：加载图片获取尺寸，自动选择合适的宽高比
      const img = new Image();
      img.onload = () => {
        const preferAspect: AspectRatioOption = img.width >= img.height ? '16:9' : '9:16';
        setCropperState({
          open: true,
          imageSrc: imageUrl,
          aspect: preferAspect,
          dropPosition,
        });
      };
      img.onerror = () => {
        toast.error('加载图片失败，请重试');
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  }, [reactFlowInstance]);

  // 行级注释：拖拽上传图片 - 裁剪确认后放置到画布
  const handleCropConfirm = useCallback(async (result: CroppedImageResult) => {
    const { dataUrl, aspect } = result;
    const dropPosition = cropperState.dropPosition;
    
    // 关闭裁剪器
    setCropperState({
      open: false,
      imageSrc: null,
      aspect: '16:9',
      dropPosition: null,
    });
    
    const imageId = `image-${Date.now()}`;
    const hasFlowCredential =
      Boolean(apiConfig.bearerToken && apiConfig.bearerToken.trim()) &&
      Boolean(apiConfig.projectId && apiConfig.projectId.trim());

    // 行级注释：使用拖拽位置或屏幕中心
    const nodeSize = getImageNodeSize(aspect);
    const imageWidth = nodeSize.width;
    const imageHeight = nodeSize.height;
    
    const position = dropPosition
      ? { x: dropPosition.x - imageWidth / 2, y: dropPosition.y - imageHeight / 2 }
      : (() => {
          const screenCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          const flowPosition = reactFlowInstance.screenToFlowPosition(screenCenter);
          return { x: flowPosition.x - imageWidth / 2, y: flowPosition.y - imageHeight / 2 };
        })();

    const newImage: ImageElement = {
      id: imageId,
      type: 'image',
      src: dataUrl,
      position,
      size: {
        width: imageWidth,
        height: imageHeight,
      },
      generatedFrom: {
        type: 'input',
      },
      uploadState: hasFlowCredential ? 'syncing' : 'local',
    };

    addElement(newImage);

    if (!hasFlowCredential) {
      console.warn('⚠️ 未配置 Flow 凭证，跳过 Flow 上传注册流程');
      toast.warning('图片已添加，但未配置 API 凭证，无法进行图生图');
      return;
    }

    try {
      const uploadResult = await registerUploadedImage(dataUrl, flowAspectMap[aspect]);
      // 行级注释：同时保存 mediaId 和 mediaGenerationId，确保首尾帧生成可用
      updateElement(imageId, {
        mediaId: uploadResult.mediaId || uploadResult.mediaGenerationId || undefined,
        mediaGenerationId: uploadResult.mediaGenerationId || undefined,
        alt: uploadResult.caption || newImage.alt,
        caption: uploadResult.caption,
        uploadState: 'synced',
        uploadMessage: undefined,
      } as Partial<ImageElement>);
      toast.success('图片上传成功');
    } catch (error: any) {
      console.error('上传图片注册 Flow 失败:', error);
      const message = error?.message || '上传图片注册 Flow 失败，请检查网络或凭证配置';
      updateElement(imageId, {
        uploadState: 'error',
        uploadMessage: message,
      } as Partial<ImageElement>);
      toast.error(message);
    }
  }, [cropperState.dropPosition, apiConfig.bearerToken, apiConfig.projectId, addElement, updateElement, reactFlowInstance, flowAspectMap]);

  // 行级注释：拖拽上传图片 - 关闭裁剪器
  const handleCropCancel = useCallback(() => {
    setCropperState({
      open: false,
      imageSrc: null,
      aspect: '16:9',
      dropPosition: null,
    });
  }, []);

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

    const newImageId = generateNodeId('image');
    const hasReferenceImages = currentReferenceImages.length > 0;
    const allSourceImages = [currentMainImage, ...currentReferenceImages];

    try {
      // 行级注释：使用统一的宽高比检测函数
      const aspectRatio = detectAspectRatio(
        currentMainImage.size?.width || 640,
        currentMainImage.size?.height || 360
      );

      const size = getImageNodeSize(aspectRatio);

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
            style: EDGE_GENERATING_STYLE,
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


    } catch (error) {
      console.error('❌ 图片编辑失败:', error);

      // 如果失败，将所有连线标记为错误状态
      // @ts-ignore
      setEdges((eds: any[]) =>
        eds.map((edge: any) =>
          edge.target === newImageId
            ? { ...edge, animated: false, style: EDGE_ERROR_STYLE }
            : edge
        )
      );
    }
  }, [annotatorTarget, addElement, updateElement, setEdges]);
  // Next Shot 包装函数（使用 useNextShot Hook）
  const handleAutoNextShot = useCallback((count: number = 1) => {
    if (connectionMenu.sourceNodeId) {
      handleNextShotGeneration(connectionMenu.sourceNodeId, undefined, count);
    }
  }, [connectionMenu.sourceNodeId, handleNextShotGeneration]);

  const handleCustomNextShot = useCallback(() => {
    showCustomNextShotInput();
  }, [showCustomNextShotInput]);

  const handleConfirmCustomNextShot = useCallback(() => {
    if (connectionMenu.sourceNodeId && connectionMenu.pendingImageConfig?.prompt) {
      handleNextShotGeneration(connectionMenu.sourceNodeId, connectionMenu.pendingImageConfig.prompt);
    }
  }, [connectionMenu.sourceNodeId, connectionMenu.pendingImageConfig, handleNextShotGeneration]);

  return (
    <div 
      ref={reactFlowWrapperRef} 
      className="w-full h-full bg-gray-50 relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
        onlyRenderVisibleElements={true} // 行级注释：只渲染视口内的节点，大幅提升性能
        proOptions={{ hideAttribution: true }}
      >
        {/* 主题切换按钮 - 右下角 */}
        <div className="absolute bottom-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* 背景网格 - 根据主题切换颜色 */}
        {uiState.showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={40}
            size={4}
            color={theme === 'dark' ? '#334155' : '#dddddd'}
            bgColor={theme === 'dark' ? '#0f172a' : '#f0f0f0'}
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
          onGenerateVideoFromImage: handleGenerateVideoFromImage,
          onImagePromptInputChange: handleImagePromptInputChange,
          onConfirmImagePrompt: handleConfirmImagePrompt,
          onBackToMain: backToMain,
          onBackToImageSubmenu: backToImageSubmenu,
          onClose: resetConnectionMenu,
          onShowCameraControlSubmenu: showCameraControlSubmenu,
          onShowCameraPositionSubmenu: showCameraPositionSubmenu,
          onGenerateReshoot: handleGenerateReshoot,
          onShowExtendVideoSubmenu: handleShowExtendVideo,
          onExtendPromptChange: () => { }, // 行级注释：不再需要，保留接口兼容性
          onConfirmExtend: () => { }, // 行级注释：不再需要，保留接口兼容性
          onAutoNextShot: handleAutoNextShot,
          onCustomNextShot: handleCustomNextShot,
          onConfirmCustomNextShot: handleConfirmCustomNextShot,
          onShowAutoNextShotCountSubmenu: showAutoNextShotCountSubmenu,
        }}
        promptInputRef={promptMenuInputRef}
      />

      {/* 多选工具栏 */}
      <SelectionToolbar 
        onMultiImageEdit={handleMultiImageEdit} 
        onTransitionShots={handleTransitionShotsGeneration}
      />

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

      {/* 行级注释：拖拽上传图片裁剪器 Modal */}
      <ImageCropperModal
        open={cropperState.open}
        imageSrc={cropperState.imageSrc}
        initialAspect={cropperState.aspect}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
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