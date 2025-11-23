
https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoReshootVideo
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
206
content-type
application/json; charset=UTF-8
date
Sun, 23 Nov 2025 06:48:40 GMT
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
/v1/video:batchAsyncGenerateVideoReshootVideo
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
567
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

## 8种镜头控制类型
{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 21041,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokNzljYjY0YTgtY2ZjYi00YzkyLThjYzEtYmM4NmViOGU5MmViIgNDQUUqJGU2OGM5N2U2LTg0N2EtNDIwMS1iNjZjLTIwZTJmMzQzMTlkMg"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_UP",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "090265b7-9788-4360-8b9c-b22d3c80fc7b"
            }
        }
    ]
}


{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 27084,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokNzljYjY0YTgtY2ZjYi00YzkyLThjYzEtYmM4NmViOGU5MmViIgNDQUUqJGU2OGM5N2U2LTg0N2EtNDIwMS1iNjZjLTIwZTJmMzQzMTlkMg"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_DOWN",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "0664a2b8-aaab-49ab-a1eb-cd6d0459def8"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 17741,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_LEFT_TO_RIGHT",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "3ca83b66-5fe4-47be-8dba-55a2ebbbe9d5"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 4555,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_RIGHT_TO_LEFT",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "f937c0b4-5785-4379-b770-e3d9c81ae8cd"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 9158,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_FORWARD",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "f0f921dd-eef8-4aa4-9385-45a146632902"
            }
        }
    ]
}


{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 26945,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_BACKWARD",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "a4a8e372-10de-4f2d-9093-4d0d3e4d4863"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 31441,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_DOLLY_IN_ZOOM_OUT",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "dd4bb28a-51c9-41c4-adcc-69e70e791072"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 6633,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_DOLLY_OUT_ZOOM_IN_LARGE",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "ebc26877-cb8b-4ba0-9a6b-7b5e0b911560"
            }
        }
    ]
}




# 镜头位置：
{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 14213,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_STATIONARY_UP",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "dc7b39c5-dc1c-481c-8b20-9d43c8570797"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 12605,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokZjIzNGQ2MTYtNDY5YS00ZGFmLTlmNTYtNjAwNmE2ZTQ1NDgyIgNDQUUqJDUwOTE2MTNmLWFkZWMtNDM1Mi1hMzkzLWFhNTgwYWIyN2U3YQ"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_STATIONARY_DOWN",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "fecd7914-2604-45a1-b93c-3eb0b500e35b"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 26739,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokNGQ2ODgyY2YtZTc1MS00ZDIwLWIyNTMtMDAyMzFkZTlhYWVkIgNDQUUqJGNhY2I0NDE1LTMzMWQtNDcyZS05YjRiLTdiNTk1NmU3MTBmYw"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_STATIONARY_LEFT_LARGE",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "1074522f-4cb1-4b7c-80d9-b3591527493d"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 28572,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokNGQ2ODgyY2YtZTc1MS00ZDIwLWIyNTMtMDAyMzFkZTlhYWVkIgNDQUUqJGNhY2I0NDE1LTMzMWQtNDcyZS05YjRiLTdiNTk1NmU3MTBmYw"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_STATIONARY_RIGHT_LARGE",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "9f79a871-7dfc-49ce-b4f1-c7eff760600f"
            }
        }
    ]
}

{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 18765,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokMmIxMzUyODctZjg1Ny00NzI3LWIwNjktOTIyYTRkODRiODRkIgNDQUUqJGZmNWFkNDIzLWViNzUtNDk1Ni04OWQ5LTU0NjZiMjM4MmJiYg"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_IN_ZOOM_OUT",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "27154a8b-af26-4a46-9af6-764ac701ec95"
            }
        }
    ]
}
{
    "clientContext": {
        "sessionId": ";1763879885884",
        "projectId": "a51e6fd3-4e7b-4b83-9539-26db9ac3a5ca",
        "tool": "PINHOLE",
        "userPaygateTier": "PAYGATE_TIER_TWO"
    },
    "requests": [
        {
            "seed": 2597,
            "aspectRatio": "VIDEO_ASPECT_RATIO_LANDSCAPE",
            "videoInput": {
                "mediaId": "CAUSJGE1MWU2ZmQzLTRlN2ItNGI4My05NTM5LTI2ZGI5YWMzYTVjYRokMmIxMzUyODctZjg1Ny00NzI3LWIwNjktOTIyYTRkODRiODRkIgNDQUUqJGZmNWFkNDIzLWViNzUtNDk1Ni04OWQ5LTU0NjZiMjM4MmJiYg"
            },
            "reshootMotionType": "RESHOOT_MOTION_TYPE_STATIONARY_DOLLY_OUT_ZOOM_IN_LARGE",
            "videoModelKey": "veo_3_0_reshoot_landscape",
            "metadata": {
                "sceneId": "895215e7-bdc3-4355-ace6-a4ca67c37ffd"
            }
        }
    ]
}