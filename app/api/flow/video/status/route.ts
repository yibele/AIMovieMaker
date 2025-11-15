import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operations, bearerToken, proxy } = body;

    if (!bearerToken) {
      return NextResponse.json(
        { error: '缺少 Bearer Token' },
        { status: 400 }
      );
    }

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: '缺少 operations 参数' },
        { status: 400 }
      );
    }

    const payload = {
      operations,
    };

    console.log('🔍 查询 Flow 视频生成状态', {
      operationsCount: operations.length,
      proxy: proxy ? '已配置' : '未配置',
    });

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Authorization: `Bearer ${bearerToken}`,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
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
      console.log('📡 使用代理查询 Flow 视频状态', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    }

    const response = await axios(axiosConfig);

    console.log('📥 Flow 视频状态响应:', response.status);

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
    console.error('❌ Flow 视频状态查询错误:', error);

    if (error.response) {
      console.error('API 错误响应:', JSON.stringify(error.response.data, null, 2));
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

