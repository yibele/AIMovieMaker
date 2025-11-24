-- ============================================
-- 插入测试凭证和邀请码 SQL 脚本
-- 使用方法：
-- 1. 将下方的 YOUR_... 替换为真实的 Google 凭证信息。
-- 2. 复制全部内容到 Supabase SQL Editor 执行。
-- ============================================

-- 1. 插入系统凭证 (System Credentials)
WITH new_credential AS (
  INSERT INTO public.system_credentials (name, credentials_json, is_active)
  VALUES (
    'VIP Pool 1', -- 凭证池名称
    '{
      "cookie": "YOUR_GOOGLE_COOKIE_HERE", 
      "bearerToken": "YOUR_BEARER_TOKEN_HERE",
      "projectId": "YOUR_PROJECT_ID_HERE",
      "apiKey": "YOUR_API_KEY_HERE"
    }'::jsonb,
    true -- 设置为 true 表示启用
  )
  RETURNING id
)
-- 2. 生成 5 个测试邀请码 (VIP-001 ~ VIP-005)
INSERT INTO public.invitation_codes (code, credential_id, notes)
SELECT 
  'VIP-' || to_char(generate_series(1, 5), 'FM000'), -- 生成 VIP-001, VIP-002, ...
  id, 
  'Test Batch 1'
FROM new_credential;

-- 查询结果验证
SELECT code, is_used, notes FROM public.invitation_codes;
