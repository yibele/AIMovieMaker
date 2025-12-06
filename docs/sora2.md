const response = await fetch('https://api.apimart.ai/v1/videos/generations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
      "model": "sora-2",
      "prompt": "A serene lake at sunset with mountains",
      "duration": 15,  // 10 或者 15
      "aspect_ratio": "16:9"
  })
});

const data = await response.json();
console.log(data);


{
  "code": 200,
  "data": [
    {
      "status": "submitted",
      "task_id": "task_01K8SGYNNNVBQTXNR4MM964S7K"
    }
  ]

}


const response = await fetch('https://api.apimart.ai/v1/tasks/task_1234567890', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});

const data = await response.json();
console.log(data);

{
  "id": "task_01K8SGYNNNVBQTXNR4MM964S7K",
  "status": "completed",
  "progress": 100,
  "result": {
    "videos": [
      {
        "url": "https://cdn.apimart.ai/videos/xxx.mp4",
        "duration": 10,
        "width": 1920,
        "height": 1080
      }
    ]
  },
  "created": 1709876543,
  "completed": 1709876663,
  "estimated_time": 120,
  "actual_time": 120
}

中间状态：
{
    "code": 200,
    "data": {
        "created": 1765000891,
        "estimated_time": 600,
        "id": "task_01KBS40K78KGHZ9SDBWQSGSXRK",
        "progress": 91,
        "status": "processing"
    }
}

最终结果：
{
    "code": 200,
    "data": {
        "actual_time": 155,
        "completed": 1765001046,
        "created": 1765000891,
        "estimated_time": 600,
        "id": "task_01KBS40K78KGHZ9SDBWQSGSXRK",
        "progress": 100,
        "result": {
            "videos": [
                {
                    "expires_at": 1765087446,
                    "url": [
                        "https://upload.apimart.ai/f/video/9998234998953836-b97ab050-d420-446e-8a3b-387822f0045f-video_task_01KBS40K78KGHZ9SDBWQSGSXRK.mp4"
                    ]
                }
            ]
        },
        "status": "completed"
    }
}