# AI Mover Maker

基于 React Flow 的 AIGC 画布创作工具，支持接入 Google Labs Whisk 完成图片生成、编辑与多图联动。

## 功能特性

### 核心功能
- ✅ **AI 图片生成**：调用 Whisk `generateImage`（Imagen 3.5）生成高质量图片
- ✅ **图片编辑**：调用 Whisk `editImage`（Gemini Pix）对已有图片进行图生图或变体生成
- ✅ **多图批量生成**：框选多张图片并批量调用 Whisk API 生成新内容，自动串联 `mediaGenerationId`
- ✅ **画布操作**：自由拖拽、缩放、旋转图片和文字元素
- ✅ **文字工具**：添加和编辑文本标注
- ✅ **图片上传**：支持本地图片上传（JPG/PNG，最大 10MB）
- ✅ **图片下载**：下载生成的图片
- ✅ **代理支持**：可选择 HTTP/SOCKS 代理转发 Whisk 请求，适配不同网络环境

### 界面布局
- **顶部标题栏**：项目标题编辑、分享按钮
- **左侧工具栏**：移动工具、文字工具、图片上传
- **画布区域**：基于 React Flow 的无限画布，支持网格背景
- **顶部操作栏**：选中图片时显示（再次生成、类似图片、下载、删除）
- **底部输入面板**：智能识别当前模式（新建/编辑/批量生成）

## 技术栈

- **框架**: Next.js 16 + React 19 + TypeScript
- **画布**: @xyflow/react (React Flow 12+)
- **状态管理**: Zustand 5
- **样式**: Tailwind CSS 4
- **图标**: Lucide React
- **AI 能力**: Google Labs Whisk（Imagen 3.5 / Gemini Pix，经 Next.js API 代理）

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

> **提示**：首次进入应用，请打开右上角的「设置」面板配置 Whisk 凭证。

### 构建生产版本

```bash
npm run build
npm start
```

## Whisk API 配置

应用通过本地的 Next.js 路由将前端请求代理到 Google Labs Whisk，需要提前准备认证信息：

| 参数 | 说明 | 获取方式 |
|------|------|----------|
| Bearer Token | `generateImage` 所需的 OAuth Bearer Token | 登录 https://labs.google → 打开 DevTools → 生成图片 → 在请求头中复制 `Authorization` |
| Cookie | `backbone.editImage` 所需 Cookie（含 `__Secure-next-auth.session-token` 等） | 登录 https://labs.google → 打开 DevTools → 执行编辑图片 → 在请求头中复制 `Cookie` |
| Proxy（可选） | HTTP/HTTPS/SOCKS 代理地址 | 如果本地网络无法直接访问 Google，可配置例如 `http://127.0.0.1:10808` 或 `socks5://127.0.0.1:7890` |

在应用右上角打开「设置」面板后填写上述字段：

1. 粘贴 Bearer Token（必填）
2. 粘贴 Cookie（使用编辑功能时必填）
3. 如需代理，填写完整的代理 URL
4. 保存配置后即可在画布中体验生成、再次生成、类似图片等功能

所有请求都会通过 `app/api/whisk/*` 路由转发，服务端会自动附加 `mediaGenerationId` 保持上下文，并在必要时复用代理。

## 使用指南

### 生成新图片
1. 在底部输入框输入提示词（例如："一座夜晚灯光璀璨的寺庙"）
2. 按 Enter 或点击发送按钮
3. 生成的图片会自动添加到画布中央

### 编辑图片
1. 点击选中画布上的图片
2. 顶部会出现操作栏
3. 点击"再次生成"替换图片，或"类似图片"在旁边生成新图片
4. 也可以在底部输入框输入新的提示词进行编辑

### 多图批量生成
1. 按住 Shift 点击多张图片，或拖拽框选
2. 底部输入框会显示"基于 X 张图片生成"
3. 输入提示词（例如："将这些图片融合成抽象艺术"）
4. 生成的新图片会排列在右侧

### 添加文字
1. 点击左侧工具栏的"T"图标
2. 画布中央会出现文本框
3. 双击文本框进入编辑模式
4. 按 Cmd/Ctrl+Enter 保存，Escape 取消

### 上传图片
1. 点击左侧工具栏的上传图标
2. 选择本地 JPG/PNG 图片（最大 10MB）
3. 图片会自动添加到画布

## 项目结构

```
AIMoverMaker/
├── app/
│   ├── globals.css          # 全局样式
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 主页面
├── components/
│   ├── nodes/
│   │   ├── ImageNode.tsx    # 图片节点组件
│   │   └── TextNode.tsx     # 文本节点组件
│   ├── AIInputPanel.tsx     # 底部 AI 输入面板
│   ├── Canvas.tsx            # 画布核心组件
│   ├── FloatingToolbar.tsx  # 悬浮操作栏
│   ├── Header.tsx            # 顶部标题栏
│   └── Toolbar.tsx           # 左侧工具栏
├── lib/
│   ├── api-mock.ts           # Whisk 调度层（处理生成 / 编辑 / 批量任务）
│   ├── store.ts              # Zustand 状态管理
│   └── types.ts              # TypeScript 类型定义
├── docs/
│   └── whisk_api.md          # Whisk API 调用与调试指南
└── README.md                 # 本文档
```

## 开发说明

### 服务端代理
- 所有图片生成与编辑请求均转发至 `app/api/whisk/generate` 与 `app/api/whisk/edit`
- 服务端会根据请求体或环境变量自动构造代理 `Agent`
- 编辑接口会透传前端提交的 `originalMediaGenerationId`，确保 Whisk 能够在同一工作流下生成变体

### 前端调度
- `lib/api-mock.ts` 负责封装所有前端调用逻辑，统一处理 Base64 转换、批量任务与异常提示
- `components/AIInputPanel.tsx` 会在生成/编辑结束后将 `mediaGenerationId` 写回元素，以便链式操作
- React Flow 主题通过全局样式 `.react-flow.custom-theme` 覆盖，可根据需要进一步调整

### 快捷键
- `Delete`: 删除选中元素
- `Cmd/Ctrl + Z`: 撤销（待实现）
- `Cmd/Ctrl + Shift + Z`: 重做（待实现）
- `Shift + 点击`: 多选元素

## 下一步计划

- [ ] 增加操作历史与撤销功能
- [ ] 支持导出画布与分享链接
- [ ] 引入账户体系及云端存储
- [ ] 丰富节点类型（形状 / 背景 / 元素库）
- [ ] 扩展更多 Whisk 参数（种子、模型选项等）

## License

ISC

---

（版本：v0.2，2025-11-12）

