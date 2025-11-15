// Google Labs Whisk API 调用函数（通过后端代理）

/**
 * 生成图片
 * @param prompt 提示词
 * @param aspectRatio 比例 '16:9' | '9:16' | '1:1'
 * @param bearerToken Bearer Token
 * @returns 包含图片数据与 mediaGenerationId 等元信息
 */
export async function generateImageWithWhisk(
  prompt: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  bearerToken: string,
  options: {
    proxy?: string;
    workflowId?: string;
    sessionId?: string;
    seed?: number;
  } = {}
): Promise<{
  imageUrl: string;
  mediaGenerationId?: string;
  workflowId?: string;
  sessionId?: string;
  translatedPrompt?: string;
}> {
  const {
    proxy,
    workflowId: workflowIdOverride,
    sessionId: sessionIdOverride,
    seed,
  } = options;
  // 使用本地 API 代理，避免 CORS 问题
  const url = '/api/whisk/generate';
  
  const payload = {
    prompt,
    aspectRatio,
    bearerToken,
    proxy: proxy || '',
    workflowId: workflowIdOverride || null,
    sessionId: sessionIdOverride || null,
    seed: typeof seed === 'number' ? seed : undefined,
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // 处理特定错误类型
    const errorReason = errorData?.error?.details?.[0]?.reason;
    if (errorReason === 'PUBLIC_ERROR_PROMINENT_PEOPLE_FILTER_FAILED') {
      throw new Error('🚫 内容被安全过滤器拦截：提示词可能包含名人或敏感内容，请修改后重试');
    } else if (response.status === 401 || response.status === 403) {
      throw new Error('❌ 认证失败：Bearer Token 可能已过期，请重新配置');
    } else {
      const message = errorData?.error?.message || errorText;
      throw new Error(`❌ API 错误 (${response.status}): ${message}`);
    }
  }
  
  const data = await response.json();
  
  // 提取 Base64 图片数据
  const generatedImage = data.imagePanels?.[0]?.generatedImages?.[0]; // 行级注释说明从响应中抽取首张图片
  const encodedImage = generatedImage?.encodedImage;
  const mediaGenerationId = generatedImage?.mediaGenerationId;
  const translatedPrompt = generatedImage?.prompt;
  const resolvedWorkflowId = data.workflowId as string | undefined;
  const resolvedSessionId = data.sessionId as string | undefined;
  const mimeType = generatedImage?.mimeType || 'image/jpeg'; // 默认按 JPEG 处理 // 行级注释说明缺省值
  
  if (!encodedImage) {
    throw new Error('❌ 响应中未找到图片数据');
  }
  
  // 返回带 data URL 前缀的完整 Base64 字符串以及元信息 // 行级注释说明返回数据结构
  return {
    imageUrl: `data:${mimeType};base64,${encodedImage}`,
    mediaGenerationId,
    workflowId: resolvedWorkflowId,
    sessionId: resolvedSessionId,
    translatedPrompt,
  };
}

/**
 * 编辑图片
 * @param imageBase64 原始图片的 Base64 数据（需包含 data URL 前缀）
 * @param instruction 编辑指令
 * @param caption 原图描述（可选）
 * @param aspectRatio 比例
 * @param cookie Cookie 值
 * @param originalMediaGenerationId 原始图片的 mediaGenerationId，用于保持上下文
 * @returns 包含编辑后图片数据与 mediaGenerationId 等元信息
 */
export async function editImageWithWhisk(
  imageBase64: string,
  instruction: string,
  caption: string = '',
  aspectRatio: '16:9' | '9:16' | '1:1',
  cookie: string,
  proxy?: string,
  originalMediaGenerationId?: string,
  workflowIdOverride?: string,
  sessionIdOverride?: string
): Promise<{
  imageUrl: string;
  mediaGenerationId?: string;
  workflowId?: string;
  sessionId?: string;
  translatedPrompt?: string;
}> {
  // 使用本地 API 代理，避免 CORS 问题
  const url = '/api/whisk/edit';
  
  const payload = {
    imageBase64,
    instruction,
    caption,
    aspectRatio,
    cookie,
    proxy: proxy || '',
    originalMediaGenerationId: originalMediaGenerationId || null, // 允许传 null 以兼容缺失 ID 的场景 // 行级注释说明处理逻辑
    workflowId: workflowIdOverride || null,
    sessionId: sessionIdOverride || null,
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // 处理特定错误类型
    const errorReason = errorData?.error?.details?.[0]?.reason;
    if (errorReason === 'PUBLIC_ERROR_PROMINENT_PEOPLE_FILTER_FAILED') {
      throw new Error('🚫 内容被安全过滤器拦截：提示词可能包含名人或敏感内容，请修改后重试');
    } else if (response.status === 401 || response.status === 403) {
      throw new Error('❌ 认证失败：Cookie 可能已过期，请重新配置');
    } else {
      const message = errorData?.error?.message || errorText;
      throw new Error(`❌ API 错误 (${response.status}): ${message}`);
    }
  }
  
  const data = await response.json();
  
  // 提取编辑后的图片数据
  const generatedImage = data.result?.data?.json?.result?.imagePanels?.[0]?.generatedImages?.[0];
  const encodedImage = generatedImage?.encodedImage;
  const mediaGenerationId = generatedImage?.mediaGenerationId;
  const translatedPrompt = generatedImage?.prompt;
  const resolvedWorkflowId = data.result?.data?.json?.result?.workflowId as string | undefined;
  const resolvedSessionId = data.sessionId as string | undefined;
  const mimeType = generatedImage?.mimeType || 'image/png'; // 编辑接口通常返回 PNG // 行级注释说明缺省值
  
  if (!encodedImage) {
    throw new Error('❌ 响应中未找到编辑后的图片数据');
  }
  
  // 返回带 data URL 前缀的完整 Base64 字符串以及元信息 // 行级注释说明返回结构
  return {
    imageUrl: `data:${mimeType};base64,${encodedImage}`,
    mediaGenerationId,
    workflowId: resolvedWorkflowId,
    sessionId: resolvedSessionId,
    translatedPrompt,
  };
}

/**
 * 获取上传图片的 Caption
 */
export async function captionImageWithWhisk(
  imageBase64: string,
  cookie: string,
  proxy?: string,
  workflowId?: string,
  sessionId?: string
): Promise<{
  caption: string;
  workflowId: string;
  sessionId: string;
}> {
  const url = '/api/whisk/caption';

  const payload = {
    imageBase64,
    cookie,
    proxy: proxy || '',
    workflowId: workflowId || null,
    sessionId: sessionId || null,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const message = errorData?.error?.message || errorData?.error || errorText;
    throw new Error(`❌ Caption API 错误 (${response.status}): ${message}`); // 行级注释说明错误处理
  }

  const data = await response.json();

  if (!data.caption) {
    console.warn('⚠️ Caption API 未返回 caption'); // 行级注释说明异常提示
  }

  return {
    caption: data.caption || '',
    workflowId: data.workflowId,
    sessionId: data.sessionId,
  };
}

/**
 * 上传图片到 Whisk 并获取 mediaGenerationId
 */
export async function uploadImageWithWhisk(
  imageBase64: string,
  caption: string,
  cookie: string,
  proxy?: string,
  workflowId?: string,
  sessionId?: string
): Promise<{
  mediaGenerationId?: string | null;
  workflowId: string;
  sessionId: string;
}> {
  const url = '/api/whisk/upload';

  const payload = {
    imageBase64,
    caption,
    cookie,
    proxy: proxy || '',
    workflowId: workflowId || null,
    sessionId: sessionId || null,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const message = errorData?.error?.message || errorData?.error || errorText;
    throw new Error(`❌ Upload API 错误 (${response.status}): ${message}`); // 行级注释说明错误处理
  }

  const data = await response.json();

  return {
    mediaGenerationId: data.uploadMediaGenerationId,
    workflowId: data.workflowId,
    sessionId: data.sessionId,
  };
}

/**
 * 运行多图编辑（runImageRecipe） // 行级注释说明函数用途
 */
export async function runImageRecipeWithWhisk(
  instruction: string,
  aspectRatio: '16:9' | '9:16' | '1:1',
  bearerToken: string,
  recipeMediaInputs: Array<{
    mediaGenerationId: string;
    caption?: string;
    mediaCategory?: string;
  }>,
  options: {
    proxy?: string;
    workflowId?: string;
    sessionId?: string;
    seed?: number;
  } = {}
): Promise<{
  imageUrl: string;
  mediaGenerationId?: string;
  workflowId?: string;
  sessionId?: string;
  translatedPrompt?: string;
}> {
  const {
    proxy,
    workflowId: workflowIdOverride,
    sessionId: sessionIdOverride,
    seed,
  } = options;
  const url = '/api/whisk/recipe';

  const payload = {
    instruction,
    aspectRatio,
    bearerToken,
    proxy: proxy || '',
    recipeMediaInputs,
    workflowId: workflowIdOverride || null,
    sessionId: sessionIdOverride || null,
    seed: typeof seed === 'number' ? seed : undefined,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const message = errorData?.error?.message || errorData?.error || errorText;
    throw new Error(`❌ runImageRecipe API 错误 (${response.status}): ${message}`); // 行级注释说明错误处理
  }

  const data = await response.json();

  const generatedImage =
    data.imagePanels?.[0]?.generatedImages?.[0] ||
    data.result?.imagePanels?.[0]?.generatedImages?.[0]; // 兼容不同响应结构 // 行级注释说明兼容处理
  const encodedImage = generatedImage?.encodedImage;
  const mediaGenerationId = generatedImage?.mediaGenerationId;
  const translatedPrompt = generatedImage?.prompt;
  const resolvedWorkflowId =
    data.workflowId ||
    data.result?.workflowId ||
    generatedImage?.workflowId ||
    undefined;
  const resolvedSessionId = data.sessionId as string | undefined;
  const mimeType = generatedImage?.mimeType || 'image/png';

  if (!encodedImage) {
    throw new Error('❌ runImageRecipe 响应中未找到图片数据');
  }

  return {
    imageUrl: `data:${mimeType};base64,${encodedImage}`,
    mediaGenerationId,
    workflowId: resolvedWorkflowId,
    sessionId: resolvedSessionId,
    translatedPrompt,
  };
}



