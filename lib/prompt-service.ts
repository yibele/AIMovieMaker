import { supabase } from './supabaseClient';
import { PromptItem, UpsertUserPromptRequest } from './types-prompt-library';

const CACHE_KEY_SYSTEM = 'aimoviemaker_system_prompts';
const CACHE_KEY_USER_PREFIX = 'aimoviemaker_user_prompts_';
const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Local Storage Helper
const getCache = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed: CacheEntry<T> = JSON.parse(item);
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (e) {
    return null;
  }
};

const setCache = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Failed to save to localStorage', e);
  }
};

const clearCache = (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
};


// API Service
export const PromptService = {
  // Fetch System Prompts
  getSystemPrompts: async (): Promise<PromptItem[]> => {
    // Try Cache First
    const cached = getCache<PromptItem[]>(CACHE_KEY_SYSTEM);
    if (cached) return cached;

    // Fetch from Supabase
    const { data, error } = await supabase
      .from('system_prompts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const mappedData = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        coverImage: item.cover_image,
        category: item.category,
        createdAt: item.created_at
    }));

    // Save to Cache
    setCache(CACHE_KEY_SYSTEM, mappedData);
    return mappedData;
  },

  // Fetch User Prompts
  getUserPrompts: async (userId: string): Promise<PromptItem[]> => {
    const cacheKey = `${CACHE_KEY_USER_PREFIX}${userId}`;
    const cached = getCache<PromptItem[]>(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('user_prompts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedData = data.map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        coverImage: item.cover_image,
        createdAt: item.created_at
    }));

    setCache(cacheKey, mappedData);
    return mappedData;
  },

  // Create User Prompt
  createUserPrompt: async (userId: string, prompt: UpsertUserPromptRequest): Promise<PromptItem> => {
    const { data, error } = await supabase
      .from('user_prompts')
      .insert({
        user_id: userId,
        title: prompt.title,
        content: prompt.content,
        cover_image: prompt.coverImage
      })
      .select()
      .single();

    if (error) throw error;

    // Invalidate Cache
    clearCache(`${CACHE_KEY_USER_PREFIX}${userId}`);

    return {
        id: data.id,
        title: data.title,
        content: data.content,
        coverImage: data.cover_image,
        createdAt: data.created_at
    };
  },

  // Update User Prompt
  updateUserPrompt: async (userId: string, promptId: string, updates: UpsertUserPromptRequest): Promise<PromptItem> => {
    const { data, error } = await supabase
      .from('user_prompts')
      .update({
        title: updates.title,
        content: updates.content,
        cover_image: updates.coverImage,
        updated_at: new Date().toISOString()
      })
      .eq('id', promptId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate Cache
    clearCache(`${CACHE_KEY_USER_PREFIX}${userId}`);

    return {
        id: data.id,
        title: data.title,
        content: data.content,
        coverImage: data.cover_image,
        createdAt: data.created_at
    };
  },

  // Delete User Prompt
  deleteUserPrompt: async (userId: string, promptId: string): Promise<void> => {
    const { error } = await supabase
      .from('user_prompts')
      .delete()
      .eq('id', promptId)
      .eq('user_id', userId);

    if (error) throw error;

    // Invalidate Cache
    clearCache(`${CACHE_KEY_USER_PREFIX}${userId}`);
  }
};

