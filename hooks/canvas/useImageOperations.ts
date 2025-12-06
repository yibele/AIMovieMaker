/**
 * 图片操作 Hook
 * 
 * 职责：处理图片节点的各种操作
 * - 复制、删除、入库、下载
 * - 再次生成
 * - 图片编辑（打开编辑器）
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ImageElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';
import { generateImageFromImage } from '@/lib/services/image-generation.service';
import { detectAspectRatio } from '@/lib/constants/node-sizes';
import { toast } from 'sonner';

/**
 * 图片操作 Hook 返回值
 */
export interface UseImageOperationsReturn {
  // 状态
  imageData: ImageElement | undefined;
  isProcessing: boolean;
  canDelete: boolean;
  
  // 操作
  handleDuplicate: () => void;
  handleDelete: () => void;
  handleArchive: () => Promise<void>;
  handleDownload: () => void;
  handleRegenerate: () => Promise<void>;
}

/**
 * 图片操作 Hook
 * 
 * @param imageId 图片节点 ID
 * @returns 图片操作函数和状态
 * 
 * @example
 * const { handleDuplicate, handleDelete, canDelete } = useImageOperations(id);
 */
export function useImageOperations(imageId: string): UseImageOperationsReturn {
  // 获取图片数据
  const imageData = useCanvasStore(state =>
    state.elements.find(el => el.id === imageId && el.type === 'image') as ImageElement | undefined
  );

  const { addElement, deleteElement, setSelection } = useCanvasStore(
    useShallow(state => ({
      addElement: state.addElement,
      deleteElement: state.deleteElement,
      setSelection: state.setSelection,
    }))
  );

  // 计算状态
  const isProcessing = useMemo(() => {
    if (!imageData) return false;
    const uploadState = imageData.uploadState ?? 'synced';
    const isSyncing = uploadState === 'syncing';
    const hasMediaId = Boolean(imageData.mediaGenerationId);
    const hasImage = Boolean(imageData.src);
    return isSyncing || (!hasMediaId && !hasImage);
  }, [imageData]);

  const canDelete = useMemo(() => {
    return !isProcessing;
  }, [isProcessing]);

  // 复制图片（只复制主图，不带附图）
  const handleDuplicate = useCallback(() => {
    if (!imageData) return;

    const newNodeId = `image-${Date.now()}`;
    
    // 行级注释：解构移除 Stack 相关字段，只复制主图属性
    const { images, mainIndex, expanded, ...mainImageData } = imageData;
    
    const newNode: ImageElement = {
      ...mainImageData,
      id: newNodeId,
      position: {
        x: imageData.position.x + (imageData.size?.width || 400) + 50,
        y: imageData.position.y,
      },
    };

    addElement(newNode);
    setSelection([newNodeId]);
    toast.success('图片已复制');
  }, [imageData, addElement, setSelection]);

  // 删除图片
  const handleDelete = useCallback(() => {
    if (!canDelete) {
      toast.error('图片正在处理中，无法删除');
      return;
    }
    deleteElement(imageId);
  }, [imageId, canDelete, deleteElement]);

  // 入库
  const handleArchive = useCallback(async () => {
    if (!imageData?.src) {
      toast.error('图片未生成，无法入库');
      return;
    }

    try {
      // 动态导入素材库
      const { useMaterialsStore } = await import('@/lib/materials-store');
      const { addMaterial } = useMaterialsStore.getState();
      const { apiConfig } = useCanvasStore.getState();

      await addMaterial({
        type: 'image',
        name: imageData.generatedFrom?.prompt || 'Untitled Image',
        src: imageData.src,
        thumbnail: imageData.src,
        mediaId: imageData.mediaId,
        mediaGenerationId: imageData.mediaGenerationId || '',
        metadata: {
          prompt: imageData.generatedFrom?.prompt,
          width: imageData.size?.width,
          height: imageData.size?.height,
        },
        projectId: apiConfig.projectId,
      });

      toast.success('已添加到精选素材库');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '入库失败');
    }
  }, [imageData]);

  // 下载
  const handleDownload = useCallback(async () => {
    if (!imageData?.src) {
      toast.error('图片未生成，无法下载');
      return;
    }

    try {
      let blob: Blob;

      // 行级注释：生成文件名，使用 prompt 前几个字或默认名称
      const promptPrefix = imageData.generatedFrom?.prompt?.slice(0, 20)?.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') || 'image';
      const fileName = `${promptPrefix}_${Date.now()}.png`;

      // 行级注释：优先使用 base64（AI 生成的图片都有 base64）
      if (imageData.base64) {
        const dataUrl = imageData.base64.startsWith('data:')
          ? imageData.base64
          : `data:image/png;base64,${imageData.base64}`;
        const base64Data = dataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
      } else if (imageData.src.startsWith('data:')) {
        // 行级注释：src 是 base64（用户上传的图片）
        const base64Data = imageData.src.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
      } else {
        // 行级注释：普通 URL，使用 fetch 获取 blob 强制下载
        const response = await fetch(imageData.src);
        if (!response.ok) {
          throw new Error(`下载失败: ${response.status}`);
        }
        blob = await response.blob();
      }

      // 行级注释：创建下载链接并触发下载
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // 行级注释：清理
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success('下载成功');
    } catch (error) {
      console.error('❌ 下载图片失败:', error);
      toast.error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, [imageData]);

  // 再次生成
  const handleRegenerate = useCallback(async () => {
    if (!imageData) return;

    const prompt = imageData.generatedFrom?.prompt;
    if (!prompt) {
      toast.error('未找到原始提示词，无法再次生成');
      return;
    }

    // 推断宽高比
    const aspectRatio = imageData.size
      ? detectAspectRatio(imageData.size.width, imageData.size.height)
      : '16:9';

    try {
      toast.info('开始生成...');
      await generateImageFromImage(imageData, {
        prompt,
        aspectRatio,
        count: 1,
      });
      toast.success('生成完成');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    }
  }, [imageData]);

  return {
    imageData,
    isProcessing,
    canDelete,
    handleDuplicate,
    handleDelete,
    handleArchive,
    handleDownload,
    handleRegenerate,
  };
}

