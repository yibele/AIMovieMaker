# 用户图片上传
https://aisandbox-pa.googleapis.com/v1:uploadUserImage
Request Method
POST
Status Code
200 OK
Remote Address
127.0.0.1:10808
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
https://labs.google
access-control-expose-headers
vary,vary,vary,content-encoding,date,server,content-length
alt-svc
h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
content-encoding
gzip
content-length
186
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:56:12 GMT
server
ESF
vary
Origin
vary
X-Origin
vary
Referer
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
0
:authority
aisandbox-pa.googleapis.com
:method
POST
:path
/v1:uploadUserImage
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer [REDACTED_OAUTH_TOKEN]
content-length
394759
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
cross-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
qSH0RgPhYS+tEktJTy2ahvLDO9s=
x-browser-year
2025
x-client-data
CK61yQEIiLbJAQiitskBCKmdygEI/4HLAQiUocsBCIagzQEI7o7PAQj0mM8B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300014, 3300104, 3300130, 3313321, 3326207, 3330196, 3362822, 3393390, 3394676];
}
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

返回：
{
    "mediaGenerationId": {
        "mediaGenerationId": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ"
    },
    "width": 768,
    "height": 1364
}

# 生成图片：
## 文生图：

https://aisandbox-pa.googleapis.com/v1/projects/02ac868b-925f-40c1-9187-a688bd03a84d/flowMedia:batchGenerateImages
Request Method
POST
Status Code
200 OK
Remote Address
127.0.0.1:10808
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
https://labs.google
access-control-expose-headers
vary,vary,vary,content-encoding,date,server,content-length
alt-svc
h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
content-encoding
gzip
content-length
6705620
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 15:01:18 GMT
server
ESF
vary
Origin
vary
X-Origin
vary
Referer
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
0
:authority
aisandbox-pa.googleapis.com
:method
POST
:path
/v1/projects/02ac868b-925f-40c1-9187-a688bd03a84d/flowMedia:batchGenerateImages
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer [REDACTED_OAUTH_TOKEN]
content-length
738
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
cross-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
qSH0RgPhYS+tEktJTy2ahvLDO9s=
x-browser-year
2025
x-client-data
CK61yQEIiLbJAQiitskBCKmdygEI/4HLAQiUocsBCIagzQEI7o7PAQj0mM8B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300014, 3300104, 3300130, 3313321, 3326207, 3330196, 3362822, 3393390, 3394676];
}

payload:
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
        },
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 243064,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "一个美女",
            "imageInputs": []
        },
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 932683,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "一个美女",
            "imageInputs": []
        },
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 680090,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "一个美女",
            "imageInputs": []
        }
    ]
}

返回：
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
                "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/image/4aab44c8-4b86-4dd3-9ab4-5072f861b78e?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1762981276&Signature=AVt2NrqdH6J4EE2Y6X2ILWjBS85p%2B%2FezCQFX67oJusMD%2FvzB%2FKVgX3Lt%2BA2iSf3RVPmZj3%2BO8tUtFlxP2D0HN3sz1fAahV6KrJ4F1v7N63JIIHHOqQdGwPb%2FXL%2FnwrT0gq0fPRojbN%2FFgtOhga6hIy4VX9wiLXJSkt9boxLaSpJ%2F%2FvNGhMmECQj7xVk6nVGILyD1KH8csRz9dUlTvNI%2Fz4qpiyCFy2QCCpMhDcY5WxOEBSd%2FgMeLtr3mDGiWgfXdulfe5XkOqj9VqfWmklVaXaqIzVWEVKCd6SVkKbMPdqYLIIJKWC62jm3tJDIF8vkzvVif83M7CvDJmUQfjxB6Xg%3D%3D",
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
    },
    {
        "name": "CAMSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokZjUwOGJkMjQtNDc5Ny00ODUxLTgwNjctZDgyZTQ1MTJiYjI3IgNDQUUqJDQzYjgxODJkLWI2MDctNGE1OC1hMGFlLThkZTlhODJmOGQ2OQ",
        "workflowId": "f508bd24-4797-4851-8067-d82e4512bb27",
        "image": {
            "generatedImage": {
                "encodedImage": "iVBORw0KGgoAAAANSUhEUgAABUAAAAMACAIA...",
                "seed": 243064,
                "mediaGenerationId": "CAMSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokZjUwOGJkMjQtNDc5Ny00ODUxLTgwNjctZDgyZTQ1MTJiYjI3IgNDQUUqJDQzYjgxODJkLWI2MDctNGE1OC1hMGFlLThkZTlhODJmOGQ2OQ",
                "mediaVisibility": "PRIVATE",
                "prompt": "A beautiful woman",
                "modelNameType": "GEM_PIX",
                "workflowId": "f508bd24-4797-4851-8067-d82e4512bb27",
                "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/image/43b8182d-b607-4a58-a0ae-8de9a82f8d69?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1762981275&Signature=Qo7t3ZXuJdR0nymO1L4tHZROBhrt42YgeTFvv1gEovWpE4fYkYgXJ1KRw%2BalvYVv8LZFlE4znneJ2yS9k7U5L3L7EOY4d%2BPZ9uHeu3yF1upNYYhpyP0q1QIMwf3WpjJCu%2BV5nXlnusW3qRpdxAtHFIxRTQh6OvmYOK2dvztxcNm%2F3qWLtVhyXf1K2M7YgfAb03%2BvlTZtMHKi4jVBVvtR8TJ1tQQ%2BC5pjQw7twXZs%2B9qUIpSeunvrjrsPG%2ByJ3nGILeDz%2B9tpa8EJtlbC7jWpdpKvHqFxd%2BXjtBPrZ2WrYj9LWv%2FlAzUFsFAZjLFioZglocO0SI8rngrTsb2cjOIdqQ%3D%3D",
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
    },
    {
        "name": "CAMSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokN2FkZWM0YTgtMTNjZC00ZTNkLWJlNTAtYjQzZmFiMDM0MDE3IgNDQUUqJDVkYjk5ODQwLTI2YTUtNGFiOC1iMzkwLWY3YjU3M2Q2ZjJkZg",
        "workflowId": "7adec4a8-13cd-4e3d-be50-b43fab034017",
        "image": {
            "generatedImage": {
                "encodedImage": "iVBORw0KGgoAAAANSUhEUgAABUAAAAMACAIAAABq...",
                "seed": 932683,
                "mediaGenerationId": "CAMSJDAyYWM4NjhiLTkyNWYtNDBjMS05MTg3LWE2ODhiZDAzYTg0ZBokN2FkZWM0YTgtMTNjZC00ZTNkLWJlNTAtYjQzZmFiMDM0MDE3IgNDQUUqJDVkYjk5ODQwLTI2YTUtNGFiOC1iMzkwLWY3YjU3M2Q2ZjJkZg",
                "mediaVisibility": "PRIVATE",
                "prompt": "A beautiful woman",
                "modelNameType": "GEM_PIX",
                "workflowId": "7adec4a8-13cd-4e3d-be50-b43fab034017",
                "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/image/5db99840-26a5-4ab8-b390-f7b573d6f2df?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1762981276&Signature=KPzOp%2BtaFoP44cTwTG1sAdgyL2RofBmICsJsVI4bHU%2FGZA5vM9PURGwT5WDy7G7diYP4hricQ%2BYucjFGf0dumxMqRc%2F1cYeCS4orXiHeucX4l5%2FjdCQIVlXmZzaekyjLHYvlyD32Fukur8jowNO4e28kktzxN704%2FOFLEWGUaUGiI4LFl8D1NvW%2BtrIUV7%2BE8K07CgHsrXqjAWMiSHee48ZswccW5A0bjXrY448YUq1hNr4AuMpAWRUyrYRibbXWkikYiW%2FV%2B7URK3WHF4mAbvtQTNI0pjDcIdC3YPWT4PoDS7gVXBkoPVFKRtatTolVNeQfyTwuZ6xJsk%2Fx1JRHEw%3D%3D",
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
    },
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
                "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/image/4aab44c8-4b86-4dd3-9ab4-5072f861b78e?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1762981276&Signature=AVt2NrqdH6J4EE2Y6X2ILWjBS85p%2B%2FezCQFX67oJusMD%2FvzB%2FKVgX3Lt%2BA2iSf3RVPmZj3%2BO8tUtFlxP2D0HN3sz1fAahV6KrJ4F1v7N63JIIHHOqQdGwPb%2FXL%2FnwrT0gq0fPRojbN%2FFgtOhga6hIy4VX9wiLXJSkt9boxLaSpJ%2F%2FvNGhMmECQj7xVk6nVGILyD1KH8csRz9dUlTvNI%2Fz4qpiyCFy2QCCpMhDcY5WxOEBSd%2FgMeLtr3mDGiWgfXdulfe5XkOqj9VqfWmklVaXaqIzVWEVKCd6SVkKbMPdqYLIIJKWC62jm3tJDIF8vkzvVif83M7CvDJmUQfjxB6Xg%3D%3D",
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

## 图生图

https://aisandbox-pa.googleapis.com/v1/projects/02ac868b-925f-40c1-9187-a688bd03a84d/flowMedia:batchGenerateImages
Request Method
POST
Status Code
200 OK
Remote Address
127.0.0.1:10808
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
https://labs.google
access-control-expose-headers
vary,vary,vary,content-encoding,date,server,content-length
alt-svc
h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
content-encoding
gzip
content-length
8186373
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 15:07:00 GMT
server
ESF
vary
Origin
vary
X-Origin
vary
Referer
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
0
:authority
aisandbox-pa.googleapis.com
:method
POST
:path
/v1/projects/02ac868b-925f-40c1-9187-a688bd03a84d/flowMedia:batchGenerateImages
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer [REDACTED_OAUTH_TOKEN]
content-length
2834
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
cross-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
qSH0RgPhYS+tEktJTy2ahvLDO9s=
x-browser-year
2025
x-client-data
CK61yQEIiLbJAQiitskBCKmdygEI/4HLAQiUocsBCIagzQEI7o7PAQj0mM8B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300014, 3300104, 3300130, 3313321, 3326207, 3330196, 3362822, 3393390, 3394676];
}

payload:
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
                },
                {
                    "name": "CAMaJDRmZDY4N2EyLTRkOGUtNDU2MC1iN2JiLTAzMGM2YTQ5NWZmMCIDQ0FFKiRkMzZkOGYyMy04ZjI1LTQ4OTAtYWI1MS0zZDk1ZjJiYjI5ODg",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRlYTE3OGExLTdkN2YtNGM1NC1iMjhhLTM2MWVhZTViZTRlMCIDQ0FFKiQ3MTJhODU5OS02NThmLTQxOGMtYTAwYi1mYjI0ZDQyMDc0ZWM",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                }
            ]
        },
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 419142,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "三个角色在同一图片中",
            "imageInputs": [
                {
                    "name": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRmZDY4N2EyLTRkOGUtNDU2MC1iN2JiLTAzMGM2YTQ5NWZmMCIDQ0FFKiRkMzZkOGYyMy04ZjI1LTQ4OTAtYWI1MS0zZDk1ZjJiYjI5ODg",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRlYTE3OGExLTdkN2YtNGM1NC1iMjhhLTM2MWVhZTViZTRlMCIDQ0FFKiQ3MTJhODU5OS02NThmLTQxOGMtYTAwYi1mYjI0ZDQyMDc0ZWM",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                }
            ]
        },
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 240438,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "三个角色在同一图片中",
            "imageInputs": [
                {
                    "name": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRmZDY4N2EyLTRkOGUtNDU2MC1iN2JiLTAzMGM2YTQ5NWZmMCIDQ0FFKiRkMzZkOGYyMy04ZjI1LTQ4OTAtYWI1MS0zZDk1ZjJiYjI5ODg",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRlYTE3OGExLTdkN2YtNGM1NC1iMjhhLTM2MWVhZTViZTRlMCIDQ0FFKiQ3MTJhODU5OS02NThmLTQxOGMtYTAwYi1mYjI0ZDQyMDc0ZWM",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                }
            ]
        },
        {
            "clientContext": {
                "sessionId": ";1762958374159"
            },
            "seed": 795698,
            "imageModelName": "GEM_PIX",
            "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
            "prompt": "三个角色在同一图片中",
            "imageInputs": [
                {
                    "name": "CAMaJDYzMzI4ZjM3LTc0ODQtNGU5ZC1iODZmLTAzMzgyYTM0NGRkYSIDQ0FFKiQyY2E5NGZmMS1jZjA5LTRiODAtYjFiNC1lOWI1MjY5YjY3NGQ",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRmZDY4N2EyLTRkOGUtNDU2MC1iN2JiLTAzMGM2YTQ5NWZmMCIDQ0FFKiRkMzZkOGYyMy04ZjI1LTQ4OTAtYWI1MS0zZDk1ZjJiYjI5ODg",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                },
                {
                    "name": "CAMaJDRlYTE3OGExLTdkN2YtNGM1NC1iMjhhLTM2MWVhZTViZTRlMCIDQ0FFKiQ3MTJhODU5OS02NThmLTQxOGMtYTAwYi1mYjI0ZDQyMDc0ZWM",
                    "imageInputType": "IMAGE_INPUT_TYPE_REFERENCE"
                }
            ]
        }
    ]
}



# 文生视频
    equest URL
https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText
Request Method
POST
Status Code
200 OK
Remote Address
127.0.0.1:10808
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
https://labs.google
access-control-expose-headers
vary,vary,vary,content-encoding,date,server,content-length
alt-svc
h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
content-encoding
gzip
content-length
205
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:48:58 GMT
server
ESF
vary
Origin
vary
X-Origin
vary
Referer
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
0
:authority
aisandbox-pa.googleapis.com
:method
POST
:path
/v1/video:batchAsyncGenerateVideoText
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer [REDACTED_OAUTH_TOKEN]
content-length
375
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
cross-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
qSH0RgPhYS+tEktJTy2ahvLDO9s=
x-browser-year
2025
x-client-data
CK61yQEIiLbJAQiitskBCKmdygEI/4HLAQiUocsBCIagzQEI7o7PAQj0mM8B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300014, 3300104, 3300130, 3313321, 3326207, 3330196, 3362822, 3393390, 3394676];
}


payload:
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

返回：
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

## 查询结果
https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus
Request Method
POST
Status Code
200 OK
Remote Address
127.0.0.1:10808
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
https://labs.google
access-control-expose-headers
vary,vary,vary,content-encoding,date,server,content-length
alt-svc
h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
content-encoding
gzip
content-length
188
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:49:09 GMT
server
ESF
vary
Origin
vary
X-Origin
vary
Referer
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
0
:authority
aisandbox-pa.googleapis.com
:method
POST
:path
/v1/video:batchCheckAsyncVideoGenerationStatus
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer [REDACTED_OAUTH_TOKEN]
content-length
166
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
cross-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
qSH0RgPhYS+tEktJTy2ahvLDO9s=
x-browser-year
2025
x-client-data
CK61yQEIiLbJAQiitskBCKmdygEI/4HLAQiUocsBCIagzQEI7o7PAQj0mM8B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300014, 3300104, 3300130, 3313321, 3326207, 3330196, 3362822, 3393390, 3394676];
}

payload:
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

返回：
生成中
[
    {
        "operation": {
            "name": "f1c22d03926da6fde596fbf0859404b7"
        },
        "sceneId": "b35919a4-3a87-4d9e-8843-f292b7df4723",
        "status": "MEDIA_GENERATION_STATUS_ACTIVE"
    }
]
生成完成： 
servingBaseUri 指的是视频缩略图
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
                        "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/video/e998b1f2-fd49-4dbf-be26-ab243c042398?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1762980593&Signature=FvUlqA8o0QnqXL1mZk6aiyFiS4ljqRuXZ5g4IEHa8GdeZfdSrZZWIk2XuaiESuNkIFBlLa6DoEbxMPuUAQsItEk4UYX4SkrPb%2FY5JgcT2b1FGRSrUw74m%2BePY6DKed9GWnYYlBCh0HA5%2BzcQaciJf5AN7uCRLWppeAOAXQkmqa8IExLockiXQIHG2raW8xJiiLrObKLDzKcrmQrnvM4qSrB1qJ81nxfYZMEQBebIuho%2BPCZowWpcGRFSYUMpmt%2B8rHKVB71dt1cg4gssCVaVQCqRHE6WX1FknVT1%2FKyAKbcJMkRL49g3671t5xt5wuRUt1zQzZuG0D0wTnXNkY%2BuTA%3D%3D",
                        "mediaVisibility": "PRIVATE",
                        "servingBaseUri": "https://storage.googleapis.com/ai-sandbox-videofx/image/e998b1f2-fd49-4dbf-be26-ab243c042398?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1762980594&Signature=JXjLMXQsDduVeNucq9V%2BuecIvlRshbpt7x4ck5lFZ%2B6Ppd0BKocNMQkZNb8bri9Qqg47HywhtLI4QOf8fJsJsJezkIzuuWlZIvjawXWI%2BV6JsFgRDCxpCegv8d34epKDaCQmBDr00Z5WuonMq6jVc0kNCQQY9ANQPZmF5FkoJN5qSLb%2FMJ6qemFXEoMcOmh4WUX1li1AOQ7M7VqqvM%2Bw7lh5%2FR3xwx0zGSed85Zv6pbZLWS01ht1dDvbiqjNZ6tgNjMEyocBG4F732Ksv%2FN1fT%2B2zW%2FL%2FqU8%2B6Dn40Z1kSPsZgMWySAGkqa2BudNRl4%2BngccwNxa8bxwqHNGxCu5nw%3D%3D",
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



# 图生视频（结果查询跟文生图一样）

首尾帧生图

https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage
Request Method
POST
Status Code
200 OK
Remote Address
127.0.0.1:10808
Referrer Policy
strict-origin-when-cross-origin
access-control-allow-credentials
true
access-control-allow-origin
https://labs.google
access-control-expose-headers
vary,vary,vary,content-encoding,date,server,content-length
alt-svc
h3=":443"; ma=2592000,h3-29=":443"; ma=2592000
content-encoding
gzip
content-length
204
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:57:54 GMT
server
ESF
vary
Origin
vary
X-Origin
vary
Referer
x-content-type-options
nosniff
x-frame-options
SAMEORIGIN
x-xss-protection
0
:authority
aisandbox-pa.googleapis.com
:method
POST
:path
/v1/video:batchAsyncGenerateVideoStartAndEndImage
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer [REDACTED_OAUTH_TOKEN]
content-length
650
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"
sec-ch-ua-mobile
?0
sec-ch-ua-platform
"macOS"
sec-fetch-dest
empty
sec-fetch-mode
cors
sec-fetch-site
cross-site
user-agent
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
qSH0RgPhYS+tEktJTy2ahvLDO9s=
x-browser-year
2025
x-client-data
CK61yQEIiLbJAQiitskBCKmdygEI/4HLAQiUocsBCIagzQEI7o7PAQj0mM8B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300014, 3300104, 3300130, 3313321, 3326207, 3330196, 3362822, 3393390, 3394676];
}

payload:
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
返回：
[
    {
        "operation": {
            "name": "b0bd944ef0f4f590010e1d0b76af8c9b"
        },
        "sceneId": "13fc39cc-9ab3-4bbd-8239-4212afc73789",
        "status": "MEDIA_GENERATION_STATUS_PENDING"
    }
]

