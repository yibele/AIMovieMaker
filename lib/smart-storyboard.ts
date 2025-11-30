/**
 * 智能分镜工具函数
 * 
 * 核心功能：
 * 1. 构造网格布局的 Prompt（让模型生成 N×M 网格图）
 * 2. 客户端切割大图为多张小图
 * 3. 上传切割后的小图获取 mediaId
 */

// 行级注释：网格配置类型
export type GridConfig = {
  rows: number;  // 行数
  cols: number;  // 列数
};

// 行级注释：预设的网格选项
export const GRID_PRESETS = {
  '2x2': { rows: 2, cols: 2, label: '2×2 (4张)', total: 4 },
  '1x4': { rows: 1, cols: 4, label: '1×4 (4张)', total: 4 },
  '2x3': { rows: 2, cols: 3, label: '2×3 (6张)', total: 6 },
} as const;

export type GridPresetKey = keyof typeof GRID_PRESETS;

/**
 * 构造网格布局的 Prompt
 * 将用户输入的 prompt 包裹在强制布局指令中
 * 
 * @param userPrompt 用户输入的原始提示词
 * @param gridConfig 网格配置（行数和列数）
 * @returns 构造好的完整 Prompt
 */
export function buildGridPrompt(
  userPrompt: string,
  gridConfig: GridConfig = { rows: 2, cols: 2 }
): string {
  const { rows, cols } = gridConfig;
  const totalViews = rows * cols;

  // 行级注释：强制布局指令模板
  const gridPrompt = `MANDATORY LAYOUT: Create a precise ${rows}x${cols} GRID containing exactly ${totalViews} distinct panels.
- The output image MUST be a single image divided into a ${rows} (rows) by ${cols} (columns) matrix.
- There must be EXACTLY ${rows} horizontal rows and ${cols} vertical columns.
- Each panel must be completely separated by a thin, distinct, solid black line.
- DO NOT create a collage. DO NOT overlap images. DO NOT create random sizes.
- The grid structure must be perfectly aligned for slicing.

Subject Content: "${userPrompt}"

Styling Instructions:
- Each panel shows the SAME subject/scene from a DIFFERENT angle (e.g., Front, Side, Back, Action, Close-up).
- Maintain perfect consistency of the character/object across all panels.
- Cinematic lighting, high fidelity.

Negative Constraints:
- No text, no captions, no UI elements.
- No watermarks.
- No broken grid lines.`;

  return gridPrompt;
}

/**
 * 将一张大图切割成 rows × cols 张小图
 * 
 * @param imageSource 图片源（base64 data URL 或 图片 URL）
 * @param rows 网格的行数
 * @param cols 网格的列数
 * @returns Promise<string[]> 包含每一块小图的 Base64 数据数组（data:image/png;base64,...）
 */
export function sliceImageGrid(
  imageSource: string,
  rows: number,
  cols: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // 行级注释：必须设置，避免 Canvas 跨域污染

    img.onload = () => {
      const totalWidth = img.width;
      const totalHeight = img.height;

      // 行级注释：计算每一块的尺寸（向下取整，避免浮点数导致边缘溢出）
      const pieceWidth = Math.floor(totalWidth / cols);
      const pieceHeight = Math.floor(totalHeight / rows);

      const pieces: string[] = [];

      // 行级注释：创建临时 Canvas 用于绘制和导出每一块小图
      const canvas = document.createElement('canvas');
      canvas.width = pieceWidth;
      canvas.height = pieceHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('无法获取 Canvas 上下文，请检查浏览器兼容性'));
      }

      // 行级注释：双重循环遍历网格，切割每一块小图
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // 行级注释：清空 Canvas
          ctx.clearRect(0, 0, pieceWidth, pieceHeight);

          // 行级注释：核心切割逻辑 - drawImage 从源图截取指定区域绘制到 Canvas
          ctx.drawImage(
            img,
            c * pieceWidth,   // 源图中当前列的起始 X 坐标
            r * pieceHeight,  // 源图中当前行的起始 Y 坐标
            pieceWidth,       // 截取的宽度
            pieceHeight,      // 截取的高度
            0, 0,             // Canvas 上的起始位置
            pieceWidth,       // 绘制的宽度
            pieceHeight       // 绘制的高度
          );

          // 行级注释：导出为 PNG base64
          pieces.push(canvas.toDataURL('image/png'));
        }
      }

      resolve(pieces);
    };

    img.onerror = (e) => {
      reject(new Error(`图片加载失败: ${e}`));
    };

    // 行级注释：设置图片源，触发加载
    img.src = imageSource;
  });
}

/**
 * 从 base64 data URL 中提取纯 base64 数据
 * 
 * @param dataUrl data:image/png;base64,xxxxx 格式的字符串
 * @returns 纯 base64 字符串（不含前缀）
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1] || '';
  }
  return dataUrl;
}

/**
 * 计算切割后每张小图的预估尺寸
 * 基于 Flow API 返回的 1080P 图片
 * 
 * @param aspectRatio 原图宽高比
 * @param gridConfig 网格配置
 * @returns 每张小图的预估尺寸
 */
export function estimateSlicedImageSize(
  aspectRatio: '16:9' | '9:16' | '1:1',
  gridConfig: GridConfig
): { width: number; height: number } {
  // 行级注释：Flow API 返回的图片分辨率（1080P）
  const baseSize = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1024, height: 1024 },
  };

  const original = baseSize[aspectRatio];
  return {
    width: Math.floor(original.width / gridConfig.cols),
    height: Math.floor(original.height / gridConfig.rows),
  };
}

