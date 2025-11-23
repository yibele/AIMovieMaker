# Grok API 调用文档

## 基础信息

- **API 基础地址**: `https://grok.com/rest/app-chat`
- **媒体上传**: `https://grok.com/rest/media`
- **请求方式**: POST
- **响应格式**: JSON 流式响应（多个 JSON 对象拼接，格式为 `}{`）

## 认证

### 必需的 Cookie

从 grok.com 浏览器会话中提取以下 Cookie：

```
sso, sso-rw, x-userid, x-challenge, x-signature, cf_clearance
```

### 必需的请求头

```javascript
{
  'Content-Type': 'application/json',
  'Origin': 'https://grok.com',
  'Cookie': '[完整的 Cookie 字符串]',
  'x-xai-request-id': crypto.randomUUID()
}
```

---

## API 端点

### 1. 创建对话 / 文本聊天

**端点**: `POST https://grok.com/rest/app-chat/conversations/new`

**请求示例**:

```json
{
  "temporary": false,
  "modelName": "grok-4-1-non-thinking-w-tool",
  "message": "你好",
  "fileAttachments": [],
  "imageAttachments": [],
  "disableSearch": false,
  "enableImageGeneration": false,
  "imageGenerationCount": 0
}
```

**流式响应**:

```json
{"result":{"conversation":{"conversationId":"xxx"}}}
{"result":{"response":{"token":"你好"}}}
{"result":{"response":{"isSoftStop":true}}}
```

---

### 2. 图像生成

**端点**: `POST https://grok.com/rest/app-chat/conversations/new`

**请求示例**:

```json
{
  "temporary": false,
  "modelName": "grok-4-1-non-thinking-w-tool",
  "message": "生成一张猫的图片",
  "enableImageGeneration": true,
  "enableImageStreaming": true,
  "imageGenerationCount": 2
}
```

**关键响应**（进度 50%）:

```json
{
  "result": {
    "response": {
      "streamingImageGenerationResponse": {
        "imageId": "xxx",
        "imageUrl": "users/{userId}/generated/{imageId}-part-0/image.jpg",
        "progress": 50
      }
    }
  }
}
```

**完成响应**（进度 100%）:

```json
{
  "result": {
    "response": {
      "streamingImageGenerationResponse": {
        "imageId": "xxx",
        "imageUrl": "users/{userId}/generated/{imageId}/image.jpg",
        "progress": 100,
        "assetId": "xxx"
      }
    }
  }
}
```

**访问图片**:

```
完整 URL: https://assets.grok.com/users/{userId}/generated/{imageId}/image.jpg
```

---

### 3. 上传图片（用于视频生成）

**端点**: `POST https://grok.com/rest/media/post/create`

**请求示例**:

```json
{
  "mediaType": "MEDIA_POST_TYPE_IMAGE",
  "mediaUrl": "https://assets.grok.com/users/{userId}/generated/{imageId}/image.jpg"
}
```

**响应**:

```json
{
  "id": "xxx",  // 重要：用于视频生成
  "userId": "xxx",
  "mediaUrl": "https://assets.grok.com/...",
  "mimeType": "image/jpeg"
}
```

---

### 4. 图片转视频

**端点**: `POST https://grok.com/rest/app-chat/conversations/new`

**请求示例**:

```json
{
  "temporary": true,
  "modelName": "grok-3",
  "message": "https://assets.grok.com/users/{userId}/generated/{imageId}/image.jpg --mode=normal",
  "fileAttachments": ["{imageId}"],
  "toolOverrides": {
    "videoGen": true
  },
  "responseMetadata": {
    "modelConfigOverride": {
      "modelMap": {
        "videoGenModelConfig": {
          "parentPostId": "{imageId}",
          "aspectRatio": "2:3",
          "videoLength": 6
        }
      }
    }
  }
}
```

**视频配置参数**:
- `aspectRatio`: `"2:3"`, `"16:9"`, `"9:16"`, `"1:1"`
- `videoLength`: 通常为 `6` 秒
- `mode`: `"normal"`

**流式响应**（进行中）:

```json
{
  "result": {
    "response": {
      "streamingVideoGenerationResponse": {
        "videoId": "xxx",
        "progress": 45,  // 1, 5, 15, 24, 33, 45, 95, 100
        "imageReference": "https://assets.grok.com/...",
        "mode": "normal",
        "modelName": "imagine_xdit_1"
      }
    }
  }
}
```

**完成响应**（进度 100%）:

```json
{
  "result": {
    "response": {
      "streamingVideoGenerationResponse": {
        "videoId": "xxx",
        "progress": 100,
        "assetId": "xxx",
        "videoUrl": "users/{userId}/generated/{videoId}/generated_video.mp4",
        "thumbnailImageUrl": "users/{userId}/generated/{videoId}/preview_image.jpg"
      }
    }
  }
}
```

**访问视频**:

```
视频: https://assets.grok.com/users/{userId}/generated/{videoId}/generated_video.mp4
缩略图: https://assets.grok.com/users/{userId}/generated/{videoId}/preview_image.jpg
```

---

## 完整示例代码

### 视频生成完整流程

```javascript
// 1. 上传图片
const uploadResponse = await fetch('https://grok.com/rest/media/post/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': cookies
  },
  body: JSON.stringify({
    mediaType: 'MEDIA_POST_TYPE_IMAGE',
    mediaUrl: imageUrl
  })
});
const { id: mediaPostId } = await uploadResponse.json();

// 2. 生成视频
const videoResponse = await fetch('https://grok.com/rest/app-chat/conversations/new', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': cookies,
    'x-xai-request-id': crypto.randomUUID()
  },
  body: JSON.stringify({
    temporary: true,
    modelName: 'grok-3',
    message: `${imageUrl} --mode=normal`,
    fileAttachments: [mediaPostId],
    toolOverrides: { videoGen: true },
    responseMetadata: {
      modelConfigOverride: {
        modelMap: {
          videoGenModelConfig: {
            parentPostId: mediaPostId,
            aspectRatio: '2:3',
            videoLength: 6
          }
        }
      }
    }
  })
});

// 3. 处理流式响应
const reader = videoResponse.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const jsonObjects = buffer.split('}{');
  buffer = jsonObjects.pop() || '';
  
  jsonObjects.forEach((json, index) => {
    if (index > 0) json = '{' + json;
    if (index < jsonObjects.length - 1 || buffer === '') json = json + '}';
    
    try {
      const data = JSON.parse(json);
      
      // 监听视频生成进度
      if (data.result?.response?.streamingVideoGenerationResponse) {
        const video = data.result.response.streamingVideoGenerationResponse;
        console.log(`进度: ${video.progress}%`);
        
        if (video.progress === 100) {
          const videoUrl = `https://assets.grok.com/${video.videoUrl}`;
          console.log('视频完成:', videoUrl);
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  });
}
```

---

## 快速参考

### 模型选择
- **文本对话/图像生成**: `grok-4-1-non-thinking-w-tool`
- **视频生成**: `grok-3`

### 图像模型
- 生成: `imagine_x_1`

### 视频模型
- 生成: `imagine_xdit_1`

### 视频进度值
`1` → `5` → `15` → `24` → `33` → `45` → `95` → `100`

### 媒体资源访问
- **图片**: `https://assets.grok.com/` + 相对路径
- **视频**: `https://assets.grok.com/` + 相对路径
- **认证**: 必须携带有效的 Cookie

---

## 注意事项

1. Cookie 会过期，需定期更新
2. 所有响应都是流式的，需正确解析 `}{` 格式
3. 视频生成前必须先上传图片获取 `mediaPostId`
4. 媒体资源访问需要认证
5. `isSoftStop: true` 表示响应结束
