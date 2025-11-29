import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';


/**
 * 搜索项目工作流接口（获取图片或视频内容）
 * GET /api/flow/workflows/search
 * 
 * 查询参数:
 * - cookie: 用户的登录 Cookie
 * - projectId: 项目 ID
 * - mediaType: 媒体类型 (IMAGE 或 VIDEO，默认 VIDEO)
 * - pageSize: 每页数量 (可选，默认 4)
 * - cursor: 分页游标 (可选，默认 null)
 * - fetchBookmarked: 是否获取收藏 (可选，默认 false)
 * - rawQuery: 搜索关键词 (可选，默认空字符串)
 * - proxy: 代理配置 (可选)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cookie = searchParams.get('cookie');
    const projectId = searchParams.get('projectId');
    const mediaType = searchParams.get('mediaType') || 'VIDEO';
    const pageSize = parseInt(searchParams.get('pageSize') || '4');
    const cursor = searchParams.get('cursor') || null;
    const fetchBookmarked = searchParams.get('fetchBookmarked') === 'true';
    const rawQuery = searchParams.get('rawQuery') || '';
    const proxy = searchParams.get('proxy');

    // 验证必需参数
    if (!cookie) {
      return NextResponse.json(
        { error: '缺少 Cookie' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少项目 ID' },
        { status: 400 }
      );
    }

    // 规范化媒体类型
    const normalizedMediaType =
      mediaType.toUpperCase() === 'IMAGE'
        ? 'MEDIA_TYPE_IMAGE'
        : 'MEDIA_TYPE_VIDEO';

    // 构建查询参数
    const queryParams = {
      json: {
        pageSize,
        projectId,
        toolName: 'PINHOLE',
        fetchBookmarked,
        rawQuery,
        mediaType: normalizedMediaType,
        cursor,
      },
      meta: {
        values: {
          cursor: ['undefined'],
        },
      },
    };

    const queryString = encodeURIComponent(JSON.stringify(queryParams));



    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Accept: '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Origin: 'https://labs.google',
      Referer: `https://labs.google/fx/tools/flow/project/${projectId}`,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const axiosConfig = createProxiedAxiosConfig(
      `https://labs.google/fx/api/trpc/project.searchProjectWorkflows?input=${queryString}`,
      'GET',
      headers,
      proxy || undefined
    );

    axiosConfig.timeout = 30000;

    const response = await axios(axiosConfig);


    const data = response.data;

    // 提取工作流数据
    const workflows = data?.result?.data?.json?.result?.workflows || [];

    // 根据媒体类型规范化数据
    const normalizedWorkflows = workflows.map((workflow: any) => {
      const workflowStep = workflow.workflowSteps?.[0];
      const mediaGeneration = workflowStep?.mediaGenerations?.[0];

      // 行级注释：解析 mediaGenerationId - 这对于视频延长功能至关重要
      // 结构通常是 { mediaType: 'VIDEO', projectId: '...', workflowId: '...', workflowStepId: '...', mediaKey: '...' }
      // 但有时也会包含嵌套的 mediaGenerationId 字符串
      let mediaGenerationId = null;

      // 1. 优先尝试从 generatedVideo/generatedImage 中获取（通常在 mediaData 中）
      if (normalizedMediaType === 'MEDIA_TYPE_VIDEO') {
        mediaGenerationId = mediaGeneration?.mediaData?.videoData?.generatedVideo?.mediaGenerationId;
      } else {
        // 图片通常没有 mediaGenerationId，或者位置不同
      }

      // 2. 如果上面没找到，尝试从 mediaGenerationId 对象中获取 mediaKey (对于某些操作可能足够)
      if (!mediaGenerationId) {
        mediaGenerationId = mediaGeneration?.mediaGenerationId?.mediaKey;
      }

      // 3. 再次尝试直接获取 mediaGenerationId 字符串（如果有的话）
      if (!mediaGenerationId && typeof mediaGeneration?.mediaGenerationId === 'string') {
        mediaGenerationId = mediaGeneration.mediaGenerationId;
      }

      // 4. 如果是对象且包含 mediaGenerationId 属性
      if (!mediaGenerationId && mediaGeneration?.mediaGenerationId?.mediaGenerationId) {
        mediaGenerationId = mediaGeneration.mediaGenerationId.mediaGenerationId;
      }

      // 5. 最后的回退：使用 mediaId 或 workflowId
      if (!mediaGenerationId) {
        mediaGenerationId = mediaGeneration?.mediaId || workflow.workflowId;
      }

      // 行级注释：调试日志 - 查看提取结果
      if (normalizedMediaType === 'MEDIA_TYPE_VIDEO') {
      
      }

      if (normalizedMediaType === 'MEDIA_TYPE_VIDEO') {
        // 视频数据格式
        return {
          workflowId: workflow.workflowId,
          title: mediaGeneration?.mediaExtraData?.mediaTitle,
          createTime: workflowStep?.workflowStepLog?.stepCreationTime,
          mediaType: 'VIDEO',
          mediaGenerationId,
          mediaId: mediaGeneration?.mediaId,
          videoData: {
            fifeUrl: mediaGeneration?.mediaData?.videoData?.fifeUri,
            thumbnailUrl: mediaGeneration?.mediaData?.videoData?.servingBaseUri,
            prompt: mediaGeneration?.mediaData?.videoData?.generatedVideo?.prompt,
            seed: mediaGeneration?.mediaData?.videoData?.generatedVideo?.seed,
            model: mediaGeneration?.mediaData?.videoData?.generatedVideo?.model,
            aspectRatio: mediaGeneration?.mediaData?.videoData?.generatedVideo?.aspectRatio,
          },
        };
      } else {
        // 图片数据格式
        return {
          workflowId: workflow.workflowId,
          title: mediaGeneration?.mediaData?.mediaTitle,
          createTime: workflowStep?.workflowStepLog?.stepCreationTime,
          mediaType: 'IMAGE',
          mediaGenerationId,
          mediaId: mediaGeneration?.mediaId,
          imageData: {
            fifeUrl: mediaGeneration?.mediaData?.imageData?.fifeUri,
            prompt: workflowStep?.workflowStepLog?.requestData?.promptInputs?.[0]?.textInput,
            seed: mediaGeneration?.mediaData?.imageData?.generatedImage?.seed,
            model: mediaGeneration?.mediaData?.imageData?.generatedImage?.modelNameType,
            aspectRatio: mediaGeneration?.mediaData?.imageData?.generatedImage?.aspectRatio,
          },
        };
      }
    });

    return NextResponse.json({
      workflows: normalizedWorkflows,
      cursor: data?.result?.data?.json?.result?.cursor,
      mediaType: normalizedMediaType,
    });
  } catch (error: any) {
    return handleApiError(error, 'Flow 搜索工作流');
  }
}

