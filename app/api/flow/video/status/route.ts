import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import {
  handleApiError,
  validateRequiredParams,
  createProxiedAxiosConfig,
} from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operations, bearerToken, proxy } = body;

    // 验证必需参数
    const validation = validateRequiredParams(
      { bearerToken, operations },
      ['bearerToken', 'operations']
    );
    if (!validation.valid) {
      return validation.error!;
    }

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'operations 必须是非空数组' },
        { status: 400 }
      );
    }

    const payload = {
      operations,
    };

   

    const headers = {
      'Content-Type': 'text/plain;charset=UTF-8',
      Authorization: `Bearer ${bearerToken}`,
      Origin: 'https://labs.google',
      Referer: 'https://labs.google/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    };

    const axiosConfig = createProxiedAxiosConfig(
      'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus',
      'POST',
      headers,
      proxy,
      payload
    );

    axiosConfig.timeout = 30000;

    const response = await axios(axiosConfig);


    const data = response.data;

    // 解析返回的 operations
    const responseOperations = data.operations || [];
    if (responseOperations.length === 0) {
      return NextResponse.json(
        { error: 'Flow 响应中未找到 operations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      operations: responseOperations,
      remainingCredits: data.remainingCredits,
    });
  } catch (error: any) {
    return handleApiError(error, 'Flow 视频状态查询');
  }
}

