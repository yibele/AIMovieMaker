'use client';

import { RefreshCw, Copy, Download, Trash2, Square, Edit3 } from 'lucide-react';
import { Panel, useReactFlow, useViewport } from '@xyflow/react';
import { useCanvasStore } from '@/lib/store';
import { ImageElement } from '@/lib/types';
import { editImage } from '@/lib/api-mock';
import { generateFromInput, imageToImageFromInput } from '@/lib/input-panel-generator';
import { ToolbarButton, ToolbarDivider } from './nodes/ToolbarButton';
import { useState } from 'react';
import ImageAnnotatorModal, { ImageAnnotatorResult } from './ImageAnnotatorModal';
import { toast } from 'sonner';

interface FloatingToolbarProps {
  setEdges?: (edges: any) => void;
}

export default function FloatingToolbar({ setEdges }: FloatingToolbarProps) {
  const { getNode } = useReactFlow();
  const { zoom, x: viewportX, y: viewportY } = useViewport();
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const deleteSelectedElements = useCanvasStore((state) => state.deleteSelectedElements);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addPromptHistory = useCanvasStore((state) => state.addPromptHistory);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const promptsHistory = useCanvasStore((state) => state.promptsHistory);

  // 只在选中图片时显示
  const selectedElements = elements.filter((el) => selection.includes(el.id));
  const imageElements = selectedElements.filter((el) => el.type === 'image') as ImageElement[];
  const [annotatorTarget, setAnnotatorTarget] = useState<ImageElement | null>(null);
  const [isLoadingAnnotatorImage, setIsLoadingAnnotatorImage] = useState(false);

  // mediaId -> base64 缓存，避免重复下载
  const [mediaBase64Cache] = useState<Map<string, string>>(new Map());

  // 单选时的操作
  const isSingleSelection = imageElements.length === 1;
  const selectedImage = isSingleSelection ? imageElements[0] : null;

  // 打开图片注释 - 优先使用已有的 base64，无需再次下载
  const handleAnnotate = async () => {
    if (!selectedImage?.src) {
      toast.error('当前图片暂无可编辑内容');
      return;
    }

    // 如果图片已有 base64，直接使用（新生成的图片都有 base64）
    if (selectedImage.base64) {
      console.log('✅ 使用图片自带的 base64');
      const imageDataUrl = selectedImage.base64.startsWith('data:')
        ? selectedImage.base64
        : `data:image/png;base64,${selectedImage.base64}`;

      setAnnotatorTarget({
        ...selectedImage,
        src: imageDataUrl,
      });
      setIsLoadingAnnotatorImage(false);
      return;
    }

    // 检查是否有有效的 mediaId 或 mediaGenerationId
    const effectiveMediaId = selectedImage.mediaId || selectedImage.mediaGenerationId;
    if (!effectiveMediaId) {
      toast.error('当前图片缺少 mediaId 或 mediaGenerationId，无法编辑');
      return;
    }
    
    // 立即打开 Modal，显示加载状态
    setAnnotatorTarget(selectedImage);
    setIsLoadingAnnotatorImage(true);

    try {
      // 检查缓存
      if (mediaBase64Cache.has(effectiveMediaId)) {
        console.log('✅ 使用缓存的图片 base64');
        const cachedDataUrl = mediaBase64Cache.get(effectiveMediaId)!;
        setAnnotatorTarget({
          ...selectedImage,
          src: cachedDataUrl,
        });
        setIsLoadingAnnotatorImage(false);
        return;
      }
      
      console.log('📥 通过 API 获取原图 base64...');
      
      const { useCanvasStore } = await import('@/lib/store');
      const apiConfig = useCanvasStore.getState().apiConfig;

      if (!apiConfig.apiKey || !apiConfig.bearerToken) {
        toast.error('请先在设置中配置 API Key 和 Bearer Token');
        setAnnotatorTarget(null);
        setIsLoadingAnnotatorImage(false);
        return;
      }

      // 通过后端代理调用（避免 API Key Referrer 限制）
      const mediaResponse = await fetch(
        `/api/flow/media/${effectiveMediaId}?key=${apiConfig.apiKey}&returnUriOnly=false&proxy=${apiConfig.proxy || ''}`,
        {
          headers: apiConfig.bearerToken ? {
            'Authorization': `Bearer ${apiConfig.bearerToken}`
          } : {}
        }
      );
      
      if (!mediaResponse.ok) {
        throw new Error('Media API 调用失败');
      }
      
      const mediaData = await mediaResponse.json();
      
      // 提取 base64 数据
      const encodedImage = mediaData?.image?.encodedImage;
      if (!encodedImage) {
        throw new Error('未获取到图片数据');
      }
      
      console.log('✅ 获取原图 base64 成功');
      
      // 使用 base64 DataURL 更新目标
      const imageDataUrl = `data:image/png;base64,${encodedImage}`;
      
      // 缓存 base64
      mediaBase64Cache.set(effectiveMediaId, imageDataUrl);
      
      setAnnotatorTarget({
        ...selectedImage,
        src: imageDataUrl, // 用 base64 DataURL
      });
      setIsLoadingAnnotatorImage(false);
      
    } catch (error) {
      console.error('❌ 获取原图失败:', error);
      toast.error(`无法打开编辑器: ${error instanceof Error ? error.message : '未知错误'}`);
      setAnnotatorTarget(null);
      setIsLoadingAnnotatorImage(false);
    }
  };

  // 注释完成 - 将标注图上传并进行图生图
  const handleAnnotatorConfirm = async (result: ImageAnnotatorResult, annotatedImageDataUrl: string) => {
    if (!selectedImage) return;
    
    // 保持 Modal 打开，不关闭
    // setAnnotatorTarget(null);
    
    // 如果没有提示词，不做图生图
    if (!result.promptText || !result.promptText.trim()) {
      console.log('✅ 图片标注完成，但未输入提示词，跳过图生图');
      return;
    }
    
    try {
      console.log('🖍️ 开始图片编辑流程:', result.promptText);
      
      // 推断宽高比
      let aspectRatio: '16:9' | '9:16' | '1:1' = '16:9';
      if (selectedImage.size) {
        const { width = 400, height = 300 } = selectedImage.size;
        const ratio = width / height;
        if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = '16:9';
        else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = '9:16';
        else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
      }
      
      // 计算新图片位置（在原图右侧）
      const newPosition = {
        x: selectedImage.position.x + (selectedImage.size?.width || 640) + 50,
        y: selectedImage.position.y,
      };
      
      // 创建新图片的尺寸
      const size = { width: 640, height: 360 };
      if (aspectRatio === '9:16') {
        size.width = 360;
        size.height = 640;
      } else if (aspectRatio === '1:1') {
        size.width = 512;
        size.height = 512;
      }
      
      // 立即创建 placeholder（在上传阶段就显示）
      const newImageId = `image-${Date.now()}`;
      const newImage: ImageElement = {
        id: newImageId,
        type: 'image',
        src: '',
        position: newPosition,
        size: size,
        sourceImageIds: [selectedImage.id],
        generatedFrom: {
          type: 'image-to-image',
          sourceIds: [selectedImage.id],
          prompt: result.promptText,
        },
      };
      
      addElement(newImage);
      
      // 创建连线（连到原图，不连标注图）
      if (setEdges) {
        const edgeId = `edge-${selectedImage.id}-${newImageId}`;
        setEdges((eds: any) => [
          ...eds,
          {
            id: edgeId,
            source: selectedImage.id,
            target: newImageId,
            type: 'default',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 1 },
          },
        ]);
      }
      
      // 1. 将标注图的 DataURL 转为 base64
      const base64Data = annotatedImageDataUrl.split(',')[1];
      
      // 2. 上传标注后的图片到 Flow，获取 mediaGenerationId
      const { registerUploadedImage } = await import('@/lib/api-mock');
      
      console.log('📤 上传标注图片到 Flow...');
      const uploadResult = await registerUploadedImage(base64Data);
      
      if (!uploadResult.mediaGenerationId) {
        throw new Error('上传失败：未获取到 mediaGenerationId');
      }
      
      console.log('✅ 标注图片上传成功:', uploadResult.mediaGenerationId);
      
      // 3. 调用图生图 API
      console.log('🎨 使用标注图进行图生图...');
      const { imageToImage } = await import('@/lib/api-mock');
      
      const imageResult = await imageToImage(
        result.promptText,
        annotatedImageDataUrl, // 传入标注图的 dataUrl
        aspectRatio,
        '',
        uploadResult.mediaGenerationId, // 使用上传后的 mediaGenerationId
        1
      );
      
      // 更新图片内容（包含 base64）
      updateElement(newImageId, {
        src: imageResult.imageUrl,
        base64: imageResult.images?.[0]?.base64, // 保存 base64，用于后续编辑
        promptId: imageResult.promptId,
        mediaId: imageResult.mediaId,
        mediaGenerationId: imageResult.mediaGenerationId,
        uploadState: 'synced',
      } as Partial<ImageElement>);
      
      // 停止连线动画
      if (setEdges) {
        const edgeId = `edge-${selectedImage.id}-${newImageId}`;
        setEdges((eds: any) =>
          eds.map((edge: any) =>
            edge.id === edgeId
              ? { ...edge, animated: false }
              : edge
          )
        );
      }
      
      // 添加到历史记录
      addPromptHistory({
        promptId: imageResult.promptId,
        promptText: result.promptText,
        imageId: newImageId,
        mode: 'edit',
        createdAt: Date.now(),
      });
      
      console.log('✅ 图片编辑完成！');
      
    } catch (error) {
      console.error('❌ 图片编辑失败:', error);
      toast.error(`图片编辑失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 关闭注释
  const handleAnnotatorClose = () => {
    setAnnotatorTarget(null);
  };

  // 再次生成
  const handleRegenerate = async () => {
    if (!selectedImage) return;

    try {
      // 1. 获取原始提示词
      let originalPrompt = '';

      // 首先从 generatedFrom 中获取
      if (selectedImage.generatedFrom?.prompt) {
        originalPrompt = selectedImage.generatedFrom.prompt;
      } else if (selectedImage.promptId) {
        // 从历史记录中查找
        const history = promptsHistory.find(h => h.promptId === selectedImage.promptId);
        if (history) {
          originalPrompt = history.promptText;
        }
      }

      // 如果还是没有提示词，使用默认值
      if (!originalPrompt) {
        originalPrompt = '生成图片';
      }

      // 2. 根据生成类型执行不同的生成逻辑
      const generationType = selectedImage.generatedFrom?.type;

      if (generationType === 'image-to-image') {
        // 图生图：找到源图片，再次运行图生图
        console.log('图生图再次生成:', originalPrompt);

        // 查找基图
        const sourceImageId = selectedImage.sourceImageIds?.[0] ||
                             selectedImage.generatedFrom?.sourceIds?.[0];

        if (!sourceImageId) {
          toast.error('找不到原始图片，无法再次生成');
          return;
        }

        const sourceImage = elements.find(el => el.id === sourceImageId && el.type === 'image') as ImageElement;

        if (!sourceImage) {
          toast.error('原始图片已被删除，无法再次生成');
          return;
        }

        // 从原图尺寸推断宽高比
        let aspectRatio = '16:9';
        if (selectedImage.size) {
          const { width = 400, height = 300 } = selectedImage.size;
          const ratio = width / height;
          if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = '16:9';
          else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = '9:16';
          else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
        }

        // 创建图生图的 placeholder 和连线
        const size = { width: 640, height: 360 }; // 默认尺寸，后续根据 aspectRatio 调整

        // 根据宽高比调整尺寸
        if (aspectRatio === '9:16') {
          size.width = 360;
          size.height = 640;
        } else if (aspectRatio === '1:1') {
          size.width = 512;
          size.height = 512;
        }

        // 在当前选中的图片上方创建新图片
        const newImageId = `image-${Date.now()}`;
        const newImage: ImageElement = {
          id: newImageId,
          type: 'image',
          src: '',
          position: {
            x: selectedImage.position.x,
            y: selectedImage.position.y - size.height - 100, // 上方 100px 间距
          },
          size: size,
          sourceImageIds: [sourceImage.id],
          generatedFrom: {
            type: 'image-to-image',
            sourceIds: [sourceImage.id],
            prompt: originalPrompt,
          },
        };

        // 添加图片节点
        addElement(newImage);

        // 创建连线（带动画）
        if (setEdges) {
          const edgeId = `edge-${sourceImage.id}-${newImageId}`;
          setEdges((eds: any) => [
            ...eds,
            {
              id: edgeId,
              source: sourceImage.id,
              target: newImageId,
              type: 'default',
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 1 },
            },
          ]);
        }

        // 调用图生图 API
        try {
          import('@/lib/api-mock').then(({ imageToImage }) => {
            imageToImage(
              originalPrompt,
              sourceImage.src,
              aspectRatio as '16:9' | '9:16' | '1:1',
              '',
              sourceImage.mediaId || sourceImage.mediaGenerationId,
              1
            ).then((result) => {
              // 更新图片内容
              updateElement(newImageId, {
                src: result.imageUrl,
                promptId: result.promptId,
                mediaId: result.mediaId,
                mediaGenerationId: result.mediaGenerationId,
                uploadState: 'synced',
              } as Partial<ImageElement>);

              // 停止连线动画
              if (setEdges) {
                const edgeId = `edge-${sourceImage.id}-${newImageId}`;
                setEdges((eds: any) =>
                  eds.map((edge: any) =>
                    edge.id === edgeId
                      ? { ...edge, animated: false }
                      : edge
                  )
                );
              }

              // 添加到历史记录
              addPromptHistory({
                promptId: result.promptId,
                promptText: originalPrompt,
                imageId: newImageId,
                mode: 'regenerate',
                createdAt: Date.now(),
              });
            }).catch((error) => {
              console.error('图生图失败:', error);
              updateElement(newImageId, {
                uploadState: 'error',
                uploadMessage: '生成失败',
              } as Partial<ImageElement>);
            });
          });
        } catch (error) {
          console.error('图生图失败:', error);
          updateElement(newImageId, {
            uploadState: 'error',
            uploadMessage: '生成失败',
          } as Partial<ImageElement>);
        }
      } else {
        // 文生图：直接生成新图片
        console.log('文生图再次生成:', originalPrompt);

        // 从原图尺寸推断宽高比
        let aspectRatio = '16:9';
        if (selectedImage.size) {
          const { width = 400, height = 300 } = selectedImage.size;
          const ratio = width / height;
          if (Math.abs(ratio - 16/9) < 0.1) aspectRatio = '16:9';
          else if (Math.abs(ratio - 9/16) < 0.1) aspectRatio = '9:16';
          else if (Math.abs(ratio - 1) < 0.1) aspectRatio = '1:1';
        }

        // 计算新图片位置（在原图右侧）
        const newPosition = {
          x: selectedImage.position.x + (selectedImage.size?.width || 640) + 50,
          y: selectedImage.position.y,
        };

        // 使用 generateFromInput 生成新图片
        await generateFromInput(
          originalPrompt,
          aspectRatio as '16:9' | '9:16' | '1:1',
          1, // 生成数量
          newPosition,
          addElement,
          updateElement,
          useCanvasStore.getState().deleteElement,
          addPromptHistory
        );
      }
    } catch (error) {
      console.error('再次生成失败:', error);
      toast.error('生成失败，请重试');
    }
  };

  // 生成类似图片
  const handleSimilar = async () => {
    if (!selectedImage) return;
    
    const prompt = '生成类似的图片';
    
    try {
      const result = await editImage(prompt, selectedImage.id, 'similar');
      
      const newImage: ImageElement = {
        id: `image-${Date.now()}`,
        type: 'image',
        src: result.imageUrl,
        position: {
          x: selectedImage.position.x + (selectedImage.size?.width || 400) + 20,
          y: selectedImage.position.y,
        },
        size: selectedImage.size,
        promptId: result.promptId,
        sourceImageIds: [selectedImage.id],
      };
      
      addElement(newImage);
      
      addPromptHistory({
        promptId: result.promptId,
        promptText: prompt,
        imageId: newImage.id,
        mode: 'similar',
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('生成类似图片失败:', error);
      toast.error('生成失败，请重试');
    }
  };

  // 复制图片
  const handleDuplicate = () => {
    if (!selectedImage) return;

    const newImage: ImageElement = {
      ...selectedImage,
      id: `image-${Date.now()}`,
      position: {
        x: selectedImage.position.x + (selectedImage.size?.width || 400) + 30,
        y: selectedImage.position.y,
      },
    };

    addElement(newImage);
    setSelection([newImage.id]);
  };

// 下载图片 - 在新标签页打开让用户右键保存
  const handleDownload = () => {
    imageElements.forEach((img) => {
      if (!img?.src) return;
      // 在新标签页打开图片
      const newWindow = window.open(img.src, '_blank', 'noopener,noreferrer');

      // 如果新窗口打开成功，显示提示
      if (newWindow) {
        console.log(`✅ 已在新标签页打开图片: ${img.id}`);
      } else {
        // 如果新窗口被阻止，回退到当前窗口打开
        window.location.href = img.src;
        console.log(`⚠️ 新标签页被阻止，在当前窗口打开图片: ${img.id}`);
      }
    });
  };

  // 删除 - 直接删除，无需确认
  const handleDelete = () => {
    deleteSelectedElements();
  };

  // 阻止事件冒泡
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const hasSelection = imageElements.length > 0;
  let toolbarContent: React.ReactElement | null = null;

  if (hasSelection) {
    if (isSingleSelection && selectedImage) {
      const node = getNode(selectedImage.id);
      if (node) {
        const imgWidth = selectedImage.size?.width || 400;
        const screenX = node.position.x * zoom + viewportX;
        const screenY = node.position.y * zoom + viewportY;

        toolbarContent = (
          <div
            key={selectedImage.id}
            className="image-toolbar-pop absolute z-50 flex items-center gap-2 bg-white/95 backdrop-blur-xl text-gray-700 rounded-xl border border-gray-200 shadow-2xl px-3 py-2 pointer-events-auto"
            style={{
              left: `${screenX + (imgWidth * zoom) / 2}px`,
              top: `${screenY - 58}px`,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={handleMouseDown}
          >
            <ToolbarButton icon={<RefreshCw className="w-4 h-4" />} label="再次生成" onClick={() => handleRegenerate()} />
            <ToolbarButton icon={<Copy className="w-4 h-4" />} label="类似图片" onClick={() => handleSimilar()} />
            <ToolbarButton icon={<Edit3 className="w-4 h-4" />} label="图片编辑" onClick={() => handleAnnotate()} />
            <ToolbarButton icon={<Square className="w-4 h-4" />} label="复制" onClick={() => handleDuplicate()} />
            <ToolbarDivider />
            <ToolbarButton icon={<Download className="w-4 h-4" />} label="下载" onClick={() => handleDownload()} />
            <ToolbarButton icon={<Trash2 className="w-4 h-4" />} label="删除" variant="danger" onClick={() => handleDelete()} />
          </div>
        );
      }
    } else {
      toolbarContent = (
        <Panel position="top-center" className="!m-0 !p-0">
          <div
            className="flex items-center gap-2 bg-white/95 backdrop-blur-xl text-gray-700 rounded-xl border border-gray-200 shadow-2xl px-4 py-2"
            onMouseDown={handleMouseDown}
          >
            <span className="px-2 py-1 text-xs font-medium text-gray-500">
              已选中 {imageElements.length} 张图片
            </span>

            <ToolbarDivider />
            <ToolbarButton icon={<Download className="w-4 h-4" />} label="下载" onClick={() => handleDownload()} />
            <ToolbarButton icon={<Trash2 className="w-4 h-4" />} label="删除" variant="danger" onClick={() => handleDelete()} />
          </div>
        </Panel>
      );
    }
  }

  return (
    <>
      {toolbarContent}
      <ImageAnnotatorModal
        open={Boolean(annotatorTarget)}
        imageSrc={annotatorTarget?.src || null}
        isLoadingImage={isLoadingAnnotatorImage}
        onClose={handleAnnotatorClose}
        onConfirm={handleAnnotatorConfirm}
      />
    </>
  );
}