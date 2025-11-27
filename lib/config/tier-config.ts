/**
 * 套餐配置适配器
 * 
 * 核心原则：
 * 1. 所有 Pro/Ultra 差异只在此文件定义
 * 2. 其他代码通过适配器获取配置，不做条件判断
 * 3. 新增功能时只需在此文件添加配置
 * 
 * @example
 * // 使用示例
 * import { getVideoApiConfig } from '@/lib/config/tier-config';
 * const config = getVideoApiConfig('text-to-video', 'pro', '16:9', 'fast');
 * // => { videoModelKey: 'veo_3_1_t2v_fast', userPaygateTier: 'PAYGATE_TIER_ONE', ... }
 */

// ============================================================================
// 类型定义
// ============================================================================

// 账号套餐类型
export type AccountTier = 'pro' | 'ultra';

// 视频生成模式
export type VideoMode = 'quality' | 'fast';

// 宽高比
export type AspectRatio = '16:9' | '9:16' | '1:1';

// 图片生成模型
export type ImageModel = 'nanobanana' | 'nanobananapro';

// 视频生成类型
export type VideoGenerationType = 
  | 'text-to-video'        // 文生视频
  | 'image-to-video'       // 图生视频（仅首帧）
  | 'image-to-video-fl'    // 图生视频（首尾帧）
  | 'extend'               // 视频延长
  | 'reshoot'              // 镜头控制重拍
  | 'upsample';            // 超清放大

// PaygateTier 类型
export type PaygateTier = 'PAYGATE_TIER_ONE' | 'PAYGATE_TIER_TWO';

// 视频宽高比枚举
export type VideoAspectRatioEnum = 
  | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  | 'VIDEO_ASPECT_RATIO_PORTRAIT'
  | 'VIDEO_ASPECT_RATIO_SQUARE';

// 图片宽高比枚举
export type ImageAspectRatioEnum = 
  | 'IMAGE_ASPECT_RATIO_LANDSCAPE'
  | 'IMAGE_ASPECT_RATIO_PORTRAIT'
  | 'IMAGE_ASPECT_RATIO_SQUARE';

// ============================================================================
// 套餐能力定义
// ============================================================================

export interface TierCapabilities {
  // 支持的视频模式
  supportedVideoModes: VideoMode[];
  // 默认视频模式
  defaultVideoMode: VideoMode;
  // PaygateTier
  paygateTier: PaygateTier;
  // 是否支持超清放大
  supportsUpsample: boolean;
  // 是否支持 Quality 模式
  supportsQualityMode: boolean;
  // 最大单次生成图片数量
  maxImageGenerationCount: number;
}

// ============================================================================
// 套餐能力配置（单一数据源）
// ============================================================================

const TIER_CAPABILITIES: Record<AccountTier, TierCapabilities> = {
  pro: {
    supportedVideoModes: ['fast'],
    defaultVideoMode: 'fast',
    paygateTier: 'PAYGATE_TIER_ONE',
    supportsUpsample: true,
    supportsQualityMode: false,
    maxImageGenerationCount: 4,
  },
  ultra: {
    supportedVideoModes: ['quality', 'fast'],
    defaultVideoMode: 'quality',
    paygateTier: 'PAYGATE_TIER_TWO',
    supportsUpsample: true,
    supportsQualityMode: true,
    maxImageGenerationCount: 4,
  },
};

// ============================================================================
// 视频模型命名映射表（核心配置）
// 
// 命名规则：
// - 文生视频: veo_3_1_t2v_{fast_}{portrait_}{ultra}
// - 图生视频: veo_3_1_i2v_s_{fast_}{portrait_}{ultra}{_fl}
// - 延长视频: veo_3_1_extend_{fast_}{aspect}{_ultra}
// - 镜头控制: veo_3_0_reshoot_{aspect}
// - 超清放大: veo_2_1080p_upsampler_8s (固定)
// ============================================================================

interface VideoModelMapping {
  // [tier][mode][aspectRatio] => modelKey
  [tier: string]: {
    [mode: string]: {
      [aspect: string]: string;
    };
  };
}

// 文生视频模型映射
const TEXT_TO_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      '16:9': 'veo_3_1_t2v_fast',
      '9:16': 'veo_3_1_t2v_fast_portrait',
      '1:1': 'veo_3_1_t2v_fast',  // 方形使用横屏模型（如果API不支持方形）
    },
    quality: {
      // Pro 不支持 quality，但为了代码健壮性提供 fallback
      '16:9': 'veo_3_1_t2v_fast',
      '9:16': 'veo_3_1_t2v_fast_portrait',
      '1:1': 'veo_3_1_t2v_fast',
    },
  },
  ultra: {
    fast: {
      '16:9': 'veo_3_1_t2v_fast_ultra',
      '9:16': 'veo_3_1_t2v_fast_ultra',  // 根据代码注释，portrait 也用同样的 key
      '1:1': 'veo_3_1_t2v_fast_ultra',
    },
    quality: {
      '16:9': 'veo_3_1_t2v',
      '9:16': 'veo_3_1_t2v',  // quality portrait 也用同样的 key
      '1:1': 'veo_3_1_t2v',
    },
  },
};

// 图生视频模型映射（仅首帧）
const IMAGE_TO_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      '16:9': 'veo_3_1_i2v_s_fast',
      '9:16': 'veo_3_1_i2v_s_fast_portrait',
      '1:1': 'veo_3_1_i2v_s_fast',
    },
    quality: {
      // Pro 不支持 quality，fallback 到 fast
      '16:9': 'veo_3_1_i2v_s_fast',
      '9:16': 'veo_3_1_i2v_s_fast_portrait',
      '1:1': 'veo_3_1_i2v_s_fast',
    },
  },
  ultra: {
    fast: {
      '16:9': 'veo_3_1_i2v_s_fast_ultra',
      '9:16': 'veo_3_1_i2v_s_fast_portrait_ultra',
      '1:1': 'veo_3_1_i2v_s_fast_ultra',
    },
    quality: {
      '16:9': 'veo_3_1_i2v_s',
      '9:16': 'veo_3_1_i2v_s_portrait',
      '1:1': 'veo_3_1_i2v_s',
    },
  },
};

// 图生视频模型映射（首尾帧）
const IMAGE_TO_VIDEO_FL_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      '16:9': 'veo_3_1_i2v_s_fast_fl',
      '9:16': 'veo_3_1_i2v_s_fast_portrait_fl',
      '1:1': 'veo_3_1_i2v_s_fast_fl',
    },
    quality: {
      // Pro 不支持 quality，fallback 到 fast
      '16:9': 'veo_3_1_i2v_s_fast_fl',
      '9:16': 'veo_3_1_i2v_s_fast_portrait_fl',
      '1:1': 'veo_3_1_i2v_s_fast_fl',
    },
  },
  ultra: {
    fast: {
      '16:9': 'veo_3_1_i2v_s_fast_ultra_fl',
      '9:16': 'veo_3_1_i2v_s_fast_portrait_ultra_fl',
      '1:1': 'veo_3_1_i2v_s_fast_ultra_fl',
    },
    quality: {
      '16:9': 'veo_3_1_i2v_s_fl',
      '9:16': 'veo_3_1_i2v_s_portrait_fl',
      '1:1': 'veo_3_1_i2v_s_fl',
    },
  },
};

// 视频延长模型映射
const EXTEND_VIDEO_MODELS: VideoModelMapping = {
  pro: {
    fast: {
      '16:9': 'veo_3_1_extend_fast_landscape',
      '9:16': 'veo_3_1_extend_fast_portrait',
      '1:1': 'veo_3_1_extend_fast_square',
    },
    quality: {
      '16:9': 'veo_3_1_extend_landscape',
      '9:16': 'veo_3_1_extend_portrait',
      '1:1': 'veo_3_1_extend_square',
    },
  },
  ultra: {
    fast: {
      '16:9': 'veo_3_1_extend_fast_landscape_ultra',
      '9:16': 'veo_3_1_extend_fast_portrait_ultra',
      '1:1': 'veo_3_1_extend_fast_square_ultra',
    },
    quality: {
      '16:9': 'veo_3_1_extend_landscape_ultra',
      '9:16': 'veo_3_1_extend_portrait_ultra',
      '1:1': 'veo_3_1_extend_square_ultra',
    },
  },
};

// 镜头控制模型映射（不区分 tier 和 mode）
const RESHOOT_VIDEO_MODELS: Record<AspectRatio, string> = {
  '16:9': 'veo_3_0_reshoot_landscape',
  '9:16': 'veo_3_0_reshoot_portrait',
  '1:1': 'veo_3_0_reshoot_square',
};

// 超清放大模型（固定）
const UPSAMPLE_VIDEO_MODEL = 'veo_2_1080p_upsampler_8s';

// ============================================================================
// 适配器函数（对外接口）
// ============================================================================

/**
 * 获取套餐能力
 */
export function getTierCapabilities(tier: AccountTier): TierCapabilities {
  return TIER_CAPABILITIES[tier];
}

/**
 * 获取有效的视频模式
 * Pro 强制使用 fast，Ultra 可选 quality/fast
 * 
 * @param tier 账号套餐
 * @param requestedMode 请求的视频模式
 * @returns 实际使用的视频模式
 */
export function getEffectiveVideoMode(tier: AccountTier, requestedMode?: VideoMode): VideoMode {
  const capabilities = TIER_CAPABILITIES[tier];
  
  // 如果没有请求模式，使用默认模式
  if (!requestedMode) {
    return capabilities.defaultVideoMode;
  }
  
  // 如果请求的模式不支持，使用默认模式
  if (!capabilities.supportedVideoModes.includes(requestedMode)) {
    console.warn(
      `⚠️ ${tier} 账号不支持 ${requestedMode} 模式，自动切换到 ${capabilities.defaultVideoMode}`
    );
    return capabilities.defaultVideoMode;
  }
  
  return requestedMode;
}

/**
 * 获取 PaygateTier
 */
export function getPaygateTier(tier: AccountTier): PaygateTier {
  return TIER_CAPABILITIES[tier].paygateTier;
}

/**
 * 获取视频宽高比枚举
 */
export function getVideoAspectRatioEnum(aspectRatio: AspectRatio): VideoAspectRatioEnum {
  switch (aspectRatio) {
    case '9:16':
      return 'VIDEO_ASPECT_RATIO_PORTRAIT';
    case '1:1':
      return 'VIDEO_ASPECT_RATIO_SQUARE';
    default:
      return 'VIDEO_ASPECT_RATIO_LANDSCAPE';
  }
}

/**
 * 获取图片宽高比枚举
 */
export function getImageAspectRatioEnum(aspectRatio: AspectRatio): ImageAspectRatioEnum {
  switch (aspectRatio) {
    case '9:16':
      return 'IMAGE_ASPECT_RATIO_PORTRAIT';
    case '1:1':
      return 'IMAGE_ASPECT_RATIO_SQUARE';
    default:
      return 'IMAGE_ASPECT_RATIO_LANDSCAPE';
  }
}

/**
 * 获取视频模型 Key（核心函数）
 * 
 * @param type 视频生成类型
 * @param tier 账号套餐
 * @param aspectRatio 宽高比
 * @param videoMode 视频模式（quality/fast），Pro 会自动降级为 fast
 * @returns 完整的 videoModelKey
 * 
 * @example
 * // Pro + 文生视频 + 横屏
 * getVideoModelKey('text-to-video', 'pro', '16:9', 'fast') 
 * // => 'veo_3_1_t2v_fast'
 * 
 * // Ultra + 文生视频 + 横屏 + quality
 * getVideoModelKey('text-to-video', 'ultra', '16:9', 'quality') 
 * // => 'veo_3_1_t2v'
 * 
 * // Ultra + 图生视频 + 竖屏 + 首尾帧 + fast
 * getVideoModelKey('image-to-video-fl', 'ultra', '9:16', 'fast') 
 * // => 'veo_3_1_i2v_s_fast_portrait_ultra_fl'
 */
export function getVideoModelKey(
  type: VideoGenerationType,
  tier: AccountTier,
  aspectRatio: AspectRatio,
  videoMode?: VideoMode
): string {
  // 超清放大是固定模型，直接返回
  if (type === 'upsample') {
    return UPSAMPLE_VIDEO_MODEL;
  }
  
  // 镜头控制重拍只区分宽高比
  if (type === 'reshoot') {
    return RESHOOT_VIDEO_MODELS[aspectRatio];
  }
  
  // 获取有效的视频模式（Pro 会自动降级为 fast）
  const effectiveMode = getEffectiveVideoMode(tier, videoMode);
  
  // 根据类型选择模型映射表
  let modelMapping: VideoModelMapping;
  switch (type) {
    case 'text-to-video':
      modelMapping = TEXT_TO_VIDEO_MODELS;
      break;
    case 'image-to-video':
      modelMapping = IMAGE_TO_VIDEO_MODELS;
      break;
    case 'image-to-video-fl':
      modelMapping = IMAGE_TO_VIDEO_FL_MODELS;
      break;
    case 'extend':
      modelMapping = EXTEND_VIDEO_MODELS;
      break;
    default:
      throw new Error(`未知的视频生成类型: ${type}`);
  }
  
  // 从映射表中获取模型 Key
  const modelKey = modelMapping[tier]?.[effectiveMode]?.[aspectRatio];
  
  if (!modelKey) {
    throw new Error(
      `找不到视频模型配置: type=${type}, tier=${tier}, mode=${effectiveMode}, aspect=${aspectRatio}`
    );
  }
  
  return modelKey;
}

/**
 * 验证功能是否支持当前套餐
 */
export function isFeatureSupported(
  feature: 'upsample' | 'quality_mode' | 'extend' | 'reshoot',
  tier: AccountTier,
  aspectRatio?: AspectRatio
): { supported: boolean; reason?: string } {
  const capabilities = TIER_CAPABILITIES[tier];
  
  switch (feature) {
    case 'upsample':
      // 超清放大只支持 16:9
      if (aspectRatio && aspectRatio !== '16:9') {
        return { supported: false, reason: '超清放大仅支持 16:9 横屏视频' };
      }
      return { supported: capabilities.supportsUpsample };
      
    case 'quality_mode':
      return { 
        supported: capabilities.supportsQualityMode,
        reason: capabilities.supportsQualityMode ? undefined : 'Pro 账号只支持 Fast 模式'
      };
      
    case 'extend':
    case 'reshoot':
      return { supported: true };
      
    default:
      return { supported: true };
  }
}

// ============================================================================
// API 请求配置（统一接口）
// ============================================================================

/**
 * 视频 API 请求配置
 */
export interface VideoApiConfig {
  videoModelKey: string;
  userPaygateTier: PaygateTier;
  effectiveVideoMode: VideoMode;
  aspectRatioEnum: VideoAspectRatioEnum;
}

/**
 * 图片 API 请求配置
 */
export interface ImageApiConfig {
  imageModelName: 'GEM_PIX' | 'GEM_PIX_2';
  aspectRatioEnum: ImageAspectRatioEnum;
}

/**
 * 获取视频 API 请求配置（统一入口）
 * 
 * 这是最核心的函数，一次调用获取所有需要的配置参数
 * 
 * @example
 * const config = getVideoApiConfig('text-to-video', 'pro', '16:9', 'fast');
 * // config = {
 * //   videoModelKey: 'veo_3_1_t2v_fast',
 * //   userPaygateTier: 'PAYGATE_TIER_ONE',
 * //   effectiveVideoMode: 'fast',
 * //   aspectRatioEnum: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
 * // }
 */
export function getVideoApiConfig(
  type: VideoGenerationType,
  tier: AccountTier,
  aspectRatio: AspectRatio,
  videoMode?: VideoMode
): VideoApiConfig {
  const effectiveMode = getEffectiveVideoMode(tier, videoMode);
  
  return {
    videoModelKey: getVideoModelKey(type, tier, aspectRatio, effectiveMode),
    userPaygateTier: getPaygateTier(tier),
    effectiveVideoMode: effectiveMode,
    aspectRatioEnum: getVideoAspectRatioEnum(aspectRatio),
  };
}

/**
 * 获取图片 API 请求配置
 * 
 * @example
 * const config = getImageApiConfig('pro', '16:9', 'nanobanana');
 * // config = {
 * //   imageModelName: 'GEM_PIX',
 * //   aspectRatioEnum: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
 * // }
 */
export function getImageApiConfig(
  tier: AccountTier,
  aspectRatio: AspectRatio,
  model?: ImageModel
): ImageApiConfig {
  return {
    imageModelName: model === 'nanobananapro' ? 'GEM_PIX_2' : 'GEM_PIX',
    aspectRatioEnum: getImageAspectRatioEnum(aspectRatio),
  };
}

// ============================================================================
// 调试工具（开发环境使用）
// ============================================================================

/**
 * 打印所有视频模型配置（用于调试）
 */
export function debugPrintAllVideoModels(): void {
  const types: VideoGenerationType[] = [
    'text-to-video', 
    'image-to-video', 
    'image-to-video-fl', 
    'extend', 
    'reshoot', 
    'upsample'
  ];
  const tiers: AccountTier[] = ['pro', 'ultra'];
  const aspects: AspectRatio[] = ['16:9', '9:16', '1:1'];
  const modes: VideoMode[] = ['quality', 'fast'];

  console.log('=== 视频模型配置一览 ===');
  
  for (const type of types) {
    console.log(`\n【${type}】`);
    for (const tier of tiers) {
      for (const mode of modes) {
        for (const aspect of aspects) {
          try {
            const modelKey = getVideoModelKey(type, tier, aspect, mode);
            const effectiveMode = getEffectiveVideoMode(tier, mode);
            console.log(
              `  ${tier.padEnd(5)} | ${mode.padEnd(7)} (实际:${effectiveMode.padEnd(7)}) | ${aspect} => ${modelKey}`
            );
          } catch (e) {
            console.log(
              `  ${tier.padEnd(5)} | ${mode.padEnd(7)} | ${aspect} => ❌ 不支持`
            );
          }
        }
      }
    }
  }
}

