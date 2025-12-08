import { NextRequest, NextResponse } from 'next/server';

/**
 * MiniMax TTS 语音合成 API
 * POST /api/tts/minimax
 * 
 * 请求体:
 * - text: 需要合成的文本
 * - voiceId: 音色 ID
 * - apiKey: MiniMax API Key
 * - speed?: 语速 (0.5-2, 默认 1)
 * - volume?: 音量 (0.5-2, 默认 1)
 * - pitch?: 音高 (-12 到 12, 默认 0)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      text, 
      voiceId, 
      apiKey,
      speed = 1, 
      volume = 1, 
      pitch = 0 
    } = body;

    // 行级注释：验证必需参数
    if (!text?.trim()) {
      return NextResponse.json({ error: '文本内容不能为空' }, { status: 400 });
    }

    if (!voiceId?.trim()) {
      return NextResponse.json({ error: '请选择音色' }, { status: 400 });
    }

    if (!apiKey?.trim()) {
      return NextResponse.json({ error: '请配置 MiniMax API Key' }, { status: 400 });
    }

    // 行级注释：限制文本长度
    if (text.length > 10000) {
      return NextResponse.json({ error: '文本长度不能超过 10000 字符' }, { status: 400 });
    }

    // 行级注释：构建 MiniMax TTS 请求
    const payload = {
      model: 'speech-2.6-hd',  // 行级注释：使用高清模型
      text: text.trim(),
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed: Math.max(0.5, Math.min(2, speed)),
        vol: Math.max(0.5, Math.min(2, volume)),
        pitch: Math.max(-12, Math.min(12, pitch)),
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
      output_format: 'url',  // 行级注释：返回 URL，有效期 24 小时
    };

    console.log('🎤 MiniMax TTS 请求:', { voiceId, textLength: text.length });

    const response = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ MiniMax TTS 错误:', errorData);
      
      // 行级注释：解析常见错误
      const statusMsg = errorData?.base_resp?.status_msg || '';
      if (statusMsg.includes('invalid api key') || response.status === 401) {
        return NextResponse.json({ error: 'API Key 无效，请检查配置' }, { status: 401 });
      }
      if (statusMsg.includes('insufficient balance')) {
        return NextResponse.json({ error: 'MiniMax 余额不足' }, { status: 402 });
      }
      
      return NextResponse.json(
        { error: errorData?.base_resp?.status_msg || '语音合成失败' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 行级注释：检查返回状态
    if (data.base_resp?.status_code !== 0) {
      console.error('❌ MiniMax TTS 业务错误:', data.base_resp);
      return NextResponse.json(
        { error: data.base_resp?.status_msg || '语音合成失败' },
        { status: 500 }
      );
    }

    // 行级注释：提取音频数据
    const audioData = data.data;
    const extraInfo = data.extra_info || {};

    if (!audioData?.audio) {
      return NextResponse.json({ error: '未返回音频数据' }, { status: 500 });
    }

    console.log('✅ MiniMax TTS 成功:', {
      duration: extraInfo.audio_length,
      wordCount: extraInfo.word_count,
    });

    return NextResponse.json({
      success: true,
      audioUrl: audioData.audio,  // 行级注释：output_format=url 时返回的是 URL
      duration: extraInfo.audio_length || 0,  // 毫秒
      audioInfo: {
        sampleRate: extraInfo.audio_sample_rate,
        bitrate: extraInfo.bitrate,
        format: extraInfo.audio_format || 'mp3',
        wordCount: extraInfo.word_count,
        audioSize: extraInfo.audio_size,
      },
      traceId: data.trace_id,
    });

  } catch (error: any) {
    console.error('❌ MiniMax TTS 异常:', error);
    return NextResponse.json(
      { error: error.message || '服务暂时不可用' },
      { status: 500 }
    );
  }
}

