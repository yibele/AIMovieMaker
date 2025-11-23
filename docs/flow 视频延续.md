https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoExtendVideo
请求方法
POST
状态代码
200 OK
远程地址
127.0.0.1:7897
引用站点策略
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
Sun, 23 Nov 2025 07:25:01 GMT
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
/v1/video:batchAsyncGenerateVideoExtendVideo
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6
authorization
Bearer YOUR_BEARER_TOKEN
content-length
633
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Chromium";v="142", "Microsoft Edge";v="142", "Not_A Brand";v="99"
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
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0

payload :
{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "textInput": {
                "prompt": "天上分飞下来一个女巫。"
            },
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokODMxMGY3MmItZWE1YS00NGM4LWE0ZDktNjI0NGM3NGZhYTBiIgNDQUUqJDUwNmZjZTk4LWQ4ZWMtNGNiYS04MTRkLTYzMjAwN2M3Y2I3MA",
                "startFrameIndex": 168,
                "endFrameIndex": 191
            },
            "videoModelKey": "veo_3_1_extend_fast_landscape_ultra",
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "seed": 24818,
            "metadata": {
                "sceneId": "9db4a3f5-f358-4f7e-831c-f05b851a237e"
            }
        }
    ]
}

返回
{
    "operations": [
        {
            "operation": {
                "name": "3d14a30f4a1f6646790ee1e4e63ac35f"
            },
            "sceneId": "9db4a3f5-f358-4f7e-831c-f05b851a237e",
            "status": "MEDIA_GENERATION_STATUS_PENDING"
        }
    ],
    "remainingCredits": 36970
}

 