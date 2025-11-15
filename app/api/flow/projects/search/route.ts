import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

/**
 * 搜索用户项目列表接口
 * GET /api/flow/projects/search
 * 
 * 查询参数:
 * - cookie: 用户的登录 Cookie
 * - pageSize: 每页数量 (可选，默认 20)
 * - cursor: 分页游标 (可选，默认 null)
 * - proxy: 代理配置 (可选)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cookie = searchParams.get('cookie');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const cursor = searchParams.get('cursor') || null;
    const proxy = searchParams.get('proxy');

    // 验证必需参数
    if (!cookie) {
      return NextResponse.json(
        { error: '缺少 Cookie' },
        { status: 400 }
      );
    }

    // 构建查询参数
    const queryParams: any = {
      json: {
        pageSize,
        toolName: 'PINHOLE',
      },
    };

    // 只有当 cursor 存在时才添加到请求中
    if (cursor) {
      queryParams.json.cursor = cursor;
    }

    const queryString = encodeURIComponent(JSON.stringify(queryParams));

    console.log('🔍 调用 Flow 搜索项目接口', {
      pageSize,
      cursor: cursor || '无',
      proxy: proxy ? '已配置' : '未配置',
    });

    const axiosConfig: any = {
      method: 'GET',
      url: `https://labs.google/fx/api/trpc/project.searchUserProjects?input=${queryString}`,
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Accept: '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/fx/tools/flow',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
      proxy: false,
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy || undefined);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理调用 Flow 搜索项目接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 搜索项目响应状态:', response.status);

    const data = response.data;

    // 提取项目列表数据
    const projects = data?.result?.data?.json?.result?.projects || [];

    // 规范化项目数据
    const normalizedProjects = projects.map((project: any) => ({
      projectId: project.projectId,
      projectTitle: project.projectInfo?.projectTitle,
      thumbnailMediaKey: project.projectInfo?.thumbnailMediaKey,
      creationTime: project.creationTime,
      sceneCount: project.scenes ? project.scenes.length : 0,
      scenes: project.scenes || [],
    }));

    return NextResponse.json({
      projects: normalizedProjects,
      cursor: data?.result?.data?.json?.result?.cursor,
    });
  } catch (error: any) {
    console.error('❌ Flow 搜索项目错误:', error);

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

