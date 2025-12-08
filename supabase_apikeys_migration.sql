-- ============================================================================
-- 用户 API Keys 迁移脚本
-- 为 profiles 表添加用户自己配置的 API Key 字段
-- 注意：dashscope_api_key 是平台提供的，不在此处添加
-- ============================================================================

-- 添加 海螺视频 API Key (DMXAPI)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS hailuo_api_key TEXT;

-- 添加 Sora2 API Key (apimart.ai)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS sora2_api_key TEXT;

-- 添加 fal.ai API Key (高清放大)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS fal_api_key TEXT;

-- 添加注释
COMMENT ON COLUMN public.profiles.hailuo_api_key IS '海螺视频 DMXAPI Key (用户自己配置)';
COMMENT ON COLUMN public.profiles.sora2_api_key IS 'Sora2 视频 API Key - apimart.ai (用户自己配置)';
COMMENT ON COLUMN public.profiles.fal_api_key IS 'fal.ai 高清放大 API Key (用户自己配置)';

-- 验证字段添加成功
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('hailuo_api_key', 'sora2_api_key', 'fal_api_key');

