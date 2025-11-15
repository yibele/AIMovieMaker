'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, NodeResizer } from '@xyflow/react';
import type { ImageElement } from '@/lib/types';
import { useNodeResize } from '@/lib/node-resize-helpers';

// 行级注释：图片节点组件
function ImageNode({ data, selected, id }: NodeProps) {
  const imageData = data as unknown as ImageElement;
  const uploadState = imageData.uploadState ?? 'synced';
  const isSyncing = uploadState === 'syncing';
  const isError = uploadState === 'error';
  const hasMediaId = Boolean(imageData.mediaGenerationId);
  const showBaseImage = Boolean(imageData.src);
  const isProcessing = !isError && (isSyncing || !hasMediaId || !showBaseImage);
  
  // 行级注释：只有从文本节点生成或图生图时才显示输入点，从输入框直接生成的图片不显示
  const shouldShowInputHandle = imageData.generatedFrom?.type !== 'input';
  
  // 行级注释：使用共享的 resize 逻辑
  const { handleResizeStart, handleResize, handleResizeEnd } = useNodeResize(id);
  
  return (
    <>
      {/* NodeResizer - 统一风格 */}
      <NodeResizer
        minWidth={100}
        minHeight={75}
        maxWidth={1080}
        maxHeight={1920}
        keepAspectRatio={true}
        isVisible={selected}
        color="#3b82f6"
        handleStyle={{
          width: '10px',
          height: '10px',
          borderRadius: '4px',
          backgroundColor: '#3b82f6',
          border: '1px solid white',
        }}
        lineStyle={{
          borderWidth: '1px',
          borderColor: '#3b82f6',
        }}
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />

      <div
        className={`relative rounded-xl transition-all w-full h-full ${
          selected
            ? 'ring-1 ring-blue-500/80 shadow-[0_10px_40px_rgba(59,130,246,0.25)]'
            : 'shadow-[0_8px_24px_rgba(15,23,42,0.12)]'
        }`}
        style={{ overflow: 'visible', backgroundColor: '#fff' }}
      >
        {/* 输入连接点（左侧） - 条件显示 */}
        {shouldShowInputHandle && (
          <Handle
            type="target"
            position={Position.Left}
            className="!flex !items-center !justify-center !w-4 !h-4 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm"
            style={{ left: '-6px', top: '50%' }}
            isConnectable={true}
          />
        )}

        <div className="absolute inset-0 rounded-xl overflow-hidden">
          {isProcessing ? (
            <div className="flex h-full w-full items-center justify-center bg-white">
              <div className="loading-glow w-[85%] h-[85%] rounded-xl" data-variant="compact" />
            </div>
          ) : showBaseImage ? (
            <img
              src={imageData.src}
              alt={imageData.alt || '生成的图片'}
              className="h-full w-full object-cover pointer-events-none select-none"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-xs font-medium text-gray-500">
              等待图片内容
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-50/80 backdrop-blur-sm text-red-500">
              <span className="text-xs font-medium">同步失败</span>
              {imageData.uploadMessage && (
                <span className="text-[10px] leading-tight px-6 text-center opacity-75">
                  {imageData.uploadMessage}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 输出连接点（右侧） - 用于连接到视频节点 */}
        <Handle
          type="source"
          position={Position.Right}
          className="!flex !items-center !justify-center !w-3.5 !h-3.5 !bg-blue-500 !border-2 !border-white !rounded-full shadow-sm"
          style={{ right: '-6px', top: '50%' }}
          isConnectable={true}
        />
      </div>
    </>
  );
}

export default memo(ImageNode);

