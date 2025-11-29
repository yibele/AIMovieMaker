import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';


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


    const headers = {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Accept: '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Origin: 'https://labs.google',
      Referer: 'https://labs.google/fx/tools/flow',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const axiosConfig = createProxiedAxiosConfig(
      `https://labs.google/fx/api/trpc/project.searchUserProjects?input=${queryString}`,
      'GET',
      headers,
      proxy || undefined
    );

    axiosConfig.timeout = 30000;

    const response = await axios(axiosConfig);


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
    return handleApiError(error, 'Flow 搜索项目');
  }
}

