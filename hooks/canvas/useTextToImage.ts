import { useCallback } from 'react';
import { TextElement, ImageElement, CanvasElement } from '@/lib/types';
import { generateImage } from '@/lib/api-mock';
import { useCanvasStore } from '@/lib/store';
import {
  ImageAspectRatio,
  getImageSizeFromRatio,
  getTargetPositionRightOf,
} from '@/types/image-generation';

// 行级注释：文生图 Hook 的依赖类型
type UseTextToImageDeps = {
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  setEdges: any; // React Flow setEdges 类型
  resetConnectionMenu?: () => void;
};

// 行级注释：文生图 Hook - 从文本节点生成图片
export function useTextToImage({
  addElement,
  updateElement,
  setEdges,
  resetConnectionMenu,
}: UseTextToImageDeps) {
  // 行级注释：文生图处理函数
  const handleTextToImage = useCallback(
    async (sourceNode: TextElement, aspectRatio: ImageAspectRatio) => {
      // 行级注释：关闭连线菜单（如果存在）
      resetConnectionMenu?.();

      // 行级注释：根据比例计算尺寸
      const size = getImageSizeFromRatio(aspectRatio);

      // 行级注释：在文本节点右侧位置
      const position = getTargetPositionRightOf(sourceNode, 100, 200);

      // 行级注释：创建临时 ID
      const newImageId = `image-${Date.now()}`;

      // 行级注释：立即创建占位符图片节点（生成中状态）
      const placeholderImage: ImageElement = {
        id: newImageId,
        type: 'image',
        src: '', // 空 src，触发"加载中"显示
        position,
        size,
        generatedFrom: {
          type: 'text', // 从文本节点生成
          sourceIds: [sourceNode.id],
          prompt: sourceNode.text,
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
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 1 },
        },
      ]);

      try {
        // 行级注释：使用文本节点的文字作为提示词生成图片（传入选中的比例）
        const result = await generateImage(sourceNode.text, aspectRatio);

        // 行级注释：更新图片节点，替换为真实图片
        updateElement(newImageId, {
          src: result.imageUrl,
          promptId: result.promptId,
          mediaId: result.mediaId, // 保存 Flow mediaId 以便后续图生视频引用
          mediaGenerationId: result.mediaGenerationId, // 保存 Flow 返回的 mediaGenerationId，便于后续图生图
        } as Partial<ImageElement>);

        // 行级注释：停止连线动画（生成完成后变为普通线）
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.id === `edge-${sourceNode.id}-${newImageId}`
              ? { ...edge, animated: false }
              : edge
          )
        );

      } catch (error: any) {
        console.error('❌ 生成图片失败:', error);
        // 行级注释：删除失败的占位符和连线
        useCanvasStore.getState().deleteElement(newImageId);
        setEdges((eds: any[]) =>
          eds.filter((edge: any) => edge.id !== `edge-${sourceNode.id}-${newImageId}`)
        );
        // 行级注释：显示详细的错误信息
        const errorMessage = error?.message || '生成图片失败，请重试';
        alert(errorMessage);
      }
    },
    [addElement, updateElement, setEdges, resetConnectionMenu]
  );

  return { handleTextToImage };
}

