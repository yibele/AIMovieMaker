# 激活码系统文档

## 📋 概述

激活码系统是一个基于手机号的用户激活方案，允许用户通过手机号 + 激活码的方式获取 24 小时的使用权限。系统会为每个手机号分配专属的 Google API 凭证（Bearer Token 和 Cookie）。

### 核心特性
- ✅ 保留 Supabase Auth（Google/GitHub 登录）
- ✅ 登录后弹出手机号绑定界面
- ✅ 通过激活码验证手机号
- ✅ 为每个手机号分配专属 Google 凭证
- ✅ 24 小时自动过期
- ✅ API 自动优先使用用户专属凭证

---

## 🗄️ 一、数据库设计

### 1.1 扩展 profiles 表

```sql
-- 在现有 profiles 表中添加激活相关字段
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),              -- 绑定的手机号
  ADD COLUMN IF NOT EXISTS google_bearer_token TEXT,       -- 专属 Google Bearer Token
  ADD COLUMN IF NOT EXISTS google_cookie TEXT,             -- 专属 Google Cookie
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,         -- 激活时间
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;           -- 过期时间（activated_at + 24小时）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_expires_at ON profiles(expires_at);
```

### 1.2 创建激活码表

```sql
-- 激活码表：存储手机号和对应的激活码
CREATE TABLE IF NOT EXISTS activation_codes (
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
  
  -- 约束
  UNIQUE(phone, code)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_activation_phone_code ON activation_codes(phone, code);
CREATE INDEX IF NOT EXISTS idx_activation_is_used ON activation_codes(is_used);
```

### 1.3 创建手机号凭证表

```sql
-- 手机号凭证表：存储手机号对应的 Google 凭证（管理员配置）
CREATE TABLE IF NOT EXISTS phone_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,            -- 手机号（唯一）
  
  -- Google 凭证
  google_bearer_token TEXT NOT NULL,            -- Google Bearer Token
  google_cookie TEXT,                           -- Google Cookie（可选）
  
  -- 元数据
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,                                   -- 备注
  
  -- 索引
  INDEX idx_phone (phone)
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_phone_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_phone_credentials_updated_at
  BEFORE UPDATE ON phone_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_credentials_updated_at();
```

### 1.4 数据表关系

```
auth.users (Supabase Auth)
    ↓ (一对一)
profiles
    ↓ (通过 phone)
phone_credentials ←→ activation_codes
```

---

## 🔌 二、API 接口

### 2.1 激活接口

**路径：** `POST /api/activation/activate`

**请求头：**
```http
Content-Type: application/json
Authorization: Bearer {supabase_access_token}
```

**请求体：**
```json
{
  "phone": "13800138000",
  "code": "ABC123"
}
```

**响应（成功）：**
```json
{
  "success": true,
  "expiresAt": "2024-11-24T12:00:00.000Z"
}
```

**响应（失败）：**
```json
{
  "error": "手机号或激活码错误"
}
```

**错误码：**
- `401`: 未登录
- `400`: 手机号或激活码错误
- `403`: 该手机号未配置凭证
- `500`: 服务器错误

### 2.2 检查激活状态接口（可选）

**路径：** `GET /api/activation/status`

**请求头：**
```http
Authorization: Bearer {supabase_access_token}
```

**响应：**
```json
{
  "isActivated": true,
  "phone": "13800138000",
  "expiresAt": "2024-11-24T12:00:00.000Z",
  "remainingHours": 12
}
```

---

## 🔑 三、凭证获取逻辑

### 3.1 优先级机制

系统使用**双层降级**机制获取 Google API 凭证：

```
1. 优先使用用户专属凭证（profiles 表中的 google_bearer_token）
   ↓ (如果未激活或已过期)
2. 降级使用全局凭证（环境变量中的 GOOGLE_BEARER_TOKEN）
```

### 3.2 实现代码

创建 `lib/get-user-credentials.ts`：

```typescript
import { supabase } from './supabaseClient';

export async function getUserCredentials(userId?: string): Promise<{
  bearerToken: string;
  cookie?: string;
  isUserToken: boolean;
}> {
  // 1. 如果有 userId，尝试从 profiles 获取用户专属凭证
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('google_bearer_token, google_cookie, expires_at')
      .eq('id', userId)
      .single();
    
    // 检查是否有效且未过期
    if (profile?.google_bearer_token && profile.expires_at) {
      const expiresAt = new Date(profile.expires_at);
      const now = new Date();
      
      if (now < expiresAt) {
        console.log('✅ 使用用户专属凭证（手机号绑定）');
        return {
          bearerToken: profile.google_bearer_token,
          cookie: profile.google_cookie,
          isUserToken: true,
        };
      } else {
        console.log('⚠️ 用户凭证已过期');
      }
    }
  }
  
  // 2. 降级：使用全局凭证（环境变量）
  const globalBearerToken = process.env.GOOGLE_BEARER_TOKEN;
  const globalCookie = process.env.GOOGLE_COOKIE;
  
  if (!globalBearerToken) {
    throw new Error('未配置全局凭证，且用户未激活');
  }
  
  console.log('📌 使用全局凭证（环境变量）');
  return {
    bearerToken: globalBearerToken,
    cookie: globalCookie,
    isUserToken: false,
  };
}
```

### 3.3 在 API 中使用

修改现有的 API 路由，例如 `app/api/flow/generate/route.ts`：

```typescript
import { getUserCredentials } from '@/lib/get-user-credentials';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // 获取凭证（自动优先用户凭证）
    const { bearerToken, cookie } = await getUserCredentials(userId);
    
    // 调用 Google API
    const result = await generateImageDirectly(
      body.prompt,
      bearerToken,  // 使用获取到的凭证
      // ... 其他参数
    );
    
    return Response.json(result);
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 📱 四、前端集成

### 4.1 激活弹窗组件

创建 `components/PhoneActivationModal.tsx`：

```tsx
'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Smartphone, Key } from 'lucide-react';

interface PhoneActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhoneActivationModal: React.FC<PhoneActivationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleActivate = async () => {
    if (!phone.trim() || !code.trim()) {
      toast.error('请输入手机号和激活码');
      return;
    }

    setIsLoading(true);
    try {
      // 获取当前 session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('请先登录');
        return;
      }

      // 调用激活接口
      const response = await fetch('/api/activation/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '激活失败');
      }

      toast.success('🎉 激活成功！可以使用 24 小时');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white mb-4">
            <Smartphone className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">绑定手机号</h2>
          <p className="text-slate-500 mt-2">输入手机号和激活码即可使用</p>
        </div>

        <div className="space-y-4">
          {/* 手机号输入框 */}
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="请输入手机号"
              maxLength={11}
              className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
              disabled={isLoading}
            />
          </div>

          {/* 激活码输入框 */}
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="请输入激活码"
              className="w-full pl-11 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-100 outline-none transition-all font-mono"
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
            />
          </div>

          {/* 激活按钮 */}
          <button
            onClick={handleActivate}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {isLoading ? '激活中...' : '立即激活'}
          </button>

          {/* 稍后再说按钮 */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-all"
          >
            稍后再说
          </button>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-slate-400 text-center mt-6">
          没有激活码？关注小红书 <span className="text-violet-500 font-semibold">「你的账号」</span> 获取
        </p>
      </div>
    </div>
  );
};
```

### 4.2 在 Dashboard 中集成

修改 `app/canvas/page.tsx` 或 `components/DashboardView.tsx`：

```tsx
import { PhoneActivationModal } from '@/components/PhoneActivationModal';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Dashboard() {
  const [showActivation, setShowActivation] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkActivationStatus();
  }, []);

  const checkActivationStatus = async () => {
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) return;

    // 查询用户激活状态
    const { data: profile } = await supabase
      .from('profiles')
      .select('expires_at, phone')
      .eq('id', user.id)
      .single();

    // 判断是否需要激活
    const needsActivation = !profile?.phone || 
      !profile?.expires_at || 
      new Date(profile.expires_at) < new Date();

    setShowActivation(needsActivation);
  };

  return (
    <>
      {/* 你的 Dashboard 组件 */}
      <div>
        {/* ... 现有内容 ... */}
      </div>

      {/* 激活码弹窗 */}
      <PhoneActivationModal
        isOpen={showActivation}
        onClose={() => setShowActivation(false)}
        onSuccess={() => checkActivationStatus()}
      />
    </>
  );
}
```

---

## 🛠️ 五、管理员操作

### 5.1 配置手机号凭证

作为管理员，你需要先为手机号配置 Google 凭证：

```sql
-- 1. 在 phone_credentials 表中添加手机号和对应的 Google 凭证
INSERT INTO phone_credentials (
  phone, 
  google_bearer_token, 
  google_cookie, 
  notes
) VALUES (
  '13800138000',
  'ya29.a0AfB_byD...',  -- 你的 Google Bearer Token
  '__Secure-next-auth.session-token=...',  -- 你的 Cookie（可选）
  '小红书推广第1批用户'
);

-- 批量插入多个
INSERT INTO phone_credentials (phone, google_bearer_token, google_cookie, notes) VALUES
  ('13800138000', 'ya29.a0AfB_byD...', '__Secure-next-auth...', '用户1'),
  ('13800138001', 'ya29.a0AfB_byE...', '__Secure-next-auth...', '用户2'),
  ('13800138002', 'ya29.a0AfB_byF...', '__Secure-next-auth...', '用户3');
```

### 5.2 生成激活码

为手机号生成对应的激活码：

```sql
-- 为手机号创建激活码
INSERT INTO activation_codes (phone, code, notes, created_by) VALUES
  ('13800138000', 'ABC123', '小红书推广', 'admin@example.com'),
  ('13800138001', 'DEF456', '小红书推广', 'admin@example.com'),
  ('13800138002', 'GHI789', '小红书推广', 'admin@example.com');

-- 或者使用函数批量生成（可选）
CREATE OR REPLACE FUNCTION generate_activation_code(
  p_phone VARCHAR(20),
  p_notes TEXT DEFAULT NULL
) RETURNS VARCHAR(50) AS $$
DECLARE
  v_code VARCHAR(50);
BEGIN
  -- 生成随机激活码（6位字母+数字）
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  
  -- 插入激活码
  INSERT INTO activation_codes (phone, code, notes, created_by)
  VALUES (p_phone, v_code, p_notes, 'system');
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 使用函数生成激活码
SELECT generate_activation_code('13800138003', '小红书推广');
```

### 5.3 查询激活码使用情况

```sql
-- 查看所有激活码
SELECT 
  ac.phone,
  ac.code,
  ac.is_used,
  ac.used_at,
  p.email AS used_by_email,
  ac.notes,
  ac.created_at
FROM activation_codes ac
LEFT JOIN auth.users u ON ac.used_by = u.id
LEFT JOIN profiles p ON u.id = p.id
ORDER BY ac.created_at DESC;

-- 查看未使用的激活码
SELECT phone, code, created_at, notes
FROM activation_codes
WHERE is_used = FALSE
ORDER BY created_at DESC;

-- 查看已激活的用户
SELECT 
  p.phone,
  p.email,
  p.activated_at,
  p.expires_at,
  CASE 
    WHEN p.expires_at > NOW() THEN '有效'
    ELSE '已过期'
  END AS status
FROM profiles p
WHERE p.phone IS NOT NULL
ORDER BY p.activated_at DESC;
```

### 5.4 重置用户激活状态

```sql
-- 延长用户有效期（再给 24 小时）
UPDATE profiles
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE phone = '13800138000';

-- 清除用户激活状态（需要重新激活）
UPDATE profiles
SET 
  phone = NULL,
  google_bearer_token = NULL,
  google_cookie = NULL,
  activated_at = NULL,
  expires_at = NULL
WHERE phone = '13800138000';

-- 撤销激活码（标记为未使用，可以重新使用）
UPDATE activation_codes
SET 
  is_used = FALSE,
  used_by = NULL,
  used_at = NULL
WHERE code = 'ABC123';
```

---

## 🔄 六、工作流程

### 6.1 用户激活流程

```
1. 用户访问网站
   ↓
2. 点击登录 → 使用 Google/GitHub 登录（Supabase Auth）
   ↓
3. 登录成功 → 进入 Dashboard
   ↓
4. 系统检查 profiles.expires_at
   ↓
   如果未激活或已过期 → 弹出"绑定手机号"弹窗
   ↓
5. 用户输入手机号 + 激活码
   ↓
6. 系统验证：
   - 检查 activation_codes 表中是否存在该手机号+激活码
   - 检查激活码是否已被使用
   - 从 phone_credentials 表获取该手机号对应的 Google 凭证
   ↓
7. 激活成功：
   - 将 Google 凭证写入 profiles 表
   - 设置 expires_at = NOW() + 24小时
   - 标记激活码为已使用
   ↓
8. 用户可以正常使用（24小时内）
   ↓
9. 24小时后过期 → 重新弹出激活窗口
```

### 6.2 API 调用流程

```
用户发起请求（如生成图片）
   ↓
API 路由接收请求
   ↓
调用 getUserCredentials(userId)
   ↓
   检查 profiles 表中的 google_bearer_token 和 expires_at
   ↓
   如果有效且未过期 → 使用用户专属凭证
   如果无效或已过期 → 降级使用全局凭证（环境变量）
   ↓
使用获取到的凭证调用 Google Flow API
   ↓
返回结果给用户
```

---

## 📊 七、数据统计

### 7.1 激活统计 SQL

```sql
-- 总激活码数量
SELECT COUNT(*) AS total_codes FROM activation_codes;

-- 已使用激活码数量
SELECT COUNT(*) AS used_codes FROM activation_codes WHERE is_used = TRUE;

-- 激活率
SELECT 
  COUNT(*) AS total_codes,
  COUNT(CASE WHEN is_used THEN 1 END) AS used_codes,
  ROUND(COUNT(CASE WHEN is_used THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) AS activation_rate
FROM activation_codes;

-- 当前有效用户数
SELECT COUNT(*) AS active_users
FROM profiles
WHERE phone IS NOT NULL 
  AND expires_at > NOW();

-- 今日新增激活用户
SELECT COUNT(*) AS today_activations
FROM profiles
WHERE activated_at::DATE = CURRENT_DATE;

-- 按日期统计激活情况
SELECT 
  DATE(activated_at) AS date,
  COUNT(*) AS activations
FROM profiles
WHERE activated_at IS NOT NULL
GROUP BY DATE(activated_at)
ORDER BY date DESC
LIMIT 30;
```

---

## 🚨 八、注意事项

### 8.1 安全性

1. **凭证保护**
   - Google Bearer Token 和 Cookie 存储在数据库中，不要暴露给前端
   - 使用 Supabase RLS（Row Level Security）保护敏感字段
   - API 路由中使用服务端验证

2. **激活码保护**
   - 激活码应该足够随机，不易被猜测
   - 考虑添加激活码有效期
   - 限制同一手机号的激活次数

3. **RLS 策略示例**

```sql
-- 用户只能查看自己的 profile（但不能看到 google_bearer_token）
CREATE POLICY "Users can view own profile basic info"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 用户不能直接修改凭证字段
CREATE POLICY "Users cannot update credentials"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    google_bearer_token IS NOT DISTINCT FROM (SELECT google_bearer_token FROM profiles WHERE id = auth.uid())
  );
```

### 8.2 性能优化

1. **缓存用户凭证**
   - 可以在内存中缓存用户凭证（5分钟），减少数据库查询
   - 使用 Redis 缓存激活状态

2. **定期清理过期数据**

```sql
-- 创建定期清理函数
CREATE OR REPLACE FUNCTION cleanup_expired_activations()
RETURNS void AS $$
BEGIN
  -- 清理过期超过 7 天的用户凭证
  UPDATE profiles
  SET 
    google_bearer_token = NULL,
    google_cookie = NULL
  WHERE expires_at < NOW() - INTERVAL '7 days'
    AND google_bearer_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- 可以配置 pg_cron 定期执行
-- SELECT cron.schedule('cleanup-expired', '0 2 * * *', 'SELECT cleanup_expired_activations()');
```

### 8.3 错误处理

在 API 中添加详细的错误日志：

```typescript
try {
  // ... 激活逻辑
} catch (error: any) {
  console.error('激活失败:', {
    error: error.message,
    phone: phone.substring(0, 3) + '****' + phone.substring(7), // 脱敏
    code: code.substring(0, 2) + '***',
    userId: user?.id,
    timestamp: new Date().toISOString(),
  });
  
  return NextResponse.json({ error: '激活失败，请稍后重试' }, { status: 500 });
}
```

---

## 🔧 九、环境变量配置

在 `.env.local` 中添加：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 全局 Google 凭证（降级使用）
GOOGLE_BEARER_TOKEN=ya29.a0AfB_byD...
GOOGLE_COOKIE=__Secure-next-auth.session-token=...

# JWT Secret（用于 session 管理，可选）
JWT_SECRET=your-secret-key-here
```

---

## 📝 十、测试清单

### 10.1 功能测试

- [ ] 用户可以正常登录（Google/GitHub）
- [ ] 未激活用户看到激活弹窗
- [ ] 输入正确的手机号+激活码后激活成功
- [ ] 输入错误的激活码提示错误
- [ ] 激活后可以正常使用 API
- [ ] 同一激活码不能被多人使用
- [ ] 24小时后自动过期
- [ ] 过期后重新弹出激活窗口
- [ ] 降级到全局凭证工作正常

### 10.2 安全测试

- [ ] 用户无法直接访问他人的凭证
- [ ] API 正确验证 session token
- [ ] 前端无法看到 Bearer Token
- [ ] RLS 策略生效
- [ ] SQL 注入防护

### 10.3 性能测试

- [ ] 并发激活测试
- [ ] 凭证获取性能
- [ ] 数据库查询性能
- [ ] 过期检查性能

---

## 📚 十一、FAQ

### Q1: 如果用户的 Google 凭证过期了怎么办？

A: 有两种处理方式：
1. 在 `phone_credentials` 表中更新该手机号对应的新凭证
2. 系统会自动降级使用全局凭证

### Q2: 一个手机号可以有多个激活码吗？

A: 可以。`activation_codes` 表允许同一手机号有多个激活码，但每个激活码只能使用一次。

### Q3: 如何延长用户的使用时间？

A: 运行 SQL：
```sql
UPDATE profiles
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE phone = '13800138000';
```

### Q4: 激活码可以重复使用吗？

A: 默认不可以。但如果需要，可以运行：
```sql
UPDATE activation_codes
SET is_used = FALSE, used_by = NULL, used_at = NULL
WHERE code = 'ABC123';
```

### Q5: 如何批量生成激活码？

A: 可以使用提供的 SQL 函数，或者编写脚本批量插入。

---

## 🎯 十二、未来扩展

### 可能的扩展方向：

1. **激活码类型**
   - 支持不同时长的激活码（7天、30天、永久）
   - 支持不同权限的激活码（基础版、高级版）

2. **管理后台**
   - 可视化管理激活码
   - 查看激活统计
   - 批量生成和导出激活码

3. **自动化**
   - 接入支付系统，用户付费后自动生成激活码
   - 接入短信验证，自动发送激活码

4. **监控告警**
   - 凭证即将过期时提醒管理员
   - 异常激活行为告警
   - 使用量统计和告警

---

## 📞 支持

如有问题，请联系技术团队。

---

**版本：** v1.0  
**最后更新：** 2024-11-23  
**作者：** AIMoverMaker Team

