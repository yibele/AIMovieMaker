/**
 * VL 视觉分析 API 工具层
 * 
 * 职责：调用 Qwen VL 进行图片分析
 * 用途：
 * - 生成视频提示词
 * - 分析图片内容
 * - 生成过渡镜头描述
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 视觉分析参数
 */
export interface VisionAnalysisParams {
  imageUrl: string;
  endImageUrl?: string;  // 用于首尾帧分析
  apiKey: string;
  prompt: string;
}

/**
 * 视觉分析结果
 */
export interface VisionAnalysisResult {
  content: string;
}

// ============================================================================
// API 函数
// ============================================================================

/**
 * 调用 Qwen VL 分析图片
 * 
 * @param params 分析参数
 * @returns 分析结果
 * 
 * @example
 * // 单图分析
 * const result = await analyzeImage({
 *   imageUrl: 'https://...',
 *   apiKey: 'sk-xxx',
 *   prompt: '描述这张图片的内容'
 * });
 * 
 * // 双图分析（首尾帧）
 * const result = await analyzeImage({
 *   imageUrl: 'https://start.jpg',
 *   endImageUrl: 'https://end.jpg',
 *   apiKey: 'sk-xxx',
 *   prompt: '描述从第一张图到第二张图的过渡动作'
 * });
 */
export async function analyzeImage(params: VisionAnalysisParams): Promise<VisionAnalysisResult> {
  const { imageUrl, endImageUrl, apiKey, prompt } = params;

  // 行级注释：根据是否有尾帧图片构建不同的消息格式
  const content = endImageUrl
    ? [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'image_url', image_url: { url: endImageUrl } },
        { type: 'text', text: prompt }
      ]
    : [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: prompt }
      ];

  const messages = [{
    role: 'user',
    content
  }];

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `VL API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  const resultContent = data.choices?.[0]?.message?.content?.trim() || '';

  if (!resultContent) {
    throw new Error('VL API 返回空结果');
  }

  return { content: resultContent };
}

// ============================================================================
// 预设 Prompt 模板
// ============================================================================

/**
 * VL 分析 Prompt 模板
 */
export const VL_PROMPTS = {
  // 单图描述（用于生成视频提示词）
  DESCRIBE_IMAGE: `请用英文描述这张图片的内容，包括：
1. 主体对象和位置
2. 动作或状态
3. 背景环境
4. 光线和氛围
请用简洁的一段话描述，适合用作视频生成提示词。`,

  // 首尾帧过渡（用于生成过渡镜头）
  DESCRIBE_TRANSITION: `请用英文描述从第一张图到第二张图的过渡动作。
描述应该包括：
1. 镜头如何从第一个场景过渡到第二个场景
2. 主体的运动轨迹
3. 时间流逝的感觉
请用简洁的一句话描述，适合用作视频生成提示词。`,

  // 下一镜头建议（用于自动分镜）
  SUGGEST_NEXT_SHOT: `Based on this image, suggest the next shot in a video sequence.
Describe:
1. Camera movement (pan, zoom, etc.)
2. What happens next in the scene
3. The emotional progression
Keep it concise, suitable for video generation prompt.`,

  // 单图视频提示词生成（8秒电影级视频）
  VIDEO_PROMPT_SINGLE: `Analyze this image and generate an 8-second cinematic video prompt.

STYLE OPTIONS (choose the best fit for this image):
- Single continuous shot: Smooth camera movement (pan, zoom, dolly) with natural motion
- Multi-shot sequence: 2-3 shots with cuts if the scene benefits from angle changes

Focus on: subject movement, camera motion, environmental dynamics, mood/atmosphere.
Output ONLY the prompt text. Under 80 words. English. No shot numbers or timestamps.`,

  // 首尾帧视频提示词生成（8秒过渡视频）
  VIDEO_PROMPT_START_END: `Analyze these two images (start frame and end frame) and generate an 8-second video prompt.

STYLE OPTIONS (choose the best fit):
- Single continuous transition: One smooth camera movement from Frame A to Frame B
- Multi-shot transition: 2-3 shots if the change requires cuts or complex motion

Describe the journey from Frame A to Frame B: subject movement, camera motion, environmental changes.
Output ONLY the prompt text. Under 80 words. English. No shot numbers or timestamps.`,
} as const;

// ============================================================================
// 视频提示词生成函数
// ============================================================================

/**
 * 分析图片生成视频提示词
 * 
 * @param imageUrl 首帧图片 URL 或 base64
 * @param endImageUrl 尾帧图片 URL 或 base64（可选）
 * @param apiKey DashScope API Key
 * @returns 生成的视频提示词
 * 
 * @example
 * // 单图生成视频提示词
 * const prompt = await analyzeImageForVideoPrompt(imageUrl, null, apiKey);
 * 
 * // 首尾帧生成视频提示词
 * const prompt = await analyzeImageForVideoPrompt(startUrl, endUrl, apiKey);
 */
export async function analyzeImageForVideoPrompt(
  imageUrl: string,
  endImageUrl: string | null,
  apiKey: string
): Promise<string> {
  // 行级注释：根据是否有尾帧选择不同的 prompt
  const systemPrompt = endImageUrl
    ? VL_PROMPTS.VIDEO_PROMPT_START_END
    : VL_PROMPTS.VIDEO_PROMPT_SINGLE;

  const result = await analyzeImage({
    imageUrl,
    endImageUrl: endImageUrl || undefined,
    apiKey,
    prompt: systemPrompt
  });

  // 行级注释：清理返回内容，移除可能的引号包裹
  return result.content.replace(/^["']|["']$/g, '');
}

