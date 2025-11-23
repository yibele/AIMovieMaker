# Grok Cookie Extractor

🍪 自动提取 Grok.com 的认证 Cookie，用于 Grok API 调用的 Chrome 扩展。

## 功能特性

- ✅ 一键提取所有必需的 Cookie
- 📋 一键复制到剪贴板
- 💾 自动保存，下次打开直接显示
- 🎨 美观的用户界面
- ⚡ 快速、简单、可靠

## 安装方法

### 1. 加载扩展

1. 打开 Chrome 浏览器
2. 在地址栏输入: `chrome://extensions/`
3. 打开右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择 `grok-cookie-extractor` 文件夹
6. 完成！扩展已安装

### 2. 固定扩展（可选）

1. 点击浏览器工具栏的 **拼图图标**（扩展）
2. 找到 **"Grok Cookie Extractor"**
3. 点击 **固定图标** 📌
4. 现在可以快速访问了

## 使用方法

### 步骤 1: 登录 Grok

1. 访问 [https://grok.com](https://grok.com)
2. 使用你的账号登录

### 步骤 2: 提取 Cookie

1. 点击浏览器工具栏的扩展图标
2. 点击 **"📋 提取 Cookie"** 按钮
3. 等待几秒钟...
4. ✅ 提取成功！

### 步骤 3: 复制 Cookie

1. 点击 **"📄 复制到剪贴板"** 按钮
2. Cookie 已复制，可以粘贴使用了！

## 提取的 Cookie 包括

### 必需的 Cookie（必须有）

扩展会检查以下核心 Cookie：

- ✅ `sso` - 会话令牌（必需）
- ✅ `sso-rw` - 读写会话令牌（必需）
- ✅ `x-userid` - 用户 ID（必需）

### 可选的 Cookie（有更好）

以下 Cookie 如果存在会自动包含，但不是必需的：

- `x-challenge` - 认证挑战码
- `x-signature` - 认证签名
- `cf_clearance` - Cloudflare 验证
- `_ga` - Google Analytics
- 其他追踪和会话 Cookie

**注意**：即使缺少某些可选 Cookie，扩展仍会提取所有可用的 Cookie，通常不影响 API 调用。

## Cookie 格式

提取的 Cookie 格式如下：

```
sso=xxx; sso-rw=xxx; x-userid=xxx; x-challenge=xxx; x-signature=xxx; cf_clearance=xxx; ...
```

可以直接用于 API 请求的 `Cookie` 请求头。

## 使用 Cookie 调用 API

```javascript
// 示例：使用提取的 Cookie 调用 Grok API
fetch('https://grok.com/rest/app-chat/conversations/new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': '粘贴你复制的 Cookie',
    'x-xai-request-id': crypto.randomUUID()
  },
  body: JSON.stringify({
    temporary: false,
    modelName: 'grok-4-1-non-thinking-w-tool',
    message: '你好'
  })
});
```

## 注意事项

⚠️ **重要提示**：

1. **Cookie 会过期** - 通常几小时到几天，过期后需要重新提取
2. **保管好 Cookie** - Cookie 相当于你的登录凭证，不要分享给他人
3. **仅用于开发** - 此扩展仅供开发和测试使用
4. **需要登录** - 提取前必须先在 grok.com 登录

## 故障排除

### ❌ "未找到 Cookie"

**解决方法**：
1. 确保已在 grok.com 登录
2. 刷新 grok.com 页面
3. 重新打开扩展提取

### ❌ "缺少必需的 Cookie"

**解决方法**：
1. 退出登录后重新登录
2. 清除浏览器缓存和 Cookie
3. 重新登录 grok.com

### ⚠️ Cookie 复制后无法使用

**可能原因**：
1. Cookie 已过期（重新提取）
2. 缺少某些必需的 Cookie
3. API 调用格式不正确

## 开发信息

- **版本**: 1.0.0
- **Manifest**: V3
- **权限**: cookies, storage
- **适用域名**: grok.com

## 目录结构

```
grok-cookie-extractor/
├── manifest.json      # 扩展配置文件
├── popup.html         # 弹窗界面
├── popup.js           # 弹窗脚本
├── icons/             # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 本文件
```

## 图标说明

如果没有图标文件，扩展仍然可以正常工作，只是会显示默认图标。

你可以：
1. 使用任何 16x16, 48x48, 128x128 的 PNG 图片
2. 放在 `icons/` 文件夹
3. 命名为 `icon16.png`, `icon48.png`, `icon128.png`

## 许可证

MIT License - 自由使用、修改和分发

## 支持

如有问题，请检查：
1. 是否已登录 grok.com
2. 是否启用了开发者模式
3. 是否正确加载了扩展

---

**享受使用 Grok API！** 🚀
