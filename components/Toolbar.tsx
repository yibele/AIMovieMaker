'use client';

import { useState } from 'react';
import { MousePointer2, Type, Upload, Video } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { TextElement, ImageElement, VideoElement } from '@/lib/types';
import { registerUploadedImage } from '@/lib/api-mock';
import MaterialsPanel from './MaterialsPanel';
import { MaterialsIcon } from './icons/MaterialsIcon';

export default function Toolbar() {
  const [isMaterialsPanelOpen, setIsMaterialsPanelOpen] = useState(false);
  const activeTool = useCanvasStore((state) => state.uiState.activeTool);
  const setUIState = useCanvasStore((state) => state.setUIState);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const { screenToFlowPosition } = useReactFlow(); // 获取屏幕坐标转画布坐标的方法

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
    {
      id: 'materials' as const,
      icon: MaterialsIcon,
      label: '素材库',
      action: () => setIsMaterialsPanelOpen(true),
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

  // 添加视频节点
  const handleAddVideo = () => {
    // 获取屏幕中心的画布坐标
    const screenCenter = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const flowPosition = screenToFlowPosition(screenCenter);
    
    // 视频节点的尺寸（16:9 比例）
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
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=480&h=270&fit=crop',
      duration: 5,
      status: 'ready',
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
        
        // 创建图片元素获取尺寸
        const img = new Image();
        img.onload = async () => {
          const maxWidth = 500;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const imageId = `image-${Date.now()}`;
          const hasFlowCredential =
            Boolean(apiConfig.bearerToken && apiConfig.bearerToken.trim()) &&
            Boolean(apiConfig.projectId && apiConfig.projectId.trim());
          const flowAspectRatio =
            img.width === img.height
              ? 'IMAGE_ASPECT_RATIO_SQUARE'
              : img.width > img.height
              ? 'IMAGE_ASPECT_RATIO_LANDSCAPE'
              : 'IMAGE_ASPECT_RATIO_PORTRAIT';
          
          // 获取屏幕中心的画布坐标
          const screenCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
          const flowPosition = screenToFlowPosition(screenCenter);
          
          // 图片缩放后的尺寸
          const imageWidth = img.width * scale;
          const imageHeight = img.height * scale;
          
          const newImage: ImageElement = {
            id: imageId,
            type: 'image',
            src: imageUrl,
            position: {
              x: flowPosition.x - imageWidth / 2, // 居中对齐
              y: flowPosition.y - imageHeight / 2,
            },
            size: {
              width: imageWidth,
              height: imageHeight,
            },
            generatedFrom: {
              type: 'input', // 上传的图片标记为 input 类型，无源节点
            },
            uploadState: hasFlowCredential ? 'syncing' : 'local', // 若可同步则展示进度态 // 行级注释说明状态初始化
          };
          addElement(newImage);

          if (!hasFlowCredential) {
            console.warn('⚠️ 未配置 Flow 凭证，跳过 Flow 上传注册流程');
            alert('图片已添加，但未配置 Flow 的 Bearer Token 或 Project ID，无法进行图生图，请先在设置中填写');
            return;
          }

          try {
            const result = await registerUploadedImage(imageUrl, flowAspectRatio);
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
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  };

  return (
    <>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-white rounded-xl shadow-lg p-2 flex flex-col gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={tool.action}
              className={`p-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              title={tool.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* 素材库面板 */}
      <MaterialsPanel
        isOpen={isMaterialsPanelOpen}
        onClose={() => setIsMaterialsPanelOpen(false)}
      />
    </>
  );
}

