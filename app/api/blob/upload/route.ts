import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// 上传图片到 Vercel Blob 存储
// 支持两种输入：imageDataUrl (base64) 或 imageUrl (远程 URL)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageDataUrl, imageUrl, filename } = body;

    if (!imageDataUrl && !imageUrl) {
      return NextResponse.json(
        { error: '缺少图片数据（需要 imageDataUrl 或 imageUrl）' },
        { status: 400 }
      );
    }

    // 检查环境变量
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('⚠️ 未配置 BLOB_READ_WRITE_TOKEN，无法使用 Vercel Blob');
      return NextResponse.json(
        { 
          error: '服务器未配置 Blob 存储',
          hint: '请在 Vercel 项目设置中添加 BLOB_READ_WRITE_TOKEN 环境变量'
        },
        { status: 500 }
      );
    }

    let buffer: Buffer;
    let contentType = 'image/png';

    // 方式1: 从 DataURL 解析
    if (imageDataUrl) {
      console.log('📤 从 DataURL 上传图片到 Vercel Blob...');
      const matches = imageDataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: '无效的图片数据格式' },
          { status: 400 }
        );
      }
      contentType = matches[1];
      const base64Data = matches[2];
      buffer = Buffer.from(base64Data, 'base64');
    } 
    // 方式2: 从远程 URL 下载（后端下载，避免前端跨域）
    else if (imageUrl) {
      console.log('📤 从远程 URL 下载并上传到 Vercel Blob:', imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`下载图片失败: HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
    } else {
      return NextResponse.json(
        { error: '未提供有效的图片数据' },
        { status: 400 }
      );
    }

    // 生成文件名
    const finalFilename = filename || `image-${Date.now()}.png`;

    // 上传到 Vercel Blob
    const blob = await put(finalFilename, buffer, {
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log('✅ 图片上传成功:', blob.url);

    return NextResponse.json({
      url: blob.url,
      downloadUrl: blob.downloadUrl,
      pathname: blob.pathname,
      contentType: blob.contentType,
      size: buffer.length,
    });

  } catch (error: any) {
    console.error('❌ Blob 上传错误:', error);

    return NextResponse.json(
      {
        error: error.message || '上传失败',
        details: error.code || error.cause?.message,
      },
      { status: 500 }
    );
  }
}

