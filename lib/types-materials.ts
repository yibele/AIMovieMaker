// 素材库相关类型定义

export type MaterialType = 'image' | 'video';

// 素材项
export interface MaterialItem {
  id: string; // 唯一标识
  type: MaterialType; // 素材类型
  name: string; // 素材名称
  thumbnail?: string; // 缩略图 URL
  src: string; // 原始文件 URL
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
  materials: MaterialItem[];
  selectedMaterials: string[]; // 选中的素材 ID
  isLoading: boolean;
  searchQuery: string;
  activeTab: MaterialType; // 当前激活的标签页
  sortBy: 'createdAt' | 'name' | 'type'; // 排序方式
  sortOrder: 'asc' | 'desc'; // 排序顺序
}

// 素材库操作
export interface MaterialsActions {
  // 基础操作
  addMaterial: (material: Omit<MaterialItem, 'id' | 'createdAt'>) => void;
  removeMaterial: (id: string) => void;
  updateMaterial: (id: string, updates: Partial<MaterialItem>) => void;

  // 选择操作
  selectMaterial: (id: string) => void;
  selectMaterials: (ids: string[]) => void;
  clearSelection: () => void;

  // 搜索和筛选
  setSearchQuery: (query: string) => void;
  setActiveTab: (type: MaterialType) => void;
  setSortBy: (sortBy: MaterialsState['sortBy']) => void;
  setSortOrder: (order: MaterialsState['sortOrder']) => void;

  // 从项目导入素材
  importFromProject: (projectId: string) => Promise<void>;

  // 添加到画布
  addToCanvas: (materialId: string, position?: { x: number; y: number }) => void;
}