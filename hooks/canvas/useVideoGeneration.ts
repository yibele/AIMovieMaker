'use client';

import { useCallback, useRef } from 'react';
import { useCanvasStore } from '@/lib/store';
import { VideoElement, ImageElement } from '@/lib/types';
import { VIDEO_NODE_DEFAULT_SIZE, detectAspectRatio } from '@/lib/constants/node-sizes';
import { analyzeImageForVideoPrompt } from '@/lib/tools/vision-api';
import { generateVideoFromText, generateVideoFromImages, generateVideoFromReferenceImages } from '@/lib/api-mock';
import { generateNodeId } from '@/lib/services/node-management.service';

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
        } catch (error) {
          console.error('❌ VL 分析失败:', error);
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
          generationType = 'reference-images'; // 行级注释：多图参考视频类型
        } else if (hasAtLeastOneImage) {
          // 行级注释：图生视频 - 使用首尾帧
          const actualStartId = startImageId || endImageId!;
          const actualEndId = startImageId && endImageId ? endImageId : undefined;

          result = await generateVideoFromImages(actualStartId, actualEndId, promptText);

          if (startImageId) combinedSourceIds.add(startImageId);
          if (endImageId) combinedSourceIds.add(endImageId);
          generationType = 'image-to-image';
        } else {
          // 行级注释：纯文本生成视频
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
      } catch (error) {
        console.error('❌ 视频生成失败:', error);
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

