# 🚀 快速开始指南

## 5 分钟安装使用

### 📦 第 1 步：安装扩展

1. 打开 Chrome 浏览器
2. 地址栏输入：`chrome://extensions/`
3. 打开右上角 **"开发者模式"** 开关
4. 点击 **"加载已解压的扩展程序"**
5. 选择整个 `grok-cookie-extractor` 文件夹
6. ✅ 安装完成！

### 🔐 第 2 步：登录 Grok

1. 打开新标签页
2. 访问：https://grok.com
3. 登录你的账号
4. 确保登录成功

### 🍪 第 3 步：提取 Cookie

1. 点击浏览器工具栏的扩展图标（拼图）
2. 找到 **"Grok Cookie Extractor"**
3. 点击打开扩展
4. 点击 **"📋 提取 Cookie"** 按钮
5. 等待 2-3 秒...
6. ✅ 提取成功！

### 📋 第 4 步：复制 Cookie

1. 点击 **"📄 复制到剪贴板"** 按钮
2. ✅ Cookie 已复制！
3. 现在可以用于 API 调用了

---

## 💻 使用 Cookie 调用 API

### Node.js 示例

```javascript
const cookies = '粘贴你复制的 Cookie';

// 文本对话
fetch('https://grok.com/rest/app-chat/conversations/new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': cookies,
    'x-xai-request-id': crypto.randomUUID()
  },
  body: JSON.stringify({
    temporary: false,
    modelName: 'grok-4-1-non-thinking-w-tool',
    message: '你好'
  })
});
```

### Python 示例

```python
import requests
import uuid

cookies_str = '粘贴你复制的 Cookie'

# 转换为字典格式
cookies = {}
for item in cookies_str.split('; '):
    key, value = item.split('=', 1)
    cookies[key] = value

# 文本对话
response = requests.post(
    'https://grok.com/rest/app-chat/conversations/new',
    headers={
        'Content-Type': 'application/json',
        'x-xai-request-id': str(uuid.uuid4())
    },
    cookies=cookies,
    json={
        'temporary': False,
        'modelName': 'grok-4-1-non-thinking-w-tool',
        'message': '你好'
    }
)
```

---

## ❓ 常见问题

### Q: 提示"未找到 Cookie"？

**A**: 确保你已经：
1. ✅ 登录了 grok.com
2. ✅ 在 grok.com 页面（不是其他网站）
3. ✅ 刷新页面后重试

### Q: 提示"缺少必需的 Cookie"？

**A**: 说明你还没有登录。请先：
1. 访问 https://grok.com
2. 登录你的账号
3. 确保登录成功后再提取

### Q: 提示"缺少可选 Cookie"？

**A**: 这是正常的！只要有核心 Cookie（sso, sso-rw, x-userid）就能用。
- 可选 Cookie 不影响基本功能
- 扩展会提取所有可用的 Cookie
- 可以直接使用

### Q: Cookie 多久会过期？

**A**: 通常 1-3 天，过期后重新提取即可。

### Q: 扩展图标不显示？

**A**: 没关系！功能正常，只是用默认图标。
你可以参考 `icons/README-ICONS.md` 添加自定义图标。

### Q: 如何更新 Cookie？

**A**: 再次点击"提取 Cookie"按钮即可。

---

## 🎯 下一步

现在你可以：

1. 📚 查看完整文档：`README.md`
2. 🔧 参考 API 文档：`../docs/grok-api.md`
3. 💡 开始开发你的 Grok 应用！

---

**祝你使用愉快！** 🎉
