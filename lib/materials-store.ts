import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MaterialItem, MaterialType, MaterialsState, MaterialsActions } from './types-materials';
import { CanvasElement, ImageElement, VideoElement } from './types';
import { v4 as uuidv4 } from 'uuid';
import { loadImageSize, calculateDisplaySize } from './image-utils';
import { addMaterialToCloud, getCloudMaterials, deleteCloudMaterial } from './materials-service';
import { useCanvasStore } from './store'; // 引入 CanvasStore 获取 userId
import { getCachedUser } from './supabaseClient';

// 素材库 store
interface MaterialsStore extends MaterialsState, MaterialsActions { }

export const useMaterialsStore = create<MaterialsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      materials: [], // 我的精选 (Supabase)
      projectHistory: [], // 项目历史 (Google API)
      trash: [], // 废片库 (本地)
      selectedMaterials: [],
      isLoading: false,
      loadingMessage: undefined,
      searchQuery: '',
      activeTab: 'library_image', // 默认显示我的精选图片
      sortBy: 'createdAt',
      sortOrder: 'desc',
      currentUserId: null,

      // 设置精选素材 (从云端加载后调用)
      setMaterials: (newMaterials) => {
        set({ materials: newMaterials });
      },

      // 设置项目历史 (从 Google API 加载后调用)
      setProjectHistory: (newHistory) => {
        set({ projectHistory: newHistory });
      },

      // 从云端加载精选素材
      loadCloudMaterials: async (userId, projectId) => {
        if (!userId) {
          console.warn('userId is missing, cannot load cloud materials.');
          return;
        }
        set({ isLoading: true, loadingMessage: '正在加载我的精选...' });
        try {
          const cloudMaterials = await getCloudMaterials(userId, projectId);
          set({ materials: cloudMaterials, currentUserId: userId });
          set({ loadingMessage: '我的精选加载完成。' });
        } catch (error) {
          console.error('Failed to load cloud materials:', error);
          set({ loadingMessage: '加载我的精选失败。' });
        } finally {
          set({ isLoading: false });
          setTimeout(() => set({ loadingMessage: undefined }), 1500);
        }
      },

      // 从 Google API 加载项目历史 (实际在 lib/project-materials.ts 中实现)
      loadProjectHistory: async (projectId) => {
        // This action is mainly a placeholder. The actual loading logic resides in lib/project-materials.ts
        // which calls setProjectHistory.
        // Will be updated by loadMaterialsFromProject
      },


      // 添加素材到云端 (入库)
      addMaterial: async (materialData) => {
        // 1. 获取 userId
        let userId = useCanvasStore.getState().apiConfig.userId;

        // 行级注释：使用缓存的用户信息，减少 API 请求
        if (!userId) {
          const user = await getCachedUser();
          if (user) {
            userId = user.id;
            // 更新 store 以备后用
            useCanvasStore.getState().setApiConfig({ userId });
          }
        }

        if (!userId) {
          console.error('User not authenticated. Cannot add material to cloud.');
          return null;
        }

        // 2. 查重 (防止重复入库)
        const state = get();
        const existingMaterial = state.materials.find((m) => {
          // 优先匹配 mediaGenerationId
          if (materialData.mediaGenerationId && m.mediaGenerationId &&
            materialData.mediaGenerationId.trim() !== '' && m.mediaGenerationId.trim() !== '') {
            return materialData.mediaGenerationId === m.mediaGenerationId;
          }
          // 其次匹配 src
          return m.src === materialData.src;
        });

        if (existingMaterial) {
          // 可以选择抛出特定错误让 UI 提示 "已存在"，或者直接返回成功
          // 这里直接返回现有对象，视为成功
          return existingMaterial;
        }

        // 3. 调用 Supabase API
        try {
          const savedMaterial = await addMaterialToCloud(materialData, userId);
          if (savedMaterial) {
            // 3. 更新本地精选素材列表 (乐观更新，或重新加载)
            set((state) => ({
              materials: [savedMaterial, ...state.materials],
            }));
            return savedMaterial;
          }
          return null;
        } catch (error) {
          console.error('Failed to add material to cloud:', error);
          throw error;
        }
      },

      // 从精选库删除素材 (云端)
      removeMaterial: async (id) => {
        const state = get();
        const material = state.materials.find((m) => m.id === id);

        // 先移入废片库 (本地备份，以便恢复)
        if (material) {
          get().moveToTrash({
            ...material,
            projectId: useCanvasStore.getState().apiConfig.projectId, // 确保关联当前项目
          });
        }

        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
          selectedMaterials: state.selectedMaterials.filter((sid) => sid !== id),
        }));
        try {
          await deleteCloudMaterial(id);
        } catch (error) {
          console.error('Failed to delete cloud material:', error);
          // 可以在这里进行错误回滚
        }
      },

      // ===== 废片库操作 =====

      // 移入废片库 (从画布删除时调用)
      moveToTrash: (materialData) => {
        const state = get();

        // 查重：防止重复添加到废片库
        const existingInTrash = state.trash.find((t) => {
          // 优先匹配 mediaGenerationId
          if (materialData.mediaGenerationId && t.mediaGenerationId &&
            materialData.mediaGenerationId.trim() !== '' && t.mediaGenerationId.trim() !== '') {
            return materialData.mediaGenerationId === t.mediaGenerationId;
          }
          // 其次匹配 src
          return t.src === materialData.src;
        });

        if (existingInTrash) {
          return;
        }

        const material: MaterialItem = {
          ...materialData,
          id: materialData.id || uuidv4(), // 保持原 ID 或生成新 ID
          createdAt: new Date().toISOString(),
          tags: ['trash'],
        };
        set((state) => ({
          trash: [material, ...state.trash],
        }));
      },

      // 恢复废片 (废片 -> 正式素材)
      restoreFromTrash: async (id) => {
        const { trash, addMaterial } = get();
        const item = trash.find((t) => t.id === id);
        if (!item) return;

        // 1. 从废片库移除
        set((state) => ({
          trash: state.trash.filter((t) => t.id !== id),
        }));

        // 2. 调用 addMaterial 入库 (会自动存到 Supabase 并更新 materials 列表)
        await addMaterial({
          type: item.type,
          name: item.name,
          src: item.src,
          thumbnail: item.thumbnail,
          mediaId: item.mediaId,
          mediaGenerationId: item.mediaGenerationId,
          metadata: item.metadata,
          projectId: item.projectId,
        });
      },

      // 彻底删除
      deleteFromTrash: (id) => {
        set((state) => ({
          trash: state.trash.filter((t) => t.id !== id),
          selectedMaterials: state.selectedMaterials.filter((sid) => sid !== id),
        }));
      },

      // 清空废片库
      clearTrash: () => {
        set({ trash: [] });
      },

      // 更新素材 (针对精选库)
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

      // 从项目导入素材 (此处不再直接导入，而是通过 loadProjectHistory 填充 projectHistory)
      importFromProject: async (projectId: string) => {
        console.warn('importFromProject is deprecated. Use loadProjectHistory instead.');
        // This function will be removed or refactored.
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

      // 添加素材到画布 (支持从 Materials, Project History, 或 Trash 添加)
      addToCanvas: async (materialId, position = { x: 100, y: 100 }) => {
        const state = get();
        // 优先从精选库查找，然后是项目历史，最后是废片库
        const material = state.materials.find((m) => m.id === materialId) ||
          state.projectHistory.find((m) => m.id === materialId) ||
          state.trash.find((m) => m.id === materialId);

        if (!material) return;

        // 如果是从废片库添加，自动恢复它并入库
        if (state.trash.find((m) => m.id === materialId)) {
          await get().restoreFromTrash(materialId); // 自动入库到精选库
        }

        const canvasStore = useCanvasStore.getState();

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



            // 根据宽高比设置合适的尺寸
            switch (aspectRatio) {
              case '16:9':
                return { width: 480, height: 270 }; // 横屏视频 (16:9)
              case '9:16':
                return { width: 270, height: 480 }; // 竖屏视频 (9:16)
              case '1:1':
                return { width: 320, height: 320 }; // 方形视频
              case '4:3':
                return { width: 400, height: 300 }; // 传统比例
              default:
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
          canvasStore.addElement(videoElement);
        }
      },
    }),
    {
      name: 'materials-storage',
      // 行级注释：自定义 storage，处理 QuotaExceededError
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name),
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
              console.warn('⚠️ localStorage 已满，清理废片库...');
              // 行级注释：存储满时清空废片库
              try {
                const data = JSON.parse(value);
                if (data.state?.trash) {
                  data.state.trash = []; // 清空废片
                }
                localStorage.setItem(name, JSON.stringify(data));
                console.log('✅ 废片库已清理');
              } catch {
                // 如果还是失败，清空整个存储
                localStorage.removeItem(name);
                console.log('✅ 本地存储已重置');
              }
            }
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
      // 行级注释：持久化 trash 和 UI 状态，不持久化 materials (云端同步)
      partialize: (state) => ({
        trash: state.trash.slice(0, 50), // 行级注释：限制废片库最多 50 条
        materials: state.materials, // 缓存精选素材
        currentUserId: state.currentUserId, // 缓存所属用户
        activeTab: state.activeTab,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        searchQuery: state.searchQuery,
      }),
    }
  )
);
