-- ============================================
-- 激活码系统数据库迁移脚本
-- 版本：v1.0
-- 日期：2024-11-23
-- ============================================

-- 1. 扩展 profiles 表（添加激活相关字段）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),              -- 绑定的手机号
  ADD COLUMN IF NOT EXISTS google_bearer_token TEXT,       -- 专属 Google Bearer Token
  ADD COLUMN IF NOT EXISTS google_cookie TEXT,             -- 专属 Google Cookie
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,         -- 激活时间
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;           -- 过期时间（activated_at + 24小时）

-- 创建 profiles 表的索引
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_expires_at ON public.profiles(expires_at);

-- 2. 创建激活码表
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,                   -- 手机号
  code VARCHAR(50) NOT NULL,                    -- 激活码
  
  -- 状态
  is_used BOOLEAN DEFAULT FALSE,                -- 是否已使用
  used_by UUID REFERENCES auth.users(id),       -- 使用者
  used_at TIMESTAMP,                            -- 使用时间
  
  -- 元数据
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,                              -- 创建者（管理员）
  notes TEXT,                                   -- 备注（如：小红书推广第1批）
  
  -- 约束：同一手机号不能有重复的激活码
  UNIQUE(phone, code)
);

-- 创建 activation_codes 表的索引
CREATE INDEX IF NOT EXISTS idx_activation_phone_code ON public.activation_codes(phone, code);
CREATE INDEX IF NOT EXISTS idx_activation_is_used ON public.activation_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_activation_created_at ON public.activation_codes(created_at);

-- 3. 创建手机号凭证表（存储手机号对应的 Google 凭证）
CREATE TABLE IF NOT EXISTS public.phone_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,            -- 手机号（唯一）
  
  -- Google 凭证
  google_bearer_token TEXT NOT NULL,            -- Google Bearer Token
  google_cookie TEXT,                           -- Google Cookie（可选）
  
  -- 元数据
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT                                    -- 备注
);

-- 创建 phone_credentials 表的索引
CREATE INDEX IF NOT EXISTS idx_phone_credentials_phone ON public.phone_credentials(phone);

-- 4. 创建自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_phone_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_phone_credentials_updated_at ON public.phone_credentials;
CREATE TRIGGER trigger_update_phone_credentials_updated_at
  BEFORE UPDATE ON public.phone_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_credentials_updated_at();

-- 5. 启用 Row Level Security (RLS)
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_credentials ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略

-- activation_codes: 只有管理员可以操作（通过 Service Role Key）
-- 普通用户不能直接访问激活码表
DO $$ BEGIN
  CREATE POLICY "Service role can manage activation codes"
    ON public.activation_codes
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- phone_credentials: 只有管理员可以操作
-- 普通用户不能直接访问凭证表
DO $$ BEGIN
  CREATE POLICY "Service role can manage phone credentials"
    ON public.phone_credentials
    FOR ALL
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles: 用户只能查看自己的基本信息，不能看到凭证字段
-- 注意：这会覆盖之前的策略，需要重新创建
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

DO $$ BEGIN
  CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own basic profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
      auth.uid() = id
      -- 防止用户直接修改凭证字段
      AND google_bearer_token IS NOT DISTINCT FROM (SELECT google_bearer_token FROM profiles WHERE id = auth.uid())
      AND google_cookie IS NOT DISTINCT FROM (SELECT google_cookie FROM profiles WHERE id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. 创建实用函数

-- 生成随机激活码的函数
CREATE OR REPLACE FUNCTION generate_activation_code(
  p_phone VARCHAR(20),
  p_notes TEXT DEFAULT NULL
) RETURNS VARCHAR(50) AS $$
DECLARE
  v_code VARCHAR(50);
BEGIN
  -- 生成随机激活码（6位大写字母+数字）
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
  
  -- 插入激活码
  INSERT INTO public.activation_codes (phone, code, notes, created_by)
  VALUES (p_phone, v_code, p_notes, 'system');
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 清理过期激活的函数（可选，用于定期清理）
CREATE OR REPLACE FUNCTION cleanup_expired_activations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 清理过期超过 7 天的用户凭证
  UPDATE public.profiles
  SET 
    google_bearer_token = NULL,
    google_cookie = NULL
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND google_bearer_token IS NOT NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 插入测试数据（可选，用于测试）
-- 取消注释以下代码来插入测试数据

/*
-- 插入测试手机号凭证
INSERT INTO public.phone_credentials (phone, google_bearer_token, google_cookie, notes)
VALUES 
  ('13800138000', 'test_token_1', 'test_cookie_1', '测试账号1'),
  ('13800138001', 'test_token_2', 'test_cookie_2', '测试账号2')
ON CONFLICT (phone) DO NOTHING;

-- 为测试手机号生成激活码
INSERT INTO public.activation_codes (phone, code, notes, created_by)
VALUES 
  ('13800138000', 'TEST01', '测试激活码1', 'admin'),
  ('13800138001', 'TEST02', '测试激活码2', 'admin')
ON CONFLICT (phone, code) DO NOTHING;
*/

-- 9. 创建视图：查看激活统计（可选）
CREATE OR REPLACE VIEW activation_stats AS
SELECT 
  COUNT(*) AS total_codes,
  COUNT(CASE WHEN is_used THEN 1 END) AS used_codes,
  COUNT(CASE WHEN NOT is_used THEN 1 END) AS unused_codes,
  ROUND(
    COUNT(CASE WHEN is_used THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*)::NUMERIC, 0) * 100, 
    2
  ) AS activation_rate
FROM public.activation_codes;

CREATE OR REPLACE VIEW active_users_stats AS
SELECT 
  COUNT(*) AS total_activated_users,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) AS active_users,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) AS expired_users
FROM public.profiles
WHERE phone IS NOT NULL;

-- ============================================
-- 迁移完成
-- ============================================

-- 验证表是否创建成功
DO $$
BEGIN
  RAISE NOTICE '✅ 激活码系统迁移完成！';
  RAISE NOTICE '表创建状态:';
  RAISE NOTICE '  - profiles 表已扩展';
  RAISE NOTICE '  - activation_codes 表: %', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activation_codes') 
    THEN '已创建' ELSE '创建失败' END;
  RAISE NOTICE '  - phone_credentials 表: %', 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phone_credentials') 
    THEN '已创建' ELSE '创建失败' END;
END $$;

