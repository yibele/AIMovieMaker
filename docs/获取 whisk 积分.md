Request URL
https://aisandbox-pa.googleapis.com/v1/whisk:getVideoCreditStatus
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
150
content-type
application/json; charset=UTF-8
date
Wed, 12 Nov 2025 14:22:07 GMT
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
/v1/whisk:getVideoCreditStatus
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
2
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

payload :
{}

返回数据：
{
    "credits": 680,
    "g1MembershipState": "AVAILABLE_CREDITS",
    "isUserAnimateCountryEnabled": true,
    "userPaygateTier": "PAYGATE_TIER_ONE"
}

