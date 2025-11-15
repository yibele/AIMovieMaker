import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

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

    console.log('🗑️ 调用 Flow 删除项目接口', {
      projectId,
      proxy: proxy ? '已配置' : '未配置',
    });

    const payload = {
      json: {
        projectToDeleteId: projectId,
      },
    };

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://labs.google/fx/api/trpc/project.deleteProject',
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
      console.log('📡 使用代理调用 Flow 删除项目接口', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 删除项目响应状态:', response.status);

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
    console.error('❌ Flow 删除项目错误:', error);

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

