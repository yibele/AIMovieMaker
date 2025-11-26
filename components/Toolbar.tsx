'use client';

import { useState, useRef, useCallback } from 'react';
import { MousePointer2, Type, Upload, Video } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { TextElement, ImageElement, VideoElement } from '@/lib/types';
import { registerUploadedImage } from '@/lib/api-mock';
import type { FlowAspectRatioEnum } from '@/lib/api-mock';
import { TEXT_NODE_DEFAULT_SIZE, VIDEO_NODE_DEFAULT_SIZE } from '@/lib/constants/node-sizes';
import ImageCropperModal, {
  AspectRatioOption,
  CroppedImageResult,
} from './ImageCropperModal';

export default function Toolbar() {
  const activeTool = useCanvasStore((state) => state.uiState.activeTool);
  const setUIState = useCanvasStore((state) => state.setUIState);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const { screenToFlowPosition } = useReactFlow(); // 获取屏幕坐标转画布坐标的方法

  type CropperState = {
    open: boolean;
    imageSrc: string | null;
    aspect: AspectRatioOption;
  };

  const createDefaultCropperState = (): CropperState => ({
    open: false,
    imageSrc: null,
    aspect: '16:9',
  });

  const [cropperState, setCropperState] = useState<CropperState>(
    createDefaultCropperState
  );

  const closeCropper = () => setCropperState(createDefaultCropperState());

  // macOS Dock 效果状态
  const [mouseY, setMouseY] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const flowAspectMap: Record<AspectRatioOption, FlowAspectRatioEnum> = {
    '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  };

  // 工具按钮配置
  const toolGroups = [
    {
      id: 'base',
      items: [
    {
      id: 'select' as const,
      icon: MousePointer2,
      label: '移动',
      action: () => setUIState({ activeTool: 'select' }),
          isActive: activeTool === 'select',
          dotColor: 'bg-blue-500'
        }
      ]
    },
    {
      id: 'create',
      items: [
    {
      id: 'text' as const,
      icon: Type,
          label: '添加文字',
      action: () => handleAddText(),
          isActive: false,
          dotColor: 'bg-purple-500'
    },
    {
      id: 'upload' as const,
      icon: Upload,
      label: '上传图片',
      action: () => handleUploadImage(),
          isActive: false,
          dotColor: 'bg-pink-500'
    },
    {
      id: 'video' as const,
      icon: Video,
      label: '视频节点',
      action: () => handleAddVideo(),
          isActive: false,
          dotColor: 'bg-orange-500'
    },
      ]
    }
    ];

  // 添加文字
  const handleAddText = () => {
    // 获取屏幕中心的画布坐标
    const screenCenter = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const flowPosition = screenToFlowPosition(screenCenter);
    
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: '双击编辑文字',
      position: {
        x: flowPosition.x - TEXT_NODE_DEFAULT_SIZE.width / 2, // 居中对齐
        y: flowPosition.y - TEXT_NODE_DEFAULT_SIZE.height / 2,
      },
      size: TEXT_NODE_DEFAULT_SIZE,
      fontSize: 16,
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
    };
    addElement(newText);
  };

  // 添加视频节点 - 创建空节点供文生视频
  const handleAddVideo = () => {
    // 获取屏幕中心的画布坐标
    const screenCenter = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const flowPosition = screenToFlowPosition(screenCenter);
    
    const newVideo: VideoElement = {
      id: `video-${Date.now()}`,
      type: 'video',
      position: {
        x: flowPosition.x - VIDEO_NODE_DEFAULT_SIZE.width / 2, // 居中对齐
        y: flowPosition.y - VIDEO_NODE_DEFAULT_SIZE.height / 2,
      },
      size: VIDEO_NODE_DEFAULT_SIZE,
      src: '', // 空源，等待生成
      thumbnail: '',
      duration: 0,
      status: 'pending', // pending 状态会自动显示输入框
      readyForGeneration: false,
      generationCount: 1, // 默认生成 1 个视频
    };
    addElement(newVideo);
  };

  // 上传图片
  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // 检查文件大小（最大 10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert('图片大小不能超过 10MB');
        return;
      }

      // 读取文件并创建本地 URL
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string;
        if (!imageUrl) {
          alert('读取图片失败，请重试');
          return;
        }
        
        const img = new Image();
        img.onload = () => {
          const preferAspect: AspectRatioOption =
            img.width >= img.height ? '16:9' : '9:16';
          setCropperState({
            open: true,
            imageSrc: imageUrl,
            aspect: preferAspect,
          });
        };
        img.onerror = () => {
          alert('加载图片失败，请重试');
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  const placeImageOnCanvas = async (result: CroppedImageResult) => {
    const { dataUrl, width, height, aspect } = result;
          const imageId = `image-${Date.now()}`;
          const hasFlowCredential =
            Boolean(apiConfig.bearerToken && apiConfig.bearerToken.trim()) &&
            Boolean(apiConfig.projectId && apiConfig.projectId.trim());

          const screenCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
          const flowPosition = screenToFlowPosition(screenCenter);
          
    const maxWidth = 500;
    const scale = width > maxWidth ? maxWidth / width : 1;
    const imageWidth = width * scale;
    const imageHeight = height * scale;
          
          const newImage: ImageElement = {
            id: imageId,
            type: 'image',
      src: dataUrl,
            position: {
        x: flowPosition.x - imageWidth / 2,
              y: flowPosition.y - imageHeight / 2,
            },
            size: {
              width: imageWidth,
              height: imageHeight,
            },
            generatedFrom: {
        type: 'input',
            },
      uploadState: hasFlowCredential ? 'syncing' : 'local',
          };

          addElement(newImage);

          if (!hasFlowCredential) {
            console.warn('⚠️ 未配置 Flow 凭证，跳过 Flow 上传注册流程');
      alert(
        '图片已添加，但未配置 Flow 的 Bearer Token 或 Project ID，无法进行图生图，请先在设置中填写'
      );
            return;
          }

          try {
      const result = await registerUploadedImage(
        dataUrl,
        flowAspectMap[aspect]
      );
            updateElement(imageId, {
              mediaGenerationId: result.mediaGenerationId || undefined,
              alt: result.caption || newImage.alt,
              caption: result.caption,
              uploadState: 'synced',
              uploadMessage: undefined,
            } as Partial<ImageElement>);
          } catch (error: any) {
            console.error('上传图片注册 Flow 失败:', error);
            const message =
              error?.message || '上传图片注册 Flow 失败，请检查网络或凭证配置';
            updateElement(imageId, {
              uploadState: 'error',
              uploadMessage: message,
            } as Partial<ImageElement>);
            alert(message);
          }
    };
    
  const handleCropConfirm = async (result: CroppedImageResult) => {
    closeCropper();
    await placeImageOnCanvas(result);
  };

  return (
    <>
      {/* 左侧工具栏 - 垂直居中，与右侧风格一致 */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 pointer-events-none">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white/60 p-2 flex flex-col gap-4 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
          
          {toolGroups.map((group, groupIndex) => (
            <div key={group.id} className={`flex flex-col gap-2 ${groupIndex > 0 ? 'pt-2 border-t border-gray-100' : ''}`}>
              {group.items.map((tool, btnIndex) => {
        const Icon = tool.icon;

        return (
                  <div key={tool.id} className="relative group/btn">
          <button
            onClick={tool.action}
                      className={`
                        relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300
                        ${tool.isActive 
                          ? 'bg-gray-100 text-gray-900 shadow-inner' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:scale-105 active:scale-95'}
                      `}
          >
            <Icon 
                        className={`w-5 h-5 transition-all duration-300 ${tool.isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} 
                      />
                      
                      {/* 激活状态指示点 */}
                      {tool.isActive && (
                        <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${tool.dotColor || 'bg-blue-500'} shadow-sm animate-pulse`} />
                      )}
          </button>

                    {/* Tooltip - 右侧弹出 */}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-900/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg opacity-0 invisible translate-x-2 group-hover/btn:opacity-100 group-hover/btn:visible group-hover/btn:translate-x-0 transition-all duration-200 whitespace-nowrap shadow-xl pointer-events-none z-50">
                      {tool.label}
                      {/* 小箭头 */}
                      <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900/90 rotate-45" />
                    </div>
                  </div>
        );
      })}
    </div>
          ))}
        </div>
      </div>

      <ImageCropperModal
        open={cropperState.open}
        imageSrc={cropperState.imageSrc}
        initialAspect={cropperState.aspect}
        onCancel={closeCropper}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
