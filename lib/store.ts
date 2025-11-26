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
  apiKey: string; // Flow API Key
  bearerToken: string;
  cookie: string;
  dashScopeApiKey: string; // 阿里云 DashScope API Key
  proxy: string; // 代理地址，例如 http://127.0.0.1:10808
  projectId: string;
  workflowId: string;
  sessionId: string;
  generationCount: number; // 每次生成的图片数量 (1-4)
  accountTier: 'pro' | 'ultra'; // 账号类型：Pro 或 Ultra
  imageModel: 'nanobanana' | 'nanobananapro'; // 图片生成模型：Banana (Preview) 或 Banana Pro
  videoModel?: 'quality' | 'fast'; // 视频生成模型：Quality 或 Fast
  isManaged?: boolean; // 是否为托管模式
  userId?: string; // 用户ID
  credentialMode?: 'cloud' | 'local'; // 凭证模式：cloud=云端同步（邀请码用户），local=本地开发者模式
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
  // 助手面板打开状态
  isAssistantOpen: boolean;
  // 项目前置提示词映射（按 projectId 存储）
  projectPrefixPrompts: Record<string, string>;
  // 当前项目的前置提示词
  currentPrefixPrompt: string;
  // 前置提示词是否启用（默认启用）
  prefixPromptEnabled: boolean;
  // 行级注释：视频积分状态
  credits: number | null;

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
  setPrefixPrompt: (prompt: string) => void;
  loadProjectPrefixPrompt: (projectId: string) => void;
  setPrefixPromptEnabled: (enabled: boolean) => void; // 行级注释：设置前置提示词启用状态
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsAssistantOpen: (isOpen: boolean) => void;
  getElementByIds: (ids: string[]) => CanvasElement[];
  regenerateFlowContext: () => { workflowId: string; sessionId: string };
  triggerVideoGeneration?: (videoId: string) => void;
  setCredits: (credits: number) => void; // 行级注释：更新积分
  // 行级注释：从输入框生成图片的回调（由 Canvas 注入）
  onGenerateFromInput?: (
    prompt: string,
    aspectRatio: '16:9' | '9:16' | '1:1',
    count: number,
    panelRef: HTMLDivElement | null
  ) => void;
  // 图片编辑器状态
  annotatorTarget: ImageElement | null;
  isLoadingAnnotatorImage: boolean;
  setAnnotatorTarget: (target: ImageElement | null) => void;
  setIsLoadingAnnotatorImage: (loading: boolean) => void;
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
      apiKey: '',
      bearerToken: '',
      cookie: '',
      dashScopeApiKey: '',
      proxy: '',
      projectId: '',
      workflowId: context.workflowId,
      sessionId: context.sessionId,
      generationCount: 1, // 默认生成 1 张图片
      accountTier: 'pro', // 行级注释：默认 Pro 账号
      imageModel: 'nanobanana', // 行级注释：默认 Banana (Preview)
      videoModel: 'quality',
      credentialMode: 'cloud', // 行级注释：默认云端模式
    };
  }

  try {
    const saved = localStorage.getItem('aimovimaker_api_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      const context = createFlowContext();
      return {
        apiKey: parsed?.apiKey || '',
        bearerToken: parsed?.bearerToken || '',
        cookie: parsed?.cookie || '',
        dashScopeApiKey: parsed?.dashScopeApiKey || '',
        proxy: parsed?.proxy || '',
        projectId: parsed?.projectId || '',
        workflowId: parsed?.workflowId || context.workflowId,
        sessionId: parsed?.sessionId || context.sessionId,
        generationCount: parsed?.generationCount ?? 1, // 默认生成 1 张图片
        accountTier: parsed?.accountTier || 'pro', // 行级注释：兼容旧配置，默认 pro
        imageModel: parsed?.imageModel || 'nanobanana', // 行级注释：兼容旧配置，默认 Banana (Preview)
        videoModel: parsed?.videoModel || 'quality', // 行级注释：兼容旧配置，默认 quality
        isManaged: parsed?.isManaged || false,
        credentialMode: parsed?.credentialMode || 'cloud', // 行级注释：兼容旧配置，默认云端模式
      };
    }
  } catch (error) {
    console.error('加载 API 配置失败:', error);
  }

  const context = createFlowContext();
  return {
    apiKey: '',
    bearerToken: '',
    cookie: '',
    dashScopeApiKey: '',
    proxy: '',
    projectId: '',
    workflowId: context.workflowId,
    sessionId: context.sessionId,
    generationCount: 1, // 默认生成 1 张图片
    accountTier: 'pro', // 行级注释：默认 Pro 账号
    imageModel: 'nanobanana', // 行级注释：默认 Banana (Preview)
    videoModel: 'quality', // 行级注释：视频生成模型 quality 或 fast
    isManaged: false,
    credentialMode: 'cloud', // 行级注释：默认云端模式
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

  // 保存项目前置提示词
  const saveProjectPrefixPrompt = (projectId: string, prompt: string) => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('aimovimaker_project_prefix_prompts');
        const prompts: Record<string, string> = saved ? JSON.parse(saved) : {};
        if (prompt) {
          prompts[projectId] = prompt;
        } else {
          delete prompts[projectId];
        }
        localStorage.setItem('aimovimaker_project_prefix_prompts', JSON.stringify(prompts));
      } catch (error) {
        console.error('保存项目前置提示词失败:', error);
      }
    }
  };

  // 加载所有项目前置提示词
  const loadProjectPrefixPrompts = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};

    try {
      const saved = localStorage.getItem('aimovimaker_project_prefix_prompts');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      console.error('加载项目前置提示词失败:', error);
      return {};
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
    credits: null, // 行级注释：初始积分为 null，待首次获取
    isSettingsOpen: false,
    projectPrefixPrompts: loadProjectPrefixPrompts(),
    currentPrefixPrompt: initialConfig.projectId ? loadProjectPrefixPrompts()[initialConfig.projectId] || '' : '',
    prefixPromptEnabled: true, // 行级注释：默认启用前置提示词
    triggerVideoGeneration: undefined,
    onGenerateFromInput: undefined,

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

    deleteElement: (id) => {
      const { elements } = get();
      const element = elements.find((el) => el.id === id);

      // 如果是图片或视频节点，且有内容，则移入废片库
      if (element && (element.type === 'image' || element.type === 'video')) {
        const mediaEl = element as any; // ImageElement | VideoElement
        if (mediaEl.src && !mediaEl.src.startsWith('blob:')) {
          // 延迟加载 materialsStore 避免循环依赖
          const { moveToTrash } = require('./materials-store').useMaterialsStore.getState();

          moveToTrash({
            id: mediaEl.id, // 复用节点 ID 或生成新 ID 均可
            type: element.type as 'image' | 'video',
            name: mediaEl.promptText || mediaEl.generatedFrom?.prompt || 'Untitled',
            src: mediaEl.src,
            thumbnail: mediaEl.thumbnail || mediaEl.src,
            mediaId: mediaEl.mediaId,
            mediaGenerationId: mediaEl.mediaGenerationId,
            metadata: {
              prompt: mediaEl.promptText || mediaEl.generatedFrom?.prompt,
              width: mediaEl.size?.width,
              height: mediaEl.size?.height,
              // aspectRatio: ... (如果需要)
            },
            projectId: get().apiConfig.projectId, // 关键：关联当前项目 ID，确保在废片库中可见
            createdAt: new Date().toISOString(),
            tags: ['trash'],
          });
        }
      }

      set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
        selection: state.selection.filter((selId) => selId !== id),
      }));
    },

    deleteSelectedElements: () => {
      const { elements, selection } = get();
      const { moveToTrash } = require('./materials-store').useMaterialsStore.getState();

      // 遍历选中的元素，将图片/视频移入废片库
      elements.forEach(el => {
        if (selection.includes(el.id) && (el.type === 'image' || el.type === 'video')) {
          const mediaEl = el as any;
          if (mediaEl.src && !mediaEl.src.startsWith('blob:')) {
            moveToTrash({
              id: mediaEl.id,
              type: el.type as 'image' | 'video',
              name: mediaEl.promptText || mediaEl.generatedFrom?.prompt || 'Untitled',
              src: mediaEl.src,
              thumbnail: mediaEl.thumbnail || mediaEl.src,
              mediaId: mediaEl.mediaId,
              mediaGenerationId: mediaEl.mediaGenerationId,
              metadata: {
                prompt: mediaEl.promptText || mediaEl.generatedFrom?.prompt,
                width: mediaEl.size?.width,
                height: mediaEl.size?.height,
              },
              projectId: get().apiConfig.projectId, // 关键：关联当前项目 ID
              createdAt: new Date().toISOString(),
              tags: ['trash'],
            });
          }
        }
      });

      set((state) => ({
        elements: state.elements.filter(
          (el) => !state.selection.includes(el.id)
        ),
        selection: [],
      }));
    },

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

    setPrefixPrompt: (prompt) => {
      const projectId = get().apiConfig.projectId;
      if (!projectId) return;

      // 保存到项目映射中
      saveProjectPrefixPrompt(projectId, prompt);

      // 更新当前前置提示词
      set({ currentPrefixPrompt: prompt });
    },

    loadProjectPrefixPrompt: (projectId) => {
      const prompts = get().projectPrefixPrompts;
      const prompt = prompts[projectId] || '';
      set({
        currentPrefixPrompt: prompt,
        apiConfig: { ...get().apiConfig, projectId }
      });
    },

    setPrefixPromptEnabled: (enabled) => set({ prefixPromptEnabled: enabled }),

    setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

    isAssistantOpen: false,
    setIsAssistantOpen: (isOpen: boolean) => set({ isAssistantOpen: isOpen }),

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

    setCredits: (credits) => set({ credits }), // 行级注释：更新积分状态

    // 图片编辑器状态和方法
    annotatorTarget: null,
    isLoadingAnnotatorImage: false,
    setAnnotatorTarget: (target) => set({ annotatorTarget: target }),
    setIsLoadingAnnotatorImage: (loading) => set({ isLoadingAnnotatorImage: loading }),
  };
});