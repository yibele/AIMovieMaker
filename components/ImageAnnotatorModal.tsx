'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  Eraser,
  PenLine,
  Redo2,
  Send,
  Square,
  Type,
  Undo2,
  X,
} from 'lucide-react';

// 工具类型定义
type ToolType = 'pen' | 'arrow' | 'rectangle' | 'text' | 'eraser';

// 归一化坐标，便于适配不同尺寸
type RelativePoint = {
  x: number;
  y: number;
};

interface BaseAnnotation {
  id: string;
  color: string;
  type: ToolType;
}

interface PenAnnotation extends BaseAnnotation {
  type: 'pen';
  points: RelativePoint[];
  strokeWidth: number;
}

interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  start: RelativePoint;
  end: RelativePoint;
  strokeWidth: number;
}

interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  start: RelativePoint;
  end: RelativePoint;
  strokeWidth: number;
}

interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: RelativePoint;
  text: string;
}

export type Annotation =
  | PenAnnotation
  | ArrowAnnotation
  | RectangleAnnotation
  | TextAnnotation;

export interface ImageAnnotatorResult {
  annotations: Annotation[];
  promptText: string;
}

interface ImageAnnotatorModalProps {
  open: boolean;
  imageSrc: string | null;
  isLoadingImage?: boolean; // 是否正在加载原图
  mainImage?: any; // 主图信息（完整的 ImageElement）
  referenceImages?: any[]; // 参考图列表（从外部传入）
  onClose: () => void;
  onConfirm?: (result: ImageAnnotatorResult, annotatedImageDataUrl: string, mainImage?: any, referenceImages?: any[]) => void | Promise<void>;
}

const toolDefinitions: {
  id: ToolType;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'pen', label: '画笔', icon: PenLine },
  { id: 'arrow', label: '箭头', icon: ArrowUpRight },
  { id: 'rectangle', label: '方框', icon: Square },
  { id: 'text', label: '文字', icon: Type },
  { id: 'eraser', label: '橡皮擦', icon: Eraser },
];

const colorOptions = [
  '#0f172a', // 黑色
  '#ffffff', // 白色
  '#ef4444', // 红色
  '#10b981', // 绿色
] as const;

const strokeWidthOptions = [
  { id: 'thin', label: '细', width: 2 },
  { id: 'medium', label: '中', width: 4 },
  { id: 'thick', label: '粗', width: 6 },
] as const;

const cursorMap: Record<ToolType, string> = {
  pen: 'crosshair',
  arrow: 'crosshair',
  rectangle: 'crosshair',
  text: 'text',
  eraser: 'pointer',
};

export default function ImageAnnotatorModal({
  open,
  imageSrc,
  isLoadingImage = false,
  mainImage,
  referenceImages = [],
  onClose,
  onConfirm,
}: ImageAnnotatorModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 1, height: 1 });
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [selectedColor, setSelectedColor] = useState<string>(colorOptions[0]);
  const [selectedStrokeWidth, setSelectedStrokeWidth] = useState<number>(strokeWidthOptions[1].width); // 默认中等粗细
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(
    null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false); // 是否正在生成
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // 行级注释：内部管理主图和参考图状态（允许用户切换）
  const [currentMainImage, setCurrentMainImage] = useState<any>(mainImage);
  const [currentReferenceImages, setCurrentReferenceImages] = useState<any[]>(referenceImages);
  const [switchingImage, setSwitchingImage] = useState(false); // 是否正在切换图片

  // 行级注释：当外部主图和参考图变化时，重置内部状态
  useEffect(() => {
    if (open) {
      setCurrentMainImage(mainImage);
      setCurrentReferenceImages(referenceImages);
      setAnnotations([]); // 清空标注
      setPromptText(''); // 清空提示词
    }
  }, [open, mainImage, referenceImages]);

  // 监听图片加载，更新尺寸
  useEffect(() => {
    if (!imgRef.current || !open) return;
    
    const updateSize = () => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      setImgSize({ width: rect.width, height: rect.height });
    };
    
    const img = imgRef.current;
    if (img.complete) {
      updateSize();
    } else {
      img.onload = updateSize;
    }
    
    const observer = new ResizeObserver(updateSize);
    observer.observe(img);
    return () => observer.disconnect();
  }, [open, imageSrc]);

  // 行级注释：切换主图 - 将某个参考图设为主图（确保加载 base64 数据）
  const handleSetMainImage = async (newMainImage: any) => {
    if (!newMainImage || switchingImage) return;
    
    setSwitchingImage(true);
    
    try {
      // 清空当前标注（因为要切换到新的主图了）
      setAnnotations([]);
      setRedoStack([]);
      setDraftAnnotation(null);
      
      // 行级注释：如果新主图已有 base64，直接使用
      if (newMainImage.base64) {
        const imageDataUrl = newMainImage.base64.startsWith('data:')
          ? newMainImage.base64
          : `data:image/png;base64,${newMainImage.base64}`;
        
        // 交换主图和参考图
        const oldMainImage = currentMainImage;
        const newReferenceImages = currentReferenceImages.filter(img => img.id !== newMainImage.id);
        
        if (oldMainImage) {
          newReferenceImages.push(oldMainImage);
        }
        
        // 更新主图为 base64 版本
        setCurrentMainImage({
          ...newMainImage,
          src: imageDataUrl,
        });
        setCurrentReferenceImages(newReferenceImages);
        
        console.log('✅ 主图已切换 (使用 base64):', newMainImage.id);
        setSwitchingImage(false);
        return;
      }
      
      // 行级注释：如果新主图没有 base64，通过 API 加载
      const effectiveMediaId = newMainImage.mediaId || newMainImage.mediaGenerationId;
      
      if (!effectiveMediaId) {
        throw new Error('该图片缺少 mediaId，无法切换为主图');
      }
      
      // 获取 API 配置（从 Canvas 传入的 mainImage 应该包含完整信息）
      const apiKey = (window as any).__API_KEY__ || '';
      const proxy = (window as any).__PROXY__ || '';
      
      if (!apiKey) {
        console.warn('⚠️ 未找到 API Key，尝试使用原始 src');
        
        // 交换主图和参考图（使用原始 src）
        const oldMainImage = currentMainImage;
        const newReferenceImages = currentReferenceImages.filter(img => img.id !== newMainImage.id);
        
        if (oldMainImage) {
          newReferenceImages.push(oldMainImage);
        }
        
        setCurrentMainImage(newMainImage);
        setCurrentReferenceImages(newReferenceImages);
        
        console.log('✅ 主图已切换 (使用原始 src):', newMainImage.id);
        setSwitchingImage(false);
        return;
      }
      
      // 通过 API 获取 base64
      const mediaResponse = await fetch(
        `/api/flow/media/${effectiveMediaId}?key=${apiKey}&returnUriOnly=false&proxy=${proxy}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!mediaResponse.ok) {
        throw new Error('获取图片数据失败');
      }
      
      const mediaResult = await mediaResponse.json();
      const base64Data = mediaResult.encodedImage;
      
      if (!base64Data) {
        throw new Error('API 未返回图片数据');
      }
      
      const imageDataUrl = base64Data.startsWith('data:')
        ? base64Data
        : `data:image/png;base64,${base64Data}`;
      
      // 交换主图和参考图
      const oldMainImage = currentMainImage;
      const newReferenceImages = currentReferenceImages.filter(img => img.id !== newMainImage.id);
      
      if (oldMainImage) {
        newReferenceImages.push(oldMainImage);
      }
      
      // 更新主图为 base64 版本
      setCurrentMainImage({
        ...newMainImage,
        src: imageDataUrl,
        base64: imageDataUrl,
      });
      setCurrentReferenceImages(newReferenceImages);
      
      console.log('✅ 主图已切换 (加载 base64):', newMainImage.id);
      
    } catch (error) {
      console.error('❌ 切换主图失败:', error);
      alert(`切换主图失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setSwitchingImage(false);
    }
  };

  // 关闭 modal 并清除所有标记
  const handleClose = useCallback(() => {
    setAnnotations([]);
    setRedoStack([]);
    setDraftAnnotation(null);
    setIsDrawing(false);
    setPromptText('');
    setEditingTextId(null);
    onClose();
  }, [onClose]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose, open]);

  // 文本输入自动聚焦
  useEffect(() => {
    if (editingTextId) {
      textAreaRef.current?.focus();
    }
  }, [editingTextId]);

  const clampPoint = (point: RelativePoint): RelativePoint => ({
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  });

  const eventToPoint = useCallback(
    (event: React.PointerEvent | PointerEvent): RelativePoint | null => {
      if (!imgRef.current) return null;
      const rect = imgRef.current.getBoundingClientRect();
      
      // 直接返回像素坐标（相对于图片）
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      return {
        x: Math.min(rect.width, Math.max(0, x)),
        y: Math.min(rect.height, Math.max(0, y)),
      };
    },
    []
  );

  const relativeToAbsolute = useCallback(
    (point: RelativePoint) => {
      // 坐标已经是像素了，直接返回
      return { x: point.x, y: point.y };
    },
    []
  );

  // 检测点击是否在某个标注上（用于橡皮擦）
  const findAnnotationAtPoint = useCallback((point: RelativePoint): Annotation | null => {
    // 从后往前检查（后画的在上面）
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];
      
      if (annotation.type === 'text') {
        // 文字：检测点击是否在文字区域附近（20px范围）
        const distance = Math.hypot(point.x - annotation.position.x, point.y - annotation.position.y);
        if (distance < 30) return annotation;
      } else if (annotation.type === 'pen') {
        // 画笔：检测点击是否在笔画路径附近
        for (const penPoint of annotation.points) {
          const distance = Math.hypot(point.x - penPoint.x, point.y - penPoint.y);
          if (distance < annotation.strokeWidth + 10) return annotation;
        }
      } else if (annotation.type === 'arrow' || annotation.type === 'rectangle') {
        // 箭头和矩形：检测点击是否在形状内或边界附近
        const { start, end } = annotation;
        const minX = Math.min(start.x, end.x) - 10;
        const maxX = Math.max(start.x, end.x) + 10;
        const minY = Math.min(start.y, end.y) - 10;
        const maxY = Math.max(start.y, end.y) + 10;
        
        if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
          return annotation;
        }
      }
    }
    return null;
  }, [annotations]);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || !open || isDraggingText) {
      return;
    }

    const point = eventToPoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();

    // 橡皮擦：删除点击位置的标注
    if (activeTool === 'eraser') {
      const targetAnnotation = findAnnotationAtPoint(point);
      if (targetAnnotation) {
        setAnnotations((prev) => prev.filter((a) => a.id !== targetAnnotation.id));
        setRedoStack([]); // 删除后清空重做栈
      }
      return;
    }

    if (activeTool === 'text') {
      const id = `annotation-${Date.now()}`;
      const textAnnotation: TextAnnotation = {
        id,
        type: 'text',
        color: selectedColor,
        position: point,
        text: '',
      };
      setAnnotations((prev) => [...prev, textAnnotation]);
      setRedoStack([]);
      setEditingTextId(id);
      return;
    }

    const id = `annotation-${Date.now()}`;
    let nextDraft: Annotation | null = null;

    if (activeTool === 'pen') {
      nextDraft = {
        id,
        type: 'pen',
        color: selectedColor,
        points: [point],
        strokeWidth: selectedStrokeWidth,
      };
    } else if (activeTool === 'arrow') {
      nextDraft = {
        id,
        type: 'arrow',
        color: selectedColor,
        start: point,
        end: point,
        strokeWidth: selectedStrokeWidth,
      };
    } else if (activeTool === 'rectangle') {
      nextDraft = {
        id,
        type: 'rectangle',
        color: selectedColor,
        start: point,
        end: point,
        strokeWidth: selectedStrokeWidth,
      };
    }

    if (!nextDraft) return;
    setDraftAnnotation(nextDraft);
    setRedoStack([]);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDrawing || !draftAnnotation) return;
    const point = eventToPoint(event);
    if (!point) return;

    setDraftAnnotation((prev) => {
      if (!prev) return prev;
      if (prev.type === 'pen') {
        return {
          ...prev,
          points: [...prev.points, point],
        };
      }
      if (prev.type === 'arrow' || prev.type === 'rectangle') {
        return {
          ...prev,
          end: point,
        };
      }
      return prev;
    });
  };

  const shouldKeepAnnotation = (annotation: Annotation) => {
    if (annotation.type === 'pen') {
      return annotation.points.length > 1;
    }
    if (annotation.type === 'text') {
      return annotation.text.trim().length > 0;
    }
    const dx = annotation.end.x - annotation.start.x;
    const dy = annotation.end.y - annotation.start.y;
    return Math.hypot(dx, dy) > 0.002;
  };

  const finishDrawing = useCallback(() => {
    if (!draftAnnotation) {
      setIsDrawing(false);
      return;
    }
    if (!shouldKeepAnnotation(draftAnnotation)) {
      setDraftAnnotation(null);
      setIsDrawing(false);
      return;
    }
    setAnnotations((prev) => [...prev, draftAnnotation]);
    setDraftAnnotation(null);
    setIsDrawing(false);
  }, [draftAnnotation]);

  const handlePointerUp = () => {
    if (!isDrawing) return;
    finishDrawing();
  };

  const handlePointerLeave = () => {
    if (!isDrawing) return;
    finishDrawing();
  };

  const handleUndo = () => {
    setAnnotations((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const removed = next.pop();
      if (removed) {
        setRedoStack((stack) => [...stack, removed]);
      }
      return next;
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const annotation = next.pop();
      if (annotation) {
        setAnnotations((ann) => [...ann, annotation]);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!onConfirm || !promptText.trim()) {
      return;
    }

    let payload = annotations;
    if (draftAnnotation && shouldKeepAnnotation(draftAnnotation)) {
      payload = [...annotations, draftAnnotation];
      setAnnotations(payload);
      setDraftAnnotation(null);
      setIsDrawing(false);
    }

    // 保存当前的 prompt 用于生成
    const currentPrompt = promptText.trim();
    
    // 立即清空输入框，让用户可以继续输入下一个请求
    setPromptText('');
    
    setIsGenerating(true); // 开始生成（仅用于视觉反馈）

    try {
      // 生成合成图片（原图 + 标注），直接传递 DataURL
      console.log('🎨 生成标注合成图...');
      const annotatedImageDataUrl = await generateAnnotatedImage();

      // 直接将 DataURL 传递给回调，不需要上传到 Blob
      // 同时传递当前的主图和参考图（可能已被用户切换过）
      await onConfirm({
        annotations: payload,
        promptText: currentPrompt,
      }, annotatedImageDataUrl, currentMainImage, currentReferenceImages);
      
      // 不自动关闭！让用户可以继续编辑
      
    } catch (error) {
      console.error('图片处理失败:', error);
      alert(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 如果失败，恢复 prompt
      setPromptText(currentPrompt);
    } finally {
      setIsGenerating(false); // 结束生成
    }
  };

  // 生成标注后的合成图片
  const generateAnnotatedImage = async (): Promise<string> => {
    if (!imgRef.current || !imageSrc) {
      throw new Error('图片未加载');
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文');
    }

    const img = imgRef.current;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 直接通过 fetch 加载图片，避免 CORS 污染问题
    try {
      console.log('🔄 正在加载图片...');
      const response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      ctx.drawImage(bitmap, 0, 0);
      console.log('✅ 图片加载成功');
    } catch (fetchError) {
      console.error('❌ 加载图片失败:', fetchError);
      throw new Error(`无法加载图片: ${fetchError instanceof Error ? fetchError.message : '未知错误'}`);
    }

    // 绘制标注
    const scaleX = img.naturalWidth / imgSize.width;
    const scaleY = img.naturalHeight / imgSize.height;

    annotations.forEach((annotation) => {
      if (annotation.type === 'pen') {
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.strokeWidth * Math.max(scaleX, scaleY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        annotation.points.forEach((point, index) => {
          const x = point.x * scaleX;
          const y = point.y * scaleY;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      } else if (annotation.type === 'arrow') {
        const startX = annotation.start.x * scaleX;
        const startY = annotation.start.y * scaleY;
        const endX = annotation.end.x * scaleX;
        const endY = annotation.end.y * scaleY;

        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.strokeWidth * Math.max(scaleX, scaleY);
        ctx.lineCap = 'round';

        // 绘制箭头线
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 绘制箭头头部
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowSize = 15 * Math.max(scaleX, scaleY);
        ctx.beginPath();
        ctx.moveTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX, endY);
        ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (annotation.type === 'rectangle') {
        const x = Math.min(annotation.start.x, annotation.end.x) * scaleX;
        const y = Math.min(annotation.start.y, annotation.end.y) * scaleY;
        const width = Math.abs(annotation.end.x - annotation.start.x) * scaleX;
        const height = Math.abs(annotation.end.y - annotation.start.y) * scaleY;

        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.strokeWidth * Math.max(scaleX, scaleY);
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 8 * Math.max(scaleX, scaleY));
        ctx.stroke();
      } else if (annotation.type === 'text' && annotation.text) {
        const x = annotation.position.x * scaleX;
        const y = annotation.position.y * scaleY;

        ctx.fillStyle = annotation.color;
        ctx.font = `600 ${18 * Math.max(scaleX, scaleY)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(annotation.text, x, y);
      }
    });

    return canvas.toDataURL('image/png');
  };

  const displayAnnotations = useMemo(() => {
    const list = [...annotations];
    if (draftAnnotation) {
      list.push(draftAnnotation);
    }
    return list;
  }, [annotations, draftAnnotation]);

  const editingAnnotation = useMemo(
    () =>
      annotations.find(
        (item) => item.id === editingTextId && item.type === 'text'
      ) as TextAnnotation | undefined,
    [annotations, editingTextId]
  );

  const editingPosition = useMemo(() => {
    if (!editingAnnotation) return null;
    return relativeToAbsolute(editingAnnotation.position);
  }, [editingAnnotation, relativeToAbsolute]);

  const handleTextChange = (value: string) => {
    setAnnotations((prev) =>
      prev.map((item) =>
        item.id === editingTextId && item.type === 'text'
          ? { ...item, text: value }
          : item
      )
    );
  };

  const closeTextEditor = () => {
    if (!editingTextId) return;
    const current = annotations.find(
      (item) => item.id === editingTextId && item.type === 'text'
    ) as TextAnnotation | undefined;
    if (current && !current.text.trim()) {
      setAnnotations((prev) => prev.filter((item) => item.id !== current.id));
    }
    setEditingTextId(null);
  };

  // 文字拖动处理
  const handleTextPointerDown = (textId: string, event: React.PointerEvent) => {
    event.stopPropagation();
    setIsDraggingText(true);
    setEditingTextId(textId);
    
    const handleMove = (e: PointerEvent) => {
      const point = eventToPoint(e as any);
      if (!point) return;
      
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === textId && item.type === 'text'
            ? { ...item, position: point }
            : item
        )
      );
    };
    
    const handleUp = () => {
      setIsDraggingText(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  if (!open || !imageSrc) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative flex w-fit max-w-[95vw] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_25px_80px_rgba(15,23,42,0.65)] max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div>
            <p className="text-lg font-semibold text-gray-900">图片编辑</p>
            <p className="text-sm text-gray-500">
              使用工具在图片上注释，随后通过提示词做精准微调
            </p>
          </div>
          <button
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 overflow-auto">
          <div className="relative w-fit mx-auto rounded-2xl border border-gray-200 bg-slate-50 overflow-hidden">
            {/* 加载状态 */}
            {isLoadingImage && (
              <div className="flex items-center justify-center min-w-[400px] min-h-[300px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                  <p className="text-sm text-gray-600">正在加载图片...</p>
                </div>
              </div>
            )}
            
            {/* 图片和标注 */}
            {!isLoadingImage && (imageSrc || currentMainImage?.src) && (
              <>
                <img
                  ref={imgRef}
                  src={currentMainImage?.src || imageSrc || ''}
                  alt="待编辑图片"
                  className="pointer-events-none select-none block max-h-[60vh]"
                />

                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
                  style={{ cursor: cursorMap[activeTool] }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                >
                {displayAnnotations.map((annotation) => {
                  if (annotation.type === 'pen') {
                    const pathPoints = annotation.points
                      .map((point) => `${point.x},${point.y}`)
                      .join(' ');
                    return (
                      <polyline
                        key={annotation.id}
                        points={pathPoints}
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  }
                  if (annotation.type === 'arrow') {
                    const start = annotation.start;
                    const end = annotation.end;
                    const angle = Math.atan2(end.y - start.y, end.x - start.x);
                    const arrowSize = 15;
                    const arrowPoints = [
                      {
                        x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
                        y: end.y - arrowSize * Math.sin(angle - Math.PI / 6),
                      },
                      { x: end.x, y: end.y },
                      {
                        x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
                        y: end.y - arrowSize * Math.sin(angle + Math.PI / 6),
                      },
                    ]
                      .map((point) => `${point.x},${point.y}`)
                      .join(' ');

                    return (
                      <g key={annotation.id}>
                        <line
                          x1={start.x}
                          y1={start.y}
                          x2={end.x}
                          y2={end.y}
                          stroke={annotation.color}
                          strokeWidth={annotation.strokeWidth}
                          strokeLinecap="round"
                        />
                        <polyline
                          points={arrowPoints}
                          fill="none"
                          stroke={annotation.color}
                          strokeWidth={annotation.strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  }
                  if (annotation.type === 'rectangle') {
                    const start = annotation.start;
                    const end = annotation.end;
                    const x = Math.min(start.x, end.x);
                    const y = Math.min(start.y, end.y);
                    const width = Math.abs(start.x - end.x);
                    const height = Math.abs(start.y - end.y);
                    return (
                      <rect
                        key={annotation.id}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                        fill="transparent"
                        rx={8}
                      />
                    );
                  }
                  if (annotation.type === 'text') {
                    // 如果正在编辑这个文字，不在 SVG 中显示
                    if (annotation.id === editingTextId) return null;
                    
                    if (!annotation.text) return null;
                    
                    return (
                      <text
                        key={annotation.id}
                        x={annotation.position.x}
                        y={annotation.position.y}
                        fill={annotation.color}
                        fontSize="18"
                        fontWeight={600}
                        dominantBaseline="middle"
                        textAnchor="middle"
                        style={{ cursor: 'move', userSelect: 'none' }}
                        onPointerDown={(e) => handleTextPointerDown(annotation.id, e)}
                      >
                        {annotation.text}
                      </text>
                    );
                  }
                  return null;
                })}
                </svg>

                {editingAnnotation && editingPosition ? (
              <input
                ref={textAreaRef as any}
                type="text"
                value={editingAnnotation.text}
                onChange={(event) => handleTextChange(event.target.value)}
                onBlur={closeTextEditor}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    closeTextEditor();
                  }
                }}
                className="absolute bg-transparent text-center font-semibold outline-none pointer-events-auto z-20"
                style={{
                  top: `${editingPosition.y}px`,
                  left: `${editingPosition.x}px`,
                  transform: 'translate(-50%, -50%)',
                  color: editingAnnotation.color,
                  fontSize: '18px',
                  minWidth: '100px',
                  padding: '4px 8px',
                }}
                placeholder="输入文字"
                autoFocus
              />
                ) : null}

                <div className="pointer-events-none absolute inset-0 z-10">
              <div className="pointer-events-auto absolute left-4 top-4 flex gap-1.5 rounded-2xl bg-white/95 backdrop-blur-xl p-1.5 shadow-xl border border-gray-200/80">
                {toolDefinitions.map((tool) => {
                  const Icon = tool.icon;
                  const active = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? 'bg-gray-900 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="whitespace-nowrap">{tool.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pointer-events-auto absolute right-4 top-4 flex gap-1.5 rounded-2xl bg-white/95 backdrop-blur-xl p-1.5 shadow-xl border border-gray-200/80">
                <button
                  onClick={handleUndo}
                  disabled={!annotations.length}
                  className="rounded-xl p-2 text-gray-600 transition enabled:hover:bg-gray-100 enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                  title="撤销"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!redoStack.length}
                  className="rounded-xl p-2 text-gray-600 transition enabled:hover:bg-gray-100 enabled:hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                  title="重做"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>

              <div className="pointer-events-auto absolute bottom-4 left-4 flex items-center gap-4 rounded-2xl bg-white/95 backdrop-blur-xl px-4 py-2.5 shadow-xl border border-gray-200/80">
                {/* 颜色选择 */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    颜色
                  </span>
                  <div className="flex items-center gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        style={{ 
                          backgroundColor: color,
                          border: color === '#ffffff' ? '2px solid #e5e7eb' : undefined
                        }}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? 'border-gray-900 scale-110 shadow-lg'
                            : color === '#ffffff' 
                              ? 'border-gray-300 shadow hover:scale-105'
                              : 'border-white/80 shadow hover:scale-105'
                        }`}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                
                {/* 粗细选择 */}
                <div className="flex items-center gap-3 border-l border-gray-300 pl-4">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    粗细
                  </span>
                  <div className="flex items-center gap-1.5">
                    {strokeWidthOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedStrokeWidth(option.width)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedStrokeWidth === option.width
                            ? 'bg-gray-900 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={option.label}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
                </div>
              </>
            )}
          </div>

          {/* 参考图列表（包含主图） */}
          {(currentMainImage || (currentReferenceImages && currentReferenceImages.length > 0)) && (
            <div className="flex-shrink-0 border-t border-gray-200 pt-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">
                  图片列表
                </span>
                <span className="text-xs text-gray-500">
                  可在提示词中使用"主图"、"图1"、"图2"等引用，点击图片可切换主图
                </span>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2">
                {/* 主图 */}
                {currentMainImage && (
                  <div 
                    className="relative flex-shrink-0 group"
                    title="当前主图（正在编辑的图片）"
                  >
                    <img
                      src={currentMainImage.src}
                      alt="主图"
                      className="w-24 h-24 rounded-lg object-cover border-3 border-blue-500 shadow-md"
                    />
                    <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded font-bold shadow-sm">
                      主图
                    </span>
                    <div className="absolute bottom-1 left-1 right-1 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg pt-4 pb-1 px-1">
                      <span className="text-white text-[10px] font-medium block text-center">
                        正在编辑
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 参考图列表 */}
                {currentReferenceImages.map((ref: any, index: number) => (
                  <div 
                    key={ref.id} 
                    className="relative flex-shrink-0 group cursor-pointer"
                    title={`参考图 ${index + 1} - 点击设为主图`}
                  >
                    <img
                      src={ref.src}
                      alt={`参考图 ${index + 1}`}
                      className="w-24 h-24 rounded-lg object-cover border-2 border-gray-300 group-hover:border-purple-400 transition-all"
                    />
                    <span className="absolute top-1 left-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      图{index + 1}
                    </span>
                    
                    {/* 切换主图按钮 */}
                    <button
                      onClick={() => handleSetMainImage(ref)}
                      disabled={switchingImage}
                      className="absolute bottom-1 left-1 right-1 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg py-1.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <span className="text-white text-[10px] font-bold block text-center">
                        {switchingImage ? '切换中...' : '设为主图'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-shrink-0 relative">
            <textarea
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  if (promptText.trim() && !isLoadingImage) {
                    handleConfirm();
                  }
                }
              }}
              placeholder={
                referenceImages && referenceImages.length > 0
                  ? "例如：把方框里的人物换成图1中的人物，背景用图2…… (Enter 发送，Shift+Enter 换行)"
                  : "例如：请根据我圈起来的位置，替换为海滩上的吊床…… (Enter 发送，Shift+Enter 换行)"
              }
              disabled={isLoadingImage}
              className="w-full min-h-[80px] resize-none rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 pr-16 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleConfirm}
              disabled={isLoadingImage || !promptText.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 group inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="发送 (Enter)"
            >
              {isGenerating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

