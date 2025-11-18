import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';

/**
 * 创建项目接口
 * POST /api/flow/projects/create
 *
 * 请求体:
 * - cookie: 用户的登录 Cookie
 * - projectTitle: 新建项目标题
 * - proxy: 代理配置 (可选)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookie, projectTitle, proxy } = body;

    // 验证必需参数
    const validation = validateRequiredParams(
      { cookie, projectTitle },
      ['cookie', 'projectTitle']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    console.log('🆕 调用 Flow 创建项目接口', {
      projectTitle,
      proxy: proxy ? '已配置' : '未配置',
    });

    const payload = {
      json: {
        projectTitle,
        toolName: 'PINHOLE',
      },
    };

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
      'https://labs.google/fx/api/trpc/project.createProject',
      'POST',
      headers,
      proxy,
      payload
    );

    axiosConfig.timeout = 30000;

    const response = await axios(axiosConfig);

    console.log('📥 Flow 创建项目响应状态:', response.status);

    const result = response.data?.result?.data?.json?.result;

    const normalizedProject = result
      ? {
          projectId: result.projectId,
          projectTitle: result.projectInfo?.projectTitle,
          thumbnailMediaKey: result.projectInfo?.thumbnailMediaKey,
          creationTime: result.creationTime ?? new Date().toISOString(),
        }
      : null;

    return NextResponse.json({
      success: Boolean(normalizedProject?.projectId),
      project: normalizedProject,
    });
  } catch (error: any) {
    return handleApiError(error, 'Flow 创建项目');
  }
}


