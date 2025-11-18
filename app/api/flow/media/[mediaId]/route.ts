import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';

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

    // 验证必需参数
    const validation = validateRequiredParams({ key }, ['key']);
    if (!validation.valid) {
      return validation.error!;
    }

    // 确保返回的参数不为null
    const returnUriOnlySafe = returnUriOnly || 'true';
    const clientContextSafe = clientContext || 'PINHOLE';

    // 构建 Google API URL
    const apiUrl = 'https://aisandbox-pa.googleapis.com/v1/media/' + encodeURIComponent(mediaId) +
      '?key=' + encodeURIComponent(key!) +
      '&clientContext.tool=' + encodeURIComponent(clientContextSafe) +
      '&returnUriOnly=' + encodeURIComponent(returnUriOnlySafe);

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
    const axiosConfig = createProxiedAxiosConfig(
      apiUrl,
      'GET',
      headers,
      proxy || undefined
    );

    axiosConfig.timeout = 30000;

    // 调用 Google API
    const response = await axios(axiosConfig);

    console.log('📥 Media API 响应状态:', response.status);

    // 返回数据
    return NextResponse.json(response.data);

  } catch (error: any) {
    return handleApiError(error, 'Media API');
  }
}