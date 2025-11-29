import { NextRequest, NextResponse } from 'next/server';

// 缓存数据（内存缓存，避免重复请求）
let cachedData: AiwindPrompt[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30分钟缓存

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
      
      // 找到下一个数据块的位置，限制搜索范围在当前数据块内
      const nextIdMatch = jsContent.substring(startPos + 10).match(/\{id:\d+,slug:/);
      const endPos = (nextIdMatch && nextIdMatch.index !== undefined)
        ? startPos + 10 + nextIdMatch.index 
        : startPos + 10000;
      
      // 只在当前数据块范围内搜索
      const chunk = jsContent.substring(startPos, endPos);
      
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
      let promptText = '';
      let hasRealPrompt = false;
      
      // 查找 prompts:[ 的位置（确保在当前数据块内）
      const promptsIndex = chunk.indexOf('prompts:[');
      if (promptsIndex > -1) {
        const afterPrompts = chunk.substring(promptsIndex);
        const backtickStart = afterPrompts.indexOf('`');
        
        if (backtickStart > -1) {
          const contentStart = backtickStart + 1;
          let contentEnd = contentStart;
          
          // 查找结束的反引号
          for (let i = contentStart; i < afterPrompts.length; i++) {
            if (afterPrompts[i] === '`') {
              contentEnd = i;
              break;
            }
          }
          
          if (contentEnd > contentStart) {
            const extractedPrompt = afterPrompts.substring(contentStart, contentEnd);
            // 验证提取的内容是有效的提示词（不是标题的重复）
            if (extractedPrompt.length > 20 && extractedPrompt !== title) {
              promptText = extractedPrompt;
              hasRealPrompt = true;
            }
          }
        }
      }
      
      // 如果没有找到有效提示词，使用标题
      if (!hasRealPrompt) {
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
  const pageSize = 10; // 减少每页数量，提升性能
  const search = searchParams.get('search') || '';
  const refresh = searchParams.get('refresh') === 'true'; // 强制刷新缓存

  // 如果需要强制刷新，清除缓存
  if (refresh) {
    cachedData = null;
    cacheTimestamp = 0;
  }

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
