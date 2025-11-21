'use client';

import { useState, useRef, useCallback } from 'react';
import { MousePointer2, Type, Upload, Video } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { TextElement, ImageElement, VideoElement } from '@/lib/types';
import { registerUploadedImage } from '@/lib/api-mock';
import type { FlowAspectRatioEnum } from '@/lib/api-mock';
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

  // 计算按钮缩放比例（macOS Dock 效果）
  const calculateScale = useCallback((buttonIndex: number) => {
    if (mouseY === null) return 1;
    
    const button = buttonRefs.current[buttonIndex];
    if (!button) return 1;
    
    const rect = button.getBoundingClientRect();
    const buttonCenterY = rect.top + rect.height / 2;
    const distance = Math.abs(mouseY - buttonCenterY);
    
    // 距离越近，缩放越大
    const maxScale = 1.5; // 最大缩放 150%
    const minScale = 1.0; // 最小缩放 100%
    const range = 100; // 影响范围 100px
    
    if (distance > range) return minScale;
    
    const scale = maxScale - ((distance / range) * (maxScale - minScale));
    return scale;
  }, [mouseY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouseY(e.clientY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMouseY(null);
  }, []);

  const flowAspectMap: Record<AspectRatioOption, FlowAspectRatioEnum> = {
    '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
  };

  // 工具按钮配置
  const tools = [
    {
      id: 'select' as const,
      icon: MousePointer2,
      label: '移动',
      action: () => setUIState({ activeTool: 'select' }),
    },
    {
      id: 'text' as const,
      icon: Type,
      label: '文字',
      action: () => handleAddText(),
    },
    {
      id: 'upload' as const,
      icon: Upload,
      label: '上传图片',
      action: () => handleUploadImage(),
    },
    {
      id: 'video' as const,
      icon: Video,
      label: '视频节点',
      action: () => handleAddVideo(),
    },
    ];

  // 添加文字
  const handleAddText = () => {
    // 获取屏幕中心的画布坐标
    const screenCenter = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const flowPosition = screenToFlowPosition(screenCenter);
    
    // 文字节点的尺寸
    const textWidth = 200;
    const textHeight = 80;
    
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: '双击编辑文字',
      position: {
        x: flowPosition.x - textWidth / 2, // 居中对齐
        y: flowPosition.y - textHeight / 2,
      },
      size: { width: textWidth, height: textHeight }, // 初始尺寸，字体大小会根据此计算
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
    
    // 视频节点的尺寸（16:9 横屏，默认）
    const videoWidth = 480;
    const videoHeight = 270;
    
    const newVideo: VideoElement = {
      id: `video-${Date.now()}`,
      type: 'video',
      position: {
        x: flowPosition.x - videoWidth / 2, // 居中对齐
        y: flowPosition.y - videoHeight / 2,
      },
      size: { width: videoWidth, height: videoHeight },
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
    <div 
      className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-200/50 p-3 flex flex-col gap-2"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {tools.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        const scale = calculateScale(index);

        return (
          <button
            key={tool.id}
            ref={(el) => { buttonRefs.current[index] = el; }}
            onClick={tool.action}
            style={{
              transform: `scale(${scale})`,
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            className={`relative p-3 rounded-xl origin-center ${
              isActive
                ? 'bg-blue-100 text-blue-600 shadow-lg'
                : 'text-gray-700'
            }`}
            title={tool.label}
          >
            <Icon className="w-5 h-5 relative z-10" />
          </button>
        );
      })}
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

