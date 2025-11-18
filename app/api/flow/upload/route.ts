import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  normalizeImageAspectRatio,
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
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
        aspectRatio: normalizeImageAspectRatio(aspectRatio),
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

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
      Origin: 'https://labs.google',
      Referer: 'https://labs.google/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const axiosConfig = createProxiedAxiosConfig(
      'https://aisandbox-pa.googleapis.com/v1:uploadUserImage',
      'POST',
      headers,
      proxy,
      payload
    );

    axiosConfig.timeout = 60000;

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
    return handleApiError(error, 'Flow 上传图片代理');
  }
}


