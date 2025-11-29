import { NextResponse } from 'next/server';

// 数据源 URL
const DATA_SOURCE_URL = 'https://opennana.com/awesome-prompt-gallery/data/prompts.json';

// 缓存（1小时）
let cachedData: unknown = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1小时

export async function GET() {
  // 检查缓存
  if (cachedData && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(DATA_SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 更新缓存
    cachedData = data;
    cacheTimestamp = Date.now();
    
    return NextResponse.json(data);
  } catch {
    // 如果请求失败，返回缓存数据（如果有）
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch data', items: [] },
      { status: 500 }
    );
  }
}

