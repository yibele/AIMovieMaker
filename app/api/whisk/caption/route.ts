import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// 获取图片 Caption 的 API 代理 // 行级注释说明文件作用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageBase64,
      cookie,
      proxy,
      workflowId,
      sessionId,
    } = body;

    if (!cookie) {
      return NextResponse.json(
        { error: '缺少 Cookie' },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: '缺少图片数据' },
        { status: 400 }
      );
    }

    const clientWorkflowId =
      typeof workflowId === 'string' && workflowId.trim().length > 0
        ? workflowId.trim()
        : crypto.randomUUID(); // 若未提供则生成新的 workflowId // 行级注释说明默认策略

    const clientSessionId =
      typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId.trim()
        : `;${Date.now()}`; // 若未提供则生成新的 sessionId // 行级注释说明默认策略

    const payload = {
      json: {
        clientContext: {
          workflowId: clientWorkflowId,
          sessionId: clientSessionId,
          tool: 'BACKBONE', // 对齐 Whisk 请求上下文要求 // 行级注释说明字段意义
        },
        captionInput: {
          candidatesCount: 1,
          mediaInput: {
            mediaCategory: 'MEDIA_CATEGORY_SUBJECT',
            rawBytes: imageBase64,
          },
        },
      },
    };

    console.log('📝 发起 Whisk Caption API 请求', {
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
      proxy: proxy ? '已配置' : '未配置',
    });

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://labs.google/fx/api/trpc/backbone.captionImage',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 60000, // 设置超时避免长时间挂起 // 行级注释说明超时配置
      proxy: false, // 禁用 axios 自带代理以使用自定义 agent // 行级注释说明代理处理
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理访问 Caption API', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    } else {
      console.log('🌐 未使用代理访问 Caption API');
    }

    const response = await axios(axiosConfig);

    console.log('📥 Caption API 响应状态:', response.status);

    const caption =
      response.data?.result?.data?.json?.result?.candidates?.[0]?.output ??
      ''; // 提取候选描述文本 // 行级注释说明解析逻辑

    return NextResponse.json({
      caption,
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
    });
  } catch (error: any) {
    console.error('❌ Caption API 代理错误:', error);

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


