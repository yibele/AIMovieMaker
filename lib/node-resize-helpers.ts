// 行级注释：Node 组件通用的 resize 逻辑（避免在每个 Node 中重复）
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from './store';
import { CanvasElement } from './types';

// 行级注释：创建标准的 resize 回调
export function useNodeResize(nodeId: string) {
  const updateElement = useCanvasStore((state) => state.updateElement);
  const { getNode } = useReactFlow();

  const handleResizeStart = useCallback(() => {
    // 行级注释：resize 开始时的钩子（如需添加逻辑可在此扩展）
  }, []);

  const handleResize = useCallback(() => {
    // 行级注释：resize 过程中的钩子（NodeResizer 自动更新尺寸，无需手动处理）
  }, []);

  const handleResizeEnd = useCallback(
    (event: any, params: any) => {
      const newSize = {
        width: params.width,
        height: params.height,
      };

      // 行级注释：获取节点最新位置（缩放某些角时位置会变化）
      const node = getNode(nodeId);
      if (node && node.position) {
        updateElement(nodeId, {
          size: newSize,
          position: node.position,
        } as Partial<CanvasElement>);
      } else {
        updateElement(nodeId, { size: newSize } as Partial<CanvasElement>);
      }
    },
    [nodeId, updateElement, getNode]
  );

  return {
    handleResizeStart,
    handleResize,
    handleResizeEnd,
  };
}

