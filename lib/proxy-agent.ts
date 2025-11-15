import type { Agent } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// 解析代理字符串并返回对应的 Agent（支持请求参数和环境变量） // 行级注释说明函数作用
export function resolveProxyAgent(
  proxyFromRequest?: string
): {
  agent?: Agent;
  proxyUrl?: string;
  proxyType: 'socks' | 'http' | 'none';
} {
  // 优先使用接口参数，其次回退到环境变量 // 行级注释说明优先级逻辑
  const proxyUrl =
    proxyFromRequest?.trim() ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY;

  if (!proxyUrl) {
    return { proxyType: 'none' }; // 没有代理直接返回 none // 行级注释说明无代理分支
  }

  if (/^socks/i.test(proxyUrl)) {
    return {
      agent: new SocksProxyAgent(proxyUrl),
      proxyUrl,
      proxyType: 'socks',
    };
  }

  return {
    agent: new HttpsProxyAgent(proxyUrl),
    proxyUrl,
    proxyType: 'http',
  };
}


