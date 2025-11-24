-- ============================================
-- 邀请码系统数据库迁移脚本 (Invitation System)
-- ============================================

-- 1. 系统凭证池 (System Credentials Pool)
-- 存放真实的 Google API 凭证 (Bearer Token, Cookie, ProjectId 等)
create table if not exists public.system_credentials (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- 凭证名称/描述，例如 "VIP Pool 1"
  credentials_json jsonb not null, -- 存放具体的凭证数据 { "bearerToken": "...", "cookie": "...", "projectId": "..." }
  is_active boolean default true, -- 是否可用
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. 邀请码表 (Invitation Codes)
-- 邀请码与凭证池关联
create table if not exists public.invitation_codes (
  code text primary key, -- 邀请码本身作为主键
  credential_id uuid references public.system_credentials(id), -- 关联的凭证
  
  -- 状态
  is_used boolean default false,
  used_by uuid references auth.users(id), -- 被哪个用户使用了
  used_at timestamp with time zone,
  
  -- 元数据
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone, -- 邀请码有效期（可选）
  notes text -- 备注
);

-- 3. 更新 profiles 表
-- 记录用户激活状态
alter table public.profiles 
  add column if not exists activation_status text default 'inactive', -- active, inactive
  add column if not exists activated_code text; -- 记录使用的激活码

-- 4. 安全策略 (RLS)
alter table public.system_credentials enable row level security;
alter table public.invitation_codes enable row level security;

-- 只有 service role (后台 API) 能读写这些敏感表
-- 普通用户无法直接查询 credentials 或 invitation_codes
create policy "Service role only for credentials" on public.system_credentials for all using (false); 
create policy "Service role only for invitation codes" on public.invitation_codes for all using (false);
