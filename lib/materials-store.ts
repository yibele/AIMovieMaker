import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MaterialItem, MaterialType, MaterialsState, MaterialsActions } from './types-materials';
import { CanvasElement, ImageElement, VideoElement } from './types';
import { v4 as uuidv4 } from 'uuid';
import { loadImageSize, calculateDisplaySize } from './image-utils';

// 素材库 store
interface MaterialsStore extends MaterialsState, MaterialsActions {}

export const useMaterialsStore = create<MaterialsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      materials: [],
      selectedMaterials: [],
      isLoading: false,
      loadingMessage: undefined,
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

      // 按项目替换素材
      setMaterialsForProject: (projectId, newMaterials) => {
        set((state) => {
          const preserved = state.materials.filter(
            (material) => !material.projectId || material.projectId !== projectId
          );

          const dedupMap = new Map<string, MaterialItem>();
          newMaterials.forEach((material) => {
            const key = material.mediaGenerationId || material.id;
            dedupMap.set(key, material);
          });

          return {
            materials: [...preserved, ...Array.from(dedupMap.values())],
          };
        });
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

      setLoading: (loading) => {
        set((state) => ({
          isLoading: loading,
          loadingMessage: loading ? state.loadingMessage : undefined,
        }));
      },

      setLoadingMessage: (message) => {
        set({ loadingMessage: message });
      },

      // 添加素材到画布
      addToCanvas: async (materialId, position = { x: 100, y: 100 }) => {
        const material = get().materials.find((m) => m.id === materialId);
        if (!material) return;

        const canvasStore = require('./store').useCanvasStore.getState();

        if (material.type === 'image') {
          let size = { width: 320, height: 320 }; // 默认 1:1 比例

          // 如果有原始尺寸信息，使用它
          if (material.metadata?.width && material.metadata?.height) {
            size = calculateDisplaySize(
              material.metadata.width,
              material.metadata.height
            );
          } else {
            // 否则加载图片获取实际尺寸
            try {
              const imageSize = await loadImageSize(material.src);
              size = calculateDisplaySize(imageSize.width, imageSize.height);
            } catch (error) {
              console.error('Failed to load image size:', error);
              // 使用默认尺寸
            }
          }

          const imageElement: ImageElement = {
            id: uuidv4(),
            type: 'image',
            position,
            size,
            src: material.src,
            alt: material.name,
            caption: material.metadata?.caption,
            mediaId: material.mediaId, // Flow 图生图时用作 imageInputs.name // 行级注释说明字段用途
            mediaGenerationId: material.mediaGenerationId,
            uploadState: 'synced',
            generatedFrom: {
              type: 'input',
              prompt: material.metadata?.prompt,
            },
          };
          canvasStore.addElement(imageElement);
        } else if (material.type === 'video') {
          // 计算视频尺寸，保持比例
          const calculateVideoSize = () => {
            const aspectRatio = material.metadata?.aspectRatio;

            // 调试信息
            console.log('视频素材信息:', {
              name: material.name,
              metadata: material.metadata,
              aspectRatio: aspectRatio,
            });

            // 根据宽高比设置合适的尺寸
            switch (aspectRatio) {
              case '16:9':
                console.log('使用 16:9 比例');
                return { width: 480, height: 270 }; // 横屏视频 (16:9)
              case '9:16':
                console.log('使用 9:16 比例');
                return { width: 270, height: 480 }; // 竖屏视频 (9:16)
              case '1:1':
                console.log('使用 1:1 比例');
                return { width: 320, height: 320 }; // 方形视频
              case '4:3':
                console.log('使用 4:3 比例');
                return { width: 400, height: 300 }; // 传统比例
              default:
                console.log('使用默认 16:9 比例，因为 aspectRatio 为:', aspectRatio);
                // 如果没有宽高比信息，使用默认的 16:9
                return { width: 480, height: 270 };
            }
          };

          const videoElement: VideoElement = {
            id: uuidv4(),
            type: 'video',
            position,
            size: calculateVideoSize(),
            src: material.src,
            thumbnail: material.thumbnail || material.src,
            duration: material.metadata?.duration || 5,
            mediaGenerationId: material.mediaGenerationId,
            status: 'ready',
            promptText: material.metadata?.prompt,
            readyForGeneration: false, // 从素材库添加的视频无需生成
          };
          console.log('创建视频节点，尺寸:', calculateVideoSize());
          canvasStore.addElement(videoElement);
        }
      },
    }),
    {
      name: 'materials-storage',
      storage: createJSONStorage(() => localStorage),
      // 行级注释：不持久化 materials，改为手动加载
      partialize: (state) => ({
        activeTab: state.activeTab,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        searchQuery: state.searchQuery,
      }),
    }
  )
);

