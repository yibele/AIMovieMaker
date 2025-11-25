'use client';

import React, { useState } from 'react';
import { Edit3, Download, Trash2, FolderInput } from 'lucide-react';
import { Panel } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { useMaterialsStore } from '@/lib/materials-store';
import { ImageElement, VideoElement } from '@/lib/types';
import { toast } from 'sonner';

interface SelectionToolbarProps {
  onMultiImageEdit?: () => void;
}

export default function SelectionToolbar({ onMultiImageEdit }: SelectionToolbarProps) {
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements);
  const apiConfig = useCanvasStore((state) => state.apiConfig);

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
          mediaGenerationId: img.mediaGenerationId,
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
          mediaGenerationId: vid.mediaGenerationId,
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
        console.log('🚀 开始下载图片:', img.id);

        let blob: Blob;

        // 行级注释：优先使用 base64（AI 生成的图片都有 base64）
        if (img.base64) {
          console.log('✅ 使用 base64 直接下载（瞬时，0 流量）');

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
          console.log('✅ 使用 src (base64) 直接下载（瞬时，0 流量）');

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
          console.log('⚠️ 无 base64，从 URL 下载:', img.src);

          const response = await fetch(img.src);
          if (!response.ok) {
            throw new Error(`下载失败: ${response.status}`);
          }
          blob = await response.blob();
        }

        console.log('✅ 图片准备完成，大小:', blob.size, 'bytes');

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

  // 行级注释：阻止事件冒泡，避免触发画布的拖动
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 只有全部是图片时才显示"图片编辑"按钮
  const allImages = selection.length === selectedImages.length;
  const canEdit = allImages && selectedImages.length >= 2 && selectedImages.length <= 6;

  return (
    <Panel position="top-center" className="!m-0 !p-0 animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className="flex items-center gap-2 bg-white/95 backdrop-blur-xl text-gray-700 rounded-xl border border-gray-200 shadow-2xl px-4 py-2 transition-all hover:shadow-lg"
        onMouseDown={handleMouseDown}
      >
        {/* 选中数量提示 */}
        <span className="px-2 py-1 text-xs font-medium text-gray-500">
          已选中 {selection.length} {allImages ? '张图片' : '个元素'}
        </span>

        {/* 分隔线 */}
        {canEdit && <div className="border-l border-gray-200 h-6 mx-1" />}

        {/* 图片编辑按钮（仅当选中 2-6 张图片时显示） */}
        {canEdit && (
          <button
            onClick={handleImageEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
            title="多图编辑 - 将选中的图片用于编辑和融合"
          >
            <Edit3 className="w-4 h-4" />
            <span>图片编辑</span>
          </button>
        )}

        {/* 分隔线 */}
        <div className="border-l border-gray-200 h-6 mx-1" />

        {/* 批量入库按钮 */}
        <button
          onClick={handleBatchArchive}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="将选中素材保存到精选库"
        >
          <FolderInput className="w-4 h-4" />
          <span>入库</span>
        </button>

        {/* 分隔线 */}
        <div className="border-l border-gray-200 h-6 mx-1" />

        {/* 下载按钮 */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          title="下载选中的图片"
          disabled={selectedImages.length === 0}
        >
          <Download className="w-4 h-4" />
          <span>下载</span>
        </button>

        {/* 删除按钮 */}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          title="删除选中的元素"
        >
          <Trash2 className="w-4 h-4" />
          <span>删除</span>
        </button>
      </div>
    </Panel>
  );
}

