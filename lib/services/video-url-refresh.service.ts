/**
 * 视频 URL 刷新服务
 * 
 * 用于刷新过期的视频 URL（fifeUrl 和 thumbnailUrl）
 * 通过 searchProjectWorkflows 接口批量获取最新 URL，
 * 然后用 mediaGenerationId 匹配画布中的视频节点
 */

import { VideoElement } from '@/lib/types';

// 行级注释：从 searchProjectWorkflows 返回的视频数据结构
interface WorkflowVideo {
  workflowId: string;
  mediaGenerationId: string | null;
  mediaId: string | null;
  videoData: {
    fifeUrl: string | null;
    thumbnailUrl: string | null;
  };
}

// 行级注释：刷新结果
interface RefreshResult {
  videoId: string;
  success: boolean;
  newSrc?: string;
  newThumbnail?: string;
  error?: string;
}

/**
 * 从 Flow API 获取项目下所有视频的最新 URL
 * 
 * @param projectId Flow 项目 ID
 * @param cookie 用户 Cookie
 * @param pageSize 每页数量
 * @returns 视频列表
 */
async function fetchProjectVideos(
  projectId: string,
  cookie: string,
  pageSize: number = 100
): Promise<WorkflowVideo[]> {
  const allVideos: WorkflowVideo[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  // 行级注释：分页获取所有视频
  while (hasMore) {
    const params = new URLSearchParams({
      cookie,
      projectId,
      mediaType: 'VIDEO',
      pageSize: String(pageSize),
    });

    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await fetch(`/api/flow/workflows/search?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `获取视频列表失败: ${response.status}`);
    }

    const data = await response.json();
    const workflows = data.workflows || [];

    // 行级注释：映射视频数据
    for (const workflow of workflows) {
      allVideos.push({
        workflowId: workflow.workflowId,
        mediaGenerationId: workflow.mediaGenerationId,
        mediaId: workflow.mediaId,
        videoData: {
          fifeUrl: workflow.videoData?.fifeUrl || null,
          thumbnailUrl: workflow.videoData?.thumbnailUrl || null,
        },
      });
    }

    // 行级注释：检查是否还有更多
    cursor = data.cursor;
    hasMore = Boolean(cursor) && workflows.length === pageSize;
  }

  return allVideos;
}

/**
 * 匹配视频节点和 Flow 返回的视频数据
 * 
 * @param videoNode 画布中的视频节点
 * @param flowVideos Flow 返回的视频列表
 * @returns 匹配的视频数据，或 null
 */
function matchVideoNode(
  videoNode: VideoElement,
  flowVideos: WorkflowVideo[]
): WorkflowVideo | null {
  const nodeMediaGenId = videoNode.mediaGenerationId;

  if (!nodeMediaGenId) {
    return null;
  }

  // 行级注释：用 mediaGenerationId 匹配
  // 注意：Flow 返回的 mediaGenerationId 可能是完整的 base64 字符串，也可能是 mediaKey
  for (const flowVideo of flowVideos) {
    if (!flowVideo.mediaGenerationId) continue;

    // 行级注释：完全匹配
    if (flowVideo.mediaGenerationId === nodeMediaGenId) {
      return flowVideo;
    }

    // 行级注释：部分匹配（mediaKey 在完整 ID 中）
    if (
      nodeMediaGenId.includes(flowVideo.mediaGenerationId) ||
      flowVideo.mediaGenerationId.includes(nodeMediaGenId)
    ) {
      return flowVideo;
    }
  }

  return null;
}

/**
 * 批量刷新视频 URL
 * 
 * @param videoNodes 需要刷新的视频节点列表
 * @param projectId Flow 项目 ID
 * @param cookie 用户 Cookie
 * @param onUpdate 每个视频更新后的回调
 * @param concurrency 并发数（默认 4）
 */
export async function refreshVideoUrls(
  videoNodes: VideoElement[],
  projectId: string,
  cookie: string,
  onUpdate: (videoId: string, updates: { src?: string; thumbnail?: string }) => void,
  concurrency: number = 4
): Promise<RefreshResult[]> {
  // 行级注释：过滤出有 mediaGenerationId 的视频节点
  const nodesToRefresh = videoNodes.filter(
    (node) => node.mediaGenerationId && node.status === 'ready'
  );

  if (nodesToRefresh.length === 0) {
    console.log('ℹ️ 没有需要刷新 URL 的视频节点');
    return [];
  }

  console.log(`🔄 开始刷新 ${nodesToRefresh.length} 个视频的 URL...`);

  // 行级注释：Step 1 - 获取项目下所有视频
  let flowVideos: WorkflowVideo[];
  try {
    flowVideos = await fetchProjectVideos(projectId, cookie);
    console.log(`✅ 获取到 ${flowVideos.length} 个 Flow 视频`);
  } catch (error: any) {
    console.error('❌ 获取视频列表失败:', error);
    return nodesToRefresh.map((node) => ({
      videoId: node.id,
      success: false,
      error: error.message,
    }));
  }

  // 行级注释：Step 2 - 匹配并更新视频节点（分批并发）
  const results: RefreshResult[] = [];

  // 行级注释：将节点分成多个批次，每批 concurrency 个
  for (let i = 0; i < nodesToRefresh.length; i += concurrency) {
    const batch = nodesToRefresh.slice(i, i + concurrency);

    // 行级注释：并发处理当前批次
    const batchResults = await Promise.all(
      batch.map(async (videoNode): Promise<RefreshResult> => {
        const matchedVideo = matchVideoNode(videoNode, flowVideos);

        if (!matchedVideo) {
          console.warn(`⚠️ 视频节点 ${videoNode.id} 未找到匹配的 Flow 视频`);
          return {
            videoId: videoNode.id,
            success: false,
            error: '未找到匹配的视频',
          };
        }

        const newSrc = matchedVideo.videoData.fifeUrl || undefined;
        const newThumbnail = matchedVideo.videoData.thumbnailUrl || undefined;

        // 行级注释：检查是否需要更新
        const needsUpdate =
          (newSrc && newSrc !== videoNode.src) ||
          (newThumbnail && newThumbnail !== videoNode.thumbnail);

        if (!needsUpdate) {
          return {
            videoId: videoNode.id,
            success: true,
            newSrc: videoNode.src,
            newThumbnail: videoNode.thumbnail,
          };
        }

        // 行级注释：调用更新回调，只更新 src 和 thumbnail
        const updates: { src?: string; thumbnail?: string } = {};
        if (newSrc) updates.src = newSrc;
        if (newThumbnail) updates.thumbnail = newThumbnail;

        onUpdate(videoNode.id, updates);

        console.log(`✅ 视频 ${videoNode.id} URL 已刷新`);

        return {
          videoId: videoNode.id,
          success: true,
          newSrc,
          newThumbnail,
        };
      })
    );

    results.push(...batchResults);

    // 行级注释：批次之间稍微延迟，避免请求过于密集
    if (i + concurrency < nodesToRefresh.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`✅ 视频 URL 刷新完成: ${successCount}/${results.length} 成功`);

  return results;
}

/**
 * 检查视频节点是否需要刷新 URL
 * （简单检查：有 mediaGenerationId 且状态为 ready）
 */
export function needsUrlRefresh(videoNode: VideoElement): boolean {
  return Boolean(
    videoNode.mediaGenerationId &&
    videoNode.status === 'ready' &&
    videoNode.src
  );
}

