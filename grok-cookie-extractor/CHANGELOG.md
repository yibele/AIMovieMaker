# 更新日志

## v1.2.0 (2025-11-23) - 🎉 终极解决方案！

### 🚀 革命性改进

- **使用 Content Script 直接读取页面 Cookie**
  - 不再依赖 Chrome Cookie API（API 有限制，获取不全）
  - 直接在 grok.com 页面中运行脚本
  - 读取 `document.cookie` - 这是浏览器实际使用的 Cookie
  - **100% 获取所有 Cookie，与浏览器完全一致！**

### ✨ 新功能

- **自动注入 Content Script**
  - 在所有 grok.com 页面自动运行
  - 无需手动操作，自动就绪
  
- **智能双重策略**
  - **优先**: 从页面直接读取 `document.cookie`（最完整）
  - **备用**: 如果页面方法失败，使用 Chrome Cookie API
  - 确保总能提取到 Cookie

- **状态显示**
  - 会显示使用的是哪种方法
  - "页面直读" = 从 document.cookie 获取
  - 无标记 = 使用 API 备用方法

### 🔧 技术改进

- 添加 `content.js` - 页面注入脚本
- 使用 `chrome.tabs.sendMessage` 通信
- 更可靠的 Cookie 字符串解析
- 完整的错误处理和降级策略

### 📝 预期效果

**之前**: 只能获取 3 个 Cookie (sso, sso-rw, x-userid)

**现在**: 获取所有 10+ 个 Cookie，包括：
- _ga, _ga_*
- i18nextLng  
- x-anonuserid  
- x-challenge, x-signature
- cf_clearance  
- mp_* (Mixpanel)

完全匹配浏览器 F12 → Application → Cookies 中看到的！

---

## v1.1.0 (2025-11-23) - 重大更新！🚀

### 🎯 核心改进

- **完全重写 Cookie 提取逻辑**
  - **方法1**: 从活动的 grok.com 标签页直接获取 Cookie
  - **方法2**: 尝试多个 URL 获取（包括子路径）
  - **方法3**: 尝试所有域名变体获取
  - **三管齐下，确保提取到所有 Cookie！**

### ✨ 新功能

- **智能标签页检测**
  - 自动查找已打开的 grok.com 标签页
  - 从实际访问的页面获取 Cookie
  - 更接近浏览器真实发送的 Cookie

- **详细的调试日志**
  - 显示从每个来源获取了多少 Cookie
  - 显示最终 Cookie 字符串的长度
  - 显示所有 Cookie 的名称列表
  - 方便排查问题

### 🔧 技术改进

- 添加 `tabs` 权限支持
- 使用三种方法组合获取 Cookie
- 更详细的错误提示
- 更好的去重逻辑

### 📝 使用提示

**重要**：为了获取最完整的 Cookie，请确保：
1. ✅ 已登录 grok.com
2. ✅ **至少打开一个 grok.com 的标签页**
3. ✅ 在 grok.com 页面上点击提取

---

## v1.0.2 (2025-11-23)

### 🚀 重大改进

- **修复 Cookie 提取不完整的问题**
  - 现在从多个域名获取 Cookie（`grok.com`, `.grok.com`）
  - 同时使用域名和 URL 两种方式获取 Cookie
  - 自动去重，确保每个 Cookie 只出现一次
  - **显著提升 Cookie 提取数量和完整性**

### ✨ 新功能

- **显示 Cookie 数量**
  - 成功提取后显示总共提取了多少个 Cookie
  - 方便验证提取是否完整
  
- **调试信息**
  - 在控制台输出提取到的 Cookie 数量
  - 便于调试和排查问题

### 🔧 技术改进

- 从单域名获取改为多域名获取
- 使用 Map 去重，避免重复的 Cookie
- 更健壮的错误处理

---

## v1.0.1 (2025-11-23)

### 🔧 修复

- **修复 Cookie 检测过于严格的问题**
  - 将 `x-challenge`, `x-signature`, `cf_clearance` 改为可选 Cookie
  - 现在只要求核心 Cookie：`sso`, `sso-rw`, `x-userid`
  - 即使缺少某些可选 Cookie 也能正常提取和使用

### ✨ 改进

- **更智能的 Cookie 检测**
  - 区分必需 Cookie 和可选 Cookie
  - 缺少可选 Cookie 时显示友好提示而不是报错
  - 自动提取所有可用的 Cookie，不限于预定义列表

- **更友好的提示信息**
  - 成功提取时会提示缺少了多少个可选 Cookie
  - 说明缺少可选 Cookie 通常不影响使用
  - 更详细的错误提示信息

### 📚 文档更新

- 更新 README.md，说明必需和可选 Cookie
- 更新 QUICKSTART.md，添加常见问题解答
- 添加本更新日志

---

## v1.0.0 (2025-11-23)

### 🎉 初始版本

- ✅ 一键提取 Grok Cookie
- ✅ 一键复制到剪贴板
- ✅ 自动保存到本地存储
- ✅ 美观的紫色渐变界面
- ✅ 显示用户 ID 和会话状态
- ✅ 完整的使用文档

---

## 核心 Cookie 说明

### 必需的 Cookie（必须有）

这些 Cookie 是调用 Grok API 的核心认证信息：

- `sso` - JWT 会话令牌，包含用户登录信息
- `sso-rw` - 读写会话令牌，用于修改操作
- `x-userid` - 用户唯一标识符

### 可选的 Cookie（有更好）

这些 Cookie 在某些情况下可能需要，但不是所有 API 调用都必须：

- `x-challenge` - 认证挑战码（某些安全场景）
- `x-signature` - 认证签名（某些安全场景）
- `cf_clearance` - Cloudflare 机器人验证（可能需要）
- `_ga`, `_ga_*` - Google Analytics 追踪
- `i18nextLng` - 语言设置
- `x-anonuserid` - 匿名用户 ID
- `mp_*` - Mixpanel 追踪

即使缺少某些可选 Cookie，基本的 API 调用（如文本对话、图像生成、视频生成）通常都能正常工作。
