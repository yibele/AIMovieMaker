import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

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

    console.log('🔍 调用 Flow 搜索工作流接口', {
      projectId,
      mediaType: normalizedMediaType,
      pageSize,
      cursor: cursor || '无',
      proxy: proxy ? '已配置' : '未配置',
    });

    const axiosConfig: any = {
      method: 'GET',
      url: `https://labs.google/fx/api/trpc/project.searchProjectWorkflows?input=${queryString}`,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Origin: 'https://labs.google',
        Referer: `https://labs.google/fx/tools/flow/project/${projectId}`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
      proxy: false,
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理调用 Flow 搜索工作流接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 搜索工作流响应状态:', response.status);

    const data = response.data;

    // 提取工作流数据
    const workflows = data?.result?.data?.json?.result?.workflows || [];

    // 根据媒体类型规范化数据
    const normalizedWorkflows = workflows.map((workflow: any) => {
      const workflowStep = workflow.workflowSteps?.[0];
      const mediaGeneration = workflowStep?.mediaGenerations?.[0];

      if (normalizedMediaType === 'MEDIA_TYPE_VIDEO') {
        // 视频数据格式
        return {
          workflowId: workflow.workflowId,
          title: mediaGeneration?.mediaExtraData?.mediaTitle,
          createTime: workflowStep?.workflowStepLog?.stepCreationTime,
          mediaType: 'VIDEO',
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
    console.error('❌ Flow 搜索工作流错误:', error);

    if (error.response) {
      console.error('API 错误响应状态码:', error.response.status);
      console.error('API 错误响应数据:', JSON.stringify(error.response.data, null, 2));

      return NextResponse.json(error.response.data, {
        status: error.response.status,
      });
    }

    return NextResponse.json(
      {
        error: error.message || '服务器错误',
        details: error.code || error.cause?.message,
      },
      { status: 500 }
    );
  }
}

