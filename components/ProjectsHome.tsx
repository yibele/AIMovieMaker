'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useCanvasStore } from '@/lib/store';
import SettingsPanel from '@/components/SettingsPanel';
import { DashboardView } from './DashboardView';
import { Project } from '../types/morpheus';
import { supabase } from '@/lib/supabaseClient';

// Flow 项目返回结构
interface FlowProject {
  projectId: string;
  projectTitle?: string;
  thumbnailMediaKey?: string;
  creationTime?: string;
  sceneCount?: number;
  scenes?: Array<{ sceneId: string }>;
}

// 页面展示所需的项目结构
interface LocalProjectCard {
  id: string;
  title: string;
  thumbnailUrl?: string;
  createdAt: string;
  sceneCount: number;
  thumbnailMediaKey?: string; // 保存原始 mediaKey，用于后续获取 URL
}

// 缓存数据结构
interface CachedProjectsData {
  projects: LocalProjectCard[];
  timestamp: number;
  cursor?: string;
  thumbnailCache?: Record<string, string>; // 缓存缩略图 URL
}

const PROJECT_PAGE_SIZE = 20; // 默认分页大小
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 缓存有效期：5分钟
const CACHE_KEY = 'flow_projects_cache'; // localStorage 键名

// 存储用户的项目ID列表到 localStorage
const saveUserProjectIds = async (projectIds: string[]) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.log('⚠️ 无法保存项目列表：未获取到用户 email');
      return;
    }
    
    const userEmail = session.user.email;
    const storageKey = `user_projects_${userEmail}`;
    localStorage.setItem(storageKey, JSON.stringify(projectIds));
    console.log('✅ 已保存用户项目列表到 localStorage:', { email: userEmail, count: projectIds.length });
  } catch (error) {
    console.error('❌ 保存项目列表失败:', error);
  }
};

// 添加单个项目ID到 localStorage
const addProjectIdToCache = async (projectId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.log('⚠️ 无法添加项目ID：未获取到用户 email');
      return;
    }
    
    const userEmail = session.user.email;
    const storageKey = `user_projects_${userEmail}`;
    const existingData = localStorage.getItem(storageKey);
    const existingIds: string[] = existingData ? JSON.parse(existingData) : [];
    
    // 避免重复添加
    if (!existingIds.includes(projectId)) {
      existingIds.unshift(projectId); // 添加到列表开头
      localStorage.setItem(storageKey, JSON.stringify(existingIds));
      console.log('✅ 已添加新项目到缓存:', { email: userEmail, projectId });
    }
  } catch (error) {
    console.error('❌ 添加项目ID失败:', error);
  }
};

// 从 localStorage 移除项目ID
const removeProjectIdFromCache = async (projectId: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.log('⚠️ 无法移除项目ID：未获取到用户 email');
      return;
    }
    
    const userEmail = session.user.email;
    const storageKey = `user_projects_${userEmail}`;
    const existingData = localStorage.getItem(storageKey);
    const existingIds: string[] = existingData ? JSON.parse(existingData) : [];
    
    const filteredIds = existingIds.filter(id => id !== projectId);
    localStorage.setItem(storageKey, JSON.stringify(filteredIds));
    console.log('✅ 已从缓存移除项目:', { email: userEmail, projectId });
  } catch (error) {
    console.error('❌ 移除项目ID失败:', error);
  }
};

// 生成符合 Flow 命名习惯的项目标题
const formatProjectTitle = () => {
  const now = new Date(); // 当前时间
  const dateLabel = now.toLocaleDateString('zh-CN', {
    month: 'short',
    day: '2-digit',
  }); // 日期部分
  const timeLabel = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }); // 时间部分
  return `${dateLabel} - ${timeLabel}`; // 合并标题
};

// 媒体 URL 缓存
const mediaUrlCache = new Map<string, string>();

// 缓存相关辅助函数
const getCachedProjects = (): CachedProjectsData | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedProjectsData;
    const now = Date.now();

    // 检查缓存是否过期
    if (now - data.timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // 如果有缩略图缓存，更新全局缓存
    if (data.thumbnailCache) {
      Object.entries(data.thumbnailCache).forEach(([key, url]) => {
        if (!mediaUrlCache.has(key)) {
          mediaUrlCache.set(key, url);
        }
      });
    }

    return data;
  } catch (error) {
    console.error('Failed to load cached projects:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedProjects = (projects: LocalProjectCard[], cursor?: string): void => {
  if (typeof window === 'undefined') return;

  try {
    // 收集当前的缩略图缓存
    const thumbnailCache: Record<string, string> = {};
    projects.forEach(project => {
      if (project.thumbnailMediaKey && project.thumbnailUrl) {
        thumbnailCache[project.thumbnailMediaKey] = project.thumbnailUrl;
      }
    });

    const data: CachedProjectsData = {
      projects,
      timestamp: Date.now(),
      cursor,
      thumbnailCache
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to cache projects:', error);
  }
};

// 获取媒体详情并返回缩略图 URL
const fetchThumbnailUrl = async (
  mediaKey: string,
  bearerToken: string,
  proxy?: string
): Promise<string | undefined> => {
  // 检查缓存
  if (mediaUrlCache.has(mediaKey)) {
    return mediaUrlCache.get(mediaKey);
  }

  // 检查缓存失败的记录（避免重复请求失败的媒体）
  if (mediaUrlCache.has(`${mediaKey}_failed`)) {
    return undefined;
  }

  try {
    const params = new URLSearchParams({
      key: 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY', // Flow API key
      clientContext: 'PINHOLE',
      returnUriOnly: 'true'
    });

    if (proxy) {
      params.set('proxy', proxy);
    }

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

    const response = await fetch(
      `/api/flow/media/${encodeURIComponent(mediaKey)}?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch media details for ${mediaKey}:`, response.status);
      // 缓存失败的记录，避免重复请求
      mediaUrlCache.set(`${mediaKey}_failed`, 'true');
      return undefined;
    }

    const data = await response.json();

    // 获取 servingBaseUri 作为缩略图 URL
    const thumbnailUrl = data?.servingBaseUri || data?.video?.servingBaseUri || data?.image?.servingBaseUri;

    if (thumbnailUrl) {
      // 缓存结果
      mediaUrlCache.set(mediaKey, thumbnailUrl);
      return thumbnailUrl;
    }

    // 如果没有获取到 URL，也标记为失败
    mediaUrlCache.set(`${mediaKey}_failed`, 'true');
    return undefined;
  } catch (error) {
    console.error('Error fetching thumbnail URL:', error);
    // 缓存失败的记录
    mediaUrlCache.set(`${mediaKey}_failed`, 'true');
    return undefined;
  }
};

// 构建缩略图 URL - 异步版本
const buildThumbnailUrl = async (
  mediaKey?: string | null,
  bearerToken?: string,
  proxy?: string
): Promise<string | undefined> => {
  if (!mediaKey || !bearerToken) return undefined;

  // 如果已经是完整 URL，直接返回
  if (mediaKey.startsWith('http')) return mediaKey;

  // 调用 fetchThumbnailUrl 获取实际 URL
  return await fetchThumbnailUrl(mediaKey, bearerToken, proxy);
};

// 将 Flow 原始数据映射为卡片数据
const mapFlowProjectToCard = (project: FlowProject, existingProjects?: LocalProjectCard[]): LocalProjectCard => {
  // 查找是否已有该项目（保留现有的缩略图）
  const existingProject = existingProjects?.find(p => p.id === project.projectId);

  // 检查是否有缓存的缩略图
  let thumbnailUrl = existingProject?.thumbnailUrl;

  // 如果没有缩略图，但 mediaKey 在缓存中，从缓存恢复
  if (!thumbnailUrl && project.thumbnailMediaKey && mediaUrlCache.has(project.thumbnailMediaKey)) {
    thumbnailUrl = mediaUrlCache.get(project.thumbnailMediaKey);
  }

  return {
    id: project.projectId,
    title: project.projectTitle || '未命名项目',
    thumbnailUrl, // 可能是 undefined（没有缩略图或未加载）
    thumbnailMediaKey: project.thumbnailMediaKey, // 保存 mediaKey
    createdAt: project.creationTime || new Date().toISOString(),
    sceneCount: project.scenes?.length ?? 0,
  };
};

interface ProjectsHomeProps {
  onLogout?: () => void;
}

export default function ProjectsHome({ onLogout }: ProjectsHomeProps) {
  const router = useRouter();
  const apiConfig = useCanvasStore((state) => state.apiConfig); // 读取 API 配置
  const setIsSettingsOpen = useCanvasStore((state) => state.setIsSettingsOpen); // 设置面板控制

  const [projects, setProjects] = useState<LocalProjectCard[]>([]); // 项目列表
  const [cursor, setCursor] = useState<string | null>(null); // 下一页游标
  const [isLoading, setIsLoading] = useState(false); // 列表加载态
  const [isCreating, setIsCreating] = useState(false); // 创建按钮加载态
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 错误提示
  const [isHydrated, setIsHydrated] = useState(false); // 客户端渲染完成
  const [isRefreshing, setIsRefreshing] = useState(false); // 后台刷新状态
  const [authStatus, setAuthStatus] = useState<'valid' | 'missing' | 'expired'>('valid');

  useEffect(() => {
    setIsHydrated(true); // 仅在客户端设置为 true

    // 立即加载缓存数据
    const cachedData = getCachedProjects();
    if (cachedData && cachedData.projects.length > 0) {
      setProjects(cachedData.projects);
      setCursor(cachedData.cursor || null);
    }
  }, []);

  const cookieConfigured = Boolean(apiConfig.cookie?.trim());
  const hasCookie = isHydrated && cookieConfigured; // 仅在客户端判断 Cookie

  useEffect(() => {
    if (isHydrated) {
      if (!cookieConfigured) {
        setAuthStatus('missing');
      } else if (authStatus === 'missing') {
        setAuthStatus('valid');
      }
    }
  }, [isHydrated, cookieConfigured]);

  const fetchProjects = useCallback(async (forceRefresh = false) => {
    if (!hasCookie) {
      setProjects([]); // 清空项目列表
      setAuthStatus('missing');
      return;
    }

    // 如果不是强制刷新，且有缓存，则进行后台刷新
    const cachedData = getCachedProjects();
    if (!forceRefresh && cachedData && cachedData.projects.length > 0) {
      setIsRefreshing(true); // 设置后台刷新状态
      setErrorMessage(null);
    } else {
      setIsLoading(true); // 进入加载状态
      setErrorMessage(null); // 清理错误提示
    }

    try {
      const params = new URLSearchParams({
        cookie: apiConfig.cookie.trim(),
        pageSize: PROJECT_PAGE_SIZE.toString(),
      }); // 构造查询参数

      if (apiConfig.proxy) {
        params.set('proxy', apiConfig.proxy); // 可选代理
      }

      const response = await fetch(
        `/api/flow/projects/search?${params.toString()}`
      ); // 调用本地 API
      const data = await response.json(); // 解析响应

      if (!response.ok) {
        throw new Error(data?.error || '获取项目列表失败'); // 抛出接口错误
      }

      // 保留现有缩略图
      const currentProjects = projects.length > 0 ? projects : (cachedData?.projects || []);

      const normalizedProjects = (data?.projects || []).map(
        (project: FlowProject) => mapFlowProjectToCard(project, currentProjects)
      ); // 转换数据，保留现有缩略图

      // 更新项目列表
      setProjects(normalizedProjects);
      setAuthStatus('valid');
      setCursor(data?.cursor ?? null); // 保存下一页游标

      // 缓存新数据
      setCachedProjects(normalizedProjects, data?.cursor);

      // 存储项目 ID 列表到 localStorage（用于项目权限验证）
      const projectIds = normalizedProjects.map((p: LocalProjectCard) => p.id);
      await saveUserProjectIds(projectIds);

      // 显示加载完成提示
      if (!forceRefresh && cachedData && cachedData.projects.length > 0) {
        toast.success('项目列表已更新');
      } else if (forceRefresh) {
        toast.success('项目列表已刷新');
      } else {
        console.log('首次加载完成');
      }
    } catch (error) {
      // 如果是后台刷新失败，不显示错误，保持缓存数据
      if (!forceRefresh && cachedData && cachedData.projects.length > 0) {
        console.error('Background refresh failed:', error);
      } else {
        setProjects([]); // 出错时清空列表
        setCursor(null); // 清空游标
        const errorMessage = error instanceof Error ? error.message : '无法获取项目列表';
        setErrorMessage(errorMessage); // 显示错误提示

        // 检查是否是401错误（token或cookie过期）
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('过期')) {
          setAuthStatus('expired');
          toast.error('登录已过期\n您的 Token 或 Cookie 已过期，请重新设置 API 配置', {
            duration: 8000,
          });
        }
      }
    } finally {
      setIsLoading(false); // 退出加载态
      setIsRefreshing(false); // 退出后台刷新态
    }
  }, [apiConfig.cookie, apiConfig.proxy, hasCookie]);

  // 异步加载缩略图
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!apiConfig.bearerToken || projects.length === 0) return;

      // 找出需要加载缩略图的项目（有 mediaKey 但没有 URL，且没有失败记录）
      const projectsNeedingThumbnails = projects.filter(
        project =>
          project.thumbnailMediaKey &&
          !project.thumbnailUrl &&
          !mediaUrlCache.has(`${project.thumbnailMediaKey}_failed`) &&
          !mediaUrlCache.has(project.thumbnailMediaKey) // 也没有成功的缓存
      );

      if (projectsNeedingThumbnails.length === 0) return;

      // 批量加载缩略图（限制并发数）
      const CONCURRENT_LIMIT = 3;
      const updates: { projectId: string; thumbnailUrl?: string }[] = [];

      for (let i = 0; i < projectsNeedingThumbnails.length; i += CONCURRENT_LIMIT) {
        const batch = projectsNeedingThumbnails.slice(i, i + CONCURRENT_LIMIT);

        await Promise.all(
          batch.map(async (project) => {
            const thumbnailUrl = await buildThumbnailUrl(
              project.thumbnailMediaKey!,
              apiConfig.bearerToken,
              apiConfig.proxy
            );

            if (thumbnailUrl) {
              updates.push({ projectId: project.id, thumbnailUrl });
            }
          })
        );
      }

      // 批量更新项目
      if (updates.length > 0) {
        setProjects(prev => {
          const updated = prev.map(project => {
            const update = updates.find(u => u.projectId === project.id);
            return update ? { ...project, thumbnailUrl: update.thumbnailUrl } : project;
          });
          // 更新缓存
          setCachedProjects(updated);
          return updated;
        });
      }
    };

    loadThumbnails();
  }, [projects.length, apiConfig.bearerToken]); // 改为依赖数组，避免死循环

  useEffect(() => {
    if (!isHydrated) {
      return; // 避免 SSR 阶段触发
    }

    // 组件挂载时，如果有缓存则后台刷新，否则正常加载
    fetchProjects(); // 总是调用 fetchProjects，它会自动判断是否需要后台刷新
  }, [fetchProjects, isHydrated]);

  // 自动同步云端凭证 (Auto-Sync Credentials)
  // 行级注释：只在 cloud 模式下自动同步，local 模式下跳过（避免覆盖用户手动设置的配置）
  useEffect(() => {
    const syncCredentials = async () => {
      // 检查当前凭证模式
      const currentConfig = useCanvasStore.getState().apiConfig;
      
      // 如果是 local（开发者）模式，跳过自动同步
      if (currentConfig.credentialMode === 'local') {
        console.log('🔒 开发者模式：跳过云端凭证自动同步');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const response = await fetch('/api/activation/activate', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.activated && data.credentials) {
            console.log('🔄 自动同步云端凭证成功');
            
            const newCreds = data.credentials;

            // 简单对比关键字段，避免不必要的更新
            if (currentConfig.cookie !== newCreds.cookie || currentConfig.bearerToken !== newCreds.bearerToken) {
               useCanvasStore.getState().setApiConfig({
                apiKey: newCreds.apiKey || currentConfig.apiKey,
                bearerToken: newCreds.bearerToken || '',
                cookie: newCreds.cookie || '',
                projectId: newCreds.projectId || currentConfig.projectId,
                accountTier: 'ultra', // VIP 用户默认 Ultra
                isManaged: true, // 标记为托管模式
                videoModel: 'fast', // 托管模式下强制使用 Fast 模型
                credentialMode: 'cloud', // 保持云端模式
              });
              toast.success('已同步最新 API 授权');
              
              // 凭证更新后，刷新项目列表
              setTimeout(() => fetchProjects(true), 500);
            }
          }
        }
      } catch (error) {
        console.error('自动同步凭证失败:', error);
      }
    };

    if (isHydrated) {
      syncCredentials();
    }
  }, [isHydrated, fetchProjects]);

  const handleOpenProject = (projectId: string) => {
    router.push(`/canvas/project/${projectId}`);
  };

  const ensureApiConfig = useCallback(() => {
    if (!isHydrated) {
      setErrorMessage('页面初始化中，请稍后再试'); // 等待客户端准备好
      return false;
    }
    if (apiConfig.cookie?.trim()) {
      return true; // 已配置 Cookie
    }
    setErrorMessage('请先在 API 设置中配置 Cookie'); // 提示用户配置
    setIsSettingsOpen(true); // 打开设置面板
    return false;
  }, [apiConfig.cookie, isHydrated, setIsSettingsOpen]);

  const handleCreateProject = useCallback(async (prompt?: string) => {
    if (!ensureApiConfig()) {
      return; // 没有配置则直接退出
    }

    setIsCreating(true); // 进入创建状态，禁用按钮
    setErrorMessage(null); // 清理旧的错误

    try {
      const payload: Record<string, string> = {
        cookie: apiConfig.cookie,
        projectTitle: prompt || formatProjectTitle(), // Use prompt as title if available
      }; // 创建请求体

      if (apiConfig.proxy) {
        payload.proxy = apiConfig.proxy; // 透传代理
      }

      const response = await fetch('/api/flow/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }); // 调用创建接口

      const data = await response.json(); // 解析结果

      if (!response.ok || !data?.success) {
        let errorMessage = '新建项目失败';

        // 检查response状态
        if (response.status === 401) {
          errorMessage = '401 Unauthorized';
        } else if (typeof data?.error === 'string') {
          errorMessage = data.error;
        } else if (typeof data?.message === 'string') {
          errorMessage = data.message;
        } else if (data?.error && typeof data?.error === 'object') {
          errorMessage = JSON.stringify(data.error);
        } else if (data?.message && typeof data?.message === 'object') {
          errorMessage = JSON.stringify(data.message);
        }

        throw new Error(errorMessage); // 统一错误
      }

      // 🔥 立即将新项目ID添加到缓存，确保用户可以马上访问
      if (data?.project?.projectId) {
        await addProjectIdToCache(data.project.projectId);
        console.log('🎉 新项目已添加到缓存，用户可以立即访问:', data.project.projectId);
      }

      await fetchProjects(true); // 创建成功后强制刷新列表
    } catch (error) {
      let errorMessage = '新建项目失败';
      let is401Error = false;

      if (error instanceof Error) {
        errorMessage = error.message;
        is401Error = errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('过期');
      } else if (typeof error === 'object' && error !== null) {
        // 处理非Error对象
        errorMessage = (error as any)?.message || (error as any)?.error || JSON.stringify(error);
        is401Error = errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('过期');
      }

      setErrorMessage(errorMessage); // 显示错误

      // 检查是否是401错误（token或cookie过期）
      if (is401Error) {
        toast.error('登录已过期\n您的 Token 或 Cookie 已过期，请重新设置 API 配置', {
          duration: 8000,
        });
      }
    } finally {
      setIsCreating(false); // 恢复按钮状态
    }
  }, [apiConfig.cookie, apiConfig.proxy, ensureApiConfig, fetchProjects]);

  // Map LocalProjectCard to Morpheus Project type
  const morpheusProjects: Project[] = useMemo(() => {
    return projects.map(p => ({
      id: p.id,
      title: p.title,
      description: `${p.sceneCount} scenes`,
      imageUrl: p.thumbnailUrl || undefined,
      createdAt: new Date(p.createdAt),
      type: 'image'
    }));
  }, [projects]);

  return (
    <div className="w-screen h-screen overflow-auto relative">
      <SettingsPanel />
      <DashboardView
        projects={morpheusProjects}
        onCreateProject={handleCreateProject}
        onRefreshProjects={() => fetchProjects(true)}
        onProjectClick={handleOpenProject}
        isLoading={isLoading || isRefreshing}
        onLogout={onLogout || (() => { })}
        authStatus={authStatus}
      />
    </div>
  );
}
