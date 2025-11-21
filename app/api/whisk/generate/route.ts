import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// 生成图片 API 代理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, aspectRatio, bearerToken, proxy, workflowId, sessionId, seed } = body;

    if (!bearerToken) {
      return NextResponse.json(
        { error: '缺少 Bearer Token' },
        { status: 400 }
      );
    }

    // 比例映射
    const aspectRatioMap: Record<string, string> = {
      '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
      '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
    };

    const clientWorkflowId =
      typeof workflowId === 'string' && workflowId.trim().length > 0
        ? workflowId.trim()
        : crypto.randomUUID();
    const clientSessionId =
      typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId.trim()
        : `;${Date.now()}`;

    const payload = {
      clientContext: {
        workflowId: clientWorkflowId,
        tool: 'BACKBONE',
        sessionId: clientSessionId,
      },
      imageModelSettings: {
        imageModel: 'IMAGEN_3_5',
        aspectRatio: aspectRatioMap[aspectRatio] || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      },
      seed:
        typeof seed === 'number'
          ? seed
          : Math.floor(Math.random() * 10000),
      prompt: prompt,
      mediaCategory: 'MEDIA_CATEGORY_BOARD',
    };

    console.log('🚀 发起 Whisk API 请求:', {
      prompt: prompt.substring(0, 50),
      aspectRatio,
      proxy: proxy ? '已配置' : '未配置',
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
    });

    // 配置 axios // 行级注释说明 axios 基础配置
    const axiosConfig: any = {
      method: 'POST',
      url: 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Authorization: `Bearer ${bearerToken}`,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 180000, // 设置 180 秒超时避免长时间挂起
      proxy: false, // 禁用 axios 默认代理以使用自定义 Agent
    };

    // 解析代理配置（请求参数优先，其次环境变量） // 行级注释说明代理优先级
    const { agent, proxyUrl: resolvedProxyUrl, proxyType } = resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log(
        '📡 使用代理连接 Whisk API:',
        proxyType.toUpperCase(),
        resolvedProxyUrl
      );
    } else {
      console.log('🌐 未使用代理，直接请求 Whisk API');
    }

    const response = await axios(axiosConfig);

    console.log('📥 Whisk API 响应状态:', response.status);
    console.log('✅ Whisk API 成功');
    
    return NextResponse.json({
      ...response.data,
      workflowId: response.data?.workflowId || clientWorkflowId,
      sessionId: clientSessionId,
    });
  } catch (error: any) {
    console.error('❌ 生成图片代理错误:', error);
    
    // 处理 axios 错误
    if (error.response) {
      console.error('API 错误响应:', error.response.data);
      return NextResponse.json(error.response.data, { status: error.response.status });
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

