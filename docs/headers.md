https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoUpsampleVideo
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
Fri, 14 Nov 2025 16:13:32 GMT
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
/v1/video:batchAsyncGenerateVideoUpsampleVideo
:scheme
https
accept
*/*
accept-encoding
gzip, deflate, br, zstd
accept-language
zh-CN,zh;q=0.9
authorization
Bearer YOUR_ACCESS_TOKEN
content-length
416
content-type
text/plain;charset=UTF-8
origin
https://labs.google
priority
u=1, i
referer
https://labs.google/
sec-ch-ua
"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"
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
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
d//u4R5DiWup/ApEN0L4er68I4A=
x-browser-year
2025
x-client-data
CJe2yQEIo7bJAQipncoBCLjqygEIlaHLAQiGoM0B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300119, 3300131, 3313321, 3323192, 3330197, 3362822];
}


payload
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


返回数据：
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


查询：

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
187
content-type
application/json; charset=UTF-8
date
Fri, 14 Nov 2025 16:14:23 GMT
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
Bearer YOUR_ACCESS_TOKEN
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
"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"
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
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36
x-browser-channel
stable
x-browser-copyright
Copyright 2025 Google LLC. All rights reserved.
x-browser-validation
d//u4R5DiWup/ApEN0L4er68I4A=
x-browser-year
2025
x-client-data
CJe2yQEIo7bJAQipncoBCLjqygEIlaHLAQiGoM0B
Decoded:
message ClientVariations {
  // Active Google-visible variation IDs on this client. These are reported for analysis, but do not directly affect any server-side behavior.
  repeated int32 variation_id = [3300119, 3300131, 3313321, 3323192, 3330197, 3362822];
}

payload :
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
返回数据是：
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
                        "fifeUrl": "https://storage.googleapis.com/ai-sandbox-videofx/video/8fbcdbe6-784f-44c7-b1d1-d77a55d2cfa1_upsampled?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1763158475&Signature=gdPrYjzetbZy2bc7YK1mNEZbqLNP22S9%2F%2B%2F70XG2ajGk%2B%2F9T2FoN5f8XCf7CnFJghv5R1oYzV%2BuM7ECYXxUvWmZS79KUM4y%2FVoO2Fi46UiRxxrG6icw%2FQr14sPk7kRvIGpbuhIgKBF8nNkfKVVUnKvfnZ9Pc%2BBDiLNvlj6wmS2LQ5UTzVEiwa2Ca6cdYQGiCtyy7DbSzovQfYdCWz6FqjGJfMDcNDgH37ep8oxXy3CF83stMIQbcVJjbnJRFcBIOlf3tWwnAgDfOsraBMMeR2mbu9Zs6uJSNJkq5v2jqF%2FAF4XH9gyjjQlfqhzUhwTy0aSwZyv%2BQniWop8GJbi4duA%3D%3D",
                        "mediaVisibility": "PRIVATE",
                        "servingBaseUri": "https://storage.googleapis.com/ai-sandbox-videofx/image/8fbcdbe6-784f-44c7-b1d1-d77a55d2cfa1_upsampled?GoogleAccessId=labs-ai-sandbox-videoserver-prod@system.gserviceaccount.com&Expires=1763158477&Signature=E0BP%2BWVJo80Tric3TCxPv8mHbyJEwxs0Ud4GKCPukb5a4jaiZ%2FbvoMtN2kOa64b5Mjij36%2BuDtKyD71FMIKVx7HK2EdrysjdAeKVPnJV8Nqcoh080R6QdTEcy6Yy%2BZjdtceL2Ydm6Zdh%2FdzRKw3H9bbgA07dxfqiFVnVuh3o8ifDoE%2F58dXYkSt7dQ1GDGLajCuhGFvHN6GpwBCNQiSTrAQPkXVem%2B0VdE3ovkRW%2BRTPwPthlPXJ4cGCyCpvZpWsI%2FnVASEl0uIVIBcnFH%2BnQjW%2Bjncla7VqdYSJAlkOR%2BML0gwcZCcznO78%2BdJEE9AqooigUo1n0hsJuWkgufFlKg%3D%3D",
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