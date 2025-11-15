'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import type { ImageElement } from '@/lib/types';
import { useCanvasStore } from '@/lib/store';

// 图片节点组件
function ImageNode({ data, selected, id }: NodeProps) {
  const updateElement = useCanvasStore((state) => state.updateElement);
  const { getNode } = useReactFlow();
  
  // 将 data 转换为 ImageElement 类型
  const imageData = data as unknown as ImageElement;
  const uploadState = imageData.uploadState ?? 'synced';
  const isSyncing = uploadState === 'syncing';
  const isError = uploadState === 'error';
  const hasMediaId = Boolean(imageData.mediaGenerationId);
  const showBaseImage = Boolean(imageData.src);
  const isProcessing = !isError && (isSyncing || !hasMediaId || !showBaseImage);
  
  // 判断是否应该显示输入连接点
  // 只有从文本节点生成或图生图时才显示输入点
  // 从输入框直接生成的图片不显示输入点
  const shouldShowInputHandle = imageData.generatedFrom?.type !== 'input';
  
  // 缩放开始回调
  const handleResizeStart = useCallback((event: any, params: any) => {
    console.log('🎨 开始调整图片尺寸:', params);
  }, []);
  
  // 缩放中回调 - NodeResizer 会自动实时更新节点尺寸
  const handleResize = useCallback((event: any, params: any) => {
    // NodeResizer 会自动更新节点的 width 和 height
    // 这里不需要做任何事情，尺寸会实时更新
  }, []);
  
  // 缩放结束回调 - 保存最终尺寸和位置到 store
  const handleResizeEnd = useCallback((event: any, params: any) => {
    const newSize = {
      width: params.width,
      height: params.height,
    };
    
    // 获取节点的最新位置（缩放其他角时位置会变化）
    const node = getNode(id);
    if (node && node.position) {
      console.log('✅ 图片尺寸和位置调整完成:', { 
        size: newSize, 
        position: node.position 
      });
      
      // 同时保存尺寸和位置
      updateElement(id, { 
        size: newSize,
        position: node.position,
      } as Partial<ImageElement>);
    } else {
      // 如果无法获取位置，只保存尺寸
      console.log('✅ 图片尺寸调整完成:', newSize);
      updateElement(id, { size: newSize } as Partial<ImageElement>);
    }
  }, [id, updateElement, getNode]);
  
  return (
    <>
      {/* NodeResizer - 只在选中时显示，四个角有方块 */}
      <NodeResizer
        minWidth={100}
        minHeight={75}
        maxWidth={1080}
        maxHeight={1920}
        keepAspectRatio={true}
        isVisible={selected}
        color="#3b82f6"
        handleStyle={{
          width: '14px',
          height: '14px',
          borderRadius: '4px',
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          boxShadow: '0 0 0 1px #3b82f6',
        }}
        lineStyle={{
          borderWidth: '1px',
          borderColor: '#3b82f6',
        }}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
      
      {/* 输入连接点（左侧） - 条件显示 */}
      {/* 只有从文本节点生成或图生图时才显示，从输入框直接生成不显示 */}
      {shouldShowInputHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !rounded-full"
          style={{ left: '-6px' }}
          isConnectable={true}
        />
      )}
      
        {isProcessing ? (
          <div className="absolute inset-0 loading-glow rounded-[20px]" data-variant="compact" />
        ) : showBaseImage ? (
          <img
            src={imageData.src}
            style={{ borderRadius: '20px' }}
            alt={imageData.alt || '生成的图片'}
            className="w-full h-full object-cover pointer-events-none select-none"
            draggable={false}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        {isError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-red-50/80 backdrop-blur-sm text-red-500"
            style={{ borderRadius: '20px' }}
          >
            <span className="text-xs font-medium">同步失败</span>
            {imageData.uploadMessage && (
              <span className="text-[10px] leading-tight px-6 text-center opacity-75">
                {imageData.uploadMessage}
              </span>
            )}
          </div>
        )}

      
      {/* 输出连接点（右侧） - 用于连接到视频节点 */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white !rounded-full"
        style={{ right: '-6px' }}
        isConnectable={true}
      />
    </>
  );
}

export default memo(ImageNode);

