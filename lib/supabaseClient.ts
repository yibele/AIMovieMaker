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
    
    // 行级注释：从 Supabase 获取 session 并缓存
    const { data: { session } } = await supabase.auth.getSession();
    cachedSession = session;
    sessionCacheTime = now;
    
    return session;
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
    if (event === 'SIGNED_OUT') {
        clearSessionCache();
    } else if (session) {
        cachedSession = session;
        sessionCacheTime = Date.now();
    }
});
