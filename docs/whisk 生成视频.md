## 图生视频 （首帧）
https://aisandbox-pa.googleapis.com/v1/whisk:generateVideo
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
145
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:22:04 GMT
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
/v1/whisk:generateVideo
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
470766
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
        "sessionId": ";1762951219243",
        "tool": "BACKBONE",
        "workflowId": "c6e94e4a-4704-413a-9070-c22e84f945ac"
    },
    "promptImageInput": {
        "prompt": "拍戏",
        "rawBytes": "/9j/4AAQSkZJRgABAQAAAQABAAD/..."
    },
    "modelNameType": "VEO_3_1_I2V_12STEP",
    "modelKey": "",
    "userInstructions": "拍戏",
    "loopVideo": false
}

返回：
{
    "operation": {
        "operation": {
            "name": "e549243a49ed974a2ec80d08438774da"
        },
        "sceneId": "",
        "status": "MEDIA_GENERATION_STATUS_PENDING"
    }
}
、


## 查询任务状态：
Request URL
https://aisandbox-pa.googleapis.com/v1:runVideoFxSingleClipsStatusCheck
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
4253078
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:23:17 GMT
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
/v1:runVideoFxSingleClipsStatusCheck
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
74
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
                "name": "e549243a49ed974a2ec80d08438774da"
            }
        }
    ]
}

返回：
[
    {
        "operation": {
            "name": "e549243a49ed974a2ec80d08438774da",
            "metadata": {
                "@type": "type.googleapis.com/google.internal.labs.aisandbox.v1.Media",
                "name": "CAUaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0ZrKiQwYmFiMmNkNC1hODQ4LTRhMWMtOTdhZC00OTAzODE4Mjc1MjQ",
                "video": {
                    "seed": 116110,
                    "mediaGenerationId": "CAUaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0ZrKiQwYmFiMmNkNC1hODQ4LTRhMWMtOTdhZC00OTAzODE4Mjc1MjQ",
                    "prompt": "A dramatic image captures a young adult female with fair skin and long black hair embracing a male subject with pale skin, styled as a vampire, in a plain light to medium gray studio setting. The young adult female, with a slender build, is wearing a form-fitting gray ribbed crew-neck t-shirt and black denim jeans, looking directly at the camera with wide, dark eyes and a neutral expression. She is embracing the male subject. The male subject, styled as a vampire, has pale skin, vivid red eyes, fake fangs, and pointed ears. He is wearing a dark purplish-red, long-sleeved, high-necked jacket over a lighter-colored, high-collared shirt, and a wide-brimmed black hat adorned with red roses. They are locked in an embrace. The background is a simple light to medium gray seamless paper, with bright, even studio lighting casting soft shadows. 拍戏",
                    "mediaVisibility": "PRIVATE",
                    "model": "veo_3_1_i2v_s_fast",
                    "baseImageMediaGenerationId": "CAMaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0ZZKiQyZWRhMzM0Yy05MDZjLTQ5ZGUtYTU5OC05NDFhOWFlMWY2MGU",
                    "isLooped": false,
                    "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE"
                },
                "createTime": "2025-11-12T14:22:02.819642Z",
                "backboneMetadata": {
                    "mediaCategory": "MEDIA_CATEGORY_VIDEO",
                    "recipeInput": {
                        "userInput": {
                            "userInstructions": "拍戏"
                        },
                        "mediaInputs": [
                            {
                                "mediaGenerationId": "CAMaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0ZZKiQyZWRhMzM0Yy05MDZjLTQ5ZGUtYTU5OC05NDFhOWFlMWY2MGU",
                                "mediaCategory": "MEDIA_CATEGORY_BOARD"
                            },
                            {
                                "mediaGenerationId": "CAMaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0RnKiRkNzAxNTcyMy00MmFmLTQxZjYtOTEwMC0xYzViNTYyZWZlNjc",
                                "mediaCategory": "MEDIA_CATEGORY_SUBJECT"
                            },
                            {
                                "mediaGenerationId": "CAMaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0VBKiQxOTdmMWY4MC0wNTFjLTQ1ZDctYmIzMy1mNjIyZWRkMTdhNTA",
                                "mediaCategory": "MEDIA_CATEGORY_SUBJECT"
                            }
                        ]
                    }
                }
            }
        },
        "sceneId": "",
        "mediaGenerationId": "CAUaJGM2ZTk0ZTRhLTQ3MDQtNDEzYS05MDcwLWMyMmU4NGY5NDVhYyIDQ0ZrKiQwYmFiMmNkNC1hODQ4LTRhMWMtOTdhZC00OTAzODE4Mjc1MjQ",
        "rawBytes": "AAAAIGZ0eXBpc29tAA...",
        "status": "MEDIA_GENERATION_STATUS_SUCCESSFUL"
    }
]