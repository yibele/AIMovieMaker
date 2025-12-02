'use client';

import React, { useState } from 'react';
import { Edit3, Download, Trash2, FolderInput, Film, Link2, Images } from 'lucide-react';
import { Panel, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { useMaterialsStore } from '@/lib/materials-store';
import { ImageElement, VideoElement } from '@/lib/types';
import { toast } from 'sonner';
import { createStartEndVideoNode, createReferenceImagesVideoNode, getRightSidePosition } from '@/lib/services/node-management.service';

interface SelectionToolbarProps {
  onMultiImageEdit?: () => void;
  onTransitionShots?: (startImage: ImageElement, endImage: ImageElement) => void; // 行级注释：衔接镜头回调
}

// Helper component for buttons with tooltips
function SelectionButton({
  onClick,
  icon: Icon,
  title,
  className = '',
  disabled = false
}: {
  onClick: () => void;
  icon: any;
  title: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <Icon className="w-4 h-4" />
      </button>

      {/* Tooltip - 上方弹出 */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 backdrop-blur-sm text-white text-[10px] font-medium rounded-md opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
        {title}
        {/* 小箭头 */}
        <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-900/90 rotate-45" />
      </div>
    </div>
  );
}

export default function SelectionToolbar({ onMultiImageEdit, onTransitionShots }: SelectionToolbarProps) {
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const { setEdges } = useReactFlow();

  // 获取选中的图片元素
  const selectedImages = elements
    .filter((el) => selection.includes(el.id) && el.type === 'image')
    .map((el) => el as ImageElement);

  // 获取选中的视频元素 (用于入库)
  const selectedVideos = elements
    .filter((el) => selection.includes(el.id) && el.type === 'video')
    .map((el) => el as VideoElement);

  // 如果没有选中或只选中1个，不显示工具栏
  if (selection.length < 2) {
    return null;
  }

  // 批量入库
  const handleBatchArchive = async () => {
    const { addMaterial } = useMaterialsStore.getState();
    let count = 0;

    // 入库图片
    for (const img of selectedImages) {
      if (img.src) {
        await addMaterial({
          type: 'image',
          name: img.generatedFrom?.prompt || 'Untitled Image',
          src: img.src,
          thumbnail: img.src,
          mediaId: img.mediaId,
          mediaGenerationId: img.mediaGenerationId || '',
          metadata: {
            prompt: img.generatedFrom?.prompt,
            width: img.size?.width,
            height: img.size?.height,
          },
          projectId: apiConfig.projectId,
        });
        count++;
      }
    }

    // 入库视频
    for (const vid of selectedVideos) {
      if (vid.src) {
        await addMaterial({
          type: 'video',
          name: vid.promptText || 'Untitled Video',
          src: vid.src,
          thumbnail: vid.thumbnail || vid.src,
          mediaGenerationId: vid.mediaGenerationId || '',
          metadata: {
            prompt: vid.promptText,
            duration: vid.duration,
          },
          projectId: apiConfig.projectId,
        });
        count++;
      }
    }

    if (count > 0) {
      toast.success(`已将 ${count} 个素材添加到精选库`);
    } else {
      toast.info('没有可入库的有效素材');
    }
  };


  // 行级注释：下载选中的图片（支持批量）
  const handleDownload = async () => {
    for (const img of selectedImages) {
      if (!img?.src) continue;

      try {

        let blob: Blob;

        // 行级注释：优先使用 base64（AI 生成的图片都有 base64）
        if (img.base64) {

          // 行级注释：处理 base64 格式
          const dataUrl = img.base64.startsWith('data:')
            ? img.base64
            : `data:image/png;base64,${img.base64}`;

          // 行级注释：将 base64 转为 Blob
          const base64Data = dataUrl.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: 'image/png' });

        } else if (img.src.startsWith('data:')) {
          // 行级注释：src 是 base64（用户上传的图片）

          const base64Data = img.src.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: 'image/png' });

        } else {
          // 行级注释：兜底方案 - fetch Google URL
          const response = await fetch(img.src);
          if (!response.ok) {
            throw new Error(`下载失败: ${response.status}`);
          }
          blob = await response.blob();
        }


        // 行级注释：创建下载链接
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `image-${img.id}.png`;

        // 行级注释：触发下载
        document.body.appendChild(link);
        link.click();

        // 行级注释：清理
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 100);

      } catch (error) {
        console.error('❌ 下载图片失败:', error);
        toast.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    // 提示下载完成
    toast.success(`已下载 ${selectedImages.length} 张图片`);
  };

  // 行级注释：删除选中的元素
  const handleDelete = () => {
    deleteSelectedElements();
    toast.success(`已删除 ${selection.length} 个元素`);
  };

  // 行级注释：图片编辑（多图参考）
  const handleImageEdit = () => {
    if (selectedImages.length < 2) {
      toast.error('请至少选择 2 张图片进行多图编辑');
      return;
    }

    if (selectedImages.length > 6) {
      toast.error('最多支持 6 张图片同时编辑');
      return;
    }

    // 检查是否有图片正在处理中
    const hasProcessing = selectedImages.some(
      (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
    );

    if (hasProcessing) {
      toast.error('存在未同步完成的图片，请稍后重试');
      return;
    }

    // 触发多图编辑回调
    if (onMultiImageEdit) {
      onMultiImageEdit();
    }
  };

  // 行级注释：衔接镜头 - 用 VL 分析两张图片，生成中间过渡的分镜
  const handleTransitionShots = () => {
    if (selectedImages.length !== 2) {
      toast.error('请选择恰好 2 张图片');
      return;
    }

    // 检查是否有图片正在处理中
    const hasProcessing = selectedImages.some(
      (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
    );

    if (hasProcessing) {
      toast.error('存在未同步完成的图片，请稍后重试');
      return;
    }

    // 行级注释：根据 x 坐标判断起点和终点（左边是起点，右边是终点）
    const sortedImages = [...selectedImages].sort((a, b) => a.position.x - b.position.x);
    const startImage = sortedImages[0];
    const endImage = sortedImages[1];

    // 调用回调
    if (onTransitionShots) {
      onTransitionShots(startImage, endImage);
    }
  };

  // 行级注释：首尾帧生成视频 - 使用节点管理服务
  const handleStartEndVideo = () => {
    if (selectedImages.length !== 2) {
      toast.error('请选择恰好 2 张图片作为首尾帧');
      return;
    }

    // 检查是否有图片正在处理中
    const hasProcessing = selectedImages.some(
      (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
    );

    if (hasProcessing) {
      toast.error('存在未同步完成的图片，请稍后重试');
      return;
    }

    // 行级注释：根据 x 坐标判断首尾帧（左边是首帧，右边是尾帧）
    const sortedImages = [...selectedImages].sort((a, b) => a.position.x - b.position.x);
    const startImage = sortedImages[0];
    const endImage = sortedImages[1];


    // 行级注释：使用节点管理服务计算视频位置（尾帧图片右侧）
    const videoPosition = getRightSidePosition(
      endImage.position,
      endImage.size || { width: 640, height: 360 },
      80
    );

    // 行级注释：使用节点管理服务创建首尾帧视频节点
    const newVideo = createStartEndVideoNode(startImage, endImage, videoPosition);
    const addElement = useCanvasStore.getState().addElement;
    addElement(newVideo);

    // 行级注释：创建连线（连线逻辑保留在组件内）
    setEdges((eds: any[]) => [
      ...eds,
      {
        id: `edge-${startImage.id}-${newVideo.id}-start`,
        source: startImage.id,
        target: newVideo.id,
        targetHandle: 'start-image',
        type: 'default',
        animated: false,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
      },
      {
        id: `edge-${endImage.id}-${newVideo.id}-end`,
        source: endImage.id,
        target: newVideo.id,
        targetHandle: 'end-image',
        type: 'default',
        animated: false,
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
      },
    ]);

    toast.success('已创建首尾帧视频节点，可输入提示词或直接发送');
  };

  // 行级注释：多图参考视频 - 选中 2-3 张图片生成视频节点
  const handleReferenceImagesVideo = () => {
    if (selectedImages.length < 2 || selectedImages.length > 3) {
      toast.error('请选择 2-3 张图片作为参考');
      return;
    }

    // 检查是否有图片正在处理中
    const hasProcessing = selectedImages.some(
      (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
    );

    if (hasProcessing) {
      toast.error('存在未同步完成的图片，请稍后重试');
      return;
    }

    // 行级注释：按 x 坐标排序，最右边的图片用于计算视频位置
    const sortedImages = [...selectedImages].sort((a, b) => a.position.x - b.position.x);
    const rightmostImage = sortedImages[sortedImages.length - 1];

    // 行级注释：计算视频位置（最右边图片的右侧）
    const videoPosition = getRightSidePosition(
      rightmostImage.position,
      rightmostImage.size || { width: 640, height: 360 },
      80
    );

    // 行级注释：创建多图参考视频节点
    const newVideo = createReferenceImagesVideoNode(videoPosition);

    // 行级注释：设置参考图片 ID
    newVideo.referenceImageIds = sortedImages.map(img => img.id);
    newVideo.generatedFrom = {
      type: 'reference-images',
      sourceIds: sortedImages.map(img => img.id),
    };

    const addElement = useCanvasStore.getState().addElement;
    addElement(newVideo);

    // 行级注释：创建连线 - 每张图片连接到对应的参考图片端口
    const handleIds = ['ref-image-1', 'ref-image-2', 'ref-image-3'];
    const newEdges = sortedImages.map((img, index) => ({
      id: `edge-${img.id}-${newVideo.id}-ref-${index + 1}`,
      source: img.id,
      target: newVideo.id,
      targetHandle: handleIds[index],
      type: 'default',
      animated: false,
      style: { stroke: '#10b981', strokeWidth: 2 }, // 行级注释：绿色表示参考图
    }));

    setEdges((eds: any[]) => [...eds, ...newEdges]);

    toast.success(`已创建多图参考视频节点，连接了 ${sortedImages.length} 张参考图片`);
  };

  // 行级注释：阻止事件冒泡，避免触发画布的拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 只有全部是图片时才显示"图片编辑"按钮
  const allImages = selection.length === selectedImages.length;
  const canEdit = allImages && selectedImages.length >= 2 && selectedImages.length <= 6;
  // 行级注释：恰好选中 2 张图片时可以生成首尾帧视频
  const canStartEndVideo = allImages && selectedImages.length === 2;
  // 行级注释：选中 2-3 张图片时可以生成多图参考视频
  const canReferenceImagesVideo = allImages && selectedImages.length >= 2 && selectedImages.length <= 3;

  return (
    <Panel position="top-center" className="!mt-20 !p-0 animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl text-gray-700 dark:text-slate-200 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl px-4 py-2 transition-all hover:shadow-lg"
        onMouseDown={handleMouseDown}
      >
        {/* 选中数量提示 */}
        <span className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-slate-400">
          已选中 {selection.length} {allImages ? '张图片' : '个元素'}
        </span>

        {/* 首尾帧视频按钮（仅当选中恰好 2 张图片时显示） */}
        {canStartEndVideo && (
          <>
            <div className="border-l border-gray-200 dark:border-slate-600 h-6 mx-1" />
            <SelectionButton
              onClick={handleStartEndVideo}
              icon={Film}
              title="首尾帧生成视频 (左=首帧, 右=尾帧)"
              className="text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
            />
            <SelectionButton
              onClick={handleTransitionShots}
              icon={Link2}
              title="衔接镜头 - AI 分析并生成中间过渡分镜"
              className="text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30"
            />
          </>
        )}

        {/* 多图参考视频按钮（仅当选中 2-3 张图片时显示） */}
        {canReferenceImagesVideo && (
          <>
            {!canStartEndVideo && <div className="border-l border-gray-200 dark:border-slate-600 h-6 mx-1" />}
            <SelectionButton
              onClick={handleReferenceImagesVideo}
              icon={Images}
              title="多图参考视频 - 使用选中的图片作为参考生成视频"
              className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
            />
          </>
        )}

        {/* 分隔线 */}
        {canEdit && <div className="border-l border-gray-200 dark:border-slate-600 h-6 mx-1" />}

        {/* 图片编辑按钮（仅当选中 2-6 张图片时显示） */}
        {canEdit && (
          <SelectionButton
            onClick={handleImageEdit}
            icon={Edit3}
            title="多图编辑 - 将选中的图片用于编辑和融合"
            className="text-gray-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400"
          />
        )}

        {/* 分隔线 */}
        <div className="border-l border-gray-200 dark:border-slate-600 h-6 mx-1" />

        {/* 批量入库按钮 */}
        <SelectionButton
          onClick={handleBatchArchive}
          icon={FolderInput}
          title="将选中素材保存到精选库"
          className="text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
        />

        {/* 分隔线 */}
        <div className="border-l border-gray-200 dark:border-slate-600 h-6 mx-1" />

        {/* 下载按钮 */}
        <SelectionButton
          onClick={handleDownload}
          icon={Download}
          title="下载选中的图片"
          disabled={selectedImages.length === 0}
          className="text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        />

        {/* 删除按钮 */}
        <SelectionButton
          onClick={handleDelete}
          icon={Trash2}
          title="删除选中的元素"
          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
        />
      </div>
    </Panel>
  );
}

