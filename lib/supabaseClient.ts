import { createClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Check .env.local');
}

// 行级注释：优化 Supabase 配置，减少不必要的 auth 请求
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true, // 保持自动刷新
        persistSession: true, // 持久化 session
        detectSessionInUrl: true,
    },
});

// ============================================================================
// Session 和 User 缓存 - 减少重复的 API 请求
// ============================================================================

// 行级注释：缓存的 session 和获取时间
let cachedSession: Session | null = null;
let sessionCacheTime: number = 0;
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 行级注释：缓存 5 分钟

/**
 * 获取缓存的 session（减少 API 请求）
 * 
 * @param forceRefresh 是否强制刷新缓存
 * @returns Session 或 null
 * 
 * @example
 * const session = await getCachedSession();
 * if (session) {
 *   // 用户已登录
 * }
 */
export async function getCachedSession(forceRefresh = false): Promise<Session | null> {
    const now = Date.now();
    
    // 行级注释：如果缓存有效且不强制刷新，直接返回缓存
    if (!forceRefresh && cachedSession && (now - sessionCacheTime) < SESSION_CACHE_TTL) {
        return cachedSession;
    }
    
    try {
        // 行级注释：从 Supabase 获取 session 并缓存
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // 行级注释：处理 refresh token 无效的情况（静默处理，不报错）
        if (error) {
            console.warn('Session 获取失败（可能是 token 过期）:', error.message);
            // 行级注释：清除无效的 session 缓存
            cachedSession = null;
            sessionCacheTime = now;
            return null;
        }
        
        cachedSession = session;
        sessionCacheTime = now;
        
        return session;
    } catch (err) {
        // 行级注释：捕获 AuthApiError 等异常，静默返回 null
        console.warn('获取 session 时发生异常:', err);
        cachedSession = null;
        sessionCacheTime = Date.now();
        return null;
    }
}

/**
 * 获取缓存的用户信息（从 session 中提取，无需额外 API 调用）
 * 
 * @param forceRefresh 是否强制刷新缓存
 * @returns User 或 null
 * 
 * @example
 * const user = await getCachedUser();
 * if (user) {
 *   console.log(user.email);
 * }
 */
export async function getCachedUser(forceRefresh = false): Promise<User | null> {
    // 行级注释：直接从缓存的 session 中获取用户，避免额外的 getUser() 调用
    const session = await getCachedSession(forceRefresh);
    return session?.user ?? null;
}

/**
 * 清除 session 缓存（登出时调用）
 */
export function clearSessionCache(): void {
    cachedSession = null;
    sessionCacheTime = 0;
}

// 行级注释：监听 auth 状态变化，自动更新缓存
supabase.auth.onAuthStateChange((event, session) => {
    // 行级注释：处理 TOKEN_REFRESHED 失败的情况
    if (event === 'TOKEN_REFRESHED' && !session) {
        // 行级注释：token 刷新失败，静默清除缓存（用户需要重新登录）
        console.log('Token 刷新失败，需要重新登录');
        clearSessionCache();
        return;
    }
    
    if (event === 'SIGNED_OUT') {
        clearSessionCache();
    } else if (session) {
        cachedSession = session;
        sessionCacheTime = Date.now();
    }
});

// 行级注释：在页面加载时清理无效的 session（避免 Invalid Refresh Token 错误）
if (typeof window !== 'undefined') {
    // 行级注释：检查 localStorage 中是否有过期的 auth 数据
    const storageKey = `sb-${supabaseUrl.split('//')[1]?.split('.')[0]}-auth-token`;
    try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            const parsed = JSON.parse(storedData);
            // 行级注释：如果 expires_at 已过期，清除 localStorage 中的无效数据
            if (parsed?.expires_at && parsed.expires_at * 1000 < Date.now()) {
                console.log('清理过期的 session 数据');
                localStorage.removeItem(storageKey);
            }
        }
    } catch {
        // 行级注释：解析失败时静默忽略
    }
}
