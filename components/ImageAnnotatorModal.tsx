'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpRight,
  PenLine,
  Redo2,
  Square,
  Type,
  Undo2,
  X,
} from 'lucide-react';

// 工具类型定义
type ToolType = 'pen' | 'arrow' | 'rectangle' | 'text';

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
}

interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  start: RelativePoint;
  end: RelativePoint;
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
  onClose: () => void;
  onConfirm?: (result: ImageAnnotatorResult) => void | Promise<void>;
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
];

const colorOptions = [
  '#f97316',
  '#f43f5e',
  '#8b5cf6',
  '#0ea5e9',
  '#10b981',
  '#facc15',
  '#0f172a',
] as const;

const cursorMap: Record<ToolType, string> = {
  pen: 'crosshair',
  arrow: 'crosshair',
  rectangle: 'crosshair',
  text: 'text',
};

export default function ImageAnnotatorModal({
  open,
  imageSrc,
  onClose,
  onConfirm,
}: ImageAnnotatorModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 1, height: 1 });
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [selectedColor, setSelectedColor] = useState<string>(colorOptions[0]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);
  const [draftAnnotation, setDraftAnnotation] = useState<Annotation | null>(
    null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, open]);

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

  const handlePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || !open) {
      return;
    }

    const point = eventToPoint(event);
    if (!point) {
      return;
    }

    event.preventDefault();

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
        strokeWidth: 3,
      };
    } else if (activeTool === 'arrow') {
      nextDraft = {
        id,
        type: 'arrow',
        color: selectedColor,
        start: point,
        end: point,
      };
    } else if (activeTool === 'rectangle') {
      nextDraft = {
        id,
        type: 'rectangle',
        color: selectedColor,
        start: point,
        end: point,
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
    if (!onConfirm) {
      onClose();
      return;
    }

    let payload = annotations;
    if (draftAnnotation && shouldKeepAnnotation(draftAnnotation)) {
      payload = [...annotations, draftAnnotation];
      setAnnotations(payload);
      setDraftAnnotation(null);
      setIsDrawing(false);
    }

    await onConfirm({
      annotations: payload,
      promptText: promptText.trim(),
    });
    onClose();
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
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 overflow-auto">
          <div className="relative w-fit mx-auto rounded-2xl border border-gray-200 bg-slate-50 overflow-hidden">
            <img
              ref={imgRef}
              src={imageSrc}
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
                        strokeWidth={3}
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
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        <polyline
                          points={arrowPoints}
                          fill="none"
                          stroke={annotation.color}
                          strokeWidth={3}
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
                        strokeWidth={2.5}
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

              <div className="pointer-events-auto absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-xl px-4 py-2.5 shadow-xl border border-gray-200/80">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  颜色
                </span>
                <div className="flex items-center gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? 'border-gray-900 scale-110 shadow-lg'
                          : 'border-white/80 shadow hover:scale-105'
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 relative">
            <textarea
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              placeholder="例如：请根据我圈起来的位置，替换为海滩上的吊床……"
              className="w-full min-h-[80px] resize-none rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 pr-14 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-gray-200"
            />
            <button
              onClick={handleConfirm}
              className="absolute right-3 top-1/2 -translate-y-1/2 group inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 text-white shadow-sm transition-all hover:bg-gray-900 hover:shadow-md active:scale-95"
              title="完成编辑"
            >
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

