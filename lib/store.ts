import { create } from 'zustand';
import {
  CanvasElement,
  ImageElement,
  TextElement,
  PromptHistory,
  BatchGenerationContext,
  UIState
} from './types';
import {
  MaterialItem,
  MaterialsState,
  MaterialType
} from './types-materials';

// API 配置接口
interface ApiConfig {
  bearerToken: string;
  cookie: string;
  proxy: string; // 代理地址，例如 http://127.0.0.1:10808
  projectId: string;
  workflowId: string;
  sessionId: string;
  generationCount: number; // 每次生成的图片数量 (1-4)
}

// 状态接口定义
interface CanvasStore {
  // 画布元素
  elements: CanvasElement[];
  // 选中的元素 ID 列表
  selection: string[];
  // 提示词历史
  promptsHistory: PromptHistory[];
  // 批量生成上下文
  batchContext: BatchGenerationContext | null;
  // UI 状态
  uiState: UIState;
  // 项目标题
  projectTitle: string;
  // API 配置
  apiConfig: ApiConfig;
  // 设置面板打开状态
  isSettingsOpen: boolean;
  
  // 操作方法
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  addPromptHistory: (history: PromptHistory) => void;
  setBatchContext: (context: BatchGenerationContext | null) => void;
  setUIState: (updates: Partial<UIState>) => void;
  setProjectTitle: (title: string) => void;
  setApiConfig: (config: Partial<ApiConfig>) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  getElementByIds: (ids: string[]) => CanvasElement[];
  regenerateFlowContext: () => { workflowId: string; sessionId: string };
  triggerVideoGeneration?: (videoId: string) => void;
}

const createFlowContext = () => {
  const workflowId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `wf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const sessionId = `;${Date.now()}`;
  return { workflowId, sessionId };
};

// 从 localStorage 加载配置
const loadApiConfig = (): ApiConfig => {
  if (typeof window === 'undefined') {
    const context = createFlowContext();
    return {
      bearerToken: '',
      cookie: '',
      proxy: '',
      projectId: '',
      workflowId: context.workflowId,
      sessionId: context.sessionId,
      generationCount: 1, // 默认生成 1 张图片
    };
  }
  
  try {
    const saved = localStorage.getItem('aimovimaker_api_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      const context = createFlowContext();
      return {
        bearerToken: parsed?.bearerToken || '',
        cookie: parsed?.cookie || '',
        proxy: parsed?.proxy || '',
        projectId: parsed?.projectId || '',
        workflowId: parsed?.workflowId || context.workflowId,
        sessionId: parsed?.sessionId || context.sessionId,
        generationCount: parsed?.generationCount ?? 1, // 默认生成 1 张图片
      };
    }
  } catch (error) {
    console.error('加载 API 配置失败:', error);
  }
  
  const context = createFlowContext();
  return {
    bearerToken: '',
    cookie: '',
    proxy: '',
    projectId: '',
    workflowId: context.workflowId,
    sessionId: context.sessionId,
    generationCount: 1, // 默认生成 1 张图片
  };
};

// 创建 store
export const useCanvasStore = create<CanvasStore>((set, get) => {
  const initialConfig = loadApiConfig();

  const saveConfig = (config: ApiConfig) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('aimovimaker_api_config', JSON.stringify(config));
      } catch (error) {
        console.error('保存 API 配置失败:', error);
      }
    }
  };

  return {
  elements: [],
  selection: [],
  promptsHistory: [],
  batchContext: null,
  uiState: {
    zoom: 1,
    showGrid: true,
    activeTool: 'select',
  },
  projectTitle: 'Untitled',
  apiConfig: initialConfig,
  isSettingsOpen: false,
  triggerVideoGeneration: undefined,
  
  addElement: (element) => 
    set((state) => ({ 
      elements: [...state.elements, element] 
    })),
  
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),
  
  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selection: state.selection.filter((selId) => selId !== id),
    })),
  
  deleteSelectedElements: () =>
    set((state) => ({
      elements: state.elements.filter(
        (el) => !state.selection.includes(el.id)
      ),
      selection: [],
    })),
  
  setSelection: (ids) => set({ selection: ids }),
  
  clearSelection: () => set({ selection: [] }),
  
  addPromptHistory: (history) =>
    set((state) => ({
      promptsHistory: [...state.promptsHistory, history],
    })),
  
  setBatchContext: (context) => set({ batchContext: context }),
  
  setUIState: (updates) =>
    set((state) => ({
      uiState: { ...state.uiState, ...updates },
    })),
  
  setProjectTitle: (title) => set({ projectTitle: title }),
  
  setApiConfig: (config: Partial<ApiConfig>) => {
    set((state) => {
      const merged: ApiConfig = {
        ...state.apiConfig,
        ...config,
      };
      saveConfig(merged);
      return { apiConfig: merged };
    });
  },

  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  
  getElementByIds: (ids) => {
    const { elements } = get();
    return elements.filter((el) => ids.includes(el.id));
  },
  regenerateFlowContext: () => {
    const context = createFlowContext();
    set((state) => {
      const nextConfig: ApiConfig = {
        ...state.apiConfig,
        workflowId: context.workflowId,
        sessionId: context.sessionId,
      };
      saveConfig(nextConfig);
      return { apiConfig: nextConfig };
    });
    return context;
  },
  };
});

