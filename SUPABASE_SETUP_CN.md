# Google 登录 Supabase 配置指南

请按照以下步骤为你的项目配置 Supabase 以支持 Google 身份验证。

## 1. 创建 Supabase 项目
1. 访问 [Supabase 控制台](https://supabase.com/dashboard)。
2. 点击 **"New Project"** (新建项目)。
3. 选择你的组织，输入项目名称（例如：`AIMovieMaker`），设置数据库密码，并选择一个区域。
4. 点击 **"Create new project"** (创建新项目)。

## 2. 获取 API 密钥
1. 项目创建完成后，进入 **Project Settings** (项目设置，齿轮图标) -> **API**。
2. 找到 `Project URL` (项目 URL) 和 `anon` (匿名) `public` (公共) 密钥。
3. 在项目根目录创建名为 `.env.local` 的文件（如果不存在），并添加这些密钥：

```env
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的匿名密钥
```

## 3. 配置 Google OAuth
1. 在 Supabase 侧边栏中进入 **Authentication** (身份验证) -> **Providers** (提供商)。
2. 找到 **Google** 并点击展开。
3. 你需要从 Google 获取 **Client ID** (客户端 ID) 和 **Client Secret** (客户端密钥)。
4. 访问 [Google Cloud 控制台](https://console.cloud.google.com/)。
5. 创建新项目或选择现有项目。
6. 搜索 **"APIs & Services"** (API 和服务) -> **Credentials** (凭据)。
7. 点击 **"Create Credentials"** (创建凭据) -> **"OAuth client ID"** (OAuth 客户端 ID)。
8. 如果提示，首先配置 **OAuth consent screen** (OAuth 同意屏幕)：
   - 用户类型：External (外部)
   - 填写应用名称和邮箱
9. 对于应用程序类型，选择 **"Web application"** (Web 应用程序)。
10. 在 **"Authorized redirect URIs"** (授权重定向 URI) 下，你必须添加来自 Supabase 的回调 URL：
    - 回到 Supabase -> Authentication -> Providers -> Google
    - 复制 **"Callback URL (for OAuth)"** (OAuth 回调 URL)（格式如 `https://<项目引用>.supabase.co/auth/v1/callback`）
    - 将此粘贴到 Google Cloud 控制台的"授权重定向 URI"中
11. 点击 **"Create"** (创建)。
12. 复制 **Client ID** (客户端 ID) 和 **Client Secret** (客户端密钥)。
13. 回到 Supabase，将它们粘贴到 Google 提供商设置中。
14. 确保 **"Enable Sign in with Google"** (启用 Google 登录) 已勾选。
15. 点击 **"Save"** (保存)。

## 4. 配置站点 URL
1. 在 Supabase 中，进入 **Authentication** -> **URL Configuration** (身份验证 -> URL 配置)。
2. 将 **Site URL** (站点 URL) 设置为 `http://localhost:3000`（用于本地开发）。
3. 如果你部署到生产环境，将你的生产 URL 添加到 **Redirect URLs** (重定向 URL)。

## 5. 测试登录
1. 重新启动你的 Next.js 服务器（`npm run dev`）以加载新的环境变量。
2. 打开应用程序，点击"Log In" (登录)，然后选择"Continue with Google" (使用 Google 继续)。
3. 它应该重定向你到 Google，成功后会重定向回你的应用程序。

## 常见问题

### 无法重定向？
- 检查 Google Cloud 控制台中的重定向 URI 是否与 Supabase 提供的完全匹配
- 确保包含 `https://` 和完整的路径

### 环境变量未生效？
- 确保 `.env.local` 文件位于项目根目录
- 重启开发服务器以加载新的环境变量

### Google OAuth 同意屏幕配置失败？
- 确保你填写了所有必填字段（应用名称、支持邮箱等）
- 如果使用测试模式，可以添加测试用户邮箱