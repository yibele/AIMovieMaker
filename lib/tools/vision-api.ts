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
} as const;

