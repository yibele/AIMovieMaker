'use client';

import { RefreshCw, Copy, Download, Trash2, Square } from 'lucide-react';
import { Panel, useReactFlow, useViewport } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { ImageElement } from '@/lib/types';
import { editImage } from '@/lib/api-mock';
import { ToolbarButton, ToolbarDivider } from './nodes/ToolbarButton';

export default function FloatingToolbar() {
  const { getNode } = useReactFlow();
  const { zoom, x: viewportX, y: viewportY } = useViewport();
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addPromptHistory = useCanvasStore((state) => state.addPromptHistory);
  const setSelection = useCanvasStore((state) => state.setSelection);

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
    
    const prompt = '生成类似的图片';
    
    try {
      const result = await editImage(prompt, selectedImage.id, 'regenerate');
      
      updateElement(selectedImage.id, {
        src: result.imageUrl,
        promptId: result.promptId,
      } as Partial<ImageElement>);
      
      addPromptHistory({
        promptId: result.promptId,
        promptText: prompt,
        imageId: selectedImage.id,
        mode: 'regenerate',
        createdAt: Date.now(),
      });
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

  // 下载图片
  const handleDownload = () => {
    imageElements.forEach((img) => {
      const link = document.createElement('a');
      link.href = img.src;
      link.download = `image-${img.id}.jpg`;
      link.click();
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
