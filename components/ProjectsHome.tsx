'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FolderOpen,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Palette,
} from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import SettingsPanel from '@/components/SettingsPanel';

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
interface ProjectCard {
  id: string;
  title: string;
  thumbnailUrl?: string;
  createdAt: string;
  sceneCount: number;
  thumbnailMediaKey?: string; // 保存原始 mediaKey，用于后续获取 URL
}

// 缓存数据结构
interface CachedProjectsData {
  projects: ProjectCard[];
  timestamp: number;
  cursor?: string;
  thumbnailCache?: Record<string, string>; // 缓存缩略图 URL
}

const PROJECT_PAGE_SIZE = 20; // 默认分页大小
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 缓存有效期：5分钟
const CACHE_KEY = 'flow_projects_cache'; // localStorage 键名

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

const setCachedProjects = (projects: ProjectCard[], cursor?: string): void => {
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
      key: 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY', // 从你的 headers 中获取的 API key
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
      console.error('Failed to fetch media details:', response.status);
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
const mapFlowProjectToCard = (project: FlowProject, existingProjects?: ProjectCard[]): ProjectCard => {
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

// 统一的时间展示格式
const formatDisplayTime = (value: string) => {
  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return value;
  }
};

export default function ProjectsHome() {
  const apiConfig = useCanvasStore((state) => state.apiConfig); // 读取 API 配置
  const setIsSettingsOpen = useCanvasStore((state) => state.setIsSettingsOpen); // 设置面板控制

  const [projects, setProjects] = useState<ProjectCard[]>([]); // 项目列表
  const [cursor, setCursor] = useState<string | null>(null); // 下一页游标
  const [isLoading, setIsLoading] = useState(false); // 列表加载态
  const [isCreating, setIsCreating] = useState(false); // 创建按钮加载态
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 错误提示
  const [isHydrated, setIsHydrated] = useState(false); // 客户端渲染完成
  const [isRefreshing, setIsRefreshing] = useState(false); // 后台刷新状态
  const [showUpdateNotification, setShowUpdateNotification] = useState(false); // 显示更新通知

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
  // const hasBearerToken = Boolean(apiConfig.bearerToken?.trim()); // TODO: 未来可能需要，暂时未使用

  const fetchProjects = useCallback(async (forceRefresh = false) => {
    if (!hasCookie) {
      setProjects([]); // 清空项目列表
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
      setCursor(data?.cursor ?? null); // 保存下一页游标

      // 缓存新数据
      setCachedProjects(normalizedProjects, data?.cursor);

      // 如果是后台刷新，显示更新通知
      if (!forceRefresh && cachedData && cachedData.projects.length > 0) {
        setShowUpdateNotification(true);
        setTimeout(() => setShowUpdateNotification(false), 3000); // 3秒后自动隐藏
      }
    } catch (error) {
      // 如果是后台刷新失败，不显示错误，保持缓存数据
      if (!forceRefresh && cachedData && cachedData.projects.length > 0) {
        console.error('Background refresh failed:', error);
      } else {
        setProjects([]); // 出错时清空列表
        setCursor(null); // 清空游标
        setErrorMessage(
          error instanceof Error ? error.message : '无法获取项目列表'
        ); // 显示错误提示
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

  const handleOpenProject = (projectId: string) => {
    console.log('打开项目:', projectId); // TODO: 路由跳转到画布
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

  const handleCreateProject = useCallback(async () => {
    if (!ensureApiConfig()) {
      return; // 没有配置则直接退出
    }

    setIsCreating(true); // 进入创建状态，禁用按钮
    setErrorMessage(null); // 清理旧的错误

    try {
      const payload: Record<string, string> = {
        cookie: apiConfig.cookie,
        projectTitle: formatProjectTitle(),
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
        throw new Error(data?.error || data?.message || '新建项目失败'); // 统一错误
      }

      await fetchProjects(true); // 创建成功后强制刷新列表
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '新建项目失败'
      ); // 显示错误
    } finally {
      setIsCreating(false); // 恢复按钮状态
    }
  }, [apiConfig.cookie, apiConfig.proxy, ensureApiConfig, fetchProjects]);

  const handleDeleteProject = useCallback(
    async (projectId: string, projectTitle: string) => {
      if (!ensureApiConfig()) {
        return; // 没有配置则退出
      }

      const confirmed = window.confirm(`确认删除项目「${projectTitle}」吗？`); // 二次确认
      if (!confirmed) {
        return; // 用户取消
      }

      // 乐观更新：立即从列表中移除
      const updatedProjects = projects.filter((project) => project.id !== projectId);

      // 立即更新 UI
      setProjects(updatedProjects);

      // 立即更新缓存
      setCachedProjects(updatedProjects);

      // 后台发送删除请求
      try {
        const payload: Record<string, string> = {
          cookie: apiConfig.cookie,
          projectId,
        }; // 删除请求体

        if (apiConfig.proxy) {
          payload.proxy = apiConfig.proxy; // 透传代理
        }

        const response = await fetch('/api/flow/projects/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }); // 调用删除接口

        const data = await response.json(); // 解析结果

        // 即使删除失败，也不恢复 UI（已删除的项目不应该再显示）
        if (!response.ok || !data?.success) {
          console.error('删除请求失败:', data?.error || data?.message || '删除项目失败');
          // 可以选择显示一个非阻塞的错误提示
          // 但不恢复 UI，因为用户已经确认删除
        }
      } catch (error) {
        console.error('删除请求出错:', error);
        // 同样不恢复 UI，但记录错误
      }
    },
    [projects, apiConfig.cookie, apiConfig.proxy, ensureApiConfig]
  );

  const skeletons = useMemo(() => Array.from({ length: 6 }), []); // 骨架屏占位
  const shouldShowEmptyState =
    !isLoading && projects.length === 0 && hasCookie; // 是否展示空状态
  const shouldShowConfigAlert = isHydrated && !cookieConfigured; // 是否展示配置提示

  return (
    <div className="w-screen h-screen overflow-auto relative">
      <SettingsPanel />
      {/* 简单的浅灰色背景 */}
      <div className="min-h-screen bg-gray-100">
        {/* 顶部操作条 */}
        <div className="w-full bg-gray-100">
          <div className="w-full px-8 pt-10 pb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-gray-500">
                Projects
              </p>
              <h2 className="text-2xl font-semibold text-gray-900">
                我的 Flow 项目
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.href = '/canvas'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105"
              >
                <Palette className="h-4 w-4" />
                进入画布
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                API 设置
              </button>
              <button
                onClick={() => fetchProjects(true)} // 强制刷新
                disabled={!hasCookie || isLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw
                  className={`h-4 w-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`}
                />
                {isLoading ? '刷新中...' : isRefreshing ? '更新中...' : '刷新列表'}
              </button>
            </div>
          </div>

          {/* 配置提示 */}
          {shouldShowConfigAlert && (
            <div className="w-full px-8 pb-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-amber-900 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">尚未配置 Flow API</p>
                    <p className="text-sm text-amber-800/90">
                      请先填写 Cookie、Bearer Token 以及代理（可选），然后保存配置。
                    </p>
                    {!apiConfig.bearerToken && (
                      <p className="text-xs text-amber-700 mt-1">
                        注意：Bearer Token 是加载项目缩略图所必需的
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    打开设置
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* 巨大的 Banner - 视频背景 */}
        <div className="px-8">
          <div className="relative w-full h-[420px] overflow-hidden rounded-[24px]">
            {/* 背景视频 - 循环播放 */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover rounded-[24px]"
            >
              <source
                src="https://www.gstatic.com/aitestkitchen/website/flow/banners/flow31_bg_05905f5a.mp4"
                type="video/mp4"
              />
            </video>

            {/* 渐变遮罩层 - 让文字更清晰 */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent rounded-[24px]" />

            {/* Banner 内容 */}
            <div className="relative h-full flex flex-col items-start justify-center px-8">
              <div className="max-w-3xl">
                {/* 标题 */}
                <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">
                  AI Movie Maker
                </h1>

                {/* 副标题 */}
                <p className="text-xl md:text-2xl text-white/95 leading-relaxed font-medium drop-shadow-lg">
                  使用 AI 技术创作惊艳的视频内容，让创意无限延伸
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 项目列表区域 */}
        <div className="w-full px-8 py-12">
          {/* 项目网格 */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading && projects.length === 0
              ? skeletons.map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[4/3] rounded-2xl bg-white shadow-sm"
                  >
                    <div className="h-[70%] animate-pulse rounded-2xl rounded-b-none bg-gray-200" />
                    <div className="h-[30%] space-y-2 rounded-2xl rounded-t-none bg-white px-4 py-4">
                      <div className="h-4 w-3/4 rounded bg-gray-200" />
                      <div className="h-3 w-1/2 rounded bg-gray-100" />
                    </div>
                  </div>
                ))
              : projects.map((project) => (
                  <div
                    key={project.id}
                    className="group aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    {/* 项目缩略图 */}
                    <div className="relative h-[70%] w-full overflow-hidden bg-gray-200">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <FolderOpen
                            className="h-12 w-12 text-gray-400"
                            strokeWidth={1.5}
                          />
                        </div>
                      )}

                      <button
                        className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full bg-black/50 p-2 text-white opacity-0 backdrop-blur-md transition-all duration-200 hover:bg-black/70 group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteProject(project.id, project.title);
                        }}
                      >
                        <Trash2 className="h-4 w-4 hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    {/* 项目信息 */}
                    <div className="flex h-[30%] flex-col justify-center gap-1 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {project.title}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDisplayTime(project.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
          </div>

          {/* 空状态提示 */}
          {shouldShowEmptyState && (
            <div className="mt-12 text-center">
              <div className="inline-block rounded-2xl bg-white px-8 py-6 shadow">
                <FolderOpen
                  className="mx-auto mb-3 h-12 w-12 text-gray-400"
                  strokeWidth={1.5}
                />
                <p className="mb-1 text-base font-medium text-gray-700">
                  还没有项目
                </p>
                <p className="text-sm text-gray-500">
                  点击下方按钮创建你的第一个 Flow 项目
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部间距 */}
        <div className="h-32" />
      </div>

      {/* 更新通知 */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300 ease-out animate-pulse">
          <div className="rounded-xl bg-green-500 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm font-medium">项目列表已更新</span>
            </div>
          </div>
        </div>
      )}

      {/* 底部中间悬浮的新建项目按钮 - 大卡片式毛玻璃 */}
      <div className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2">
        <button
          onClick={handleCreateProject}
          disabled={isCreating || !hasCookie}
          className="group flex h-[132px] w-[250px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/50 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-white/60 hover:shadow-3xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* 加号图标 */}
          <Plus
            className={`h-8 w-8 text-gray-600 ${isCreating ? 'hidden' : ''}`}
            strokeWidth={2}
          />
          {isCreating && (
            <RefreshCw className="h-6 w-6 text-gray-600 animate-spin" />
          )}

          {/* 文字 */}
          <span className="text-base font-medium text-gray-700">
            {isCreating ? '创建中...' : '新建项目'}
          </span>
          {!hasCookie && (
            <span className="text-xs text-gray-500">
              请先配置 Cookie 才能创建项目
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
