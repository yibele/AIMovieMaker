import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MaterialItem, MaterialType, MaterialsState, MaterialsActions } from './types-materials';
import { CanvasElement, ImageElement, VideoElement } from './types';
import { v4 as uuidv4 } from 'uuid';

// 素材库 store
interface MaterialsStore extends MaterialsState, MaterialsActions {}

export const useMaterialsStore = create<MaterialsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      materials: [],
      selectedMaterials: [],
      isLoading: false,
      searchQuery: '',
      activeTab: 'image',
      sortBy: 'createdAt',
      sortOrder: 'desc',

      // 添加素材
      addMaterial: (materialData) => {
        const material: MaterialItem = {
          ...materialData,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          materials: [...state.materials, material],
        }));
      },

      // 删除素材
      removeMaterial: (id) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
          selectedMaterials: state.selectedMaterials.filter((sid) => sid !== id),
        }));
      },

      // 更新素材
      updateMaterial: (id, updates) => {
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      // 选择单个素材
      selectMaterial: (id) => {
        set((state) => ({
          selectedMaterials: [id],
        }));
      },

      // 选择多个素材
      selectMaterials: (ids) => {
        set({ selectedMaterials: ids });
      },

      // 清除选择
      clearSelection: () => {
        set({ selectedMaterials: [] });
      },

      // 设置搜索查询
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // 设置激活标签
      setActiveTab: (type) => {
        set({ activeTab: type });
      },

      // 设置排序方式
      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      // 设置排序顺序
      setSortOrder: (order) => {
        set({ sortOrder: order });
      },

      // 从项目导入素材
      importFromProject: async (projectId: string) => {
        set({ isLoading: true });
        try {
          // TODO: 实现从项目 API 导入素材
          // const response = await fetch(`/api/flow/workflows/search?projectId=${projectId}`);
          // const data = await response.json();
          // data.workflows.forEach((workflow) => {
          //   // 转换为素材格式并添加
          // });
        } catch (error) {
          console.error('导入素材失败:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // 添加素材到画布
      addToCanvas: (materialId, position = { x: 100, y: 100 }) => {
        const material = get().materials.find((m) => m.id === materialId);
        if (!material) return;

        const canvasStore = require('./store').useCanvasStore.getState();

        if (material.type === 'image') {
          const imageElement: ImageElement = {
            id: uuidv4(),
            type: 'image',
            position,
            size: material.metadata?.width && material.metadata?.height
              ? { width: material.metadata.width, height: material.metadata.height }
              : { width: 300, height: 300 },
            src: material.src,
            alt: material.name,
            caption: material.metadata?.caption,
            mediaGenerationId: material.mediaGenerationId,
            uploadState: 'synced',
          };
          canvasStore.addElement(imageElement);
        } else if (material.type === 'video') {
          const videoElement: VideoElement = {
            id: uuidv4(),
            type: 'video',
            position,
            size: { width: 400, height: 300 },
            src: material.src,
            thumbnail: material.thumbnail || material.src,
            duration: material.metadata?.duration || 0,
            mediaGenerationId: material.mediaGenerationId,
            status: 'ready',
            promptText: material.metadata?.prompt,
          };
          canvasStore.addElement(videoElement);
        }
      },
    }),
    {
      name: 'materials-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化必要的字段
      partialize: (state) => ({
        materials: state.materials,
        activeTab: state.activeTab,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

// 获取过滤后的素材列表
export const useFilteredMaterials = () => {
  const materials = useMaterialsStore((state) => state.materials);
  const searchQuery = useMaterialsStore((state) => state.searchQuery);
  const activeTab = useMaterialsStore((state) => state.activeTab);
  const sortBy = useMaterialsStore((state) => state.sortBy);
  const sortOrder = useMaterialsStore((state) => state.sortOrder);

  return materials
    // 按类型过滤
    .filter((m) => m.type === activeTab)
    // 按搜索词过滤
    .filter((m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    // 排序
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
};