# Flow API 接口文档

## 概述

Flow API 是 Google AI Sandbox 提供的媒体生成服务，支持图片上传、文生图、图生图、文生视频和图生视频等功能。

## 基础信息

- **Base URL**: `https://aisandbox-pa.googleapis.com`
- **认证方式**: Bearer Token（需要有效的 OAuth 2.0 访问令牌）
- **Content-Type**: `application/json` 或 `text/plain;charset=UTF-8`

## 1. 用户图片上传

### 接口地址
```
POST /v1:uploadUserImage
```

### 请求头
```http
Authorization: Bearer [REDACTED_OAUTH_TOKEN]
Content-Type: text/plain;charset=UTF-8
```

### 请求体
```json
{
    "imageInput": {
        "rawImageBytes": "/9j/4AAQSkZJRgABAQAAAQABAAD/...",
        "mimeType": "image/jpeg",
        "isUserUploaded": true,
        "aspectRatio": "IMAGE_ASPECT_RATIO_PORTRAIT"
    },
    "clientContext": {
        "sessionId": ";1762958374159",
        "tool": "ASSET_MANAGER"
    }
}
```

### 响应
```json
{
    "mediaGenerationId": {
        "mediaGenerationId": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ"
    },
    "width": 768,
    "height": 1364
}
```

## 2. 生成图片

### 2.1 文生图

#### 接口地址
```
POST /v1/projects/{projectId}/flowMedia:batchGenerateImages
```

#### 请求体
```json
{
    "requests": [
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 620172,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "一个美女",
            "imageInputs": []
        }
    ]
}
```

#### 响应
返回一个数组，包含每个请求的生成结果：

```json
[
    {
        "name": "CAMSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokMDQxZTBmODktZGE3ZS00NDE5LWJmZTEtZGQ4YzIyZGRlMTRmIgNDQUUqJDRhYWI0NGM4LTRiODYtNGRkMy05YWI0LTUwNzJmODYxYjc4ZQ",
        "workflowId": "041e0f89-da7e-4419-bfe1-dd8c22dde14f",
        "image": {
            "generatedImage": {
                "encodedImage": "iVBORw0KGgoAAAANSUhEUgAABUAAAAMACAIAAABq...",
                "seed": 620172,
                "mediaGenerationId": "CAMSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokMDQxZTBmODktZGE3ZS00NDE5LWJmZTEtZGQ4YzIyZGRlMTRmIgNDQUUqJDRhYWI0NGM4LTRiODYtNGRkMy05YWI0LTUwNzJmODYxYjc4ZQ",
                "mediaVisibility": "PRIVATE",
                "prompt": "A beautiful woman",
                "modelNameType": "GEM_PIX",
                "workflowId": "041e0f89-da7e-4419-bfe1-dd8c22dde14f",
                "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/image/4aab44c8-4b86-4dd3-9ab4-5072f861b78e?GoogleAccessId=...",
                "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
                "requestData": {
                    "promptInputs": [
                        {
                            "textInput": "一个美女"
                        }
                    ],
                    "imageGenerationRequestData": {}
                }
            }
        }
    }
]
```

### 2.2 图生图

#### 请求体（包含参考图片）
```json
{
    "requests": [
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 633706,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "三个角色在同一图片中",
            "imageInputs": [
                {
                    "name": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                }
            ]
        }
    ]
}
```

### 参数说明

#### imageAspectRatio 枚举值
- `IMAGE_ASPECT_RATIO_LANDSCAPE` - 横向（16:9）
- `IMAGE_ASPECT_RATIO_PORTRAIT` - 纵向（9:16）
- `IMAGE_ASPECT_RATIO_SQUARE` - 方形（1:1）

#### imageModelName
- `GEM_PIX` - 主要的图片生成模型

## 3. 生成视频

### 3.1 文生视频

#### 接口地址
```
POST /v1/video:batchAsyncGenerateVideoText
```

#### 请求体（纵向视频）
```json
{
    "clientContext": {
        "sessionId": ";1762958374159",
        "projectId": "02ac868b-925f-40c1-9187-a688bd03a84d",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_ONE"
    },
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "seed": 18237,
            "textInput": {
                "prompt": "一个美女跳舞"
            },
            "videoModelKey": "veo_3_1_t2v_fast_portrait",
            "metadata": {
                "sceneId": "b35919a4-3a87-4d9e-8843-f292b7df4723"
            }
        }
    ]
}
```

#### 请求体（横向视频）
```json
{
    "clientContext": {
        "sessionId": ";1762967930559",
        "projectId": "02ac868b-925f-40c1-9187-a688bd03a84d",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_ONE"
    },
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "seed": 8809,
            "textInput": {
                "prompt": "一个美女在吃饭"
            },
            "videoModelKey": "veo_3_1_t2v_fast",
            "metadata": {
                "sceneId": "d2485960-b2b8-499b-8289-e927e63556b5"
            }
        }
    ]
}
```

#### 响应（异步任务）
```json
{
    "operations": [
        {
            "operation": {
                "name": "f1c22d03926da6fde596fbf0859404b7"
            },
            "sceneId": "b35919a4-3a87-4d9e-8843-f292b7df4723",
            "status": "MEDIA_GENERATION_STATUS_PENDING"
        }
    ],
    "remainingCredits": 660
}
```

### 3.2 查询视频生成状态

#### 接口地址
```
POST /v1/video:batchCheckAsyncVideoGenerationStatus
```

#### 请求体
```json
{
    "operations": [
        {
            "operation": {
                "name": "f1c22d03926da6fde596fbf0859404b7"
            },
            "sceneId": "b35919a4-3a87-4d9e-8843-f292b7df4723",
            "status": "MEDIA_GENERATION_STATUS_PENDING"
        }
    ]
}
```

#### 响应（生成中）
```json
[
    {
        "operation": {
            "name": "f1c22d03926da6fde596fbf0859404b7"
        },
        "sceneId": "b35919a4-3a87-4d9e-8843-f292b7df4723",
        "status": "MEDIA_GENERATION_STATUS_ACTIVE"
    }
]
```

#### 响应（生成完成）
```json
{
    "operations": [
        {
            "operation": {
                "name": "f1c22d03926da6fde596fbf0859404b7",
                "metadata": {
                    "@type": "type.googleapis.com/google.internal.labs.aisandbox.v1.Media",
                    "name": "CAUSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokMDFkYjFmY2EtYzJlMC00ZWU3LWFjZTItMGVlNGVjMGVhNTczIgNDQUUqJGU5OThiMWYyLWZkNDktNGRiZi1iZTI2LWFiMjQzYzA0MjM5OA",
                    "video": {
                        "seed": 18237,
                        "mediaGenerationId": "CAUSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokMDFkYjFmY2EtYzJlMC00ZWU3LWFjZTItMGVlNGVjMGVhNTczIgNDQUUqJGU5OThiMWYyLWZkNDktNGRiZi1iZTI2LWFiMjQzYzA0MjM5OA",
                        "prompt": "一个美女跳舞",
                        "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/video/e998b1f2-fd49-4dbf-be26-ab243c042398?GoogleAccessId=...",
                        "mediaVisibility": "PRIVATE",
                        "servingBaseUri": "https://storage.googleapis.com/ai-sandbox-videofx/image/e998b1f2-fd49-4dbf-be26-ab243c042398?GoogleAccessId=...",
                        "model": "veo_3_1_t2v_fast_portrait",
                        "isLooped": false,
                        "aspectRatio": "VIDEO_ASPECT_RATIO_PORTRAIT"
                    }
                }
            },
            "sceneId": "b35919a4-3a87-4d9e-8843-f292b7df4723",
            "mediaGenerationId": "CAUSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokMDFkYjFmY2EtYzJlMC00ZWU3LWFjZTItMGVlNGVjMGVhNTczIgNDQUUqJGU5OThiMWYyLWZkNDktNGRiZi1iZTI2LWFiMjQzYzA0MjM5OA",
            "status": "MEDIA_GENERATION_STATUS_SUCCESSFUL"
        }
    ],
    "remainingCredits": 660
}
```

### 3.3 图生视频（首尾帧）

#### 接口地址
```
POST /v1/video:batchAsyncGenerateVideoStartAndEndImage
```

#### 请求体
```json
{
    "clientContext": {
        "sessionId": ";1762958374159",
        "projectId": "02ac868b-925f-40c1-9187-a688bd03a84d",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_ONE"
    },
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "seed": 32151,
            "textInput": {
                "prompt": "自然过渡"
            },
            "videoModelKey": "veo_3_1_i2v_s_fast_portrait_fl",
            "startImage": {
                "mediaId": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ"
            },
            "endImage": {
                "mediaId": "CAMaJDRmZDY4N2EyLTRkOGUtNDU2MC1iN2JiLTAzMGM2YTQ5NWZmMCIDQ0FFKiRkMzZkOGYyMy04ZjI1LTQ4OTAtYWI1MS0zZDk1ZjJiYjI5ODg"
            },
            "metadata": {
                "sceneId": "13fc39cc-9ab3-4bbd-8239-4212afc73789"
            }
        }
    ]
}
```

### 参数说明

#### videoModelKey
- `veo_3_1_t2v_fast_portrait` - 文生视频模型（纵向）
- `veo_3_1_t2v_fast` - 文生视频模型（横向）
- `veo_3_1_i2v_s_fast_portrait_fl` - 图生视频模型（首尾帧）

#### status 状态枚举
- `MEDIA_GENERATION_STATUS_PENDING` - 等待中
- `MEDIA_GENERATION_STATUS_ACTIVE` - 处理中
- `MEDIA_GENERATION_STATUS_SUCCESSFUL` - 成功
- `MEDIA_GENERATION_STATUS_FAILED` - 失败

#### VIDEO_ASPECT_RATIO
- `VIDEO_ASPECT_RATIO_PORTRAIT` - 纵向（9:16）
- `VIDEO_ASPECT_RATIO_LANDSCAPE` - 横向（16:9）

> ⚠️ **返回结构说明**：`video:batchCheckAsyncVideoGenerationStatus` 的响应中，`metadata` 字段通常嵌套在 `operations[i].operation.metadata` 下，个别场景仍可能将 `metadata` 平铺在 `operations[i]` 上。解析结果时请同时兼容这两种结构，并优先从 `metadata.video.fifeUrl` 读取最终视频地址，从 `metadata.video.servingBaseUri` 读取缩略图。

## 通用参数说明

### clientContext
```json
{
    "sessionId": "会话ID",
    "projectId": "项目ID",
    "tool": "工具名称（ASSET_MANAGER/PINHOLE）",
    "userPaygateTier": "付费层级（PAYGATE_TIER_ONE）"
}
```

### seed
- 类型：整数
- 说明：随机种子，用于控制生成的随机性，相同种子会产生相同结果

### mediaGenerationId
- 媒体生成唯一标识符，用于后续查询和引用

### fifeUrl vs servingBaseUri
- `fifeUrl`：视频文件的完整 URL
- `servingBaseUri`：视频缩略图的 URL

## 注意事项

1. **认证**：所有请求都需要在 Header 中包含有效的 Bearer Token
2. **异步处理**：视频生成是异步操作，需要轮询状态接口获取结果
3. **配额限制**：响应中的 `remainingCredits` 表示剩余的生成次数
4. **图片格式**：上传图片需要 base64 编码
5. **批量操作**：图片生成支持批量请求，在 `requests` 数组中添加多个请求对象
6. **URL 有效期**：生成的媒体 URL 包含过期参数，需要及时下载保存

## 错误处理

- **401 Unauthorized**：认证失败，检查 Token 是否有效
- **400 Bad Request**：请求参数错误，检查请求体格式
- **429 Too Many Requests**：请求频率过高，需要限流
- **500 Internal Server Error**：服务器内部错误，稍后重试