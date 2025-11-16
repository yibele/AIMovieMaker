# Google FX API 文档

## 接口地址

**创建项目**：
```
POST https://labs.google/fx/api/trpc/project.createProject
```

**删除项目**：
```
POST https://labs.google/fx/api/trpc/project.deleteProject
```

**删除素材**：
```
POST https://labs.google/fx/api/trpc/media.deleteMedia
```

**Flow 图片生成**：
```
POST https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages
```

**Flow 图片上传**：
```
POST https://aisandbox-pa.googleapis.com/v1:uploadUserImage
```

**Flow 文生视频**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText
```

**Flow 图生视频（仅首帧）**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage
```

**Flow 图生视频（首尾帧）**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage
```

**Flow 视频状态查询**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus
```

**视频超清 (Upsample)**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo
```

**查询视频状态**：
```
POST https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus
```

**获取项目列表**：
```
GET https://labs.google/fx/api/trpc/project.searchUserProjects
```

**视频相册列表**：
```
GET https://labs.google/fx/api/trpc/project.searchProjectWorkflows
```

**图片项目**：
```
GET https://labs.google/fx/api/trpc/project.searchProjectWorkflows
```

## 功能

### Google FX 项目管理
- `createProject` - 创建新项目
- `deleteProject` - 删除项目
- `deleteMedia` - 删除素材（图片/视频）
- `searchUserProjects` - 获取用户项目列表
- `searchProjectWorkflows` + `MEDIA_TYPE_VIDEO` - 获取视频相册列表
- `searchProjectWorkflows` + `MEDIA_TYPE_IMAGE` - 搜索图片项目工作流

### Flow 创作工具
- `batchGenerateImages` - Flow 图片生成（文生图/图生图）
- `uploadUserImage` - Flow 图片上传
- `batchAsyncGenerateVideoText` - Flow 文生视频
- `batchAsyncGenerateVideoStartImage` - Flow 图生视频（仅首帧）
- `batchAsyncGenerateVideoStartAndEndImage` - Flow 图生视频（首尾帧）
- `batchCheckAsyncVideoGenerationStatus` - Flow 视频状态查询

### 视频增强工具
- `batchAsyncGenerateVideoUpsampleVideo` - 生成超清视频 (1080p)
- `batchCheckAsyncVideoGenerationStatus` - 视频生成状态查询（通用）

## 参数

### 创建项目参数
```json
{
    "json": {
        "projectTitle": "项目标题",
        "toolName": "PINHOLE"
    }
}
```

| 参数 | 说明 |
|------|------|
| projectTitle | 项目标题，如 "Nov 15 - 00:06" |
| toolName | 工具名，固定写 PINHOLE |

### 删除项目参数
```json
{
    "json": {
        "projectToDeleteId": "要删除的项目ID"
    }
}
```

| 参数 | 说明 |
|------|------|
| projectToDeleteId | 要删除的项目ID |

### 删除素材参数
```json
{
    "json": {
        "names": [
            "素材ID1",
            "素材ID2"
        ]
    }
}
```

| 参数 | 说明 |
|------|------|
| names | 要删除的素材ID数组（支持批量删除） |

### 视频超清参数
```json
{
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "seed": 14775,
            "videoInput": {
                "mediaId": "原始视频的媒体ID"
            },
            "videoModelKey": "veo_2_1080p_upsampler_8s",
            "metadata": {
                "sceneId": "场景ID"
            }
        }
    ],
    "clientContext": {
        "sessionId": "会话ID"
    }
}
```

| 参数 | 说明 |
|------|------|
| aspectRatio | 视频宽高比，LANDSCAPE 或 PORTRAIT |
| seed | 随机种子 |
| videoInput.mediaId | 原始视频的媒体ID |
| videoModelKey | 模型名称，固定为 veo_2_1080p_upsampler_8s |
| metadata.sceneId | 场景ID |
| clientContext.sessionId | 会话ID |

### 查询视频状态参数
```json
{
    "operations": [
        {
            "operation": {
                "name": "操作名称"
            },
            "sceneId": "场景ID",
            "status": "MEDIA_GENERATION_STATUS_PENDING"
        }
    ]
}
```

| 参数 | 说明 |
|------|------|
| operation.name | 发起请求时返回的操作名称 |
| sceneId | 场景ID |
| status | 当前状态（查询时提供） |

### Flow 图片生成参数
```json
{
    "requests": [
        {
            "clientContext": {
                "sessionId": "会话ID",
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_ONE"
            },
            "seed": 123456,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "描述性文字提示",
            "imageInputs": [
                {
                    "name": "参考图mediaId",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                }
            ]
        }
    ]
}
```

| 参数 | 说明 |
|------|------|
| requests | 生成请求数组，支持批量生成 |
| clientContext.sessionId | 会话ID |
| seed | 随机种子 |
| imageModelName | 模型名称，固定为 "GEM_PIX" |
| imageAspectRatio | 图片宽高比 |
| prompt | 提示词 |
| imageInputs | 参考图片数组（图生图时使用） |

### Flow 图片上传参数
```json
{
    "imageInput": {
        "rawImageBytes": "base64图片数据",
        "mimeType": "image/jpeg",
        "isUserUploaded": true,
        "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
    },
    "clientContext": {
        "sessionId": "会话ID",
        "tool": "ASSET_MANAGER"
    }
}
```

| 参数 | 说明 |
|------|------|
| imageInput.rawImageBytes | base64编码的图片数据 |
| imageInput.mimeType | 图片MIME类型 |
| imageInput.aspectRatio | 图片宽高比 |
| clientContext.sessionId | 会话ID |

### Flow 文生视频参数
```json
{
    "clientContext": {
        "sessionId": "会话ID",
        "projectId": "项目ID",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_ONE"
    },
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "seed": 123456,
            "textInput": {
                "prompt": "描述性文字提示"
            },
            "videoModelKey": "veo_3_1_t2v_fast_portrait",
            "metadata": {
                "sceneId": "场景ID"
            }
        }
    ]
}
```

| 参数 | 说明 |
|------|------|
| videoModelKey | 视频模型：`veo_3_1_t2v_fast`（横屏）或 `veo_3_1_t2v_fast_portrait`（竖屏） |
| textInput.prompt | 视频提示词 |
| metadata.sceneId | 场景ID用于跟踪 |

### Flow 图生视频参数（仅首帧）
```json
{
    "clientContext": {
        "sessionId": "会话ID",
        "projectId": "项目ID",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_ONE"
    },
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "seed": 123456,
            "textInput": {
                "prompt": "描述性文字提示"
            },
            "videoModelKey": "veo_3_1_i2v_s_fast_portrait",
            "startImage": {
                "mediaId": "首帧图片ID"
            },
            "metadata": {
                "sceneId": "场景ID"
            }
        }
    ]
}
```

| 参数 | 说明 |
|------|------|
| videoModelKey | 图生视频模型：`veo_3_1_i2v_s_fast`（横屏）或 `veo_3_1_i2v_s_fast_portrait`（竖屏） |
| startImage.mediaId | 首帧图片ID |

### Flow 图生视频参数（首尾帧）
```json
{
    "clientContext": {
        "sessionId": "会话ID",
        "projectId": "项目ID",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_ONE"
    },
    "requests": [
        {
            "aspectRatio": "VIDEO_ASPECT_RATIO_PORTRAIT",
            "seed": 123456,
            "textInput": {
                "prompt": "描述性文字提示"
            },
            "videoModelKey": "veo_3_1_i2v_s_fast_portrait_fl",
            "startImage": {
                "mediaId": "首帧图片ID"
            },
            "endImage": {
                "mediaId": "尾帧图片ID"
            },
            "metadata": {
                "sceneId": "场景ID"
            }
        }
    ]
}
```

| 参数 | 说明 |
|------|------|
| videoModelKey | 图生视频模型：`veo_3_1_i2v_s_fast_fl`（横屏）或 `veo_3_1_i2v_s_fast_portrait_fl`（竖屏） |
| startImage.mediaId | 首帧图片ID |
| endImage.mediaId | 尾帧图片ID |

### 获取项目列表参数
```
?input={"json":{"pageSize":20,"toolName":"PINHOLE","cursor":null}}
```

| 参数 | 说明 |
|------|------|
| toolName | 工具名，固定写 PINHOLE |
| pageSize | 每页显示多少条，建议20 |
| cursor | 分页游标，null |

### 视频相册列表参数
```
?input={"json":{"pageSize":4,"projectId":"你的项目ID","toolName":"PINHOLE","fetchBookmarked":false,"rawQuery":"","mediaType":"MEDIA_TYPE_VIDEO","cursor":null}}
```

| 参数 | 说明 |
|------|------|
| projectId | 项目ID |
| toolName | 工具名，固定写 PINHOLE |
| pageSize | 每页显示多少条，建议4 |
| mediaType | 媒体类型，视频写 "MEDIA_TYPE_VIDEO" |
| fetchBookmarked | 是否收藏，false |
| rawQuery | 搜索关键词，空字符串 |
| cursor | 分页游标，null |

### 图片项目参数
```
?input={"json":{"pageSize":4,"projectId":"你的项目ID","toolName":"PINHOLE","fetchBookmarked":false,"rawQuery":"","mediaType":"MEDIA_TYPE_IMAGE","cursor":null}}
```

| 参数 | 说明 |
|------|------|
| projectId | 项目ID |
| toolName | 工具名，固定写 PINHOLE |
| pageSize | 每页显示多少条 |
| mediaType | 媒体类型，固定写 "MEDIA_TYPE_IMAGE" |
| fetchBookmarked | 是否收藏，false |
| rawQuery | 搜索关键词，空字符串 |
| cursor | 分页游标，null |

## 例子

### 创建项目
```javascript
const createProject = async (projectTitle) => {
  const response = await fetch(
    'https://labs.google/fx/api/trpc/project.createProject',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '你的登录cookie',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/fx/tools/flow'
      },
      body: JSON.stringify({
        json: {
          projectTitle: projectTitle,
          toolName: "PINHOLE"
        }
      })
    }
  );

  const data = await response.json();

  // 返回的项目信息：
  // data.result.data.json.result.projectId - 新创建的项目ID
  // data.result.data.json.result.projectInfo.projectTitle - 项目标题

  return data;
};
```

### 删除项目
```javascript
const deleteProject = async (projectId) => {
  const response = await fetch(
    'https://labs.google/fx/api/trpc/project.deleteProject',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '你的登录cookie',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/fx/tools/flow'
      },
      body: JSON.stringify({
        json: {
          projectToDeleteId: projectId
        }
      })
    }
  );

  const data = await response.json();

  // 删除成功返回：
  // data.data.json.result = {}
  // data.data.json.status = 200
  // data.data.json.statusText = "OK"

  return data;
};
```

### 删除素材
```javascript
const deleteMedia = async (mediaIds) => {
  const response = await fetch(
    'https://labs.google/fx/api/trpc/media.deleteMedia',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '你的登录cookie',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/fx/tools/flow/project/[projectId]'
      },
      body: JSON.stringify({
        json: {
          names: Array.isArray(mediaIds) ? mediaIds : [mediaIds]
        }
      })
    }
  );

  const data = await response.json();

  // 删除成功返回：
  // data.result.data.json = null
  // data.result.data.json.meta.values = ["undefined"]

  return data;
};
```

### 生成超清视频
```javascript
const generateUpsampledVideo = async (mediaId, sceneId, accessToken) => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain;charset=UTF-8',
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      body: JSON.stringify({
        requests: [{
          aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE',
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

  // 返回操作名称和状态：
  // data.operations[0].operation.name - 用于后续查询
  // data.operations[0].status - MEDIA_GENERATION_STATUS_PENDING
  // data.remainingCredits - 剩余积分

  return data;
};
```

### 查询视频生成状态
```javascript
const checkVideoGenerationStatus = async (operationName, sceneId, accessToken) => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

  // 返回生成状态和视频信息：
  // data.operations[0].status - 生成状态
  // data.operations[0].metadata.video.fifeUrl - 超清视频URL
  // data.operations[0].metadata.video.servingBaseUri - 缩略图URL

  return data;
};
```

### 轮询等待视频完成
```javascript
const waitForUpsampledVideo = async (operationName, sceneId, accessToken, maxAttempts = 30) => {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkVideoGenerationStatus(operationName, sceneId, accessToken);
    const operation = status.operations[0];

    if (operation.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
      return operation.metadata.video; // 返回超清视频信息
    } else if (operation.status === 'MEDIA_GENERATION_STATUS_FAILED') {
      throw new Error('Video generation failed');
    }

    // 等待10秒后再次查询
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error('Video generation timeout');
};
```

### Flow 图片生成
```javascript
const generateFlowImages = async (projectId, prompt, accessToken, sessionId, aspectRatio = '16:9', count = 1) => {
  const response = await fetch(
    `https://aisandbox-pa.googleapis.com/v1/projects/${projectId}/flowMedia:batchGenerateImages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        requests: Array.from({ length: count }, (_, index) => ({
          clientContext: {
            sessionId: sessionId,
            tool: 'PINHOLE',
            userPaygateTier: 'PAYGATE_TIER_ONE'
          },
          seed: Math.floor(Math.random() * 1000000) + index,
          imageModelName: 'GEM_PIX',
          imageAspectRatio: aspectRatio === '16:9' ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' :
                           aspectRatio === '9:16' ? 'IMAGE_ASPECT_RATIO_PORTRAIT' : 'IMAGE_ASPECT_RATIO_SQUARE',
          prompt,
          imageInputs: [] // 可以添加参考图片
        }))
      })
    }
  );

  const data = await response.json();

  // 处理返回的图片数据
  return data.media.map(item => ({
    encodedImage: item.image.generatedImage.encodedImage,
    mediaGenerationId: item.image.generatedImage.mediaGenerationId,
    workflowId: item.workflowId,
    prompt: item.image.generatedImage.prompt,
    seed: item.image.generatedImage.seed,
    mimeType: item.image.generatedImage.mimeType,
    fifeUrl: item.image.generatedImage.fifeUrl
  }));
};
```

### Flow 图片上传
```javascript
const uploadFlowImage = async (imageBase64, sessionId, accessToken, aspectRatio = '16:9') => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1:uploadUserImage',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        imageInput: {
          rawImageBytes: imageBase64.replace(/^data:.*?;base64,/, ''),
          mimeType: imageBase64.includes('image/png') ? 'image/png' : 'image/jpeg',
          isUserUploaded: true,
          aspectRatio: aspectRatio === '16:9' ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' :
                       aspectRatio === '9:16' ? 'IMAGE_ASPECT_RATIO_PORTRAIT' : 'IMAGE_ASPECT_RATIO_SQUARE'
        },
        clientContext: {
          sessionId: sessionId,
          tool: 'ASSET_MANAGER'
        }
      })
    }
  );

  const data = await response.json();

  return {
    mediaGenerationId: data.mediaGenerationId.mediaGenerationId,
    width: data.width,
    height: data.height,
    workflowId: data.workflowId
  };
};
```

### Flow 文生视频
```javascript
const generateFlowVideoFromText = async (projectId, prompt, accessToken, sessionId, aspectRatio = '9:16') => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        clientContext: {
          sessionId: sessionId,
          projectId: projectId,
          tool: 'PINHOLE',
          userPaygateTier: 'PAYGATE_TIER_ONE'
        },
        requests: [{
          aspectRatio: aspectRatio === '16:9' ? 'VIDEO_ASPECT_RATIO_LANDSCAPE' :
                       aspectRatio === '9:16' ? 'VIDEO_ASPECT_RATIO_PORTRAIT' : 'VIDEO_ASPECT_RATIO_PORTRAIT',
          seed: Math.floor(Math.random() * 100000),
          textInput: { prompt },
          videoModelKey: aspectRatio === '16:9' ? 'veo_3_1_t2v_fast' : 'veo_3_1_t2v_fast_portrait',
          metadata: {
            sceneId: crypto.randomUUID()
          }
        }]
      })
    }
  );

  const data = await response.json();
  const operation = data.operations[0];

  return {
    operationName: operation.operation.name,
    sceneId: operation.sceneId,
    status: operation.status,
    remainingCredits: data.remainingCredits
  };
};
```

### Flow 图生视频（仅首帧）
```javascript
const generateFlowVideoFromStartImage = async (projectId, prompt, startMediaId, accessToken, sessionId, aspectRatio = '9:16') => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        clientContext: {
          sessionId: sessionId,
          projectId: projectId,
          tool: 'PINHOLE',
          userPaygateTier: 'PAYGATE_TIER_ONE'
        },
        requests: [{
          aspectRatio: aspectRatio === '16:9' ? 'VIDEO_ASPECT_RATIO_LANDSCAPE' :
                       aspectRatio === '9:16' ? 'VIDEO_ASPECT_RATIO_PORTRAIT' : 'VIDEO_ASPECT_RATIO_SQUARE',
          seed: Math.floor(Math.random() * 100000),
          textInput: { prompt },
          videoModelKey: aspectRatio === '16:9' ? 'veo_3_1_i2v_s_fast_fl' : 'veo_3_1_i2v_s_fast_portrait_fl',
          startImage: {
            mediaId: startMediaId
          },
          metadata: {
            sceneId: crypto.randomUUID()
          }
        }]
      })
    }
  );

  const data = await response.json();
  const operation = data.operations[0];

  return {
    operationName: operation.operation.name,
    sceneId: operation.sceneId,
    status: operation.status,
    remainingCredits: data.remainingCredits
  };
};
```

### Flow 图生视频（首尾帧）
```javascript
const generateFlowVideoFromImages = async (projectId, prompt, startMediaId, endMediaId, accessToken, sessionId, aspectRatio = '9:16') => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        clientContext: {
          sessionId: sessionId,
          projectId: projectId,
          tool: 'PINHOLE',
          userPaygateTier: 'PAYGATE_TIER_ONE'
        },
        requests: [{
          aspectRatio: aspectRatio === '16:9' ? 'VIDEO_ASPECT_RATIO_LANDSCAPE' :
                       aspectRatio === '9:16' ? 'VIDEO_ASPECT_RATIO_PORTRAIT' : 'VIDEO_ASPECT_RATIO_SQUARE',
          seed: Math.floor(Math.random() * 100000),
          textInput: { prompt },
          videoModelKey: aspectRatio === '16:9' ? 'veo_3_1_i2v_s_fast' : 'veo_3_1_i2v_s_fast_portrait',
          startImage: {
            mediaId: startMediaId
          },
          endImage: {
            mediaId: endMediaId
          },
          metadata: {
            sceneId: crypto.randomUUID()
          }
        }]
      })
    }
  );

  const data = await response.json();
  const operation = data.operations[0];

  return {
    operationName: operation.operation.name,
    sceneId: operation.sceneId,
    status: operation.status,
    remainingCredits: data.remainingCredits
  };
};
```

### Flow 视频状态查询
```javascript
const checkFlowVideoStatus = async (operations, accessToken) => {
  const response = await fetch(
    'https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`,
        'Origin': 'https://labs.google',
        'Referer': 'https://labs.google/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: JSON.stringify({ operations })
    }
  );

  const data = await response.json();

  return {
    operations: data.operations,
    remainingCredits: data.remainingCredits
  };
};
```

### 获取项目列表
```javascript
const getUserProjects = async () => {
  const response = await fetch(
    'https://labs.google/fx/api/trpc/project.searchUserProjects?input=' +
    encodeURIComponent(JSON.stringify({
      json: {
        pageSize: 20,
        toolName: "PINHOLE",
        cursor: null
      }
    })),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '你的登录cookie',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }
  );

  const data = await response.json();

  // 项目列表数据在：
  // data.result.data.json.result.projects

  return data;
};
```

### 获取视频相册列表
```javascript
const getVideoAlbum = async (projectId) => {
  const response = await fetch(
    'https://labs.google/fx/api/trpc/project.searchProjectWorkflows?input=' +
    encodeURIComponent(JSON.stringify({
      json: {
        pageSize: 4,
        projectId: projectId,
        toolName: "PINHOLE",
        fetchBookmarked: false,
        rawQuery: "",
        mediaType: "MEDIA_TYPE_VIDEO",
        cursor: null
      }
    })),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': '你的登录cookie',
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }
  );

  const data = await response.json();

  // 视频相册列表数据在：
  // data.result.data.json.result.workflows

  return data;
};
```

### 搜索图片项目
```javascript
const response = await fetch(
  'https://labs.google/fx/api/trpc/project.searchProjectWorkflows?input=' +
  encodeURIComponent(JSON.stringify({
    json: {
      pageSize: 4,
      projectId: "70a6bab9-fb50-4271-a568-2d1d9da1f0d0",
      toolName: "PINHOLE",
      fetchBookmarked: false,
      rawQuery: "",
      mediaType: "MEDIA_TYPE_IMAGE",
      cursor: null
    }
  })),
  {
    headers: {
      'Cookie': '你的登录cookie'
    }
  }
);
```

## 创建项目数据结构

```javascript
// 创建项目 API 返回的数据结构
{
  "result": {
    "data": {
      "json": {
        "result": {
          "projectId": "新创建的项目ID",  // e3ea9d2c-23cc-47ef-b707-cc1dcbe62c02
          "projectInfo": {
            "projectTitle": "项目标题"  // Nov 15 - 00:06
          }
        },
        "status": 200,
        "statusText": "OK"
      }
    }
  }
}
```

## 删除项目数据结构

```javascript
// 删除项目 API 返回的数据结构
{
  "data": {
    "json": {
      "result": {},  // 空对象表示删除成功
      "status": 200,
      "statusText": "OK"
    }
  }
}
```

## 删除素材数据结构

```javascript
// 删除素材 API 返回的数据结构
{
  "result": {
    "data": {
      "json": null,  // null 表示删除成功
      "meta": {
        "values": ["undefined"]  // 元数据表示操作完成
      }
    }
  }
}
```

## 视频超清数据结构

### 发起请求响应
```javascript
{
  "operations": [
    {
      "operation": {
        "name": "698f2d752670fc64ebc95841536b660d"  // 操作名称，用于后续查询
      },
      "sceneId": "5c3248ad-b298-4124-9642-41df0bfdd2b6",
      "status": "MEDIA_GENERATION_STATUS_PENDING"
    }
  ],
  "remainingCredits": 360  // 剩余积分
}
```

### 生成成功响应
```javascript
{
  "operations": [
    {
      "operation": {
        "name": "698f2d752670fc64ebc95841536b660d",
        "metadata": {
          "@type": "type.googleapis.com/google.internal.labs.aisandbox.v1.Media",
          "name": "超清视频的媒体ID",
          "video": {
            "seed": 922940,
            "mediaGenerationId": "超清视频的生成ID",
            "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/video/..._upsampled?...",
            "mediaVisibility": "PRIVATE",
            "servingBaseUri": "https://storage.googleapis.com/ai-sandbox-videofx/image/..._upsampled?...",
            "model": "veo_2_1080p_upsampler_8s",
            "isLooped": false,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE"
          }
        }
      },
      "sceneId": "5c3248ad-b298-4124-9642-41df0bfdd2b6",
      "mediaGenerationId": "超清视频的生成ID",
      "status": "MEDIA_GENERATION_STATUS_SUCCESSFUL"
    }
  ],
  "remainingCredits": 360
}
```

## 视频状态说明

- `MEDIA_GENERATION_STATUS_PENDING` - 等待处理
- `MEDIA_GENERATION_STATUS_PROCESSING` - 正在处理
- `MEDIA_GENERATION_STATUS_SUCCESSFUL` - 生成成功
- `MEDIA_GENERATION_STATUS_FAILED` - 生成失败

## 项目列表数据结构

```javascript
// 项目列表 API 返回的数据结构
{
  "result": {
    "data": {
      "json": {
        "result": {
          "projects": [  // 这里就是项目列表
            {
              "projectId": "项目ID",
              "projectInfo": {
                "projectTitle": "项目标题",
                "thumbnailMediaKey": "缩略图媒体Key"
              },
              "creationTime": "2025-11-08T10:36:14.961216Z",
              "scenes": [  // 可选：场景列表（如果项目有场景）
                {
                  "sceneId": "场景ID",
                  "sceneName": "场景名称",
                  "clips": [
                    {
                      "clipId": "片段ID",
                      "startTime": "0s",
                      "endTime": "8s"
                    }
                  ],
                  "createTime": "2025-11-07T15:07:31.525975Z"
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

## 视频相册数据结构

```javascript
// 视频相册列表 API 返回的数据结构
{
  "result": {
    "data": {
      "json": {
        "result": {
          "workflows": [  // 这里就是视频相册列表
            {
              "workflowId": "视频ID",
              "workflowSteps": [
                {
                  "mediaGenerations": [
                    {
                      "mediaData": {
                        "videoData": {
                          "fifeUri": "视频文件URL",
                          "servingBaseUri": "缩略图URL"
                        }
                      },
                      "mediaExtraData": {
                        "mediaTitle": "视频标题"
                      }
                    }
                  ],
                  "workflowStepLog": {
                    "stepCreationTime": "创建时间"
                  }
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

## 图片相册数据结构

```javascript
// 图片相册列表 API 返回的数据结构
{
  "result": {
    "data": {
      "json": {
        "result": {
          "workflows": [  // 这里就是图片相册列表
            {
              "workflowId": "图片ID",
              "workflowSteps": [
                {
                  "mediaGenerations": [
                    {
                      "mediaData": {
                        "mediaTitle": "图片标题",
                        "mediaType": "IMAGE",
                        "imageData": {
                          "generatedImage": {
                            "seed": 562318,
                            "modelNameType": "GEM_PIX",
                            "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
                          },
                          "fifeUri": "图片文件URL"
                        }
                      }
                    }
                  ],
                  "workflowStepLog": {
                    "stepCreationTime": "创建时间",
                    "requestData": {
                      "promptInputs": [
                        {
                          "textInput": "提示词"
                        }
                      ]
                    }
                  }
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

## 数据提取示例

### 提取创建项目结果
```javascript
const extractCreateProjectResult = (data) => {
  const result = data.result.data.json.result;

  return {
    projectId: result.projectId,
    projectTitle: result.projectInfo.projectTitle
  };
};
```

### 检查删除项目结果
```javascript
const checkDeleteResult = (data) => {
  const result = data.data.json;

  return {
    success: result.status === 200 && result.statusText === "OK",
    status: result.status,
    statusText: result.statusText
  };
};
```

### 检查删除素材结果
```javascript
const checkDeleteMediaResult = (data) => {
  const result = data.result.data;

  return {
    success: result.json === null && result.meta.values.includes("undefined"),
    deleted: true
  };
};
```

### 提取项目列表
```javascript
const extractProjects = (data) => {
  const projects = data.result.data.json.result.projects;

  return projects.map(project => ({
    id: project.projectId,
    title: project.projectInfo.projectTitle,
    createTime: project.creationTime,
    thumbnailKey: project.projectInfo.thumbnailMediaKey,
    sceneCount: project.scenes ? project.scenes.length : 0,
    clips: project.scenes ? project.scenes.flatMap(scene => scene.clips) : []
  }));
};
```

### 提取视频相册
```javascript
const extractVideoAlbum = (data) => {
  const workflows = data.result.data.json.result.workflows;

  return workflows.map(workflow => ({
    id: workflow.workflowId,
    title: workflow.workflowSteps[0].mediaGenerations[0].mediaExtraData.mediaTitle,
    createTime: workflow.workflowSteps[0].workflowStepLog.stepCreationTime,
    videos: workflow.workflowSteps[0].mediaGenerations.map(gen => ({
      videoUrl: gen.mediaData.videoData.fifeUri,
      thumbnailUrl: gen.mediaData.videoData.servingBaseUri,
      prompt: gen.mediaData.videoData.generatedVideo.prompt,
      seed: gen.mediaData.videoData.generatedVideo.seed
    }))
  }));
};
```

### 提取图片相册
```javascript
const extractImageAlbum = (data) => {
  const workflows = data.result.data.json.result.workflows;

  return workflows.map(workflow => ({
    id: workflow.workflowId,
    title: workflow.workflowSteps[0].mediaGenerations[0].mediaData.mediaTitle,
    createTime: workflow.workflowSteps[0].workflowStepLog.stepCreationTime,
    images: workflow.workflowSteps[0].mediaGenerations.map(gen => ({
      imageUrl: gen.mediaData.imageData.fifeUri,
      prompt: gen.mediaData.mediaTitle,
      seed: gen.mediaData.imageData.generatedImage.seed,
      aspectRatio: gen.mediaData.imageData.generatedImage.aspectRatio,
      model: gen.mediaData.imageData.generatedImage.modelNameType
    }))
  }));
};
```

## 注意事项

- 需要先登录 Google 账号
- 必须提供完整的请求头（包括 Cookie）
- 视频相册数据在 `result.data.json.result.workflows`
- 视频文件 URL 是带签名的，有时效性
- 返回的是 JSON 数据