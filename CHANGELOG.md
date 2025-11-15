# 更新日志

## v0.2 - 2025-11-11

### ✨ 新功能

#### 图片节点增强
- ✅ **图片尺寸调整**：选中图片时，可以通过拖拽四角和边缘的控制点调整大小
- ✅ 最小尺寸限制：宽度 100px，高度 75px
- ✅ 尺寸实时更新到 store

#### 文本节点优化
- ✅ **透明背景**：移除白色背景，文本直接显示在画布上
- ✅ **文本编辑工具栏**：选中文本时显示，包含：
  - 字体大小：+ / - 按钮调整（10px - 72px）
  - 粗体：切换 bold / normal
  - 斜体：切换 italic / normal
  - 下划线：切换 underline / none
- ✅ 工具栏悬浮在文本上方，深色背景
- ✅ 选中态优化：蓝色描边 + 外边距

### 🎨 UI 改进

#### 底部输入框
- ✅ 改为悬浮卡片样式，位于屏幕底部中间
- ✅ 圆角设计，阴影效果
- ✅ 最大宽度 2xl，响应式布局

### 🐛 Bug 修复
- ✅ 修复图片节点无法显示的问题（React Flow 节点同步）
- ✅ 修复文本节点创建后无法显示的问题
- ✅ 移除所有调试日志，代码更整洁

### 📝 技术细节

#### 新增依赖
- `NodeResizer` from `reactflow` - 用于图片尺寸调整

#### 类型定义更新
```typescript
export interface TextElement extends CanvasElement {
  type: 'text';
  text: string;
  fontSize?: number;
  color?: string;
  fontWeight?: 'normal' | 'bold';      // 新增
  fontStyle?: 'normal' | 'italic';     // 新增
  textDecoration?: 'none' | 'underline'; // 新增
}
```

#### 组件更新
- `ImageNode.tsx`: 添加 NodeResizer 和尺寸状态管理
- `TextNode.tsx`: 完全重写，添加工具栏和样式控制
- `Canvas.tsx`: 添加 useEffect 同步节点数据
- `AIInputPanel.tsx`: 修改为悬浮样式

### 🎯 使用说明

#### 调整图片尺寸
1. 点击选中图片（出现蓝色边框）
2. 拖拽四角或边缘的控制点
3. 松开鼠标完成调整

#### 编辑文本样式
1. 点击选中文本（出现蓝色描边）
2. 上方会出现黑色工具栏
3. 点击按钮切换样式：
   - `-` / `+`：调整字号
   - **B**：切换粗体
   - *I*：切换斜体
   - <u>U</u>：切换下划线
4. 双击文本进入编辑模式

---

## v0.1 - 2025-11-11

### 初始版本
- 基础画布功能
- AI 图片生成（虚拟数据）
- 图片上传
- 文本添加
- 多选和框选
- 状态管理

