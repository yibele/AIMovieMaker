'use client';

import { RefreshCw, Copy, Download, Trash2, Square } from 'lucide-react';
import { Panel, useReactFlow, useViewport } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { ImageElement } from '@/lib/types';
import { editImage } from '@/lib/api-mock';
import { generateFromInput, imageToImageFromInput } from '@/lib/input-panel-generator';
import { ToolbarButton, ToolbarDivider } from './nodes/ToolbarButton';
import { useState } from 'react';

interface FloatingToolbarProps {
  setEdges?: (edges: any) => void;
}

export default function FloatingToolbar({ setEdges }: FloatingToolbarProps) {
  const { getNode } = useReactFlow();
  const { zoom, x: viewportX, y: viewportY } = useViewport();
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addPromptHistory = useCanvasStore((state) => state.addPromptHistory);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const promptsHistory = useCanvasStore((state) => state.promptsHistory);

  // 只在选中图片时显示
  const selectedElements = elements.filter((el) => selection.includes(el.id));
  const imageElements = selectedElements.filter((el) => el.type === 'image') as ImageElement[];
  
  if (imageElements.length === 0) return null;

  // 单选时的操作
  const isSingleSelection = imageElements.length === 1;
  const selectedImage = isSingleSelection ? imageElements[0] : null;

  // 再次生成
  const handleRegenerate = async () => {
    if (!selectedImage) return;

    try {
      // 1. 获取原始提示词
      let originalPrompt = '';

      // 首先从 generatedFrom 中获取
      if (selectedImage.generatedFrom?.prompt) {
        originalPrompt = selectedImage.generatedFrom.prompt;
      } else if (selectedImage.promptId) {
        // 从历史记录中查找
        const history = promptsHistory.find(h => h.promptId === selectedImage.promptId);
        if (history) {
          originalPrompt = history.promptText;
        }
      }

      // 如果还是没有提示词，使用默认值
      if (!originalPrompt) {
        originalPrompt = '生成图片';
      }

      // 2. 根据生成类型执行不同的生成逻辑
      const generationType = selectedImage.generatedFrom?.type;

      if (generationType === 'image-to-image') {
        // 图生图：找到源图片，再次运行图生图
        console.log('图生图再次生成:', originalPrompt);

        // 查找基图
        const sourceImageId = selectedImage.sourceImageIds?.[0] ||
                             selectedImage.generatedFrom?.sourceIds?.[0];

        if (!sourceImageId) {
          alert('找不到原始图片，无法再次生成');
          return;
        }

        const sourceImage = elements.find(el => el.id === sourceImageId && el.type === 'image') as ImageElement;

        if (!sourceImage) {
          alert('原始图片已被删除，无法再次生成');
          return;
        }

        // 从原图尺寸推断宽高比
        let aspectRatio = '16:9';
        if (selectedImage.size) {
          const { width = 400, height = 300 } = selectedImage.size;
          const ratio = width / height;
          if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = '16:9';
          else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = '9:16';
          else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
        }

        // 创建图生图的 placeholder 和连线
        const size = { width: 640, height: 360 }; // 默认尺寸，后续根据 aspectRatio 调整

        // 根据宽高比调整尺寸
        if (aspectRatio === '9:16') {
          size.width = 360;
          size.height = 640;
        } else if (aspectRatio === '1:1') {
          size.width = 512;
          size.height = 512;
        }

        // 在当前选中的图片上方创建新图片
        const newImageId = `image-${Date.now()}`;
        const newImage: ImageElement = {
          id: newImageId,
          type: 'image',
          src: '',
          position: {
            x: selectedImage.position.x,
            y: selectedImage.position.y - size.height - 100, // 上方 100px 间距
          },
          size: size,
          sourceImageIds: [sourceImage.id],
          generatedFrom: {
            type: 'image-to-image',
            sourceIds: [sourceImage.id],
            prompt: originalPrompt,
          },
        };

        // 添加图片节点
        addElement(newImage);

        // 创建连线（带动画）
        if (setEdges) {
          const edgeId = `edge-${sourceImage.id}-${newImageId}`;
          setEdges((eds: any) => [
            ...eds,
            {
              id: edgeId,
              source: sourceImage.id,
              target: newImageId,
              type: 'default',
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 1 },
            },
          ]);
        }

        // 调用图生图 API
        try {
          import('@/lib/api-mock').then(({ imageToImage }) => {
            imageToImage(
              originalPrompt,
              sourceImage.src,
              aspectRatio as '16:9' | '9:16' | '1:1',
              '',
              sourceImage.mediaId || sourceImage.mediaGenerationId,
              1
            ).then((result) => {
              // 更新图片内容
              updateElement(newImageId, {
                src: result.imageUrl,
                promptId: result.promptId,
                mediaId: result.mediaId,
                mediaGenerationId: result.mediaGenerationId,
                uploadState: 'synced',
              } as Partial<ImageElement>);

              // 停止连线动画
              if (setEdges) {
                const edgeId = `edge-${sourceImage.id}-${newImageId}`;
                setEdges((eds: any) =>
                  eds.map((edge: any) =>
                    edge.id === edgeId
                      ? { ...edge, animated: false }
                      : edge
                  )
                );
              }

              // 添加到历史记录
              addPromptHistory({
                promptId: result.promptId,
                promptText: originalPrompt,
                imageId: newImageId,
                mode: 'regenerate',
                createdAt: Date.now(),
              });
            }).catch((error) => {
              console.error('图生图失败:', error);
              updateElement(newImageId, {
                uploadState: 'error',
                uploadMessage: '生成失败',
              } as Partial<ImageElement>);
            });
          });
        } catch (error) {
          console.error('图生图失败:', error);
          updateElement(newImageId, {
            uploadState: 'error',
            uploadMessage: '生成失败',
          } as Partial<ImageElement>);
        }
      } else {
        // 文生图：直接生成新图片
        console.log('文生图再次生成:', originalPrompt);

        // 从原图尺寸推断宽高比
        let aspectRatio = '16:9';
        if (selectedImage.size) {
          const { width = 400, height = 300 } = selectedImage.size;
          const ratio = width / height;
          if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = '16:9';
          else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = '9:16';
          else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
        }

        // 计算新图片位置（在原图右侧）
        const newPosition = {
          x: selectedImage.position.x + (selectedImage.size?.width || 640) + 50,
          y: selectedImage.position.y,
        };

        // 使用 generateFromInput 生成新图片
        await generateFromInput(
          originalPrompt,
          aspectRatio as '16:9' | '9:16' | '1:1',
          1, // 生成数量
          newPosition,
          addElement,
          updateElement,
          useCanvasStore.getState().deleteElement,
          addPromptHistory
        );
      }
    } catch (error) {
      console.error('再次生成失败:', error);
      alert('生成失败，请重试');
    }
  };

  // 生成类似图片
  const handleSimilar = async () => {
    if (!selectedImage) return;
    
    const prompt = '生成类似的图片';
    
    try {
      const result = await editImage(prompt, selectedImage.id, 'similar');
      
      const newImage: ImageElement = {
        id: `image-${Date.now()}`,
        type: 'image',
        src: result.imageUrl,
        position: {
          x: selectedImage.position.x + (selectedImage.size?.width || 400) + 20,
          y: selectedImage.position.y,
        },
        size: selectedImage.size,
        promptId: result.promptId,
        sourceImageIds: [selectedImage.id],
      };
      
      addElement(newImage);
      
      addPromptHistory({
        promptId: result.promptId,
        promptText: prompt,
        imageId: newImage.id,
        mode: 'similar',
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('生成类似图片失败:', error);
      alert('生成失败，请重试');
    }
  };

  // 复制图片
  const handleDuplicate = () => {
    if (!selectedImage) return;

    const newImage: ImageElement = {
      ...selectedImage,
      id: `image-${Date.now()}`,
      position: {
        x: selectedImage.position.x + (selectedImage.size?.width || 400) + 30,
        y: selectedImage.position.y,
      },
    };

    addElement(newImage);
    setSelection([newImage.id]);
  };

  // 下载图片：直接在新标签打开图片地址，交由浏览器处理保存
  const handleDownload = () => {
    imageElements.forEach((img) => {
      if (!img?.src) return;
      const newWindow = window.open(img.src, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // 部分浏览器会拦截弹窗，这里做降级提示
        alert('浏览器阻止了新窗口，请允许弹窗后再次尝试下载');
      }
    });
  };

  // 删除 - 直接删除，无需确认
  const handleDelete = () => {
    deleteSelectedElements();
  };

  // 阻止事件冒泡
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 单选：使用 Panel 定位到图片上方
  if (isSingleSelection && selectedImage) {
    const node = getNode(selectedImage.id);
    if (!node) return null;

    const imgWidth = selectedImage.size?.width || 400;
    const imgHeight = selectedImage.size?.height || 300;
    
    // 计算屏幕坐标（考虑 viewport 偏移和缩放）
    const screenX = node.position.x * zoom + viewportX;
    const screenY = node.position.y * zoom + viewportY;
    
    return (
      <div
        key={selectedImage.id}
        className="image-toolbar-pop absolute z-50 flex items-center gap-2 bg-white/95 backdrop-blur-xl text-gray-700 rounded-xl border border-gray-200 shadow-2xl px-3 py-2 pointer-events-auto"
        style={{
          left: `${screenX + (imgWidth * zoom) / 2}px`,
          top: `${screenY - 58}px`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={handleMouseDown}
      >
        <ToolbarButton icon={<RefreshCw className="w-4 h-4" />} label="再次生成" onClick={() => handleRegenerate()} />
        <ToolbarButton icon={<Copy className="w-4 h-4" />} label="类似图片" onClick={() => handleSimilar()} />
        <ToolbarButton icon={<Square className="w-4 h-4" />} label="复制" onClick={() => handleDuplicate()} />
        <ToolbarDivider />
        <ToolbarButton icon={<Download className="w-4 h-4" />} label="下载" onClick={() => handleDownload()} />
        <ToolbarButton icon={<Trash2 className="w-4 h-4" />} label="删除" variant="danger" onClick={() => handleDelete()} />
      </div>
    );
  }

  // 多选：使用 Panel 固定在顶部
  return (
    <Panel position="top-center" className="!m-0 !p-0">
      <div 
        className="flex items-center gap-2 bg-white/95 backdrop-blur-xl text-gray-700 rounded-xl border border-gray-200 shadow-2xl px-4 py-2"
        onMouseDown={handleMouseDown}
      >
        <span className="px-2 py-1 text-xs font-medium text-gray-500">
          已选中 {imageElements.length} 张图片
        </span>

        <ToolbarDivider />
        <ToolbarButton icon={<Download className="w-4 h-4" />} label="下载" onClick={() => handleDownload()} />
        <ToolbarButton icon={<Trash2 className="w-4 h-4" />} label="删除" variant="danger" onClick={() => handleDelete()} />
      </div>
    </Panel>
  );
}
