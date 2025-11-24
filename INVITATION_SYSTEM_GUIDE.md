# 邀请码系统完整指南 (Invitation System Guide)

本文档整合了邀请码系统（双轨制鉴权）的所有相关资源，包括数据库脚本、接口说明和使用指南。

## 1. 系统概述

**双轨制鉴权 (Dual-Track Authentication)** 允许用户通过两种方式使用系统：
1.  **托管模式 (System Mode)**: 用户输入邀请码激活，服务器自动下发并托管 Token/Cookie。用户无需手动配置。
2.  **手动模式 (Manual Mode)**: 用户未激活，需在设置面板手动输入自己的 Token/Cookie。

---

## 2. 数据库部署 (Supabase SQL)

请在 Supabase 的 **SQL Editor** 中依次执行以下两部分脚本。

### 2.1 第一步：建表与结构变更 (Schema Setup)

此脚本创建必要的表结构和安全策略。

```sql
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
```

### 2.2 第二步：插入测试数据 (Data Insertion)

**注意：** 执行前请替换 JSON 中的 `YOUR_...` 为真实值。

```sql
-- ============================================
-- 插入测试凭证和邀请码 SQL 脚本
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

-- 验证插入结果
SELECT code, is_used, notes FROM public.invitation_codes;
```

---

## 3. API 接口说明

后端接口位于 `app/api/activation/activate/route.ts`。

### 3.1 激活接口 (POST)
*   **功能**: 验证邀请码，绑定用户，返回系统凭证。
*   **请求**:
    ```json
    POST /api/activation/activate
    Header: Authorization: Bearer <user_token>
    Body: { "code": "VIP-001" }
    ```
*   **响应**:
    ```json
    {
      "success": true,
      "message": "激活成功",
      "credentials": { ... } // 包含 apiKey, bearerToken, cookie 等
    }
    ```

### 3.2 同步接口 (GET)
*   **功能**: 检查当前用户是否已激活，如果已激活，返回最新凭证。用于用户换设备登录或凭证更新。
*   **请求**:
    ```json
    GET /api/activation/activate
    Header: Authorization: Bearer <user_token>
    ```
*   **响应**:
    ```json
    {
      "activated": true,
      "status": "active",
      "credentials": { ... }
    }
    ```

---

## 4. 前端功能与测试

1.  **入口**: 登录后，仪表盘 (Dashboard) 顶部会出现一个 **礼物图标** (Gift Icon)。
2.  **激活**: 点击礼物图标，输入 `VIP-001` (或您生成的其他码)。
3.  **效果**:
    *   激活成功后，系统会自动将云端凭证填入本地配置。
    *   右上角的“设置”面板中，Cookie/Token 字段将被自动填充（用户可见，但无需操作）。
    *   刷新页面后，系统会自动调用同步接口，保持凭证最新。
4.  **验证**: 创建一个新项目或生成一张图片，检查是否能正常工作且无需手动填写 Cookie。

---

**文档生成时间:** 2024-11-25
**版本:** v1.0
