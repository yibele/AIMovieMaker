import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

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

    // 校验 Cookie
    if (!cookie) {
      return NextResponse.json({ error: '缺少 Cookie' }, { status: 400 });
    }

    // 校验项目标题
    if (!projectTitle || typeof projectTitle !== 'string') {
      return NextResponse.json({ error: '缺少项目标题' }, { status: 400 });
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

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://labs.google/fx/api/trpc/project.createProject',
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
      data: payload,
      timeout: 30000,
      proxy: false,
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理调用 Flow 创建项目接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

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
    console.error('❌ Flow 创建项目错误:', error);

    if (error.response) {
      console.error('API 错误响应状态码:', error.response.status);
      console.error(
        'API 错误响应数据:',
        JSON.stringify(error.response.data, null, 2)
      );

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


