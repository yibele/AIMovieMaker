import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// 上传图片到 Whisk 的 API 代理 // 行级注释说明文件作用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageBase64,
      caption,
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
        : crypto.randomUUID(); // 无参数时自动生成 workflowId // 行级注释说明默认策略

    const clientSessionId =
      typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId.trim()
        : `;${Date.now()}`; // 无参数时自动生成 sessionId // 行级注释说明默认策略

    const payload = {
      json: {
        clientContext: {
          workflowId: clientWorkflowId,
          sessionId: clientSessionId,
          tool: 'BACKBONE', // 对齐 Whisk 请求上下文要求 // 行级注释说明字段意义
        },
        uploadMediaInput: {
          mediaCategory: 'MEDIA_CATEGORY_SUBJECT',
          rawBytes: imageBase64,
          caption: caption || '',
        },
      },
    };

    console.log('📤 发起 Whisk Upload API 请求', {
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
      proxy: proxy ? '已配置' : '未配置',
      hasCaption: caption ? '是' : '否',
    });

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://labs.google/fx/api/trpc/backbone.uploadImage',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 60000, // 设置 60 秒超时防止长时间阻塞 // 行级注释说明超时配置
      proxy: false, // 禁用 axios 默认代理以便自定义 agent 接管 // 行级注释说明代理策略
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理上传图片', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    } else {
      console.log('🌐 未使用代理上传图片');
    }

    const response = await axios(axiosConfig);

    console.log('📥 Upload API 响应状态:', response.status);

    const uploadMediaGenerationId =
      response.data?.result?.data?.json?.result?.uploadMediaGenerationId ??
      null; // 提取上传后返回的 mediaGenerationId // 行级注释说明解析逻辑

    if (!uploadMediaGenerationId) {
      console.warn('⚠️ Upload API 未返回 mediaGenerationId');
    }

    return NextResponse.json({
      uploadMediaGenerationId,
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
    });
  } catch (error: any) {
    console.error('❌ Upload API 代理错误:', error);

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


