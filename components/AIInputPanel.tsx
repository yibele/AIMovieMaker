'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Settings2, Image as ImageIcon, Video } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { ImageElement } from '@/lib/types';
import {
  generateImage,
  imageToImage,
  runImageRecipe,
} from '@/lib/api-mock';
import { generateVideoWithFlow, checkVideoStatusWithFlow } from '@/lib/flow-api';
import { useReactFlow } from '@xyflow/react';

export default function AIInputPanel() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9'); // 默认横图
  const [showSettings, setShowSettings] = useState(false); // 控制设置面板显示
  const panelRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const selection = useCanvasStore((state) => state.selection);
  const elements = useCanvasStore((state) => state.elements);
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const deleteElement = useCanvasStore((state) => state.deleteElement);
  const addPromptHistory = useCanvasStore((state) => state.addPromptHistory);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  const { screenToFlowPosition, setEdges } = useReactFlow();
  
  // 生成数量 (1-4)
  const generationCount = apiConfig.generationCount || 1;

  // 获取选中的图片元素
  const selectedImages = elements
    .filter((el) => selection.includes(el.id) && el.type === 'image')
    .map((el) => el as ImageElement);

  // 根据选中状态确定模式和提示文案
  const getPlaceholder = () => {
    if (selectedImages.length === 0) {
      return '你想改变什么？';
    } else if (selectedImages.length === 1) {
      return '编辑图片...';
    } else {
      return `基于 ${selectedImages.length} 张图片生成新内容...`;
    }
  };

  // 根据比例计算尺寸
  const getSizeFromAspectRatio = (ratio: '16:9' | '9:16' | '1:1') => {
    switch (ratio) {
      case '9:16': // 竖图
        return { width: 360, height: 640 };
      case '16:9': // 横图
        return { width: 640, height: 360 };
      case '1:1': // 方图
        return { width: 512, height: 512 };
    }
  };

  // 计算输入框上方的生成位置（Canvas 坐标系）
  const getPositionAboveInput = () => {
    if (!panelRef.current) {
      // 如果无法获取位置，使用默认值
      return { x: 300, y: 200 };
    }
    
    // 获取输入框在屏幕上的位置
    const rect = panelRef.current.getBoundingClientRect();
    // 计算输入框中心的屏幕坐标
    const screenX = rect.left + rect.width / 2;
    // 输入框上方 450px 的位置（给图片留出空间）
    const screenY = rect.top - 450;
    
    // 转换为 Canvas 流图坐标系
    const flowPosition = screenToFlowPosition({ x: screenX, y: screenY });
    
    return flowPosition;
  };

  // 处理生成
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);

    try {
      if (selectedImages.length === 0) {
        // 模式1: 生成新图片（从输入框直接生成）
        // 获取输入框上方的位置和选择的比例尺寸
        const position = getPositionAboveInput();
        const size = getSizeFromAspectRatio(aspectRatio);
        
        // 创建多个 placeholder 节点（根据 generationCount）
        const placeholderIds: string[] = [];
        const horizontalSpacing = 20; // 图片之间的间距
        const totalWidth = generationCount * size.width + (generationCount - 1) * horizontalSpacing;
        const startX = position.x - totalWidth / 2; // 居中对齐
        
        for (let i = 0; i < generationCount; i++) {
          const newImageId = `image-${Date.now()}-${i}`;
          placeholderIds.push(newImageId);
          
          const placeholderImage: ImageElement = {
            id: newImageId,
            type: 'image',
            src: '', // 空 src，触发"加载中"显示
            position: { 
              x: startX + i * (size.width + horizontalSpacing), 
              y: position.y 
            },
            size: size,
            generatedFrom: {
              type: 'input', // 从输入框直接生成，无源节点
              prompt: prompt,
            },
          };
          
          addElement(placeholderImage);
        }
        
        try {
          // 异步生成图片（传入选中的比例和数量）
          const result = await generateImage(prompt, aspectRatio, generationCount);
          
          // 如果返回了多张图片，则更新所有 placeholder
          if (result.images && result.images.length > 0) {
            result.images.forEach((img, index) => {
              if (index < placeholderIds.length) {
                updateElement(placeholderIds[index], {
                  src: img.imageUrl,
                  promptId: result.promptId,
                  mediaGenerationId: img.mediaGenerationId,
                } as Partial<ImageElement>);
              }
            });
            
            // 如果生成的图片数量少于 placeholder，删除多余的 placeholder
            if (result.images.length < placeholderIds.length) {
              for (let i = result.images.length; i < placeholderIds.length; i++) {
                deleteElement(placeholderIds[i]);
              }
            }
          } else {
            // 如果只返回了一张图片，则只更新第一个 placeholder，删除其他的
            updateElement(placeholderIds[0], {
              src: result.imageUrl,
              promptId: result.promptId,
              mediaGenerationId: result.mediaGenerationId,
            } as Partial<ImageElement>);
            
            for (let i = 1; i < placeholderIds.length; i++) {
              deleteElement(placeholderIds[i]);
            }
          }
          
          addPromptHistory({
            promptId: result.promptId,
            promptText: prompt,
            imageId: placeholderIds[0],
            mode: 'generate',
            createdAt: Date.now(),
          });
        } catch (error: any) {
          // 生成失败，删除所有占位符
          placeholderIds.forEach(id => deleteElement(id));
          throw error;
        }
        
      } else if (selectedImages.length === 1) {
        // 模式2: 编辑单张图片（图生图）
        const selectedImage = selectedImages[0];
        const size = getSizeFromAspectRatio(aspectRatio);
        
        // 创建多个 placeholder 节点（根据 generationCount）
        const placeholderIds: string[] = [];
        const edgeIds: string[] = [];
        const horizontalSpacing = 20;
        const startX = selectedImage.position.x + (selectedImage.size?.width || 400) + 50;
        
        for (let i = 0; i < generationCount; i++) {
          const newImageId = `image-${Date.now()}-${i}`;
          placeholderIds.push(newImageId);
          
          const placeholderImage: ImageElement = {
            id: newImageId,
            type: 'image',
            src: '',
            position: {
              x: startX + i * (size.width + horizontalSpacing),
              y: selectedImage.position.y,
            },
            size: size,
            sourceImageIds: [selectedImage.id],
            generatedFrom: {
              type: 'image-to-image',
              sourceIds: [selectedImage.id],
              prompt: prompt,
            },
          };
          
          addElement(placeholderImage);
          
          // 创建连线
          const edgeId = `edge-${selectedImage.id}-${newImageId}`;
          edgeIds.push(edgeId);
          // @ts-ignore
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
        
        try {
          // 使用图生图 API（传入源图片 URL、选中的比例和数量）
          const result = await imageToImage(
            prompt,
            selectedImage.src,
            aspectRatio,
            '',
            selectedImage.mediaId || selectedImage.mediaGenerationId, // 优先使用 mediaId，Flow 图生图要求传这个 // 行级注释说明用途
            generationCount
          );
          
          // 如果返回了多张图片，则更新所有 placeholder
          if (result.images && result.images.length > 0) {
            result.images.forEach((img, index) => {
              if (index < placeholderIds.length) {
                updateElement(placeholderIds[index], {
                  src: img.imageUrl,
                  promptId: result.promptId,
                  mediaGenerationId: img.mediaGenerationId,
                } as Partial<ImageElement>);
              }
            });
            
            // 如果生成的图片数量少于 placeholder，删除多余的
            if (result.images.length < placeholderIds.length) {
              for (let i = result.images.length; i < placeholderIds.length; i++) {
                deleteElement(placeholderIds[i]);
                // @ts-ignore
                setEdges((eds: any) => eds.filter((edge: any) => edge.id !== edgeIds[i]));
              }
            }
          } else {
            // 如果只返回了一张图片，则只更新第一个 placeholder
            updateElement(placeholderIds[0], {
              src: result.imageUrl,
              promptId: result.promptId,
              mediaGenerationId: result.mediaGenerationId,
            } as Partial<ImageElement>);
            
            for (let i = 1; i < placeholderIds.length; i++) {
              deleteElement(placeholderIds[i]);
              // @ts-ignore
              setEdges((eds: any) => eds.filter((edge: any) => edge.id !== edgeIds[i]));
            }
          }
          
          // 停止所有连线动画
          // @ts-ignore
          setEdges((eds: any) => 
            eds.map((edge: any) => 
              edgeIds.includes(edge.id) 
                ? { ...edge, animated: false }
                : edge
            )
          );
          
          addPromptHistory({
            promptId: result.promptId,
            promptText: prompt,
            imageId: placeholderIds[0],
            mode: 'similar',
            createdAt: Date.now(),
          });
        } catch (error: any) {
          // 生成失败，删除所有占位符和连线
          placeholderIds.forEach(id => deleteElement(id));
          // @ts-ignore
          setEdges((eds: any) => eds.filter((edge: any) => !edgeIds.includes(edge.id)));
          throw error;
        }
        
      } else {
        // 模式3: 多图融合编辑（使用 runImageRecipe）
        const missingIds = selectedImages.filter(
          (img) => !img.mediaGenerationId || !img.mediaGenerationId.trim()
        );
        if (missingIds.length > 0) {
          throw new Error(
            '存在未同步到 Flow 的图片，无法进行多图编辑，请先为这些图片获取 mediaGenerationId'
          );
        }

        const references = selectedImages.map((img) => ({
          mediaGenerationId: img.mediaGenerationId as string,
          caption:
            img.caption ||
            img.generatedFrom?.prompt ||
            img.alt ||
            `Reference image ${img.id}`,
          mediaCategory: 'MEDIA_CATEGORY_SUBJECT',
        }));

        const baseImage = selectedImages[0];
        const size = getSizeFromAspectRatio(aspectRatio);
        
        // 创建多个 placeholder 节点（根据 generationCount）
        const placeholderIds: string[] = [];
        const allEdges: any[] = [];
        const horizontalSpacing = 20;
        const startX = baseImage.position.x + (baseImage.size?.width || 400) + 50;
        
        for (let i = 0; i < generationCount; i++) {
          const newImageId = `image-${Date.now()}-${i}`;
          placeholderIds.push(newImageId);
          
          const placeholderImage: ImageElement = {
            id: newImageId,
            type: 'image',
            src: '',
            position: {
              x: startX + i * (size.width + horizontalSpacing),
              y: baseImage.position.y,
            },
            size,
            sourceImageIds: selectedImages.map((img) => img.id),
            generatedFrom: {
              type: 'image-to-image',
              sourceIds: selectedImages.map((img) => img.id),
              prompt: prompt,
            },
          };

          addElement(placeholderImage);

          // 为每个 placeholder 创建从所有源图片到它的连线
          const edgesForThisPlaceholder = selectedImages.map((sourceImg) => ({
            id: `edge-${sourceImg.id}-${newImageId}`,
            source: sourceImg.id,
            target: newImageId,
            type: 'default',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 1 },
          }));

          allEdges.push(...edgesForThisPlaceholder);
        }

        // @ts-ignore
        setEdges((eds: any) => [...eds, ...allEdges]);

        try {
          const result = await runImageRecipe(
            prompt,
            references,
            aspectRatio,
            undefined,
            generationCount
          );

          // 如果返回了多张图片，则更新所有 placeholder
          if (result.images && result.images.length > 0) {
            result.images.forEach((img, index) => {
              if (index < placeholderIds.length) {
                updateElement(placeholderIds[index], {
                  src: img.imageUrl,
                  promptId: result.promptId,
                  mediaGenerationId: img.mediaGenerationId,
                } as Partial<ImageElement>);
              }
            });
            
            // 如果生成的图片数量少于 placeholder，删除多余的
            if (result.images.length < placeholderIds.length) {
              for (let i = result.images.length; i < placeholderIds.length; i++) {
                deleteElement(placeholderIds[i]);
                // 删除对应的连线
                const edgesToRemove = allEdges.filter(edge => edge.target === placeholderIds[i]);
                // @ts-ignore
                setEdges((eds: any) => eds.filter((edge: any) => !edgesToRemove.some(e => e.id === edge.id)));
              }
            }
          } else {
            // 如果只返回了一张图片，则只更新第一个 placeholder
            updateElement(placeholderIds[0], {
              src: result.imageUrl,
              promptId: result.promptId,
              mediaGenerationId: result.mediaGenerationId,
            } as Partial<ImageElement>);
            
            for (let i = 1; i < placeholderIds.length; i++) {
              deleteElement(placeholderIds[i]);
              const edgesToRemove = allEdges.filter(edge => edge.target === placeholderIds[i]);
              // @ts-ignore
              setEdges((eds: any) => eds.filter((edge: any) => !edgesToRemove.some(e => e.id === edge.id)));
            }
          }

          // 停止所有连线动画
          // @ts-ignore
          setEdges((eds: any) =>
            eds.map((edge: any) =>
              allEdges.some((e: any) => e.id === edge.id)
                ? { ...edge, animated: false }
                : edge
            )
          );

          addPromptHistory({
            promptId: result.promptId,
            promptText: prompt,
            imageId: placeholderIds[0],
            mode: 'batch',
            createdAt: Date.now(),
          });
        } catch (error) {
          // 生成失败，删除所有占位符和连线
          placeholderIds.forEach(id => deleteElement(id));
          // @ts-ignore
          setEdges((eds: any) =>
            eds.filter((edge: any) => !allEdges.some((e: any) => e.id === edge.id))
          );
          throw error;
        }
      }
      
      // 清空输入框
      setPrompt('');
      
    } catch (error: any) {
      console.error('生成失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // 文生视频处理
  const handleGenerateVideo = async () => {
    if (!prompt.trim() || isGeneratingVideo || isGenerating) return;

    setIsGeneratingVideo(true);

    try {
      // 检查是否配置了 API
      if (!apiConfig.bearerToken) {
        throw new Error('请先在设置中配置 Bearer Token');
      }
      if (!apiConfig.projectId) {
        throw new Error('请先在设置中配置 Project ID');
      }
      if (!apiConfig.sessionId) {
        throw new Error('请先在设置中配置 Session ID');
      }

      // 生成唯一的 sceneId
      const sceneId = crypto.randomUUID();

      console.log('🎬 开始生成视频:', {
        prompt: prompt.substring(0, 50),
        aspectRatio,
        sceneId,
      });

      // 调用 Flow 文生视频 API
      const result = await generateVideoWithFlow({
        prompt,
        aspectRatio,
        bearerToken: apiConfig.bearerToken,
        projectId: apiConfig.projectId,
        sessionId: apiConfig.sessionId,
        proxy: apiConfig.proxy,
        sceneId,
      });

      console.log('✅ 视频生成任务已提交:', result);

      // 创建视频占位符节点
      const position = getPositionAboveInput();
      const size = getSizeFromAspectRatio(aspectRatio);
      const videoId = `video-${Date.now()}`;

      // 添加视频节点
      addElement({
        id: videoId,
        type: 'video',
        src: '', // 空 src 表示正在生成
        status: 'generating', // VideoNode 期望的状态
        position,
        size,
        generatedFrom: {
          type: 'text-to-video',
          prompt,
        },
        // 存储视频生成信息用于轮询
        videoGenerationInfo: {
          operationName: result.operationName,
          sceneId: result.sceneId,
          status: result.status,
        },
      } as any);

      // 开始轮询视频生成状态
      pollVideoStatus(videoId, result.operationName);

      // 清空输入框
      setPrompt('');
    } catch (error: any) {
      console.error('❌ 视频生成失败:', error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // 轮询视频生成状态
  const pollVideoStatus = async (videoId: string, operationName: string) => {
    const maxAttempts = 60; // 最多轮询 60 次（5 分钟）
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;

        const statusResult = await checkVideoStatusWithFlow({
          operations: [{ operation: { name: operationName } }],
          bearerToken: apiConfig.bearerToken!,
          proxy: apiConfig.proxy,
        });

        const operation = statusResult.operations[0];
        const operationMetadata =
          operation?.metadata ?? operation?.operation?.metadata; // 兼容 metadata 位于不同层级
        const operationStatus = operation?.status; // 缓存状态字段便于复用
        console.log(`🔍 视频状态检查 (${attempts}/${maxAttempts}):`, operationStatus);
        console.log('📦 完整 operation 数据:', JSON.stringify(operation, null, 2));

        // 检查是否生成成功
        if (operationStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
          // 视频生成完成
          console.log('✅ 视频生成完成!');
          console.log('📦 operation.metadata:', operationMetadata);
          
          // 从 metadata.video 中提取视频信息
          const videoData =
            operation?.video ?? operationMetadata?.video; // 兼容文档与实际返回差异
          console.log('📦 videoData:', videoData);
          
          const videoUrl = videoData?.fifeUrl || '';
          const thumbnailUrl = videoData?.servingBaseUri || '';
          
          if (!videoUrl) {
            console.error('❌ Flow 返回缺少视频地址，无法播放', {
              operation,
            }); // 防止写入空地址
            updateElement(videoId, {
              status: 'error',
              videoGenerationInfo: {
                operationName,
                status: 'FAILED',
                error: 'Flow 返回缺少视频地址',
              },
            } as any);
            return;
          }
          
          console.log('🎬 视频 URL:', videoUrl);
          console.log('🖼️ 缩略图 URL:', thumbnailUrl);

          // 更新视频节点
          updateElement(videoId, {
            src: videoUrl,
            thumbnail: thumbnailUrl, // 视频封面
            status: 'ready', // VideoNode 期望的状态
            videoGenerationInfo: {
              operationName,
              status: 'COMPLETED',
              videoUrl,
              thumbnailUrl,
              mediaGenerationId: videoData?.mediaGenerationId,
            },
          } as any);

          return; // 停止轮询
        }

        // 检查是否失败
        if (operationStatus === 'MEDIA_GENERATION_STATUS_FAILED') {
          // 视频生成失败
          const errorMsg =
            operation?.error ||
            operationMetadata?.error ||
            '未知错误'; // 优先使用 Flow 返回的错误信息
          console.error('❌ 视频生成失败:', errorMsg);
          
          updateElement(videoId, {
            status: 'error', // VideoNode 期望的状态
            videoGenerationInfo: {
              operationName,
              status: 'FAILED',
              error: errorMsg,
            },
          } as any);

          return; // 停止轮询
        }

        // 仍在处理中（PENDING 或 ACTIVE）
        console.log('⏳ 视频仍在生成中...');
        
        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // 每 5 秒轮询一次
        } else {
          // 超时
          console.warn('⚠️ 视频生成超时');
        }
      } catch (error: any) {
        console.error('❌ 视频状态检查失败:', error);
        // 继续轮询（网络错误可能是暂时的）
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    // 开始轮询
    setTimeout(poll, 5000); // 5 秒后开始第一次轮询
  };

  // 按 Enter 提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // 点击外部关闭设置面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSettings &&
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // 显示已选中图片的缩略图
  const showSelectedThumbnails = selectedImages.length > 0;
  const hasProcessingSelection = selectedImages.some(
    (img) => img.uploadState === 'syncing' || !img.mediaGenerationId
  );

  return (
    <div ref={panelRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      {/* 图片设置下拉面板和操作按钮 */}
      <div className="flex items-center justify-center gap-3 mb-2 relative">
        {/* 图片设置按钮（带下拉） */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-white/30 hover:bg-white/40 backdrop-blur-md rounded-xl text-sm font-medium text-gray-700 transition-all shadow-sm border border-gray-200/50"
          >
            <Settings2 className="w-4 h-4" />
            图片设置
          </button>
          
          {/* 下拉设置面板 */}
          {showSettings && (
            <div className="absolute bottom-full left-0 mb-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 p-4 min-w-[280px]">
              {/* 比例选择器 */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-500 mb-2">比例</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === '16:9'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    横图
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === '9:16'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    竖图
                  </button>
                  <button
                    onClick={() => setAspectRatio('1:1')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === '1:1'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    方图
                  </button>
                </div>
              </div>
              
              {/* 生成数量选择器 */}
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">生成数量</div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setApiConfig({ generationCount: count })}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        generationCount === count
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={`生成 ${count} 张`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 生成图片按钮 */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="flex items-center gap-2 px-5 py-2 hover:bg-gray-200 disabled:bg-gray-300 text-gray-500 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isGenerating ? (
            <>
              生成中
            </>
          ) : (
            <>
              生成图片
            </>
          )}
        </button>
        
        {/* 生成视频按钮 */}
        <button
          onClick={handleGenerateVideo}
          disabled={!prompt.trim() || isGenerating || isGeneratingVideo}
          className="flex items-center gap-2 px-5 py-2 hover:bg-gray-200 disabled:bg-gray-300 text-gray-500 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-blue-500/50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isGeneratingVideo ? (
            <>
              生成中
            </>
          ) : (
            <>
              生成视频
            </>
          )}
        </button>
      </div>
      
      <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/30 p-4">
        {/* 选中图片的缩略图 */}
        {showSelectedThumbnails ? (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
            {selectedImages.slice(0, 5).map((img) => {
              const hasSrc = Boolean(img.src && img.src.trim());
              const isProcessing =
                img.uploadState === 'syncing' || !img.mediaGenerationId || !hasSrc;
              return (
                <div
                  key={img.id}
                  className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/60 shadow-[0_10px_25px_rgba(148,163,184,0.18)]"
                >
                  {isProcessing ? (
                    <div className="loading-glow w-full h-full rounded-lg" data-variant="compact" />
                  ) : (
                    <img
                      src={img.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              );
            })}
            {selectedImages.length > 5 && (
              <span className="text-sm text-gray-500">
                +{selectedImages.length - 5}
              </span>
            )}
          </div>
        ) : isGenerating || isGeneratingVideo || hasProcessingSelection ? (
          <div className="flex items-center justify-start gap-3 mb-3">
            <div className="loading-glow w-16 h-16 rounded-2xl" data-variant="compact" />
            <div className="loading-glow w-12 h-12 rounded-2xl opacity-85" data-variant="compact" />
            <div className="loading-glow w-10 h-10 rounded-xl opacity-65" data-variant="compact" />
          </div>
        ) : null}
        
        {/* 输入框 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={isGenerating}
              className="w-full px-4 py-3 border border-gray-300/30 rounded-2xl outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200/50 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed bg-white/40 backdrop-blur-sm"
            />
          </div>
        </div>
        
        {/* 提示文字 */}
        <div className="mt-2 text-xs text-gray-400 text-center">
          {selectedImages.length === 0 && '输入描述生成图片'}
          {selectedImages.length === 1 && '输入描述编辑选中的图片'}
          {selectedImages.length > 1 && `基于选中的 ${selectedImages.length} 张图片生成新内容`}
        </div>
      </div>
    </div>
  );
}

