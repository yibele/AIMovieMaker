// 行级注释：API Routes 通用工具函数（避免重复代码）
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosRequestConfig } from 'axios';
import { resolveProxyAgent } from './proxy-agent';

// 行级注释：标准化图片比例（Flow API）
export function normalizeImageAspectRatio(aspectRatio?: string): string {
  const aspectRatioMap: Record<string, string> = {
    '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
    '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
  };

  if (!aspectRatio) {
    return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
  }
  if (aspectRatio in aspectRatioMap) {
    return aspectRatioMap[aspectRatio];
  }
  if (
    aspectRatio === 'IMAGE_ASPECT_RATIO_LANDSCAPE' ||
    aspectRatio === 'IMAGE_ASPECT_RATIO_PORTRAIT' ||
    aspectRatio === 'IMAGE_ASPECT_RATIO_SQUARE'
  ) {
    return aspectRatio;
  }
  return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
}

// 行级注释：标准化视频比例（Flow API）
export function normalizeVideoAspectRatio(aspectRatio?: string): string {
  const aspectRatioMap: Record<string, string> = {
    '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
    '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
    '1:1': 'VIDEO_ASPECT_RATIO_SQUARE',
  };

  if (!aspectRatio) {
    return 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  }
  if (aspectRatio in aspectRatioMap) {
    return aspectRatioMap[aspectRatio];
  }
  if (
    aspectRatio === 'VIDEO_ASPECT_RATIO_LANDSCAPE' ||
    aspectRatio === 'VIDEO_ASPECT_RATIO_PORTRAIT' ||
    aspectRatio === 'VIDEO_ASPECT_RATIO_SQUARE'
  ) {
    return aspectRatio;
  }
  return 'VIDEO_ASPECT_RATIO_LANDSCAPE';
}

// 行级注释：创建带代理的 axios 配置
export function createProxiedAxiosConfig(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  proxy?: string,
  data?: any
): AxiosRequestConfig {
  const axiosConfig: AxiosRequestConfig = {
    method,
    url,
    headers,
    timeout: 60000,
    proxy: false,
  };

  if (data) {
    axiosConfig.data = data;
  }

  const { agent, proxyUrl, proxyType } = resolveProxyAgent(proxy);

  if (agent) {
    axiosConfig.httpsAgent = agent as any;
    axiosConfig.httpAgent = agent as any;
    console.log(`📡 使用${proxyType.toUpperCase()}代理: ${proxyUrl}`);
  }

  return axiosConfig;
}

// 行级注释：标准化错误响应
export function handleApiError(error: any, context: string): NextResponse {
  console.error(`❌ ${context} 错误:`, error);

  if (error.response) {
    console.error('API 错误响应状态码:', error.response.status);
    console.error('API 错误响应数据:', JSON.stringify(error.response.data, null, 2));

    return NextResponse.json(
      {
        error: error.response.data?.error?.message || `${context} 失败`,
        details: error.response.data,
      },
      { status: error.response.status }
    );
  }

  return NextResponse.json(
    {
      error: error.message || `${context} 失败`,
      details: error.code || error.cause?.message,
    },
    { status: 500 }
  );
}

// 行级注释：验证必需的请求参数
export function validateRequiredParams(
  params: Record<string, any>,
  requiredKeys: string[]
): { valid: boolean; error?: NextResponse } {
  for (const key of requiredKeys) {
    if (!params[key] || (typeof params[key] === 'string' && !params[key].trim())) {
      return {
        valid: false,
        error: NextResponse.json(
          { error: `缺少必需参数: ${key}` },
          { status: 400 }
        ),
      };
    }
  }
  return { valid: true };
}

// 行级注释：生成 Flow API 的 workflowId
export function generateWorkflowId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `wf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// 行级注释：生成 Flow API 的 sessionId
export function generateSessionId(): string {
  return `;${Date.now()}`;
}

