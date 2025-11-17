// 直接调用 Google API，不通过 Vercel 服务器
// 用于节省 Fast Origin Transfer

/**
 * 直接上传图片到 Google Flow API
 * 不需要 Cookie，可以绕过 Vercel 服务器
 */
export async function uploadImageDirectly(
  imageBase64: string,
  bearerToken: string,
  sessionId: string,
  aspectRatio?: '16:9' | '9:16' | '1:1'
): Promise<{
  mediaGenerationId?: string;
  width?: number;
  height?: number;
  workflowId?: string;
  sessionId: string;
}> {
  // 处理 base64 数据
  let base64Data = imageBase64.trim();
  let mimeType = 'image/jpeg';

  const dataUrlMatch = base64Data.match(/^data:(.*?);base64,(.*)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1] || mimeType;
    base64Data = dataUrlMatch[2];
  }

  const sanitizedBase64 = base64Data.replace(/\s/g, '');

  // 规范化宽高比
  const normalizedAspectRatio = aspectRatio === '9:16' 
    ? 'IMAGE_ASPECT_RATIO_PORTRAIT'
    : aspectRatio === '1:1'
    ? 'IMAGE_ASPECT_RATIO_SQUARE'
    : 'IMAGE_ASPECT_RATIO_LANDSCAPE';

  const payload = {
    imageInput: {
      rawImageBytes: sanitizedBase64,
      mimeType,
      isUserUploaded: true,
      aspectRatio: normalizedAspectRatio,
    },
    clientContext: {
      sessionId: sessionId.trim(),
      tool: 'ASSET_MANAGER',
    },
  };

  console.log('📤 直接上传图片到 Google Flow API...');

  try {
    const response = await fetch('https://aisandbox-pa.googleapis.com/v1:uploadUserImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ 图片上传成功（直接调用）');

    return {
      mediaGenerationId: data?.mediaGenerationId?.mediaGenerationId,
      width: data?.width,
      height: data?.height,
      workflowId: data?.workflowId,
      sessionId: sessionId.trim(),
    };
  } catch (error) {
    console.error('❌ 直接上传图片失败:', error);
    throw error;
  }
}

/**
 * 直接从 Google Flow Media API 获取图片 base64
 * 不需要 Cookie，可以绕过 Vercel 服务器
 */
export async function getImageBase64Directly(
  mediaId: string,
  apiKey: string,
  bearerToken: string
): Promise<{
  encodedImage: string;
  servingBaseUri?: string;
}> {
  console.log('📥 直接从 Google API 获取图片 base64...');

  try {
    const url = `https://aisandbox-pa.googleapis.com/v1/media/${encodeURIComponent(mediaId)}?key=${encodeURIComponent(apiKey)}&clientContext.tool=PINHOLE&returnUriOnly=false`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const encodedImage = data?.image?.encodedImage;
    if (!encodedImage) {
      throw new Error('No encodedImage in response');
    }

    console.log('✅ 获取图片 base64 成功（直接调用）');

    return {
      encodedImage,
      servingBaseUri: data?.servingBaseUri || data?.image?.servingBaseUri,
    };
  } catch (error) {
    console.error('❌ 直接获取图片 base64 失败:', error);
    throw error;
  }
}

