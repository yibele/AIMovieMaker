'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useCanvasStore } from '@/lib/store';
import { VideoElement, ImageElement, VideoModelType } from '@/lib/types';
import { VIDEO_NODE_DEFAULT_SIZE, detectAspectRatio } from '@/lib/constants/node-sizes';
import { analyzeImageForVideoPrompt } from '@/lib/tools/vision-api';
import { generateVideoFromText, generateVideoFromImages, generateVideoFromReferenceImages } from '@/lib/api-mock';
import { generateNodeId } from '@/lib/services/node-management.service';
import { generateHailuoVideo } from '@/lib/services/hailuo-video.service';
import { generateSora2Video } from '@/lib/services/sora2-video.service';

// 行级注释：边缘样式常量
const EDGE_GENERATING_STYLE = { stroke: '#a855f7', strokeWidth: 1 };
const EDGE_ERROR_STYLE = { stroke: '#ef4444', strokeWidth: 1 };
const EDGE_DEFAULT_STYLE = { stroke: '#64748b', strokeWidth: 1 };

/**
 * 视频生成 Hook
 * 
 * 职责：处理所有视频生成相关的逻辑
 * - 文生视频
 * - 图生视频
 * - 首尾帧视频
 * - 视频延长
 * - 镜头控制重拍
 */
export interface UseVideoGenerationOptions {
  setEdges: (updater: (edges: any[]) => any[]) => void;
}

export interface UseVideoGenerationReturn {
  maybeStartVideo: (videoId: string) => Promise<void>;
  activeGenerationRef: React.MutableRefObject<Set<string>>;
}

export function useVideoGeneration(options: UseVideoGenerationOptions): UseVideoGenerationReturn {
  const { setEdges } = options;
  
  const updateElement = useCanvasStore(state => state.updateElement);
  const addElement = useCanvasStore(state => state.addElement);
  
  // 行级注释：追踪正在生成的视频，避免重复生成
  const activeGenerationRef = useRef<Set<string>>(new Set());

  /**
   * 核心视频生成函数
   * 检查视频节点状态，执行生成逻辑
   */
  const maybeStartVideo = useCallback(
    async (videoId: string) => {
      // 行级注释：防止重复生成
      if (activeGenerationRef.current.has(videoId)) {
        return;
      }

      const { elements: storeElements } = useCanvasStore.getState();
      const videoElement = storeElements.find((el) => el.id === videoId) as VideoElement | undefined;

      if (!videoElement) return;

      // 行级注释：只处理排队中的视频
      if (videoElement.status !== 'queued') {
        return;
      }

      let promptText = videoElement.promptText?.trim();
      const startImageId = videoElement.startImageId;
      const endImageId = videoElement.endImageId;
      const generationCount = videoElement.generationCount || 1;

      const hasAtLeastOneImage = Boolean(startImageId || endImageId);
      
      // 行级注释：智能视频生成 - 如果有图片但没有提示词，使用 VL 分析
      if (hasAtLeastOneImage && !promptText) {
        const { apiConfig } = useCanvasStore.getState();
        const dashScopeApiKey = apiConfig.dashScopeApiKey;
        
        if (!dashScopeApiKey) {
          console.warn('⚠️ 没有配置 DashScope API Key，无法使用智能分析');
          updateElement(videoId, {
            status: 'pending',
            readyForGeneration: false,
          } as Partial<VideoElement>);
          return;
        }

        // 行级注释：获取图片信息
        const startImage = startImageId 
          ? storeElements.find(el => el.id === startImageId) as ImageElement | undefined
          : null;
        const endImage = endImageId 
          ? storeElements.find(el => el.id === endImageId) as ImageElement | undefined
          : null;
        
        const actualStartImage = startImage || endImage;
        if (!actualStartImage?.src) {
          console.warn('⚠️ 找不到有效的图片源');
          updateElement(videoId, {
            status: 'pending',
            readyForGeneration: false,
          } as Partial<VideoElement>);
          return;
        }

        try {
          updateElement(videoId, {
            status: 'generating',
            progress: 5,
          } as Partial<VideoElement>);

          
          // 行级注释：准备图片数据
          let startImageData = actualStartImage.src;
          if (actualStartImage.base64) {
            startImageData = actualStartImage.base64.startsWith('data:') 
              ? actualStartImage.base64 
              : `data:image/png;base64,${actualStartImage.base64}`;
          }
          
          let endImageData: string | null = null;
          if (startImage && endImage && endImage.id !== startImage.id) {
            if (endImage.base64) {
              endImageData = endImage.base64.startsWith('data:') 
                ? endImage.base64 
                : `data:image/png;base64,${endImage.base64}`;
            } else if (endImage.src) {
              endImageData = endImage.src;
            }
          }

          promptText = await analyzeImageForVideoPrompt(startImageData, endImageData, dashScopeApiKey);
          
          updateElement(videoId, {
            promptText: promptText,
            progress: 15,
          } as Partial<VideoElement>);
        } catch (error: any) {
          console.error('❌ VL 分析失败:', error);
          // 行级注释：显示错误提示给用户
          toast.error(error?.message || 'VL 分析失败，请重试');
          updateElement(videoId, {
            status: 'error',
            readyForGeneration: false,
          } as Partial<VideoElement>);
          return;
        }
      }
      
      // 行级注释：检查是否准备好生成
      const ready = Boolean(promptText);

      if (!ready) {
        updateElement(videoId, {
          status: 'pending',
          readyForGeneration: ready,
        } as Partial<VideoElement>);
        return;
      }


      // 行级注释：如果需要生成多个视频，创建额外的节点
      if (generationCount > 1) {
        const basePosition = videoElement.position;
        const size = videoElement.size || VIDEO_NODE_DEFAULT_SIZE;
        const spacing = 50;

        for (let i = 1; i < generationCount; i++) {
          const newVideoId = `video-${Date.now()}-${i}`;
          const newPosition = {
            x: basePosition.x + (size.width + spacing) * i,
            y: basePosition.y,
          };

          const newVideo: VideoElement = {
            id: newVideoId,
            type: 'video',
            src: '',
            thumbnail: '',
            duration: 0,
            status: 'queued',
            progress: 0,
            position: newPosition,
            size: size,
            promptText: promptText,
            startImageId: startImageId,
            endImageId: endImageId,
            referenceImageIds: videoElement.referenceImageIds, // 行级注释：复制多图参考视频的参考图片 ID
            videoModel: videoElement.videoModel || 'veo3.1', // 行级注释：复制视频模型
            sora2Duration: videoElement.sora2Duration || 10, // 行级注释：复制 Sora2 时长
            generationCount: 1,
            generatedFrom: videoElement.generatedFrom,
          };

          addElement(newVideo);

          // 行级注释：创建连线
          if (videoElement.generatedFrom?.type === 'extend' || videoElement.generatedFrom?.type === 'reshoot') {
            const sourceVideoId = videoElement.generatedFrom.sourceIds[0];
            if (sourceVideoId) {
              setEdges((eds: any[]) => [
                ...eds,
                {
                  id: `edge-${sourceVideoId}-${newVideoId}`,
                  source: sourceVideoId,
                  target: newVideoId,
                  type: 'default',
                  animated: true,
                  style: EDGE_GENERATING_STYLE,
                  label: videoElement.generatedFrom?.type === 'extend' ? '延长' : '镜头控制',
                },
              ]);
            }
          } else if (videoElement.generatedFrom?.type === 'reference-images') {
            // 行级注释：多图参考视频 - 为每个参考图片创建连线
            const referenceIds = videoElement.referenceImageIds || [];
            const handleIds = ['ref-image-1', 'ref-image-2', 'ref-image-3'];
            const newEdges = referenceIds
              .filter((refId): refId is string => Boolean(refId))
              .map((refId, index) => ({
                id: `edge-${refId}-${newVideoId}-ref-${index + 1}`,
                source: refId,
                target: newVideoId,
                targetHandle: handleIds[index],
                type: 'default',
                animated: true,
                style: EDGE_GENERATING_STYLE,
              }));
            if (newEdges.length > 0) {
              setEdges((eds: any[]) => [...eds, ...newEdges]);
            }
          } else if (startImageId) {
            setEdges((eds: any[]) => [
              ...eds,
              {
                id: `edge-${startImageId}-${newVideoId}`,
                source: startImageId,
                target: newVideoId,
                type: 'default',
                animated: true,
                style: EDGE_GENERATING_STYLE,
              },
            ]);
          }

          // 行级注释：延迟触发生成
          setTimeout(() => {
            maybeStartVideo(newVideoId);
          }, i * 500);
        }
      }

      // 行级注释：标记正在生成
      activeGenerationRef.current.add(videoId);

      updateElement(videoId, {
        status: 'generating',
        progress: 20,
        src: '',
        thumbnail: '',
      } as Partial<VideoElement>);

      // 行级注释：更新边缘动画
      setEdges((eds: any[]) =>
        eds.map((edge: any) =>
          edge.target === videoId
            ? { ...edge, animated: true, style: EDGE_GENERATING_STYLE }
            : edge
        )
      );

      try {
        let result;
        let generationType: 'text-to-video' | 'image-to-image' | 'extend' | 'reshoot' | 'reference-images' = 'text-to-video';
        const combinedSourceIds = new Set<string>(videoElement.generatedFrom?.sourceIds ?? []);
        
        // 行级注释：获取视频模型
        const videoModel: VideoModelType = videoElement.videoModel || 'veo3.1';
        const isHailuoModel = videoModel.startsWith('hailuo');
        const isSora2Model = videoModel === 'sora2';

        // 行级注释：检查 API Key 是否已配置
        const { apiConfig } = useCanvasStore.getState();
        
        if (isHailuoModel && !apiConfig.hailuoApiKey?.trim()) {
          toast.error('请先在设置中配置海螺 API Key');
          updateElement(videoId, { status: 'pending' } as Partial<VideoElement>);
          return;
        }
        
        if (isSora2Model && !apiConfig.sora2ApiKey?.trim()) {
          toast.error('请先在设置中配置 Sora2 API Key');
          updateElement(videoId, { status: 'pending' } as Partial<VideoElement>);
          return;
        }

        // 行级注释：判断视频类型并调用对应 API
        if (videoElement.generatedFrom?.type === 'extend') {
          // 行级注释：延长视频
          const sourceVideoId = videoElement.generatedFrom.sourceIds[0];
          if (!sourceVideoId) {
            throw new Error('缺少源视频节点ID');
          }

          const sourceVideo = storeElements.find(el => el.id === sourceVideoId) as VideoElement | undefined;
          if (!sourceVideo || !sourceVideo.mediaGenerationId) {
            throw new Error('源视频缺少 mediaGenerationId');
          }

          const aspectRatio = detectAspectRatio(
            videoElement.size?.width || 640,
            videoElement.size?.height || 360
          );

          const { generateVideoExtend } = await import('@/lib/api-mock');
          result = await generateVideoExtend(
            sourceVideo.mediaGenerationId,
            promptText || '',
            aspectRatio as any
          );
          generationType = 'extend';
        } else if (videoElement.generatedFrom?.type === 'reshoot') {
          console.warn('⚠️ Reshoot 视频不应该通过 maybeStartVideo 生成');
          return;
        } else if (videoElement.generatedFrom?.type === 'reference-images') {
          // 行级注释：多图参考视频生成
          const referenceImageIds = videoElement.referenceImageIds || [];
          
          if (referenceImageIds.length === 0) {
            throw new Error('多图参考视频需要至少 1 张参考图片');
          }
          
          // 行级注释：Sora2 多图参考视频 - 使用图片 URL
          if (isSora2Model) {
            const sora2Duration = videoElement.sora2Duration || 10;
            console.log('🎬 Sora2 多图参考视频, 时长:', sora2Duration, '秒, 参考图:', referenceImageIds.length, '张');
            
            // 行级注释：获取宽高比
            const aspectRatio = videoElement.size?.width && videoElement.size?.height
              ? detectAspectRatio(videoElement.size.width, videoElement.size.height) as '16:9' | '9:16' | '1:1'
              : '16:9';
            
            // 行级注释：获取所有参考图片的 URL
            const imageUrls: string[] = [];
            for (const refId of referenceImageIds) {
              if (!refId) continue;
              const imageElement = storeElements.find(el => el.id === refId) as ImageElement | undefined;
              if (imageElement?.src && (imageElement.src.startsWith('http') || imageElement.src.startsWith('https'))) {
                imageUrls.push(imageElement.src);
                combinedSourceIds.add(refId);
              }
            }
            
            if (imageUrls.length === 0) {
              throw new Error('Sora2 多图参考需要有效的图片 URL（http/https）');
            }
            
            console.log('📷 Sora2 多图参考模式，图片数量:', imageUrls.length);
            
            // 行级注释：调用 Sora2 视频服务
            const sora2Result = await generateSora2Video(
              {
                prompt: promptText || '',
                duration: sora2Duration,
                aspectRatio,
                imageUrls,
              },
              (stage, progress) => {
                updateElement(videoId, { progress } as Partial<VideoElement>);
              }
            );
            
            result = {
              videoUrl: sora2Result.videoUrl,
              thumbnail: sora2Result.thumbnailUrl || sora2Result.videoUrl,
              duration: sora2Result.duration,
              mediaGenerationId: sora2Result.taskId,
            };
            
            generationType = 'reference-images';
          } else {
            // 行级注释：Flow API 多图参考视频
            // 行级注释：获取参考图片的 mediaId
            const referenceImages: Array<{ mediaId?: string; mediaGenerationId?: string }> = [];
            
            for (const refId of referenceImageIds) {
              if (!refId) continue;
              const imageElement = storeElements.find(el => el.id === refId) as ImageElement | undefined;
              if (imageElement) {
                referenceImages.push({
                  mediaId: imageElement.mediaId,
                  mediaGenerationId: imageElement.mediaGenerationId,
                });
              }
            }
            
            if (referenceImages.length === 0) {
              throw new Error('参考图片缺少 mediaId，请确保图片已同步');
            }
            
            result = await generateVideoFromReferenceImages(
              promptText || '',
              referenceImages
            );
            
            // 行级注释：更新 sourceIds
            referenceImageIds.forEach(id => id && combinedSourceIds.add(id));
            generationType = 'reference-images';
          }
        } else if (isSora2Model) {
          // 行级注释：Sora2 模型视频生成（支持文生视频和图生视频）
          const sora2Duration = videoElement.sora2Duration || 10;
          console.log('🎬 使用 Sora2 模型生成视频, 时长:', sora2Duration, '秒');
          
          // 行级注释：获取宽高比
          const aspectRatio = videoElement.size?.width && videoElement.size?.height
            ? detectAspectRatio(videoElement.size.width, videoElement.size.height) as '16:9' | '9:16' | '1:1'
            : '16:9';
          
          // 行级注释：获取首帧图片 URL（Sora2 图生视频模式）
          let imageUrls: string[] | undefined;
          
          if (startImageId) {
            const startImage = storeElements.find(el => el.id === startImageId) as ImageElement | undefined;
            if (startImage?.src && (startImage.src.startsWith('http') || startImage.src.startsWith('https'))) {
              imageUrls = [startImage.src];
              combinedSourceIds.add(startImageId);
              console.log('📷 Sora2 图生视频模式，首帧图片:', startImage.src.substring(0, 50) + '...');
            }
          }
          
          // 行级注释：如果没有首帧但有尾帧连接，把尾帧当首帧用
          if (!imageUrls && endImageId) {
            const endImage = storeElements.find(el => el.id === endImageId) as ImageElement | undefined;
            if (endImage?.src && (endImage.src.startsWith('http') || endImage.src.startsWith('https'))) {
              imageUrls = [endImage.src];
              combinedSourceIds.add(endImageId);
              console.log('📷 Sora2 使用尾帧作为首帧:', endImage.src.substring(0, 50) + '...');
            }
          }
          
          // 行级注释：调用 Sora2 视频服务
          const sora2Result = await generateSora2Video(
            {
              prompt: promptText || '',
              duration: sora2Duration,
              aspectRatio,
              imageUrls,
            },
            (stage, progress) => {
              // 行级注释：更新进度
              updateElement(videoId, { progress } as Partial<VideoElement>);
            }
          );
          
          result = {
            videoUrl: sora2Result.videoUrl,
            thumbnail: sora2Result.thumbnailUrl || sora2Result.videoUrl,
            duration: sora2Result.duration,
            mediaGenerationId: sora2Result.taskId, // 使用 taskId 作为标识
          };
          
          generationType = imageUrls ? 'image-to-image' : 'text-to-video';
          
        } else if (isHailuoModel) {
          // 行级注释：海螺模型视频生成
          console.log('🎬 使用海螺模型生成视频:', videoModel);
          
          // 行级注释：获取首帧和尾帧图片
          let firstFrameImage: string | undefined;
          let lastFrameImage: string | undefined;
          
          // 行级注释：辅助函数 - 从图片元素获取可用的图片数据
          const getImageData = (image: ImageElement): string | undefined => {
            // 行级注释：优先使用 base64
            if (image.base64) {
              return image.base64.startsWith('data:') 
                ? image.base64 
                : `data:image/png;base64,${image.base64}`;
            }
            // 行级注释：其次使用 src（支持 http/https URL 和 data: URL）
            if (image.src) {
              if (image.src.startsWith('http') || image.src.startsWith('data:')) {
                return image.src;
              }
            }
            return undefined;
          };
          
          // 行级注释：获取首帧图片
          if (startImageId) {
            const startImage = storeElements.find(el => el.id === startImageId) as ImageElement | undefined;
            if (startImage) {
              firstFrameImage = getImageData(startImage);
              if (firstFrameImage) {
                combinedSourceIds.add(startImageId);
                console.log('✅ 海螺首帧图片已获取:', firstFrameImage.substring(0, 50) + '...');
              }
            }
          }
          
          // 行级注释：获取尾帧图片（仅 hailuo-2.0 支持首尾帧）
          if (endImageId && videoModel === 'hailuo-2.0') {
            const endImage = storeElements.find(el => el.id === endImageId) as ImageElement | undefined;
            if (endImage) {
              lastFrameImage = getImageData(endImage);
              if (lastFrameImage) {
                combinedSourceIds.add(endImageId);
                console.log('✅ 海螺尾帧图片已获取:', lastFrameImage.substring(0, 50) + '...');
              }
            }
          }
          
          // 行级注释：如果没有首帧但有尾帧连接，把尾帧当首帧用
          if (!firstFrameImage && endImageId) {
            const endImage = storeElements.find(el => el.id === endImageId) as ImageElement | undefined;
            if (endImage) {
              firstFrameImage = getImageData(endImage);
              if (firstFrameImage) {
                combinedSourceIds.add(endImageId);
                console.log('✅ 使用尾帧作为首帧:', firstFrameImage.substring(0, 50) + '...');
              }
            }
          }
          
          console.log('🎬 海螺视频参数:', {
            hasFirstFrame: Boolean(firstFrameImage),
            hasLastFrame: Boolean(lastFrameImage),
            prompt: promptText?.substring(0, 30) + '...',
          });
          
          // 行级注释：调用海螺视频服务
          const hailuoResult = await generateHailuoVideo(
            {
              prompt: promptText || '',
              model: videoModel,
              firstFrameImage,
              lastFrameImage,
              duration: 6,
            },
            (stage, progress) => {
              // 行级注释：更新进度
              updateElement(videoId, { progress } as Partial<VideoElement>);
            }
          );
          
          result = {
            videoUrl: hailuoResult.videoUrl,
            thumbnail: hailuoResult.thumbnailUrl || hailuoResult.videoUrl, // 海螺没有缩略图，用视频 URL
            duration: hailuoResult.duration,
            mediaGenerationId: hailuoResult.taskId, // 使用 taskId 作为标识
          };
          
          generationType = hasAtLeastOneImage ? 'image-to-image' : 'text-to-video';
          
        } else if (hasAtLeastOneImage) {
          // 行级注释：Flow 图生视频 - 使用首尾帧
          const actualStartId = startImageId || endImageId!;
          const actualEndId = startImageId && endImageId ? endImageId : undefined;

          result = await generateVideoFromImages(actualStartId, actualEndId, promptText);

          if (startImageId) combinedSourceIds.add(startImageId);
          if (endImageId) combinedSourceIds.add(endImageId);
          generationType = 'image-to-image';
        } else {
          // 行级注释：Flow 纯文本生成视频
          const aspectRatio = videoElement.size?.width && videoElement.size?.height
            ? detectAspectRatio(videoElement.size.width, videoElement.size.height)
            : '9:16';

          result = await generateVideoFromText(promptText || '', aspectRatio as '16:9' | '9:16' | '1:1');
          generationType = 'text-to-video';
        }

        // 行级注释：更新成功状态
        updateElement(videoId, {
          status: 'ready',
          src: result.videoUrl,
          thumbnail: result.thumbnail,
          duration: result.duration,
          mediaGenerationId: result.mediaGenerationId,
          progress: 100,
          readyForGeneration: true,
          generatedFrom: {
            type: generationType,
            sourceIds: Array.from(combinedSourceIds),
            prompt: promptText,
          },
        } as Partial<VideoElement>);

        // 行级注释：移除边缘动画
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.target === videoId
              ? { ...edge, animated: false, style: EDGE_DEFAULT_STYLE }
              : edge
          )
        );
      } catch (error: any) {
        console.error('❌ 视频生成失败:', error);
        // 行级注释：显示错误提示给用户
        toast.error(error?.message || '视频生成失败，请重试');
        updateElement(videoId, {
          status: 'error',
          readyForGeneration: true,
        } as Partial<VideoElement>);

        // 行级注释：错误边缘样式
        setEdges((eds: any[]) =>
          eds.map((edge: any) =>
            edge.target === videoId
              ? { ...edge, animated: false, style: EDGE_ERROR_STYLE }
              : edge
          )
        );
      } finally {
        activeGenerationRef.current.delete(videoId);
      }
    },
    [setEdges, updateElement, addElement]
  );

  return {
    maybeStartVideo,
    activeGenerationRef,
  };
}

