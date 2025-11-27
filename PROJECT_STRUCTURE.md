# 🎬 AIMovieMaker 项目结构

> 📅 更新时间: 2025-11-27  
> 📊 文件统计: 102 个 TypeScript 文件，共 24,380 行代码  
> 🔄 架构: 三层分离（UI → 服务 → 工具）

---

## 📁 完整目录结构

```
AIMovieMaker/
│
├── 📄 根目录配置文件
│   ├── package.json              # 项目依赖和脚本
│   ├── package-lock.json         # 依赖锁定
│   ├── tsconfig.json             # TypeScript 配置
│   ├── tailwind.config.ts        # Tailwind CSS 配置
│   ├── vercel.json               # Vercel 部署配置
│   └── .env.local                # 环境变量（不提交 Git）
│
├── 📚 文档
│   ├── README.md                 # 项目说明
│   ├── PROJECT_STRUCTURE.md      # 项目结构（本文件）
│   ├── CHANGELOG.md              # 更新日志
│   ├── CLAUDE.md                 # Claude AI 助手规则
│   ├── GEMINI.md                 # Gemini AI 助手规则
│   ├── INVITATION_SYSTEM_GUIDE.md # 邀请系统使用指南
│   ├── SUPABASE_SETUP.md         # Supabase 数据库设置（英文）
│   ├── SUPABASE_SETUP_CN.md      # Supabase 数据库设置（中文）
│   │
│   └── docs/                     # 详细技术文档
│       ├── REFACTORING_GUIDE.md  # 🔥 重构指南（核心文档）
│       ├── TODO.md               # 待办事项
│       ├── activation-system.md  # 激活系统文档
│       ├── prompt-library-schema.md # 提示词库架构
│       │
│       ├── Google API 文档
│       │   ├── flow-api-documentation.md
│       │   ├── google-fx-api-documentation.md
│       │   ├── google-fx-video-upsample-api.md
│       │   ├── flow视频生成.md
│       │   ├── flow 视频延续.md
│       │   ├── flow 视频相册接口.md
│       │   ├── flow 镜头控制.md
│       │   ├── 首尾帧.md
│       │   ├── 图片生成完整文档.md
│       │   ├── 生成图片.md
│       │   ├── 多图编辑.md
│       │   └── 新增接口使用说明.md
│       │
│       ├── Whisk API 文档
│       │   ├── whisk_api.md
│       │   ├── whisk_upload_img.md
│       │   ├── whisk 生成视频.md
│       │   └── 获取 whisk 积分.md
│       │
│       ├── 其他文档
│       │   ├── grok-api.md
│       │   ├── grok.md
│       │   ├── headers.md
│       │   ├── 获取素材.md
│       │   ├── 数据.md
│       │   ├── 部署指南.md
│       │   └── 阿里云.md
│       │
│       └── 共 28 个文档文件
│
├── 🎨 app/                       # Next.js 15 App Router
│   ├── layout.tsx                # 根布局（字体、主题）
│   ├── page.tsx                  # 首页（登录/仪表盘）
│   ├── globals.css               # 全局样式
│   │
│   ├── canvas/                   # 画布页面
│   │   ├── page.tsx              # 默认画布
│   │   └── project/
│   │       └── [projectId]/
│   │           └── page.tsx      # 项目画布（动态路由）
│   │
│   └── api/                      # API 路由（共 18 个）
│       │
│       ├── activation/           # 激活系统
│       │   └── activate/route.ts # POST 激活码验证
│       │
│       ├── blob/                 # Blob 存储
│       │   └── upload/route.ts   # POST 上传到 Vercel Blob
│       │
│       ├── flow/                 # Google Flow API 代理
│       │   ├── generate/route.ts # POST 图片生成
│       │   ├── upload/route.ts   # POST 图片上传
│       │   ├── media/
│       │   │   └── [mediaId]/route.ts # GET 获取媒体
│       │   ├── projects/
│       │   │   ├── create/route.ts    # POST 创建项目
│       │   │   ├── delete/route.ts    # POST 删除项目
│       │   │   └── search/route.ts    # POST 搜索项目
│       │   ├── workflows/
│       │   │   └── search/route.ts    # POST 搜索工作流
│       │   └── video/
│       │       ├── generate/route.ts  # POST 视频生成
│       │       ├── start-end/route.ts # POST 首尾帧视频
│       │       ├── status/route.ts    # POST 状态查询
│       │       └── upsample/route.ts  # POST 超清放大
│       │
│       ├── user/                 # 用户相关
│       │   └── apikey/route.ts   # GET/POST API Key
│       │
│       └── whisk/                # Whisk API 代理
│           ├── caption/route.ts  # POST 图片描述
│           ├── edit/route.ts     # POST 图片编辑
│           ├── generate/route.ts # POST 图片生成
│           ├── recipe/route.ts   # POST 多图融合
│           └── upload/route.ts   # POST 图片上传
│
├── 🧩 components/                # React 组件（共 40 个）
│   │
│   ├── 核心画布组件
│   │   ├── Canvas.tsx            # 🔥 核心画布 (2,422 行)
│   │   │                         # - React Flow 集成
│   │   │                         # - 节点/边管理
│   │   │                         # - 视频生成逻辑
│   │   │                         # - 连线交互
│   │   ├── CanvasNavigation.tsx  # 画布导航（缩放、定位）
│   │   ├── Toolbar.tsx           # 左侧工具栏（289 行）
│   │   ├── RightToolbar.tsx      # 右侧工具栏（174 行）
│   │   └── SelectionToolbar.tsx  # 选中工具栏（424 行）
│   │
│   ├── 输入面板
│   │   ├── AIInputPanel.tsx      # AI 输入面板（352 行）
│   │   │                         # - 提示词输入
│   │   │                         # - 生成触发
│   │   ├── MaterialsPanel.tsx    # 素材面板
│   │   ├── PromptLibraryPanel.tsx # 提示词库面板
│   │   └── GrokAssistantPanel.tsx # Grok 助手面板
│   │
│   ├── nodes/                    # 节点组件
│   │   ├── ImageNode.tsx         # 图片节点（629 行）
│   │   │                         # - 图片显示
│   │   │                         # - 图生图
│   │   │                         # - 操作工具栏
│   │   ├── VideoNode.tsx         # 视频节点（722 行）
│   │   │                         # - 视频播放
│   │   │                         # - 超清放大
│   │   │                         # - 操作工具栏
│   │   ├── TextNode.tsx          # 文本节点
│   │   ├── NoteNode.tsx          # 笔记节点（Markdown）
│   │   └── ToolbarButton.tsx     # 通用工具按钮
│   │
│   ├── canvas/                   # 画布子组件
│   │   └── connection-menu/      # 连线菜单系统
│   │       ├── ConnectionMenuRoot.tsx   # 菜单根组件
│   │       ├── ImageSubmenu.tsx         # 图片子菜单
│   │       ├── VideoSubmenu.tsx         # 视频子菜单
│   │       ├── CameraControlSubmenu.tsx # 镜头控制子菜单
│   │       ├── ImagePromptInput.tsx     # 图片提示词输入
│   │       └── ExtendVideoInput.tsx     # 延长视频输入
│   │
│   ├── 弹窗组件
│   │   ├── LoginModal.tsx              # 登录弹窗
│   │   ├── SettingsPanel.tsx           # 设置面板
│   │   ├── ImageCropperModal.tsx       # 图片裁剪
│   │   ├── ImageAnnotatorModal.tsx     # 图片标注
│   │   ├── VisionAnalysisModal.tsx     # 视觉分析
│   │   ├── VideoFrameExtractorModal.tsx # 视频帧提取
│   │   ├── PrefixPromptModal.tsx       # 前置提示词
│   │   ├── InvitationModal.tsx         # 邀请码
│   │   ├── CreateProjectModal.tsx      # 创建项目
│   │   └── ConfirmDialog.tsx           # 确认对话框
│   │
│   ├── 页面组件
│   │   ├── Header.tsx            # 顶部导航
│   │   ├── LandingPage.tsx       # 落地页
│   │   ├── DashboardView.tsx     # 仪表盘
│   │   ├── ProjectsHome.tsx      # 项目首页
│   │   ├── ProjectCard.tsx       # 项目卡片
│   │   └── ThemeToggle.tsx       # 主题切换
│   │
│   ├── 装饰组件
│   │   └── ParticleField.tsx     # 粒子背景动画
│   │
│   └── icons/
│       └── MaterialsIcon.tsx     # 素材图标
│
├── 🔧 lib/                       # 核心库
│   │
│   ├── 📦 config/                # ⭐ 配置层
│   │   ├── index.ts              # 导出入口
│   │   └── tier-config.ts        # 套餐配置适配器（537 行）
│   │       │
│   │       │ 🎯 核心职责：
│   │       │ - Pro/Ultra 套餐差异统一管理
│   │       │ - 视频模型选择（文生视频/图生视频/首尾帧/延长/重拍）
│   │       │ - PaygateTier 配置
│   │       │ - 宽高比映射
│   │       │
│   │       │ 📤 导出函数：
│   │       │ - getEffectiveVideoMode()
│   │       │ - getVideoModelKey()
│   │       │ - getPaygateTier()
│   │       │ - getVideoApiConfig()
│   │       │ - getImageApiConfig()
│   │       └── isFeatureSupported()
│   │
│   ├── 🛠️ services/              # ⭐ 业务服务层（共 1,570 行）
│   │   ├── index.ts              # 导出入口
│   │   │
│   │   ├── prompt-builder.service.ts    # 提示词构建（138 行）
│   │   │   │ - buildFinalPrompt()       # 拼接前置提示词
│   │   │   │ - getApiContext()          # 获取 API 上下文
│   │   │   │ - updateSessionContext()   # 更新会话
│   │   │   └── validateApiConfig()      # 验证配置
│   │   │
│   │   ├── video-polling.service.ts     # 视频轮询（156 行）
│   │   │   │ - pollVideoOperation()     # 轮询视频生成状态
│   │   │   └── extractFlowVideoData()   # 提取视频数据
│   │   │
│   │   ├── image-generation.service.ts  # 图片生成（269 行）
│   │   │   │ - generateImages()         # 文生图
│   │   │   │ - generateImageFromImage() # 图生图
│   │   │   └── uploadImage()            # 上传图片
│   │   │
│   │   ├── video-generation.service.ts  # 视频生成（382 行）
│   │   │   │ - generateTextToVideo()    # 文生视频
│   │   │   │ - generateImageToVideo()   # 图生视频
│   │   │   │ - upsampleVideo()          # 超清放大
│   │   │   │ - reshootVideo()           # 镜头控制重拍
│   │   │   └── extendVideo()            # 延长视频
│   │   │
│   │   └── node-management.service.ts   # 节点管理（606 行）
│   │       │
│   │       │ 🎯 核心职责：统一节点创建和管理
│   │       │
│   │       │ 📍 位置计算：
│   │       │ - getScreenCenterPosition()
│   │       │ - getCenteredPosition()
│   │       │ - getRightSidePosition()
│   │       │
│   │       │ 🖼️ 节点创建：
│   │       │ - createTextNode()
│   │       │ - createNoteNode()
│   │       │ - createImagePlaceholder()
│   │       │ - createEmptyVideoNode()
│   │       │ - createVideoFromImage()
│   │       │ - createStartEndVideoNode()
│   │       │ - createUpsampleVideoPlaceholder()
│   │       │
│   │       │ 📦 批量操作：
│   │       │ - createImagePlaceholders()
│   │       │ - createVideoPlaceholders()
│   │       │ - updateImagePlaceholders()
│   │       │ - updateVideoPlaceholders()
│   │       │ - deletePlaceholders()
│   │       │ - markPlaceholdersAsError()
│   │       │
│   │       │ 🔧 工具函数：
│   │       │ - generateNodeId()
│   │       │ - duplicateImageNode()
│   │       │ - duplicateVideoNode()
│   │       │ - addNodesToCanvas()
│   │       │ - getNodeById()
│   │       │ - getAllImageNodes()
│   │       └── getAllVideoNodes()
│   │
│   ├── 🔌 tools/                 # ⭐ 工具层（纯 API 调用）
│   │   ├── index.ts              # 导出入口
│   │   ├── image-api.ts          # 图片 API（80 行）
│   │   │   │ - uploadImageDirectly
│   │   │   └── generateImageDirectly
│   │   ├── video-api.ts          # 视频 API（145 行）
│   │   │   │ - generateVideoTextDirectly
│   │   │   │ - generateVideoImageDirectly
│   │   │   │ - generateVideoUpsampleDirectly
│   │   │   │ - generateVideoReshootDirectly
│   │   │   │ - generateVideoExtendDirectly
│   │   │   │ - checkVideoStatusDirectly
│   │   │   └── getVideoCreditStatus
│   │   └── vision-api.ts         # 视觉分析 API（137 行）
│   │       │ - analyzeImage()
│   │       └── VL_PROMPTS（预设提示词）
│   │
│   ├── 📊 constants/             # 常量定义
│   │   └── node-sizes.ts         # 节点尺寸常量
│   │       │ - IMAGE_NODE_DEFAULT_SIZE
│   │       │ - VIDEO_NODE_DEFAULT_SIZE
│   │       │ - TEXT_NODE_DEFAULT_SIZE
│   │       │ - NOTE_NODE_DEFAULT_SIZE
│   │       │ - getImageNodeSize()
│   │       │ - getVideoNodeSize()
│   │       │ - detectAspectRatio()      # 通用宽高比检测
│   │       └── detectVideoAspectRatio() # 视频宽高比检测
│   │
│   ├── 业务入口文件
│   │   ├── api-mock.ts           # 业务 API 接口（1,174 行）
│   │   │   │ 🎯 面向 UI 组件的高层业务接口
│   │   │   │ - generateImage()
│   │   │   │ - registerUploadedImage()
│   │   │   │ - imageToImage()
│   │   │   │ - runImageRecipe()
│   │   │   │ - editImage()
│   │   │   │ - generateVideoFromText()
│   │   │   │ - generateVideoFromImage()
│   │   │   │ - generateVideoFromImages()
│   │   │   │ - generateVideoUpsample()
│   │   │   │ - generateVideoReshoot()
│   │   │   └── generateVideoExtend()
│   │   │
│   │   ├── direct-google-api.ts  # 直接 Google API（946 行）
│   │   │   │ 🎯 纯 API 调用，无业务逻辑
│   │   │   │ - 图片生成/上传
│   │   │   │ - 视频生成（文生/图生/首尾帧/延长/重拍/超清）
│   │   │   └── 状态查询
│   │   │
│   │   └── input-panel-generator.ts # 输入面板生成（403 行）
│   │       │ - generateFromInput()        # 文生图
│   │       │ - imageToImageFromInput()    # 图生图
│   │       │ - multiImageRecipeFromInput() # 多图融合
│   │       └── getPositionAboveInput()    # 位置计算
│   │
│   ├── 状态管理
│   │   ├── store.ts              # Zustand 主 Store
│   │   │   │ - elements[]        # 画布元素
│   │   │   │ - apiConfig         # API 配置
│   │   │   │ - uiState           # UI 状态
│   │   │   └── actions           # 状态操作
│   │   ├── materials-store.ts    # 素材库 Store
│   │   └── theme-store.ts        # 主题 Store
│   │
│   ├── 类型定义
│   │   ├── types.ts              # 核心类型（132 行）
│   │   │   │ - ElementType
│   │   │   │ - AspectRatio / VideoAspectRatio
│   │   │   │ - ImageElement / VideoElement
│   │   │   │ - TextElement / NoteElement
│   │   │   └── CanvasElement
│   │   ├── types-materials.ts    # 素材类型
│   │   └── types-prompt-library.ts # 提示词库类型
│   │
│   └── 工具函数
│       ├── image-utils.ts        # 图片工具（尺寸计算等）
│       ├── api-route-helpers.ts  # API 路由工具
│       ├── proxy-agent.ts        # 代理配置
│       ├── get-user-credentials.ts # 用户凭证获取
│       ├── materials-service.ts  # 素材云端服务
│       ├── project-materials.ts  # 项目素材加载
│       ├── prompt-service.ts     # 提示词库服务（待启用）
│       └── supabaseClient.ts     # Supabase 客户端
│
├── 🪝 hooks/                     # React Hooks
│   └── canvas/                   # 画布相关（共 ~700 行）
│       ├── index.ts              # 导出入口
│       │
│       ├── useConnectionMenu.ts  # 连线菜单状态管理
│       │   │ - 菜单显示/隐藏
│       │   │ - 源节点追踪
│       │   └── 子菜单状态
│       │
│       ├── useTextToImage.ts     # 文生图 Hook
│       │   └── 处理文本节点 → 图片生成
│       │
│       ├── useImageToImage.ts    # 图生图 Hook
│       │   └── 处理图片节点 → 新图片生成
│       │
│       ├── useImageOperations.ts # 图片操作 Hook（180 行）
│       │   │ - handleDuplicate() # 复制
│       │   │ - handleDelete()    # 删除
│       │   │ - handleArchive()   # 入库
│       │   │ - handleDownload()  # 下载
│       │   └── handleRegenerate() # 重新生成
│       │
│       ├── useVideoOperations.ts # 视频操作 Hook（150 行）
│       │   │ - isGenerating      # 生成状态
│       │   │ - canUpscale        # 可否超清
│       │   │ - handleDownload()  # 下载
│       │   │ - handleDelete()    # 删除
│       │   └── handleArchive()   # 入库
│       │
│       └── useNodeOperations.ts  # 节点操作 Hook（120 行）
│           │ - handleAddText()   # 添加文本
│           │ - handleAddVideo()  # 添加视频
│           └── handleAddNote()   # 添加笔记
│
├── 📐 types/                     # 全局类型定义
│   ├── connection-menu.ts        # 连线菜单类型
│   ├── image-generation.ts       # 图片生成类型
│   └── morpheus.ts               # Morpheus 类型
│
└── 🔌 grok-cookie-extractor/     # Chrome 扩展（独立项目）
    ├── manifest.json
    ├── README.md
    ├── QUICKSTART.md
    ├── CHANGELOG.md
    ├── PROJECT-SUMMARY.md
    └── icons/
```

---

## 🏗️ 架构设计

### 三层分离架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      🎨 UI 层 (Presentation)                     │
│                                                                 │
│  components/           渲染和交互                                │
│  └── nodes/            节点组件（无业务逻辑）                      │
│                                                                 │
│  hooks/canvas/         用户交互处理                              │
│  └── useImageOperations, useVideoOperations, useNodeOperations  │
├─────────────────────────────────────────────────────────────────┤
│                      🛠️ 业务服务层 (Services)                    │
│                                                                 │
│  lib/services/         业务逻辑处理                              │
│  ├── prompt-builder    提示词构建                                │
│  ├── video-polling     视频轮询                                  │
│  ├── image-generation  图片生成业务                              │
│  ├── video-generation  视频生成业务                              │
│  └── node-management   节点创建/管理                             │
│                                                                 │
│  lib/config/           配置管理                                  │
│  └── tier-config       Pro/Ultra 套餐差异                        │
├─────────────────────────────────────────────────────────────────┤
│                      🔌 工具层 (Tools)                           │
│                                                                 │
│  lib/tools/            纯 API 调用（无业务逻辑）                   │
│  ├── image-api         图片 API                                  │
│  ├── video-api         视频 API                                  │
│  └── vision-api        视觉分析 API                              │
│                                                                 │
│  lib/direct-google-api Google API 直接调用                       │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流向

```
用户操作 (UI)
     │
     ▼
hooks/canvas/*          ←── 处理用户交互
     │
     ▼
lib/services/*          ←── 业务逻辑处理
     │
     ▼
lib/config/tier-config  ←── 获取套餐配置
     │
     ▼
lib/tools/*             ←── 调用 API
     │
     ▼
lib/direct-google-api   ←── Google API 请求
     │
     ▼
Google Flow API         ←── 外部服务
```

---

## 📈 代码统计

### 按层级统计

| 层级 | 文件数 | 总行数 | 说明 |
|------|--------|--------|------|
| 配置层 | 2 | 544 | Pro/Ultra 差异管理 |
| 服务层 | 6 | 1,570 | 业务逻辑统一 |
| 工具层 | 4 | 380 | 纯 API 调用 |
| Hooks | 7 | 700 | UI 交互逻辑 |
| **抽象层合计** | **19** | **~3,200** | 重构新增 |

### 主要文件统计

| 文件 | 行数 | 职责 |
|------|------|------|
| `Canvas.tsx` | 2,422 | 核心画布，React Flow 集成 |
| `api-mock.ts` | 1,174 | 业务 API 入口 |
| `direct-google-api.ts` | 946 | Google API 直接调用 |
| `VideoNode.tsx` | 722 | 视频节点组件 |
| `node-management.service.ts` | 606 | 节点管理服务 |
| `tier-config.ts` | 537 | 套餐配置适配器 |
| `ImageNode.tsx` | 629 | 图片节点组件 |
| `SelectionToolbar.tsx` | 424 | 选中工具栏 |
| `input-panel-generator.ts` | 403 | 输入面板生成 |

---

## 🔑 关键设计决策

### 1. 套餐配置集中管理

```typescript
// ❌ 之前：散落各处的 if-else
if (accountTier === 'pro') {
  videoModelKey = 'veo_3_1_t2v_fast';
} else {
  videoModelKey = videoModel === 'fast' ? 'veo_3_1_t2v_fast_ultra' : 'veo_3_1_t2v';
}

// ✅ 现在：统一通过适配器获取
import { getVideoApiConfig } from '@/lib/config/tier-config';
const config = getVideoApiConfig('text-to-video', accountTier, aspectRatio, videoMode);
// config.videoModelKey 已经是正确的值
```

### 2. 节点创建统一

```typescript
// ❌ 之前：每个组件自己创建节点
const newNode: ImageElement = {
  id: `image-${Date.now()}`,
  type: 'image',
  position: { x: 100, y: 100 },
  // ... 重复的代码
};

// ✅ 现在：使用节点管理服务
import { createImagePlaceholder } from '@/lib/services/node-management.service';
const placeholder = createImagePlaceholder(position, generatedFrom);
```

### 3. 操作逻辑封装

```typescript
// ❌ 之前：组件内实现操作逻辑
function ImageNode() {
  const handleDuplicate = () => { /* 50行代码 */ };
  const handleDelete = () => { /* 30行代码 */ };
  // ...
}

// ✅ 现在：使用 Hook 封装
import { useImageOperations } from '@/hooks/canvas';

function ImageNode() {
  const { handleDuplicate, handleDelete } = useImageOperations(id);
  // 组件只负责渲染
}
```

---

## 📚 相关文档

- [重构指南](./docs/REFACTORING_GUIDE.md) - 完整的重构设计和执行记录
- [TODO](./docs/TODO.md) - 待办事项
- [激活系统](./docs/activation-system.md) - 激活码系统文档
- [Flow API](./docs/flow-api-documentation.md) - Google Flow API 文档
