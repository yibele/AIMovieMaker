# Canvas.tsx 重构任务清单

> 📅 开始时间: 2025-11-18  
> 🎯 目标: 将 1515 行的 Canvas.tsx 拆分为可维护的模块化组件  
> 📋 状态: 进行中

---

## 📊 当前状况分析

### Canvas.tsx 现状 (1515 行)
- ✅ **功能完整**: 所有功能正常工作
- ❌ **代码过长**: 1515 行，难以维护
- ❌ **职责过多**: 包含 10+ 个不同职责
- ❌ **类型不安全**: 大量 `@ts-ignore` 和 `any` 类型

### 主要功能模块识别

| 模块 | 行数 | 职责 | 优先级 |
|------|------|------|--------|
| 连线菜单系统 | ~300 行 | 处理节点连线时的菜单交互 | 🔴 高 |
| 视频生成逻辑 | ~200 行 | 图生视频、文生视频 | 🔴 高 |
| 图片生成逻辑 | ~200 行 | 文生图、图生图、多图融合 | 🔴 高 |
| 节点连接处理 | ~150 行 | React Flow 连线事件处理 | 🟡 中 |
| 状态同步逻辑 | ~100 行 | Store ↔ React Flow 双向同步 | 🟡 中 |
| 边缘管理 | ~80 行 | 动态边缘样式、动画 | 🟢 低 |
| 节点拖拽 | ~50 行 | 多选拖拽、位置同步 | 🟢 低 |

---

## 🎯 重构策略

### 原则
1. **渐进式重构**: 每次只拆分一个模块，保证功能正常
2. **保持功能**: 不改变任何现有功能和用户体验
3. **类型安全**: 逐步消除 `any` 和 `@ts-ignore`
4. **测试验证**: 每次拆分后必须手动测试所有功能

### 拆分顺序
```
Phase 1: 连线菜单系统 (最独立，可以先拆)
  ↓
Phase 2: 图片生成逻辑 (依赖少)
  ↓
Phase 3: 视频生成逻辑 (依赖图片)
  ↓
Phase 4: 连接处理和状态同步 (核心逻辑)
  ↓
Phase 5: 类型优化和清理 (最后完善)
```

---

## 📋 任务列表

### Phase 1: 连线菜单系统拆分 (2-3天) ✅ 已完成

#### 1.1 创建连线菜单组件目录
- [x] ✅ 创建 `components/canvas/connection-menu/` 目录
- [x] ✅ 设计连线菜单类型定义文件 (`types/connection-menu.ts`)

#### 1.2 提取连线菜单状态管理
- [x] ✅ 创建 `useConnectionMenu.ts` Hook
- [x] ✅ 迁移 `ConnectionMenuState` 类型定义
- [x] ✅ 迁移 `connectionMenu` 状态和相关方法
  - `createConnectionMenuState()`
  - `resetConnectionMenu()`
  - 所有 `setConnectionMenu()` 调用

#### 1.3 拆分连线菜单 UI 组件
- [x] ✅ 创建 `ConnectionMenuRoot.tsx` - 主菜单容器
- [x] ✅ 创建 `ImageSubmenu.tsx` - 图片比例选择菜单
- [x] ✅ 创建 `VideoSubmenu.tsx` - 视频比例选择菜单
- [x] ✅ 创建 `ImagePromptInput.tsx` - 图生图提示词输入框

#### 1.4 整合和测试
- [x] ✅ 在 Canvas.tsx 中引入新组件
- [x] ✅ 删除原有的连线菜单 JSX 代码 (~150行)
- [x] ✅ 测试清单已创建 (`PHASE1_TEST_CHECKLIST.md`)
- [x] ✅ TypeScript 编译通过
- [x] ✅ 构建成功

**实际代码减少**: 203 行 → Canvas.tsx 从 1515 行减少到 1312 行 (-13.4%)

---

### Phase 2: 图片生成逻辑拆分 (2-3天)

#### 2.1 创建图片生成 Hooks 目录
- [ ] 创建 `hooks/canvas/` 目录
- [ ] 设计图片生成类型定义

#### 2.2 拆分文生图逻辑
- [ ] 创建 `useTextToImage.ts` Hook
- [ ] 迁移 `handleTextToImage()` 函数
- [ ] 处理依赖: `addElement`, `updateElement`, `setEdges`

#### 2.3 拆分图生图逻辑
- [ ] 创建 `useImageToImage.ts` Hook
- [ ] 迁移 `handleImageToImage()` 函数
- [ ] 迁移 `handleImagePromptInputChange()`
- [ ] 迁移 `handleConfirmImagePrompt()`

#### 2.4 拆分输入框生成逻辑
- [ ] 创建 `useInputGeneration.ts` Hook
- [ ] 迁移 `handleGenerateFromInput()` 函数
- [ ] 迁移输入框注册逻辑 (useEffect)

#### 2.5 整合和测试
- [ ] 在 Canvas.tsx 中引入新 Hooks
- [ ] 删除原有的图片生成函数 (~200行)
- [ ] 测试所有图片生成场景:
  - 文本节点拉线生成图片
  - 图片节点拉线生成新图片
  - 输入框文生图 (无选中)
  - 输入框图生图 (单选)
  - 输入框多图融合 (多选)

**预期代码减少**: ~200 行 → Canvas.tsx 剩余 ~1065 行

---

### Phase 3: 视频生成逻辑拆分 (2-3天)

#### 3.1 创建视频生成 Hooks
- [ ] 创建 `useVideoGeneration.ts` Hook
- [ ] 设计视频生成状态接口

#### 3.2 拆分视频生成核心逻辑
- [ ] 迁移 `maybeStartVideo()` 函数
- [ ] 迁移 `activeGenerationRef` 逻辑
- [ ] 处理视频生成的进度更新
- [ ] 处理边缘动画同步

#### 3.3 拆分文生视频逻辑
- [ ] 创建 `useTextToVideo.ts` Hook
- [ ] 迁移 `handleTextToVideo()` 函数

#### 3.4 拆分图生视频逻辑
- [ ] 创建 `useImageToVideo.ts` Hook
- [ ] 迁移 `handleImageToVideo()` 函数
- [ ] 迁移 `createVideoNodeFromImage()` 函数
- [ ] 迁移 `createTextNodeForVideo()` 函数

#### 3.5 整合和测试
- [ ] 在 Canvas.tsx 中引入新 Hooks
- [ ] 删除原有的视频生成函数 (~250行)
- [ ] 测试所有视频生成场景:
  - 文本节点拉线生成视频
  - 图片节点拉线生成视频
  - 视频节点拉线创建提示词文本
  - 图片连接到视频节点的首帧/尾帧
  - 文本连接到视频节点的提示词
  - 视频自动生成 (readyForGeneration 触发)

**预期代码减少**: ~250 行 → Canvas.tsx 剩余 ~815 行

---

### Phase 4: 连接处理和状态同步 (3-4天)

#### 4.1 拆分连接事件处理
- [ ] 创建 `useConnectionEvents.ts` Hook
- [ ] 迁移 `handleConnectStart()` 函数
- [ ] 迁移 `handleConnectEnd()` 函数
- [ ] 迁移 `handleConnect()` 函数
- [ ] 迁移 `connectionStartRef` 逻辑

#### 4.2 拆分节点变化处理
- [ ] 创建 `useNodesSync.ts` Hook
- [ ] 迁移 `handleNodesChange()` 函数
- [ ] 迁移 `handleNodeDragStop()` 函数
- [ ] 迁移 `handleSelectionChange()` 函数

#### 4.3 拆分状态同步逻辑
- [ ] 创建 `useCanvasStateSync.ts` Hook
- [ ] 迁移 store → React Flow 同步 (useEffect)
- [ ] 迁移边缘自动清理逻辑 (useEffect)
- [ ] 处理节点选中状态保留

#### 4.4 整合和测试
- [ ] 在 Canvas.tsx 中引入新 Hooks
- [ ] 删除原有的连接和同步代码 (~300行)
- [ ] 测试所有交互场景:
  - 节点拖拽 (单选/多选)
  - 节点删除
  - 节点选中
  - 连线创建
  - 连线删除

**预期代码减少**: ~300 行 → Canvas.tsx 剩余 ~515 行

---

### Phase 5: 类型优化和清理 (2-3天)

#### 5.1 消除 `@ts-ignore` 注释
- [ ] 为 React Flow 的 Node/Edge 创建准确的类型定义
- [ ] 创建 `types/canvas-flow.ts` 类型文件
- [ ] 替换所有 `@ts-ignore` 为正确的类型

#### 5.2 消除 `any` 类型
- [ ] 识别所有 `any` 使用位置
- [ ] 为 edges 操作创建类型定义
- [ ] 为 nodes 操作创建类型定义
- [ ] 为事件处理创建类型定义

#### 5.3 重构 React Flow 配置
- [ ] 提取 React Flow props 到独立的配置对象
- [ ] 创建 `constants/canvas-config.ts` 常量文件
- [ ] 提取默认值常量:
  - `VIDEO_NODE_DEFAULT_SIZE`
  - `EDGE_DEFAULT_STYLE`
  - 所有硬编码的数值

#### 5.4 最终清理
- [ ] 移除未使用的导入
- [ ] 统一注释风格（行级注释）
- [ ] 检查所有 TODO 注释
- [ ] 运行 Linter 并修复问题

#### 5.5 整合和测试
- [ ] 完整的端到端测试
- [ ] 确认所有功能正常
- [ ] 确认类型检查通过

**预期代码减少**: ~100 行 → Canvas.tsx 最终 ~400 行

---

## 🎯 最终目标架构

```
components/
├── Canvas.tsx                           // ~400 行 (主容器)
├── canvas/
│   ├── connection-menu/
│   │   ├── ConnectionMenuRoot.tsx      // 菜单容器
│   │   ├── ImageSubmenu.tsx            // 图片子菜单
│   │   ├── VideoSubmenu.tsx            // 视频子菜单
│   │   └── ImagePromptInput.tsx        // 提示词输入
│   └── constants/
│       └── canvas-config.ts            // 配置常量
│
hooks/
├── canvas/
│   ├── useConnectionMenu.ts            // 连线菜单状态
│   ├── useConnectionEvents.ts          // 连线事件处理
│   ├── useNodesSync.ts                 // 节点同步
│   ├── useCanvasStateSync.ts           // 状态同步
│   ├── useTextToImage.ts               // 文生图
│   ├── useImageToImage.ts              // 图生图
│   ├── useInputGeneration.ts           // 输入框生成
│   ├── useVideoGeneration.ts           // 视频生成核心
│   ├── useTextToVideo.ts               // 文生视频
│   └── useImageToVideo.ts              // 图生视频
│
types/
└── canvas-flow.ts                      // React Flow 类型定义
```

---

## 📈 进度跟踪

### 总体进度
- **已完成**: 1/5 阶段 (20%) ✅
- **进行中**: 无
- **待开始**: Phase 2-5

### 代码行数目标
| 阶段 | 完成后行数 | 减少行数 | 累计减少 |
|------|-----------|----------|----------|
| 初始状态 | 1515 | - | - |
| Phase 1 ✅ | 1312 | -203 | 13.4% |
| Phase 2 | ~1112 | -200 | 26.6% |
| Phase 3 | ~862 | -250 | 43.1% |
| Phase 4 | ~562 | -300 | 62.9% |
| Phase 5 | ~400 | -162 | 73.6% |

### 本周目标 (Week 1)
- [x] ✅ 完成 Phase 1: 连线菜单系统拆分 (2025-11-18)
- [ ] 开始 Phase 2: 图片生成逻辑拆分

---

## ✅ 验收标准

### 功能验收
- [ ] 所有原有功能保持正常
- [ ] 无新增 Bug
- [ ] 用户体验无变化

### 代码质量验收
- [ ] Canvas.tsx < 500 行
- [ ] 无 `@ts-ignore` 注释
- [ ] `any` 类型 < 5 处
- [ ] 所有函数有清晰的行级注释
- [ ] TypeScript 编译 0 错误 0 警告

### 性能验收
- [ ] 渲染性能无下降
- [ ] 内存占用无明显增加
- [ ] 首次加载时间无变化

---

## 🚨 风险和注意事项

### 已知风险
1. **React Flow 类型复杂**: 需要仔细处理 Node/Edge 类型定义
2. **状态同步时序**: Store ↔ React Flow 双向同步容易出现时序问题
3. **闭包陷阱**: useCallback 依赖项需要仔细检查
4. **边缘情况**: 多选拖拽、快速连线等边缘场景需要重点测试

### 回滚策略
- 每个 Phase 完成后立即 Git commit
- 如果出现严重问题，可以快速 revert 到上一个稳定状态
- 保持 `git reflog` 记录，确保可以恢复到任意时刻

---

## 📝 变更日志

| 日期 | 阶段 | 变更内容 |
|------|------|----------|
| 2025-11-18 | - | 创建重构任务清单 |

---

> 💡 **提示**: 严格按照 Phase 顺序执行，每个 Phase 完成后必须进行完整测试再进入下一阶段。

