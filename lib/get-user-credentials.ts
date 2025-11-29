// 获取用户凭证（优先用户专属凭证，降级全局凭证）
// 使用内存缓存优化性能，避免频繁查询数据库
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface UserCredentials {
  bearerToken: string;
  cookie?: string;
  isUserToken: boolean; // 是否是用户专属 token
  userId?: string;
}

// 内存缓存：userId -> { credentials, cachedAt, expiresAt }
interface CachedCredentials {
  bearerToken: string;
  cookie?: string;
  cachedAt: number;      // 缓存时间戳
  expiresAt: number;     // 用户激活过期时间戳
}

const credentialsCache = new Map<string, CachedCredentials>();

// 缓存时间：30 分钟（避免频繁查询数据库）
const CACHE_TTL = 30 * 60 * 1000;

/**
 * 获取 Google API 凭证
 * 优先级：用户专属凭证（缓存） > 用户专属凭证（数据库） > 全局凭证（环境变量）
 * 
 * @param userId - 用户 ID（可选）
 * @returns Google API 凭证
 */
export async function getUserCredentials(userId?: string): Promise<UserCredentials> {
  // 1. 如果有 userId，先检查缓存
  if (userId) {
    const cached = credentialsCache.get(userId);
    const now = Date.now();
    
    // 缓存有效条件：
    // 1. 缓存存在
    // 2. 用户激活未过期（now < expiresAt）
    // 3. 缓存时间未超过 TTL（now - cachedAt < CACHE_TTL）
    if (cached && now < cached.expiresAt && (now - cached.cachedAt) < CACHE_TTL) {
      const remainingMinutes = Math.round((cached.expiresAt - now) / (1000 * 60));
      const cacheAge = Math.round((now - cached.cachedAt) / (1000 * 60));
      

      
      return {
        bearerToken: cached.bearerToken,
        cookie: cached.cookie,
        isUserToken: true,
        userId,
      };
    }
    
    // 缓存失效或不存在，从数据库查询
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('google_bearer_token, google_cookie, expires_at, phone')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('查询用户 profile 失败:', error);
      }

      // 检查是否有效且未过期
      if (profile?.google_bearer_token && profile.expires_at) {
        const expiresAt = new Date(profile.expires_at);
        const now = new Date();

        if (now < expiresAt) {
          const expiresAtTimestamp = expiresAt.getTime();
          const nowTimestamp = now.getTime();
          
          // 更新缓存
          credentialsCache.set(userId, {
            bearerToken: profile.google_bearer_token,
            cookie: profile.google_cookie,
            cachedAt: nowTimestamp,
            expiresAt: expiresAtTimestamp,
          });
          
          const remainingHours = Math.round((expiresAtTimestamp - nowTimestamp) / (1000 * 60 * 60));


          return {
            bearerToken: profile.google_bearer_token,
            cookie: profile.google_cookie || undefined,
            isUserToken: true,
            userId,
          };
        } else {
          // 过期了，删除缓存
          credentialsCache.delete(userId);
          

        }
      }
    } catch (error) {
      console.error('获取用户凭证时发生错误:', error);
    }
  }

  // 2. 降级：使用全局凭证（环境变量）
  const globalBearerToken = process.env.GOOGLE_BEARER_TOKEN;
  const globalCookie = process.env.GOOGLE_COOKIE;

  if (!globalBearerToken) {
    throw new Error('未配置全局 Google Bearer Token，且用户未激活');
  }

  return {
    bearerToken: globalBearerToken,
    cookie: globalCookie || undefined,
    isUserToken: false,
  };
}

/**
 * 清理过期的缓存条目
 * 建议定期调用（如每小时一次）
 */
export function clearExpiredCache(): number {
  const now = Date.now();
  let cleared = 0;
  
  for (const [userId, cached] of credentialsCache.entries()) {
    if (now >= cached.expiresAt) {
      credentialsCache.delete(userId);
      cleared++;
    }
  }
  
  if (cleared > 0) {
  }
  
  return cleared;
}

/**
 * 清除指定用户的缓存
 * 用于用户激活/登出后强制刷新缓存
 * 
 * @param userId - 用户 ID
 */
export function clearUserCache(userId: string): void {
  const deleted = credentialsCache.delete(userId);
  if (deleted) {
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  totalCached: number;
  expiredCount: number;
  validCount: number;
} {
  const now = Date.now();
  let expiredCount = 0;
  let validCount = 0;
  
  for (const cached of credentialsCache.values()) {
    if (now >= cached.expiresAt) {
      expiredCount++;
    } else {
      validCount++;
    }
  }
  
  return {
    totalCached: credentialsCache.size,
    expiredCount,
    validCount,
  };
}

/**
 * 检查用户是否已激活且未过期
 * 
 * @param userId - 用户 ID
 * @returns 是否激活
 */
export async function checkUserActivation(userId: string): Promise<{
  isActivated: boolean;
  phone?: string;
  expiresAt?: string;
  remainingHours?: number;
}> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('phone, expires_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return { isActivated: false };
    }

    if (!profile.phone || !profile.expires_at) {
      return { isActivated: false };
    }

    const expiresAt = new Date(profile.expires_at);
    const now = new Date();

    if (now >= expiresAt) {
      return {
        isActivated: false,
        phone: profile.phone,
        expiresAt: profile.expires_at,
      };
    }

    const remainingHours = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));

    return {
      isActivated: true,
      phone: profile.phone,
      expiresAt: profile.expires_at,
      remainingHours,
    };
  } catch (error) {
    console.error('检查用户激活状态失败:', error);
    return { isActivated: false };
  }
}

