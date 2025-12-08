-- ============================================================================
-- 用户 API Keys 迁移脚本
-- 为 profiles 表添加更多 API Key 字段
-- ============================================================================

-- 添加 海螺视频 API Key
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS hailuo_api_key TEXT;

-- 添加 Sora2 API Key
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS sora2_api_key TEXT;

-- 添加 fal.ai API Key
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS fal_api_key TEXT;

-- 添加 账号类型 (pro/ultra)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS account_tier TEXT DEFAULT 'pro';

-- 添加注释
COMMENT ON COLUMN public.profiles.dashscope_api_key IS '阿里云 DashScope API Key (Qwen)';
COMMENT ON COLUMN public.profiles.hailuo_api_key IS '海螺视频 DMXAPI Key';
COMMENT ON COLUMN public.profiles.sora2_api_key IS 'Sora2 视频 API Key (apimart.ai)';
COMMENT ON COLUMN public.profiles.fal_api_key IS 'fal.ai 高清放大 API Key';
COMMENT ON COLUMN public.profiles.account_tier IS '账号类型: pro 或 ultra';

-- 验证字段添加成功
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('dashscope_api_key', 'hailuo_api_key', 'sora2_api_key', 'fal_api_key', 'account_tier');

