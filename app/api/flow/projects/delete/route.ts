import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';

/**
 * 删除项目接口
 * POST /api/flow/projects/delete
 * 
 * 请求体:
 * - cookie: 用户的登录 Cookie
 * - projectId: 要删除的项目ID
 * - proxy: 代理配置 (可选)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookie, projectId, proxy } = body;

    // 验证必需参数
    if (!cookie) {
      return NextResponse.json(
        { error: '缺少 Cookie' },
        { status: 400 }
      );
    }

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json(
        { error: '缺少项目 ID' },
        { status: 400 }
      );
    }


    const payload = {
      json: {
        projectToDeleteId: projectId,
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
      'https://labs.google/fx/api/trpc/project.deleteProject',
      'POST',
      headers,
      proxy,
      payload
    );

    axiosConfig.timeout = 30000;

    const response = await axios(axiosConfig);


    const data = response.data;

    // 检查删除结果
    const result = data?.data?.json;
    const success = result?.status === 200 && result?.statusText === 'OK';

    return NextResponse.json({
      success,
      status: result?.status,
      statusText: result?.statusText,
      message: success ? '项目删除成功' : '项目删除失败',
    });
  } catch (error: any) {
    return handleApiError(error, 'Flow 删除项目');
  }
}

