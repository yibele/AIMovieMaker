# Google FX 视频超清 (Upsample) API 文档

## 概述

这是 Google AI Sandbox 的核心 API，用于生成高清视频（视频超清/放大）。

## 接口地址

**发起视频超清请求**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo
```

**查询视频生成状态**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus
```

## 认证方式

使用 Bearer Token 认证：
```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 请求参数

### 发起超清请求参数

```json
{
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "seed": 14775,
            "videoInput": {
                "mediaId": "CAUSJDcwYTZiYWI5LWZiNTAtNDI3MS1hNTY4LTJkMWQ5ZGExZjBkMBokZTc3MGZmMzMtNGQzZC00YTVjLWIzMGUtYTM0YTExNzI0OTQ0IgNDQUUqJDhmYmNkYmU2LTc4NGYtNDRjNy1iMWQxLWQ3N2E1NWQyY2ZhMQ"
            },
            "videoModelKey": "veo_2_1080p_upsampler_8s",
            "metadata": {
                "sceneId": "5c3248ad-b298-4124-9642-41df0bfdd2b6"
            }
        }
    ],
    "clientContext": {
        "sessionId": ";1763136894168"
    }
}
```

| 参数 | 说明 |
|------|------|
| aspectRatio | 视频宽高比：`VIDEO_ASPECT_RATIO_LANDSCAPE` 或 `VIDEO_ASPECT_RATIO_PORTRAIT` |
| seed | 随机种子，用于控制生成的随机性 |
| videoInput.mediaId | 原始视频的媒体ID |
| videoModelKey | 模型名称：`veo_2_1080p_upsampler_8s` (1080p超清8秒) |
| metadata.sceneId | 场景ID，用于关联生成上下文 |
| clientContext.sessionId | 会话ID，用于跟踪请求 |

### 查询状态参数

```json
{
    "operations": [
        {
            "operation": {
                "name": "698f2d752670fc64ebc95841536b660d"
            },
            "sceneId": "5c3248ad-b298-4124-9642-41df0bfdd2b6",
            "status": "MEDIA_GENERATION_STATUS_PENDING"
        }
    ]
}
```

## 响应数据结构

### 发起请求响应

```json
{
    "operations": [
        {
            "operation": {
                "name": "698f2d752670fc64ebc95841536b660d"
            },
            "sceneId": "5c3248ad-b298-4124-9642-41df0bfdd2b6",
            "status": "MEDIA_GENERATION_STATUS_PENDING"
        }
    ],
    "remainingCredits": 360
}
```

### 查询状态响应（成功）

```json
{
    "operations": [
        {
            "operation": {
                "name": "698f2d752670fc64ebc95841536b660d",
                "metadata": {
                    "@type": "type.googleapis.com/google.internal.labs.aisandbox.v1.Media",
                    "name": "CAUSJDcwYTZiYWI5LWZiNTAtNDI3MS1hNTY4LTJkMWQ5ZGExZjBkMBokMWM3NWFmYzktZWMyYi00ZjdkLTg3M2YtYzM2NzQwYzQ3NWFhIgNDQUUqLjhmYmNkYmU2LTc4NGYtNDRjNy1iMWQxLWQ3N2E1NWQyY2ZhMV91cHNhbXBsZWQ",
                    "video": {
                        "seed": 922940,
                        "mediaGenerationId": "CAUSJDcwYTZiYWI5LWZiNTAtNDI3MS1hNTY4LTJkMWQ5ZGExZjBkMBokMWM3NWFmYzktZWMyYi00ZjdkLTg3M2YtYzM2NzQwYzQ3NWFhIgNDQUUqLjhmYmNkYmU2LTc4NGYtNDRjNy1iMWQxLWQ3N2E1NWQyY2ZhMV91cHNhbXBsZWQ",
                        "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/video/8fbcdbe6-784f-44c7-b1d1-d77a55d2cfa1_upsampled?GoogleAccessId=...",
                        "mediaVisibility": "PRIVATE",
                        "servingBaseUri": "https://storage.googleapis.com/ai-sandbox-videofx/image/8fbcdbe6-784f-44c7-b1d1-d77a55d2cfa1_upsampled?GoogleAccessId=...",
                        "model": "veo_2_1080p_upsampler_8s",
                        "isLooped": false,
                        "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE"
                    }
                }
            },
            "sceneId": "5c3248ad-b298-4124-9642-41df0bfdd2b6",
            "mediaGenerationId": "CAUSJDcwYTZiYWI5LWZiNTAtNDI3MS1hNTY4LTJkMWQ5ZGExZjBkMBokMWM3NWFmYzktZWMyYi00ZjdkLTg3M2YtYzM2NzQwYzQ3NWFhIgNDQUUqLjhmYmNkYmU2LTc4NGYtNDRjNy1iMWQxLWQ3N2E1NWQyY2ZhMV91cHNhbXBsZWQ",
            "status": "MEDIA_GENERATION_STATUS_SUCCESSFUL"
        }
    ],
    "remainingCredits": 360
}
```

## 状态说明

- `MEDIA_GENERATION_STATUS_PENDING` - 等待处理
- `MEDIA_GENERATION_STATUS_PROCESSING` - 正在处理
- `MEDIA_GENERATION_STATUS_SUCCESSFUL` - 生成成功
- `MEDIA_GENERATION_STATUS_FAILED` - 生成失败

## 重要字段说明

### 视频文件URL
- **fifeUrl**: 超清视频文件URL（高分辨率）
- **servingBaseUri**: 视频缩略图URL

### 媒体ID说明
- 原始视频的 `mediaId` 作为输入
- 超清视频会生成新的 `mediaGenerationId`
- 超清视频的文件名会添加 `_upsampled` 后缀

### 积分系统
- `remainingCredits`: 剩余可用积分
- 每次超清操作会消耗积分

## 代码示例

### 发起超清请求
```javascript
const generateUpsampledVideo = async (mediaId, sceneId, aspectRatio = 'VIDEO_ASPECT_RATIO_LANDSCAPE') => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'Content-Type': 'text/plain;charset=UTF-8',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      body: JSON.stringify({
        requests: [{
          aspectRatio: aspectRatio,
          seed: Math.floor(Math.random() * 1000000),
          videoInput: {
            mediaId: mediaId
          },
          videoModelKey: 'veo_2_1080p_upsampler_8s',
          metadata: {
            sceneId: sceneId
          }
        }],
        clientContext: {
          sessionId: ';' + Date.now()
        }
      })
    }
  );

  const data = await response.json();
  return data;
};
```

### 查询生成状态
```javascript
const checkVideoGenerationStatus = async (operationName, sceneId) => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
        'Content-Type': 'text/plain;charset=UTF-8',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      body: JSON.stringify({
        operations: [{
          operation: {
            name: operationName
          },
          sceneId: sceneId,
          status: 'MEDIA_GENERATION_STATUS_PENDING'
        }]
      })
    }
  );

  const data = await response.json();
  return data;
};
```

### 轮询直到完成
```javascript
const waitForUpsampledVideo = async (operationName, sceneId, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkVideoGenerationStatus(operationName, sceneId);
    const operation = status.operations[0];

    if (operation.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
      return operation;
    } else if (operation.status === 'MEDIA_GENERATION_STATUS_FAILED') {
      throw new Error('Video generation failed');
    }

    // 等待10秒后再次查询
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('Video generation timeout');
};
```

## 使用流程

1. **获取 Access Token** - 从 Google OAuth 获取 Bearer Token
2. **发起超清请求** - 调用 `batchAsyncGenerateVideoUpsampleVideo`
3. **获取操作名称** - 从响应中提取 `operation.name`
4. **轮询查询状态** - 使用 `batchCheckAsyncVideoGenerationStatus`
5. **获取超清视频** - 状态为 `SUCCESSFUL` 时提取视频URL

## 注意事项

- 需要有效的 Google Bearer Token
- 每次超清操作会消耗积分
- 视频生成过程是异步的，需要轮询状态
- 超清视频文件URL有时效性
- 支持横屏和竖屏两种格式