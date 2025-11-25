// 素材库相关类型定义

export type MaterialType = 'image' | 'video';

// 素材项
export interface MaterialItem {
  id: string; // 唯一标识
  type: MaterialType; // 素材类型
  name: string; // 素材名称
  thumbnail?: string; // 缩略图 URL
  src: string; // 原始文件 URL
  mediaId?: string; // Flow 返回的 mediaId，图生图时用作 imageInputs.name // 行级注释说明字段用途
  mediaGenerationId: string; // Flow 返回的 mediaGenerationId
  metadata?: {
    // 图片元数据
    width?: number;
    height?: number;
    caption?: string;
    // 视频元数据
    duration?: number;
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
    prompt?: string;
  };
  createdAt: string; // 创建时间
  tags?: string[]; // 标签
  projectId?: string; // 所属项目 ID（如果从项目添加）
}

// 素材库状态
export interface MaterialsState {
  materials: MaterialItem[]; // 我的精选 (Library) - 云端同步
  projectHistory: MaterialItem[]; // 项目历史 (Google API) - 临时加载
  trash: MaterialItem[];     // 废片库 (Trash Bin) - 本地存储
  selectedMaterials: string[]; // 选中的素材 ID
  isLoading: boolean;
  loadingMessage?: string;
  searchQuery: string;
  activeTab: 'library_image' | 'library_video' | 'project_history' | 'trash'; // 当前激活的标签页
  sortBy: 'createdAt' | 'name' | 'type'; // 排序方式
  sortOrder: 'asc' | 'desc'; // 排序顺序
}

// 素材库操作
export interface MaterialsActions {
  // 基础操作
  addMaterial: (material: Omit<MaterialItem, 'id' | 'createdAt' | 'tags'>) => Promise<MaterialItem | null>; // 返回保存后的 material
  setMaterials: (materials: MaterialItem[]) => void; // 设置精选素材
  setProjectHistory: (materials: MaterialItem[]) => void; // 设置项目历史
  removeMaterial: (id: string) => Promise<void>; // 删除精选素材 (云端)
  updateMaterial: (id: string, updates: Partial<MaterialItem>) => void;

  // 云端操作
  loadCloudMaterials: (userId: string, projectId?: string) => Promise<void>;
  loadProjectHistory: (projectId: string) => Promise<void>;

  // 废片库操作
  moveToTrash: (material: Omit<MaterialItem, 'id' | 'createdAt'>) => void; // 画布删除 -> 废片库
  restoreFromTrash: (id: string) => void; // 废片 -> 素材库 (恢复/入库)
  deleteFromTrash: (id: string) => void; // 彻底删除
  clearTrash: () => void; // 清空废片库

  // 选择操作
  selectMaterial: (id: string) => void;
  selectMaterials: (ids: string[]) => void;
  clearSelection: () => void;

  // 搜索和筛选
  setSearchQuery: (query: string) => void;
  setActiveTab: (type: MaterialsState['activeTab']) => void;
  setSortBy: (sortBy: MaterialsState['sortBy']) => void;
  setSortOrder: (order: MaterialsState['sortOrder']) => void;

  // 状态控制
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message?: string) => void;

  // 从项目导入素材
  importFromProject: (projectId: string) => Promise<void>;

  // 添加到画布
  addToCanvas: (materialId: string, position?: { x: number; y: number }) => Promise<void>;
}