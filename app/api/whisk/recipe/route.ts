import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { resolveProxyAgent } from '@/lib/proxy-agent';

interface RecipeMediaInputBody {
  caption?: string;
  mediaCategory?: string;
  mediaGenerationId: string;
}

// 多图编辑（runImageRecipe）API 代理 // 行级注释说明文件作用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      instruction,
      aspectRatio,
      bearerToken,
      proxy,
      recipeMediaInputs,
      seed,
      workflowId,
      sessionId,
    } = body;

    if (!bearerToken) {
      return NextResponse.json(
        { error: '缺少 Bearer Token' },
        { status: 400 }
      );
    }

    if (!instruction || typeof instruction !== 'string') {
      return NextResponse.json(
        { error: '缺少指令内容' },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(recipeMediaInputs) ||
      recipeMediaInputs.length === 0
    ) {
      return NextResponse.json(
        { error: '缺少参考图片列表' },
        { status: 400 }
      );
    }

    const normalizedInputs = recipeMediaInputs
      .map((input: RecipeMediaInputBody) => {
        if (!input?.mediaGenerationId) {
          return null;
        }
        const normalizedCaption =
          typeof input.caption === 'string' && input.caption.trim().length > 0
            ? input.caption.trim()
            : 'Reference image'; // 保证 caption 不为空 // 行级注释说明默认值
        return {
          caption: normalizedCaption,
          mediaInput: {
            mediaCategory: input.mediaCategory || 'MEDIA_CATEGORY_SUBJECT', // 默认按主体图片处理 // 行级注释说明默认类别
            mediaGenerationId: input.mediaGenerationId,
          },
        };
      })
      .filter(
        (input): input is {
          caption: string;
          mediaInput: { mediaCategory: string; mediaGenerationId: string };
        } => Boolean(input)
      );

    if (normalizedInputs.length === 0) {
      return NextResponse.json(
        { error: '参考图片缺少 mediaGenerationId，无法执行编辑' },
        { status: 400 }
      );
    }

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
      seed:
        typeof seed === 'number'
          ? seed
          : Math.floor(Math.random() * 1000000), // 若未指定种子则随机生成 // 行级注释说明默认策略
      imageModelSettings: {
        imageModel: 'IMAGEN_3_5',
        aspectRatio: aspectRatioMap[aspectRatio] || 'IMAGE_ASPECT_RATIO_LANDSCAPE',
      },
      userInstruction: instruction,
      recipeMediaInputs: normalizedInputs,
    };

    console.log('🧩 发起 Whisk runImageRecipe 请求:', {
      instruction: instruction.substring(0, 50),
      aspectRatio,
      referenceCount: normalizedInputs.length,
      proxy: proxy ? '已配置' : '未配置',
      workflowId: clientWorkflowId,
      sessionId: clientSessionId,
    });

    const axiosConfig: any = {
      method: 'POST',
      url: 'https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Authorization: `Bearer ${bearerToken}`,
        Origin: 'https://labs.google',
        Referer: 'https://labs.google/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      data: payload,
      timeout: 180000, // 设置 180 秒超时避免长时间挂起 // 行级注释说明超时配置
      proxy: false, // 禁用 axios 默认代理以使用自定义 Agent // 行级注释说明代理策略
    };

    const { agent, proxyUrl: resolvedProxyUrl, proxyType } =
      resolveProxyAgent(proxy);

    if (agent) {
      axiosConfig.httpsAgent = agent;
      axiosConfig.httpAgent = agent;
      console.log('📡 使用代理连接 runImageRecipe API:', {
        proxyType: proxyType.toUpperCase(),
        proxyUrl: resolvedProxyUrl,
      });
    } else {
      console.log('🌐 未使用代理，直接调用 runImageRecipe API');
    }

    const response = await axios(axiosConfig);

    console.log('📥 runImageRecipe API 响应状态:', response.status);
    console.log('✅ runImageRecipe API 成功');

    return NextResponse.json({
      ...response.data,
      workflowId:
        response.data?.workflowId ||
        response.data?.result?.workflowId ||
        clientWorkflowId,
      sessionId: clientSessionId,
    });
  } catch (error: any) {
    console.error('❌ runImageRecipe 代理错误:', error);

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


