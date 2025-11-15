import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// Google Flow API 媒体查询接口
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // 获取查询参数
    const key = searchParams.get('key');
    const clientContext = searchParams.get('clientContext') || 'PINHOLE';
    const returnUriOnly = searchParams.get('returnUriOnly') || 'true';
    const proxy = searchParams.get('proxy');

    if (!key) {
      return NextResponse.json(
        { error: 'Missing required parameter: key' },
        { status: 400 }
      );
    }

    // 构建 Google API URL
    const apiUrl = `https://aisandbox-pa.googleapis.com/v1/media/${encodeURIComponent(mediaId)}?key=${encodeURIComponent(key)}&clientContext.tool=${encodeURIComponent(clientContext)}&returnUriOnly=${returnUriOnly}`;

    // 准备请求头
    const headers: Record<string, string> = {
      'Accept': '*/*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Origin': 'https://labs.google',
      'Referer': 'https://labs.google/',
      'Sec-Ch-Ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
    };

    // 获取 Authorization Bearer Token
    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    }

    // 获取其他可能的自定义头部
    const customHeaders = ['x-browser-channel', 'x-browser-copyright', 'x-browser-validation', 'x-browser-year', 'x-client-data'];
    customHeaders.forEach(headerName => {
      const value = request.headers.get(headerName);
      if (value) {
        headers[headerName] = value;
      }
    });

    // 配置 axios 请求
    const axiosConfig: any = {
      method: 'GET',
      url: apiUrl,
      headers,
      timeout: 30000, // 30秒超时
      proxy: false, // 禁用 axios 自动代理检测
    };

    // 配置代理（如果提供）
    const { agent, proxyUrl: resolvedProxyUrl, proxyType } = resolveProxyAgent(proxy);
    
    if (agent) {
      axiosConfig.httpsAgent = agent; // 为 HTTPS 请求设置代理 agent
      axiosConfig.httpAgent = agent; // 为 HTTP 请求设置代理 agent
      console.log('📡 使用代理调用 Media API', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
        mediaId,
      });
    }

    // 调用 Google API
    const response = await axios(axiosConfig);

    console.log('📥 Media API 响应状态:', response.status);

    // 返回数据
    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error('❌ Media API 错误:', error);

    // 处理 axios 错误响应
    if (error.response) {
      console.error('API 错误响应状态码:', error.response.status);
      console.error('API 错误响应数据:', JSON.stringify(error.response.data, null, 2));

      return NextResponse.json(
        { error: `Failed to fetch media details: ${error.response.status} ${error.response.statusText}` },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.code || error.cause?.message,
      },
      { status: 500 }
    );
  }
}