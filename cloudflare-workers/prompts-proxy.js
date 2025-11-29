/**
 * Cloudflare Worker - OpenNana Prompts 代理
 * 部署到 Cloudflare Workers 后，更新前端的 WORKER_URL
 */

const DATA_SOURCE_URL = 'https://opennana.com/awesome-prompt-gallery/data/prompts.json';

// 缓存 key
const CACHE_KEY = 'opennana-prompts-data';

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 只允许 GET 请求
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // 尝试从 Cloudflare Cache API 获取缓存
      const cache = caches.default;
      const cacheUrl = new URL(request.url);
      cacheUrl.pathname = '/cached-prompts';
      const cacheRequest = new Request(cacheUrl.toString());
      
      let response = await cache.match(cacheRequest);
      
      if (response) {
        // 返回缓存的响应，添加 CORS 头
        const headers = new Headers(response.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('X-Cache', 'HIT');
        return new Response(response.body, {
          status: response.status,
          headers,
        });
      }

      // 缓存未命中，从源获取数据
      const fetchResponse = await fetch(DATA_SOURCE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CloudflareWorker)',
        },
      });

      if (!fetchResponse.ok) {
        throw new Error(`Upstream error: ${fetchResponse.status}`);
      }

      const data = await fetchResponse.json();

      // 创建响应
      response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600', // 1小时缓存
          'X-Cache': 'MISS',
        },
      });

      // 存入缓存（使用 waitUntil 异步处理）
      ctx.waitUntil(cache.put(cacheRequest, response.clone()));

      return response;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data', items: [] }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

