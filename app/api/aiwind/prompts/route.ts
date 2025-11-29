import { NextRequest, NextResponse } from 'next/server';

// 缓存数据（内存缓存，避免重复请求）
let cachedData: AiwindPrompt[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1小时缓存

// 数据类型
interface AiwindPrompt {
  id: string;
  title: string;
  prompt: string;        // 真正的英文提示词
  image: string;
  tags: string[];
  source?: string;
  sourceUrl?: string;
  hasRealPrompt: boolean; // 标记是否有真正的提示词
}

// 从 aiwind.org 的 JS 文件中解析数据
async function fetchAiwindData(): Promise<AiwindPrompt[]> {
  // 检查缓存
  if (cachedData && cachedData.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  try {
    // 1. 先获取 HTML 找到 JS 文件路径
    const htmlResponse = await fetch('https://www.aiwind.org/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await htmlResponse.text();
    
    // 提取 JS 文件路径
    const jsMatch = html.match(/src="(\/assets\/index-[a-z0-9]+\.js)"/);
    if (!jsMatch) {
      return cachedData || [];
    }
    
    // 2. 获取 JS 文件内容
    const jsUrl = `https://www.aiwind.org${jsMatch[1]}`;
    
    const jsResponse = await fetch(jsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const jsContent = await jsResponse.text();
    
    // 3. 解析数据
    const prompts: AiwindPrompt[] = [];
    
    // 找到每个数据块
    const idRegex = /\{id:(\d+),slug:"[^"]*",title:"([^"]+)"/g;
    let match;
    
    while ((match = idRegex.exec(jsContent)) !== null) {
      const startPos = match.index;
      const id = match[1];
      const title = match[2];
      
      // 从这个位置向后查找相关字段（扩大范围以确保能找到 prompts）
      const chunk = jsContent.substring(startPos, startPos + 8000);
      
      // 提取 source
      const sourceMatch = chunk.match(/source:\{name:"([^"]*)",url:"([^"]*)"\}/);
      const sourceName = sourceMatch ? sourceMatch[1] : '';
      const sourceUrl = sourceMatch ? sourceMatch[2] : '';
      
      // 提取 localImage
      const localImageMatch = chunk.match(/localImage:"([^"]+)"/);
      if (!localImageMatch || !localImageMatch[1].includes('cloudinary')) {
        continue;
      }
      const image = localImageMatch[1];
      
      // 提取 prompts - 真正的英文提示词
      const promptsMatch = chunk.match(/prompts:\[`([\s\S]*?)`\]/);
      let promptText = '';
      let hasRealPrompt = false;
      
      if (promptsMatch && promptsMatch[1].length > 10) {
        // 有真正的英文提示词
        promptText = promptsMatch[1];
        hasRealPrompt = true;
      } else {
        // 没有提示词，使用标题
        promptText = title;
      }
      
      // 提取 tags
      const tagsMatch = chunk.match(/tags:\[([^\]]*)\]/);
      const tags = tagsMatch 
        ? tagsMatch[1].split(',').map(t => t.replace(/["']/g, '').trim()).filter(t => t.length > 0)
        : [];
      
      prompts.push({
        id: `aiwind-${id}`,
        title: decodeUnicodeEscapes(title),
        prompt: decodeUnicodeEscapes(promptText),
        image,
        tags,
        source: sourceName,
        sourceUrl,
        hasRealPrompt,
      });
    }
    
    // 更新缓存
    if (prompts.length > 0) {
      cachedData = prompts;
      cacheTimestamp = Date.now();
    }
    
    return prompts.length > 0 ? prompts : (cachedData || []);
  } catch (error) {
    return cachedData || [];
  }
}

// 解码 Unicode 转义字符和清理文本
function decodeUnicodeEscapes(str: string): string {
  return str
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\t/g, '\t')
    .trim();
}

// API 路由处理
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = 20;
  const search = searchParams.get('search') || '';

  try {
    let allPrompts = await fetchAiwindData();
    
    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      allPrompts = allPrompts.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.prompt.toLowerCase().includes(searchLower) ||
        p.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPrompts = allPrompts.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      prompts: paginatedPrompts,
      total: allPrompts.length,
      page,
      pageSize,
      hasMore: endIndex < allPrompts.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch prompts',
      prompts: [],
      hasMore: false,
    }, { status: 500 });
  }
}
