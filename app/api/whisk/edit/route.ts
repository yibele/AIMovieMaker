import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

// 编辑图片 API 代理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, instruction, caption, aspectRatio, cookie, proxy, originalMediaGenerationId, workflowId, sessionId } = body;

    if (!cookie) {
      return NextResponse.json(
        { error: '缺少 Cookie' },
        { status: 400 }
      );
    }

    // 比例映射
    const aspectRatioMap: Record<string, string> = {
      '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
      '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
    };

    const normalizedOriginalId = typeof originalMediaGenerationId === 'string'
      ? originalMediaGenerationId.trim()
      : null; // 规范化 mediaGenerationId，便于判断是否可用 // 行级注释说明处理逻辑

    const metaValues: Record<string, string[]> = {
      'editInput.seed': ['undefined'],
      'editInput.safetyMode': ['undefined'],
    }; // 使用可扩展的字典以便动态添加 meta 值 // 行级注释说明用途

    if (!normalizedOriginalId) {
      metaValues['editInput.originalMediaGenerationId'] = ['undefined']; // 标记缺失以匹配 Web 请求格式 // 行级注释说明用途
    }

    const clientWorkflowId =
      typeof workflowId === 'string' && workflowId.trim().length > 0
        ? workflowId.trim()
        : crypto.randomUUID();
    const clientSessionId =
      typeof sessionId === 'string' && sessionId.trim().length > 0
        ? sessionId.trim()
        : `;${Date.now()}`;

    const payload = {
      json: {
        clientContext: {
          workflowId: clientWorkflowId,
          tool: 'BACKBONE',
          sessionId: clientSessionId,
        },
        imageModelSettings: {
          imageModel: 'GEM_PIX2',
          aspectRatio: aspectRatioMap[aspectRatio] || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
        },
        flags: {},
        editInput: {
          caption: caption || '',
          userInstruction: instruction,
          seed: null,
          safetyMode: null,
          originalMediaGenerationId: normalizedOriginalId || null,
          mediaInput: {
            mediaCategory: 'MEDIA_CATEGORY_BOARD',
            rawBytes: imageBase64,
          },
        },
      },
      meta: {
        values: metaValues,
      },
    };

    console.log('🖼️ 发起 Whisk 编辑 API 请求:', {
      instruction: instruction.substring(0, 50),
      aspectRatio,
      proxy: proxy ? '已配置' : '未配置',
      mediaGenerationId: normalizedOriginalId ? '已提供' : '未提供',
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
    });

    // 配置 axios // 行级注释说明 axios 基础配置
    const axiosConfig: any = {
      method: 'POST',
      url: 'https://labs.google/fx/api/trpc/backbone.editImage',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 60000, // 设置 60 秒超时避免长时间挂起
      proxy: false, // 禁用 axios 默认代理以使用自定义 Agent
    };

    // 解析代理配置（请求参数优先，其次环境变量） // 行级注释说明代理优先级
    const { agent, proxyUrl: resolvedProxyUrl, proxyType } = resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log(
        '📡 使用代理连接 Whisk 编辑 API:',
        proxyType.toUpperCase(),
        resolvedProxyUrl
      );
    } else {
      console.log('🌐 未使用代理，直接请求 Whisk 编辑 API');
    }

    const response = await axios(axiosConfig);

    console.log('📥 Whisk 编辑 API 响应状态:', response.status);
    console.log('✅ Whisk 编辑 API 成功');
    
    return NextResponse.json({
      ...response.data,
      workflowId:
        response.data?.result?.data?.json?.result?.workflowId ||
        response.data?.workflowId ||
        clientWorkflowId,
      sessionId: clientSessionId,
    });
  } catch (error: any) {
    console.error('❌ 编辑图片代理错误:', error);
    
    // 处理 axios 错误
    if (error.response) {
      console.error('API 错误响应:', error.response.data);
      const detail = error.response.data?.error?.json?.data;
      if (detail) {
        console.error('API 错误详情:', detail); // 输出更详细的错误数据帮助定位问题 // 行级注释说明用途
      }
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

