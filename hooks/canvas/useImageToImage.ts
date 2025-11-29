import { useCallback } from 'react';
import { ImageElement, CanvasElement } from '@/lib/types';
import {
  ImageAspectRatio,
  getImageSizeFromRatio,
  getTargetPositionRightOf,
} from '@/types/image-generation';

// 行级注释：图生图 Hook 的依赖类型
type UseImageToImageDeps = {
  addElement: (element: CanvasElement) => void;
  setEdges: any; // React Flow setEdges 类型
  resetConnectionMenu?: () => void;
};

// 行级注释：图生图 Hook - 从图片节点生成新图片
export function useImageToImage({
  addElement,
  setEdges,
  resetConnectionMenu,
}: UseImageToImageDeps) {
  // 行级注释：图生图处理函数 - 创建占位符图片节点，等待用户输入提示词
  const handleImageToImage = useCallback(
    async (
      sourceNode: ImageElement,
      aspectRatio: ImageAspectRatio,
      initialPrompt?: string
    ) => {
      // 行级注释：关闭连线菜单（如果存在）
      resetConnectionMenu?.();
      
      const trimmedPrompt = initialPrompt?.trim() ?? '';

      // 行级注释：根据比例计算尺寸
      const size = getImageSizeFromRatio(aspectRatio);

      // 行级注释：在源图片节点右侧位置
      const position = getTargetPositionRightOf(sourceNode, 100, 320);

      // 行级注释：创建临时 ID
      const newImageId = `image-${Date.now()}`;

      // 行级注释：创建占位符图片节点，等待用户通过输入框输入提示词
      const placeholderImage: ImageElement = {
        id: newImageId,
        type: 'image',
        src: '', // 空 src，显示等待状态
        position,
        size,
        pendingConnectionGeneration: true,
        generatedFrom: {
          type: 'image-to-image', // 标记为图生图
          sourceIds: [sourceNode.id],
          prompt: trimmedPrompt, // 将菜单中的提示词同步到节点
        },
      };

      addElement(placeholderImage);

      // 行级注释：创建连线
      setEdges((eds: any[]) => [
        ...eds,
        {
          id: `edge-${sourceNode.id}-${newImageId}`,
          source: sourceNode.id,
          target: newImageId,
          type: 'default',
          animated: false, // 图生图的连线不动画，因为需要等待用户输入
          style: { stroke: '#3b82f6', strokeWidth: 1 },
        },
      ]);

    },
    [addElement, setEdges, resetConnectionMenu]
  );

  return { handleImageToImage };
}

