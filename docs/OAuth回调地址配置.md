# OAuth 回调地址配置指南

## 问题描述
部署到服务器后，Google 登录时跳转到 `http://localhost:3000` 而不是生产域名。

## 快速解决方案（5 分钟）

### 第一步：获取你的生产域名
- **Vercel**: `https://your-app.vercel.app`
- **Railway**: `https://your-app.railway.app`
- **自己的服务器**: `https://your-domain.com`

### 第二步：配置 Supabase
1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 点击左侧 **Authentication** （认证）
4. 点击 **URL Configuration** （URL 配置）
5. 找到 **Redirect URLs** 部分
6. 点击 **Add URL**，添加以下地址：

```
https://your-domain.com/*
https://your-domain.com/
http://localhost:3000/*
```

**重要**：
- 每个地址都要单独添加
- `/*` 表示支持所有子路径
- 不要忘记也保留 `localhost:3000`（开发环境使用）

### 第三步：设置 Site URL
在同一个页面，找到 **Site URL** 字段，设置为：
```
https://your-domain.com
```

### 第四步：保存并等待
1. 点击 **Save** 保存
2. 等待 1-2 分钟让配置生效
3. 清除浏览器缓存
4. 重新测试登录

## 示例配置

### Vercel 部署示例
```
Site URL:
https://ai-movie-maker.vercel.app

Redirect URLs:
https://ai-movie-maker.vercel.app/*
https://ai-movie-maker.vercel.app/
http://localhost:3000/*
```

### 自定义域名示例
```
Site URL:
https://www.myapp.com

Redirect URLs:
https://www.myapp.com/*
https://www.myapp.com/
https://myapp.com/*
https://myapp.com/
http://localhost:3000/*
```

## 验证是否配置成功

### 方法 1：查看浏览器控制台
1. 打开浏览器开发者工具（F12）
2. 点击 Google 登录
3. 查看 Network 标签中的重定向 URL
4. 应该看到跳转到你的生产域名而不是 localhost

### 方法 2：检查 Supabase 配置
访问以下 URL（替换你的项目 ID）：
```
https://your-project.supabase.co/auth/v1/settings
```

应该看到类似的 JSON 响应：
```json
{
  "external": {
    "google": true
  },
  "external_labels": {
    "google": "Google"
  },
  "disable_signup": false,
  "autoconfirm": false
}
```

## 常见错误

### ❌ 错误 1：只配置了 localhost
```
Redirect URLs:
http://localhost:3000/*  ❌ 生产环境无法工作
```

### ✅ 正确配置
```
Redirect URLs:
https://your-domain.com/*  ✅ 生产环境
http://localhost:3000/*     ✅ 开发环境
```

### ❌ 错误 2：忘记通配符 `/*`
```
Redirect URLs:
https://your-domain.com  ❌ 无法匹配子路径
```

### ✅ 正确配置
```
Redirect URLs:
https://your-domain.com/*  ✅ 支持所有子路径
https://your-domain.com/   ✅ 支持根路径
```

### ❌ 错误 3：域名写错
```
Redirect URLs:
https://your-domain.com  ❌ 但实际部署在 your-app.vercel.app
```

### ✅ 正确配置
```
Redirect URLs:
https://your-app.vercel.app/*  ✅ 与实际部署域名一致
```

## 调试技巧

### 1. 查看 OAuth 重定向日志
在 Supabase Dashboard → **Authentication** → **Logs** 中可以看到 OAuth 请求的详细日志。

### 2. 测试环境变量
在服务器上运行：
```bash
# 检查环境变量
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. 清除所有缓存
```bash
# 浏览器：Ctrl+Shift+Delete 清除所有缓存
# Vercel：在部署页面点击 "Redeploy"
# 本地：删除 .next 文件夹并重新 build
rm -rf .next
npm run build
```

## 还是不行？

如果按照以上步骤配置后仍然不工作，检查：

1. **环境变量是否正确**：
   - Vercel Dashboard → 项目设置 → Environment Variables
   - 确保 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 正确

2. **代码中是否有硬编码的 URL**：
   - 搜索项目中是否有 `localhost:3000` 硬编码
   - 应该使用 `window.location.origin`

3. **Supabase 项目是否正确**：
   - 确认使用的是正确的 Supabase 项目
   - 环境变量中的 URL 与 Dashboard 中的项目匹配

4. **等待时间**：
   - Supabase 配置更改可能需要 1-2 分钟生效
   - 建议等待后再测试

## 联系支持
如果以上方法都无法解决，可以：
- 查看 Supabase 官方文档：https://supabase.com/docs/guides/auth
- 在 GitHub Issues 中提问
- 联系 Supabase 支持团队

