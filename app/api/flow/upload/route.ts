import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';
import {
  normalizeImageAspectRatio,
  handleApiError,
  validateRequiredParams,
} from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, bearerToken, sessionId, proxy, aspectRatio } = body;

    // 行级注释：验证必需参数
    const validation = validateRequiredParams(
      { bearerToken, imageBase64, sessionId },
      ['bearerToken', 'imageBase64', 'sessionId']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    let base64Data = imageBase64.trim();
    let mimeType = 'image/jpeg';

    const dataUrlMatch = base64Data.match(/^data:(.*?);base64,(.*)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1] || mimeType;
      base64Data = dataUrlMatch[2];
    }

    const sanitizedBase64 = base64Data.replace(/\s/g, '');

    const trimmedSessionId = sessionId.trim();

    const payload = {
      imageInput: {
        rawImageBytes: sanitizedBase64,
        mimeType,
        isUserUploaded: true,
        aspectRatio: normalizeAspectRatio(aspectRatio),
      },
      clientContext: {
        sessionId: trimmedSessionId,
        tool: 'ASSET_MANAGER',
      },
    };

    console.log('📤 调用 Flow 上传接口', {
      mimeType,
      sessionId: trimmedSessionId,
      aspectRatio: payload.imageInput.aspectRatio,
      proxy: proxy ? '已配置' : '未配置',
    });

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://aisandbox-pa.googleapis.com/v1:uploadUserImage',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearerToken}`,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 60000,
      proxy: false,
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理上传 Flow 图片', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 上传响应状态:', response.status);

    const mediaGenerationId =
      response.data?.mediaGenerationId?.mediaGenerationId;
    const width = response.data?.width;
    const height = response.data?.height;
    const workflowId = response.data?.workflowId;

    if (!mediaGenerationId) {
      console.warn('⚠️ Flow 上传未返回 mediaGenerationId');
    }

    return NextResponse.json({
      mediaGenerationId,
      width,
      height,
      workflowId,
      sessionId,
    });
  } catch (error: any) {
    console.error('❌ Flow 上传图片代理错误:', error);

    if (error.response) {
      console.error('API 错误响应:', error.response.data);
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


