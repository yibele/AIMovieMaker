# fal.ai SeedVR2 图片放大 API 文档

## 概述

集成 fal.ai 的 SeedVR2 图片放大模型，专门用于分镜生成时的高清放大。

**只支持 2K 和 4K 两种目标分辨率。**

## 重要限制

- **并发限制**：每个用户最多 **2 个并发任务**（跨所有 fal.ai 端点）
- **费用警告**：此功能按 megapixel 计费，请谨慎使用
- 企业用户可联系 fal.ai 提升并发限制

## 功能开关配置

在 `lib/config/features.ts` 中配置：

```typescript
// 是否启用分镜高清放大
export const ENABLE_STORYBOARD_UPSCALE = false;  // 默认关闭

// 放大目标分辨率：'2K' 或 '4K'
export const STORYBOARD_UPSCALE_RESOLUTION = '2K';

// fal.ai API Key（必须配置才能启用）
export const FAL_API_KEY = 'your-api-key-here';
```

## API 端点

### 1. 提交放大任务

**POST** `/api/fal/upscale`

#### 请求参数（简化版）

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `falApiKey` | string | ✅ | - | fal.ai API 密钥 |
| `imageUrl` | string | ✅ | - | 要放大的图片 URL |
| `resolution` | string | ❌ | `2K` | 目标分辨率：`2K` 或 `4K` |
| `syncMode` | boolean | ❌ | `true` | 同步模式：`true` 等待结果 |

#### 响应示例

```json
{
  "success": true,
  "mode": "sync",
  "resolution": "2K",
  "data": {
    "imageUrl": "https://storage.googleapis.com/...",
    "contentType": "image/png",
    "width": 2560,
    "height": 1440,
    "seed": 123456
  },
  "requestId": "abc123..."
}
```

### 2. 查询任务状态

**POST** `/api/fal/upscale/status`

#### 请求参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `falApiKey` | string | ✅ | fal.ai API 密钥 |
| `requestId` | string | ✅ | 任务请求 ID |

#### 响应状态

- `IN_QUEUE` - 排队中
- `IN_PROGRESS` - 处理中
- `COMPLETED` - 已完成
- `FAILED` - 失败

#### 进行中响应示例

```json
{
  "success": true,
  "status": "IN_PROGRESS",
  "queuePosition": 1,
  "logs": ["Processing image..."],
  "requestId": "abc123..."
}
```

#### 完成响应示例

```json
{
  "success": true,
  "status": "COMPLETED",
  "data": {
    "imageUrl": "https://storage.googleapis.com/...",
    "contentType": "image/jpeg",
    "width": 2048,
    "height": 2048,
    "seed": 123456
  },
  "requestId": "abc123..."
}
```

## 分镜集成

高清放大已集成到分镜生成流程中。当 `ENABLE_STORYBOARD_UPSCALE = true` 时：

**原流程：**
1. 生成 1080P 网格图
2. 切割成 2×2 分镜（每张 ~540×540）

**新流程：**
1. 生成 1080P 网格图
2. **放大到 2K/4K**
3. 切割放大后的高清图（每张 ~1280×720 或更高）

### 启用步骤

1. 编辑 `lib/config/features.ts`：

```typescript
// 启用分镜高清放大
export const ENABLE_STORYBOARD_UPSCALE = true;

// 设置分辨率（2K 性价比高，4K 最清晰）
export const STORYBOARD_UPSCALE_RESOLUTION = '2K';

// 配置 API Key
export const FAL_API_KEY = 'your-fal-api-key';
```

2. 重启应用即可生效

## 手动调用示例

```typescript
// 放大单张图片到 2K
const response = await fetch('/api/fal/upscale', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    falApiKey: 'your-api-key',
    imageUrl: 'https://example.com/image.jpg',
    resolution: '2K',  // 或 '4K'
  }),
});

const result = await response.json();
console.log(result.data.imageUrl);  // 放大后的图片 URL
```

## 错误处理

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | - | 无效参数（只支持 2K/4K） |
| 429 | `RATE_LIMIT_EXCEEDED` | 已达到并发限制（最多 2 个） |

## 定价

fal.ai 按 megapixel 计费：

| 分辨率 | 输出尺寸 | 预估费用 |
|--------|----------|----------|
| 2K | 2560×1440 | ~$0.02/张 |
| 4K | 3840×2160 | ~$0.04/张 |

*实际费用以 [fal.ai Pricing](https://fal.ai/pricing) 为准*

## 参考链接

- [fal.ai SeedVR2 API](https://fal.ai/models/fal-ai/seedvr/upscale/image/api)
- [fal.ai Rate Limits](https://docs.fal.ai/model-apis/faq#is-there-a-rate-limit)

