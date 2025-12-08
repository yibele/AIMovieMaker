/**
 * 画布数据持久化 Hook
 * 自动保存画布元素到 IndexedDB，并在页面加载时恢复
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Edge } from '@xyflow/react';
import { CanvasElement, VideoElement } from '@/lib/types';
import {
  saveCanvasSnapshot,
  loadCanvasSnapshot,
  CanvasSnapshot,
} from '@/lib/canvas-db';
import { useCanvasStore } from '@/lib/store';
import { refreshVideoUrls } from '@/lib/services/video-url-refresh.service';

// 行级注释：Hook 配置选项
interface UseCanvasPersistenceOptions {
  projectId: string; // 当前项目 ID
  projectTitle: string; // 项目标题
  elements: CanvasElement[]; // 画布元素
  edges: Edge[]; // 连线
  // 行级注释：恢复画布的回调函数
  onRestore: (elements: CanvasElement[], edges: Edge[]) => void;
  // 行级注释：自动保存的防抖延迟（毫秒）
  debounceMs?: number;
  // 行级注释：是否启用自动保存
  autoSave?: boolean;
}

// 行级注释：Hook 返回值
interface UseCanvasPersistenceReturn {
  isLoading: boolean; // 是否正在加载
  isSaving: boolean; // 是否正在保存
  lastSaved: string | null; // 最后保存时间
  hasUnsavedChanges: boolean; // 是否有未保存的更改
  saveNow: () => Promise<void>; // 手动触发保存
  loadSnapshot: () => Promise<CanvasSnapshot | null>; // 手动加载快照
}

/**
 * 画布数据持久化 Hook
 * 
 * @param options 配置选项
 * @returns 持久化状态和方法
 */
export function useCanvasPersistence(
  options: UseCanvasPersistenceOptions
): UseCanvasPersistenceReturn {
  const {
    projectId,
    projectTitle,
    elements,
    edges,
    onRestore,
    debounceMs = 2000, // 行级注释：默认 2 秒防抖
    autoSave = true,
  } = options;

  // 行级注释：状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 行级注释：用于追踪是否已完成初始加载
  const hasLoadedRef = useRef(false);
  // 行级注释：防抖定时器
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 行级注释：保存上一次的 projectId，用于检测项目切换
  const lastProjectIdRef = useRef<string | null>(null);

  // 行级注释：手动保存函数
  const saveNow = useCallback(async () => {
    if (!projectId) return;

    setIsSaving(true);
    try {
      await saveCanvasSnapshot(projectId, elements, edges, projectTitle);
      setLastSaved(new Date().toISOString());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('手动保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, elements, edges, projectTitle]);

  // 行级注释：加载快照函数
  const loadSnapshot = useCallback(async (): Promise<CanvasSnapshot | null> => {
    if (!projectId) return null;

    setIsLoading(true);
    try {
      const snapshot = await loadCanvasSnapshot(projectId);
      if (snapshot) {
        setLastSaved(snapshot.updatedAt);
      }
      return snapshot;
    } catch (error) {
      console.error('加载快照失败:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // 行级注释：项目切换时自动加载画布数据
  useEffect(() => {
    // 行级注释：如果 projectId 为空或未变化，跳过
    if (!projectId || projectId === lastProjectIdRef.current) {
      return;
    }

    // 行级注释：更新上一次的 projectId
    lastProjectIdRef.current = projectId;

    // 行级注释：如果是首次加载当前项目，尝试恢复数据
    const loadAndRestore = async () => {
      setIsLoading(true);
      try {
        const snapshot = await loadCanvasSnapshot(projectId);
        if (snapshot && snapshot.elements.length > 0) {
          console.log(`🔄 恢复画布: ${projectId}, ${snapshot.elements.length} 个元素`);
          onRestore(snapshot.elements, snapshot.edges);
          setLastSaved(snapshot.updatedAt);
          hasLoadedRef.current = true;

          // 行级注释：【关键】画布恢复后，异步刷新视频 URL（不阻塞画布加载）
          const videoNodes = snapshot.elements.filter(
            (el): el is VideoElement => el.type === 'video' && (el as VideoElement).status === 'ready'
          );

          if (videoNodes.length > 0) {
            // 行级注释：异步执行，不阻塞
            refreshVideoUrlsInBackground(videoNodes);
          }
        } else {
          console.log(`ℹ️ 无保存的画布数据: ${projectId}，清空画布`);
          // 行级注释：关键修复！新项目没有数据时，必须清空画布，避免显示其他项目的内容
          onRestore([], []);
          hasLoadedRef.current = true;
        }
      } catch (error) {
        console.error('恢复画布失败:', error);
        hasLoadedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    loadAndRestore();
  }, [projectId, onRestore]);

  // 行级注释：后台刷新视频 URL（不阻塞画布加载）
  const refreshVideoUrlsInBackground = useCallback(async (videoNodes: VideoElement[]) => {
    const { apiConfig, updateElement } = useCanvasStore.getState();
    const { cookie, projectId: flowProjectId } = apiConfig;

    // 行级注释：检查是否配置了 cookie 和 projectId
    if (!cookie?.trim() || !flowProjectId?.trim()) {
      console.log('ℹ️ 未配置 Cookie 或 Project ID，跳过视频 URL 刷新');
      return;
    }

    console.log(`🔄 后台刷新 ${videoNodes.length} 个视频的 URL...`);

    try {
      await refreshVideoUrls(
        videoNodes,
        flowProjectId,
        cookie,
        (videoId, updates) => {
          // 行级注释：只更新 src 和 thumbnail，其他字段不动
          updateElement(videoId, updates as Partial<VideoElement>);
        },
        4 // 行级注释：4 个并发
      );
    } catch (error) {
      console.error('❌ 视频 URL 刷新失败:', error);
      // 行级注释：刷新失败不影响画布使用，静默处理
    }
  }, []);

  // 行级注释：自动保存逻辑（带防抖）
  useEffect(() => {
    // 行级注释：未启用自动保存或 projectId 为空，跳过
    if (!autoSave || !projectId) return;

    // 行级注释：首次加载尚未完成，跳过（避免把空数据覆盖掉已保存的数据）
    if (!hasLoadedRef.current) return;

    // 行级注释：标记有未保存的更改
    setHasUnsavedChanges(true);

    // 行级注释：清除之前的防抖定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 行级注释：设置新的防抖定时器
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveCanvasSnapshot(projectId, elements, edges, projectTitle);
        setLastSaved(new Date().toISOString());
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('自动保存失败:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    // 行级注释：清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [autoSave, projectId, elements, edges, projectTitle, debounceMs]);

  // 行级注释：页面卸载前保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 行级注释：同步保存（IndexedDB 在 beforeunload 时可能无法完成异步操作）
      // 行级注释：使用 navigator.sendBeacon 或 localStorage 作为备份
      if (projectId && hasUnsavedChanges) {
        // 行级注释：尝试同步保存到 localStorage 作为紧急备份
        try {
          localStorage.setItem(
            `canvas_emergency_backup_${projectId}`,
            JSON.stringify({ elements, edges, projectTitle, savedAt: new Date().toISOString() })
          );
        } catch {
          // 行级注释：忽略保存失败（可能是配额超限）
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [projectId, elements, edges, projectTitle, hasUnsavedChanges]);

  return {
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    saveNow,
    loadSnapshot,
  };
}

