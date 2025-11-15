# Google Labs Whisk API 调用文档

本文档详细说明如何直接调用 Google Labs Whisk 的图片生成和编辑 API。

---

## 📋 目录

- [认证方式](#认证方式)
- [API 1: 生成图片](#api-1-生成图片)
- [API 2: 编辑图片](#api-2-编辑图片)
- [错误处理](#错误处理)
- [调用示例](#调用示例)

---

## 认证方式

### 生成图片 API
- **认证类型**: Bearer Token
- **请求头**: `Authorization: Bearer {token}`
- **获取方式**:
  1. 登录 https://labs.google
  2. 打开开发者工具(F12) → 网络标签
  3. 执行生成图片操作
  4. 找到 `generateImage` 请求
  5. 复制 `Authorization` 请求头的值

### 编辑图片 API
- **认证类型**: Cookie
- **请求头**: `Cookie: {cookie_string}`
- **获取方式**:
  1. 登录 https://labs.google
  2. 打开开发者工具(F12) → 网络标签
  3. 执行编辑图片操作
  4. 找到 `backbone.editImage` 请求
  5. 复制 `Cookie` 请求头的完整值

---

## API 1: 生成图片

### 基本信息

| 项目 | 值 |
|------|-----|
| **接口地址** | `https://aisandbox-pa.googleapis.com/v1/whisk:generateImage` |
| **请求方法** | `POST` |
| **Content-Type** | `text/plain;charset=UTF-8` |
| **认证方式** | Bearer Token |

### 请求头 (Headers)

```http
POST /v1/whisk:generateImage HTTP/1.1
Host: aisandbox-pa.googleapis.com
Content-Type: text/plain;charset=UTF-8
Authorization: Bearer {your_bearer_token_here}
Origin: https://labs.google
Referer: https://labs.google/
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6
```

### 请求体 (Request Body)

#### JSON Schema

```json
{
  "clientContext": {
    "workflowId": "string (UUID)",
    "tool": "string",
    "sessionId": "string"
  },
  "imageModelSettings": {
    "imageModel": "string (enum)",
    "aspectRatio": "string (enum)"
  },
  "seed": "integer",
  "prompt": "string",
  "mediaCategory": "string (enum)"
}
```

#### 字段说明

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| `clientContext.workflowId` | String | 是 | 工作流 ID，UUID 格式 | `"2976e5e0-b286-4431-8b0d-c7db934d5f88"` |
| `clientContext.tool` | String | 是 | 工具名称 | `"BACKBONE"` |
| `clientContext.sessionId` | String | 是 | 会话 ID | `";1762837691506"` |
| `imageModelSettings.imageModel` | Enum | 是 | AI 模型 | `"IMAGEN_3_5"` |
| `imageModelSettings.aspectRatio` | Enum | 是 | 图片比例 | `"IMAGE_ASPECT_RATIO_LANDSCAPE"` |
| `seed` | Integer | 是 | 随机种子 | `2389` |
| `prompt` | String | 是 | 图片描述提示词 | `"一个大美女"` |
| `mediaCategory` | Enum | 是 | 媒体类别 | `"MEDIA_CATEGORY_BOARD"` |

#### 枚举值说明

**imageModel 可选值：**
- `IMAGEN_3_5` - Imagen 3.5 模型

**aspectRatio 可选值：**
- `IMAGE_ASPECT_RATIO_LANDSCAPE` - 横向（宽 > 高）
- `IMAGE_ASPECT_RATIO_PORTRAIT` - 纵向（高 > 宽）
- `IMAGE_ASPECT_RATIO_SQUARE` - 正方形（宽 = 高）

**mediaCategory 可选值：**
- `MEDIA_CATEGORY_BOARD` - 标准图片

#### 完整请求示例

```json
{
  "clientContext": {
    "workflowId": "2976e5e0-b286-4431-8b0d-c7db934d5f88",
    "tool": "BACKBONE",
    "sessionId": ";1762837691506"
  },
  "imageModelSettings": {
    "imageModel": "IMAGEN_3_5",
    "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
  },
  "seed": 2389,
  "prompt": "一个大美女",
  "mediaCategory": "MEDIA_CATEGORY_BOARD"
}
```

### 响应体 (Response)

#### 成功响应 (200 OK)

```json
{
  "imagePanels": [
    {
      "prompt": "一个大美女",
      "generatedImages": [
        {
          "encodedImage": "/9j/4AAQSkZJRgABAQAAAQABAAD/...（Base64 编码的图片数据）",
          "seed": 2390,
          "mediaGenerationId": "CAMaJDI5NzZlNWUwLWIyODYtNDQzMS04YjBkLWM3ZGI5MzRkNWY4OCIDQ0FVKiQ2MDQwZDFhZi1jYTNkLTQ1MDUtYTk1ZC0yZjEwMTNhZDVjNDc",
          "prompt": "A beautiful woman",
          "imageModel": "IMAGEN_3_5",
          "workflowId": "2976e5e0-b286-4431-8b0d-c7db934d5f88",
          "fingerprintLogRecordId": "318e3250680000000000000000000000",
          "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
        }
      ]
    }
  ],
  "workflowId": "2976e5e0-b286-4431-8b0d-c7db934d5f88"
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `imagePanels[].prompt` | String | 原始提示词 |
| `imagePanels[].generatedImages[].encodedImage` | String | Base64 编码的图片数据（可直接用于 `data:image/jpeg;base64,{encodedImage}`） |
| `imagePanels[].generatedImages[].seed` | Integer | 实际使用的随机种子 |
| `imagePanels[].generatedImages[].mediaGenerationId` | String | 生成的图片 ID（用于后续编辑） |
| `imagePanels[].generatedImages[].prompt` | String | AI 翻译后的提示词 |
| `imagePanels[].generatedImages[].imageModel` | String | 使用的 AI 模型 |

---

## API 2: 编辑图片

### 基本信息

| 项目 | 值 |
|------|-----|
| **接口地址** | `https://labs.google/fx/api/trpc/backbone.editImage` |
| **请求方法** | `POST` |
| **Content-Type** | `application/json` |
| **认证方式** | Cookie |

### 请求头 (Headers)

```http
POST /fx/api/trpc/backbone.editImage HTTP/1.1
Host: labs.google
Content-Type: application/json
Cookie: {your_cookie_value_here}
Origin: https://labs.google
Referer: https://labs.google/
Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6
```

### 请求体 (Request Body)

#### JSON Schema

```json
{
  "json": {
    "clientContext": {
      "workflowId": "string (UUID)",
      "tool": "string",
      "sessionId": "string"
    },
    "imageModelSettings": {
      "imageModel": "string (enum)",
      "aspectRatio": "string (enum)"
    },
    "flags": {},
    "editInput": {
      "caption": "string",
      "userInstruction": "string",
      "seed": null,
      "safetyMode": null,
      "originalMediaGenerationId": "string",
      "mediaInput": {
        "mediaCategory": "string (enum)",
        "rawBytes": "string (base64)"
      }
    }
  },
  "meta": {
    "values": {
      "editInput.seed": ["string"],
      "editInput.safetyMode": ["string"]
    }
  }
}
```

#### 字段说明

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| `json.clientContext.workflowId` | String | 是 | 工作流 ID，UUID 格式 | `"2976e5e0-b286-4431-8b0d-c7db934d5f88"` |
| `json.clientContext.tool` | String | 是 | 工具名称 | `"BACKBONE"` |
| `json.clientContext.sessionId` | String | 是 | 会话 ID | `";1762837691506"` |
| `json.imageModelSettings.imageModel` | Enum | 是 | AI 模型 | `"GEM_PIX"` |
| `json.imageModelSettings.aspectRatio` | Enum | 是 | 图片比例 | `"IMAGE_ASPECT_RATIO_LANDSCAPE"` |
| `json.editInput.caption` | String | 否 | 原图描述 | `"一个大美女"` |
| `json.editInput.userInstruction` | String | 是 | 编辑指令 | `"戴上眼镜"` |
| `json.editInput.seed` | Null | 否 | 随机种子（一般为 null） | `null` |
| `json.editInput.safetyMode` | Null | 否 | 安全模式（一般为 null） | `null` |
| `json.editInput.originalMediaGenerationId` | String | 是 | 原始图片的生成 ID | `"CAMaJDI5NzZl..."` |
| `json.editInput.mediaInput.mediaCategory` | Enum | 是 | 媒体类别 | `"MEDIA_CATEGORY_BOARD"` |
| `json.editInput.mediaInput.rawBytes` | String | 是 | Base64 编码的图片数据（需包含 data URL 前缀） | `"data:image/jpeg;base64,/9j/4AAQ..."` |

#### 枚举值说明

**imageModel 可选值：**
- `GEM_PIX` - Gemini Pix 模型（用于编辑）

**aspectRatio 可选值：**
- `IMAGE_ASPECT_RATIO_LANDSCAPE` - 横向
- `IMAGE_ASPECT_RATIO_PORTRAIT` - 纵向
- `IMAGE_ASPECT_RATIO_SQUARE` - 正方形

**mediaCategory 可选值：**
- `MEDIA_CATEGORY_BOARD` - 标准图片

#### 完整请求示例

```json
{
  "json": {
    "clientContext": {
      "workflowId": "2976e5e0-b286-4431-8b0d-c7db934d5f88",
      "tool": "BACKBONE",
      "sessionId": ";1762837691506"
    },
    "imageModelSettings": {
      "imageModel": "GEM_PIX",
      "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
    },
    "flags": {},
    "editInput": {
      "caption": "一个大美女",
      "userInstruction": "戴上眼镜",
      "seed": null,
      "safetyMode": null,
      "originalMediaGenerationId": "CAMaJDI5NzZlNWUwLWIyODYtNDQzMS04YjBkLWM3ZGI5MzRkNWY4OCIDQ0FFKiQ2MWQyOWRjNC0xOGNkLTQ5NzMtYTJhMy1kNTk1NGY1OTUyMzY",
      "mediaInput": {
        "mediaCategory": "MEDIA_CATEGORY_BOARD",
        "rawBytes": "data:image/jpeg;base64,/9j/4AAQ..."
      }
    }
  },
  "meta": {
    "values": {
      "editInput.seed": ["undefined"],
      "editInput.safetyMode": ["undefined"]
    }
  }
}
```

### 响应体 (Response)

#### 成功响应 (200 OK)

```json
{
  "result": {
    "data": {
      "json": {
        "result": {
          "imagePanels": [
            {
              "prompt": "戴上眼镜",
              "generatedImages": [
                {
                  "encodedImage": "iVBORw0KGgoAAAANSUhEUgAABUAAAAMACAIAAABq7Fo6...（Base64 编码的图片数据）",
                  "seed": 657527,
                  "mediaGenerationId": "CAMaJDI5NzZlNWUwLWIyODYtNDQzMS04YjBkLWM3ZGI5MzRkNWY4OCIDQ0FjKiQ1NWVhNmIwNi1mODA0LTQzNWEtYjMzNC05ZmEwOWFiMWM5MmQ",
                  "prompt": "Wear glasses",
                  "imageModel": "GEM_PIX",
                  "workflowId": "2976e5e0-b286-4431-8b0d-c7db934d5f88",
                  "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
                }
              ]
            }
          ],
          "workflowId": "2976e5e0-b286-4431-8b0d-c7db934d5f88"
        },
        "status": 200,
        "statusText": "OK"
      }
    }
  }
}
```

#### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `result.data.json.result.imagePanels[].prompt` | String | 用户输入的编辑指令 |
| `result.data.json.result.imagePanels[].generatedImages[].encodedImage` | String | Base64 编码的编辑后图片数据 |
| `result.data.json.result.imagePanels[].generatedImages[].seed` | Integer | 使用的随机种子 |
| `result.data.json.result.imagePanels[].generatedImages[].mediaGenerationId` | String | 编辑后图片的 ID |
| `result.data.json.result.imagePanels[].generatedImages[].prompt` | String | AI 翻译后的指令 |
| `result.data.json.status` | Integer | HTTP 状态码 |
| `result.data.json.statusText` | String | 状态文本 |

---

## 错误处理

### 常见错误码

| 状态码 | 说明 | 解决方案 |
|--------|------|----------|
| `401` | 未授权 | 检查 Bearer Token 或 Cookie 是否有效 |
| `403` | 禁止访问 | Token/Cookie 已过期，需要重新获取 |
| `400` | 请求参数错误 | 检查请求体 JSON 格式和必填字段 |
| `429` | 请求过于频繁 | 降低请求频率，等待后重试 |
| `500` | 服务器内部错误 | 稍后重试 |

### 错误响应示例

```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials.",
    "status": "UNAUTHENTICATED"
  }
}
```

---

## 调用示例

### Python 示例

#### 1. 生成图片

```python
import requests
import json
import uuid
import time

# 配置
BEARER_TOKEN = "your_bearer_token_here"

# 生成图片
def generate_image(prompt, aspect_ratio="IMAGE_ASPECT_RATIO_LANDSCAPE"):
    url = "https://aisandbox-pa.googleapis.com/v1/whisk:generateImage"

    headers = {
        "Content-Type": "text/plain;charset=UTF-8",
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "Origin": "https://labs.google",
        "Referer": "https://labs.google/"
    }

    payload = {
        "clientContext": {
            "workflowId": str(uuid.uuid4()),
            "tool": "BACKBONE",
            "sessionId": f";{int(time.time() * 1000)}"
        },
        "imageModelSettings": {
            "imageModel": "IMAGEN_3_5",
            "aspectRatio": aspect_ratio
        },
        "seed": int(time.time() % 10000),
        "prompt": prompt,
        "mediaCategory": "MEDIA_CATEGORY_BOARD"
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        data = response.json()
        # 提取 Base64 图片数据
        image_data = data["imagePanels"][0]["generatedImages"][0]["encodedImage"]
        return image_data
    else:
        raise Exception(f"Error {response.status_code}: {response.text}")

# 使用示例
try:
    image_base64 = generate_image("一个美丽的风景")
    print(f"成功生成图片，Base64 长度: {len(image_base64)}")

    # 保存图片
    import base64
    with open("generated.jpg", "wb") as f:
        f.write(base64.b64decode(image_base64))
    print("图片已保存为 generated.jpg")

except Exception as e:
    print(f"生成失败: {e}")
```

#### 2. 编辑图片

```python
import requests
import json
import uuid
import time
import base64

# 配置
COOKIE_VALUE = "your_cookie_value_here"

# 编辑图片
def edit_image(image_path, instruction, caption=""):
    url = "https://labs.google/fx/api/trpc/backbone.editImage"

    # 读取并编码图片
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    image_base64 = base64.b64encode(image_bytes).decode()
    raw_bytes = f"data:image/jpeg;base64,{image_base64}"

    headers = {
        "Content-Type": "application/json",
        "Cookie": COOKIE_VALUE,
        "Origin": "https://labs.google",
        "Referer": "https://labs.google/"
    }

    payload = {
        "json": {
            "clientContext": {
                "workflowId": str(uuid.uuid4()),
                "tool": "BACKBONE",
                "sessionId": f";{int(time.time() * 1000)}"
            },
            "imageModelSettings": {
                "imageModel": "GEM_PIX",
                "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
            },
            "flags": {},
            "editInput": {
                "caption": caption,
                "userInstruction": instruction,
                "seed": None,
                "safetyMode": None,
                "originalMediaGenerationId": str(uuid.uuid4()),
                "mediaInput": {
                    "mediaCategory": "MEDIA_CATEGORY_BOARD",
                    "rawBytes": raw_bytes
                }
            }
        },
        "meta": {
            "values": {
                "editInput.seed": ["undefined"],
                "editInput.safetyMode": ["undefined"]
            }
        }
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code == 200:
        data = response.json()
        # 提取编辑后的图片数据
        image_data = data["result"]["data"]["json"]["result"]["imagePanels"][0]["generatedImages"][0]["encodedImage"]
        return image_data
    else:
        raise Exception(f"Error {response.status_code}: {response.text}")

# 使用示例
try:
    edited_image = edit_image("input.jpg", "戴上眼镜", "一个人的照片")

    # 保存编辑后的图片
    with open("edited.png", "wb") as f:
        f.write(base64.b64decode(edited_image))
    print("编辑后的图片已保存为 edited.png")

except Exception as e:
    print(f"编辑失败: {e}")
```

### cURL 示例

#### 1. 生成图片

```bash
curl -X POST 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage' \
  -H 'Content-Type: text/plain;charset=UTF-8' \
  -H 'Authorization: Bearer YOUR_BEARER_TOKEN' \
  -H 'Origin: https://labs.google' \
  -H 'Referer: https://labs.google/' \
  -d '{
    "clientContext": {
      "workflowId": "12345678-1234-1234-1234-123456789abc",
      "tool": "BACKBONE",
      "sessionId": ";1762837691506"
    },
    "imageModelSettings": {
      "imageModel": "IMAGEN_3_5",
      "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
    },
    "seed": 2389,
    "prompt": "一个美丽的风景",
    "mediaCategory": "MEDIA_CATEGORY_BOARD"
  }'
```

#### 2. 编辑图片

```bash
curl -X POST 'https://labs.google/fx/api/trpc/backbone.editImage' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: YOUR_COOKIE_VALUE' \
  -H 'Origin: https://labs.google' \
  -H 'Referer: https://labs.google/' \
  -d '{
    "json": {
      "clientContext": {
        "workflowId": "12345678-1234-1234-1234-123456789abc",
        "tool": "BACKBONE",
        "sessionId": ";1762837691506"
      },
      "imageModelSettings": {
        "imageModel": "GEM_PIX",
        "aspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE"
      },
      "flags": {},
      "editInput": {
        "caption": "原图描述",
        "userInstruction": "戴上眼镜",
        "seed": null,
        "safetyMode": null,
        "originalMediaGenerationId": "some-generation-id",
        "mediaInput": {
          "mediaCategory": "MEDIA_CATEGORY_BOARD",
          "rawBytes": "data:image/jpeg;base64,/9j/4AAQ..."
        }
      }
    },
    "meta": {
      "values": {
        "editInput.seed": ["undefined"],
        "editInput.safetyMode": ["undefined"]
      }
    }
  }'
```

### JavaScript/Node.js 示例

```javascript
// 安装依赖: npm install node-fetch uuid

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// 生成图片
async function generateImage(prompt, bearerToken) {
  const response = await fetch('https://aisandbox-pa.googleapis.com/v1/whisk:generateImage', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'Authorization': `Bearer ${bearerToken}`,
      'Origin': 'https://labs.google',
      'Referer': 'https://labs.google/'
    },
    body: JSON.stringify({
      clientContext: {
        workflowId: uuidv4(),
        tool: 'BACKBONE',
        sessionId: `;${Date.now()}`
      },
      imageModelSettings: {
        imageModel: 'IMAGEN_3_5',
        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
      },
      seed: Math.floor(Math.random() * 10000),
      prompt: prompt,
      mediaCategory: 'MEDIA_CATEGORY_BOARD'
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.imagePanels[0].generatedImages[0].encodedImage;
}

// 使用示例
(async () => {
  try {
    const bearerToken = 'YOUR_BEARER_TOKEN';
    const imageBase64 = await generateImage('一个美丽的风景', bearerToken);

    // 保存图片
    fs.writeFileSync('generated.jpg', Buffer.from(imageBase64, 'base64'));
    console.log('图片已生成并保存');
  } catch (error) {
    console.error('错误:', error.message);
  }
})();
```

---

## 注意事项

### 🔒 安全性
1. **不要泄露认证凭证**
   - Bearer Token 和 Cookie 包含账户权限
   - 不要将凭证提交到公开代码仓库
   - 建议使用环境变量存储

2. **Token 有效期**
   - Bearer Token 通常 1 小时左右过期
   - Cookie 的 session token 也会过期
   - 需要定期更新凭证

### ⚡ 性能建议
1. **请求频率控制**
   - 避免频繁请求导致被限流
   - 建议添加重试机制和指数退避

2. **图片大小**
   - 上传编辑的图片建议不超过 10MB
   - 过大的图片可能导致请求失败

3. **超时设置**
   - 生成图片通常需要 10-30 秒
   - 编辑图片可能需要更长时间
   - 建议设置 60 秒以上的超时时间

### 📋 最佳实践
1. **错误处理**
   - 实现完善的错误捕获和重试逻辑
   - 记录请求和响应日志便于调试

2. **参数验证**
   - 在发送请求前验证必填参数
   - 确保 UUID 和时间戳格式正确

3. **响应处理**
   - 检查响应状态码和数据结构
   - Base64 图片数据可能很大，注意内存使用

---

## 更新日志

**Version 1.0** (2025-11-11)
- 初始版本
- 包含生成和编辑两个 API 的完整文档
- 提供多语言调用示例

---

## 相关资源

- 原始 API 拦截数据: `api.md`
- 网页工具: `index.html`
- 使用说明: `README.md`

---

**免责声明**: 本文档仅供学习和研究使用。请遵守 Google Labs 的服务条款和使用政策。