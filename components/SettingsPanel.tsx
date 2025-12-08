'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, X, Shield, Globe, Workflow, RefreshCw, Save, Cloud, Loader2, Zap } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { toast } from 'sonner';
import { supabase, getCachedSession } from '@/lib/supabaseClient';

// 行级注释：从云端加载用户的 API Key 配置（只加载用户自己配置的 Key）
async function loadApiKeysFromCloud(accessToken: string): Promise<{
  hailuoApiKey?: string;
  sora2ApiKey?: string;
  falApiKey?: string;
} | null> {
  try {
    const response = await fetch('/api/user/apikey', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.apiKeys) {
        return data.apiKeys;
      }
    }
    return null;
  } catch (error) {
    console.error('加载云端 API Key 失败:', error);
    return null;
  }
}

// 行级注释：保存用户的 API Key 配置到云端（只保存用户自己配置的 Key）
async function saveApiKeysToCloud(
  accessToken: string,
  apiKeys: {
    hailuoApiKey?: string;
    sora2ApiKey?: string;
    falApiKey?: string;
  }
): Promise<boolean> {
  try {
    const response = await fetch('/api/user/apikey', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiKeys),
    });

    return response.ok;
  } catch (error) {
    console.error('保存云端 API Key 失败:', error);
    return false;
  }
}

export default function SettingsPanel() {
  const isOpen = useCanvasStore((state) => state.isSettingsOpen);
  const setIsOpen = useCanvasStore((state) => state.setIsSettingsOpen);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  
  // 行级注释：彩蛋 - 点击 Settings 图标 5 次开启/关闭开发者模式
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const regenerateFlowContext = useCanvasStore(
    (state) => state.regenerateFlowContext
  );

  const [apiKey, setApiKey] = useState(apiConfig.apiKey || '');
  const [bearerToken, setBearerToken] = useState(apiConfig.bearerToken || '');
  const [cookie, setCookie] = useState(apiConfig.cookie || '');
  const [dashScopeApiKey, setDashScopeApiKey] = useState(apiConfig.dashScopeApiKey || '');
  const [hailuoApiKey, setHailuoApiKey] = useState(apiConfig.hailuoApiKey || ''); // 海螺 API Key
  const [sora2ApiKey, setSora2ApiKey] = useState(apiConfig.sora2ApiKey || ''); // Sora2 API Key
  const [falApiKey, setFalApiKey] = useState(apiConfig.falApiKey || ''); // fal.ai API Key
  const [minimaxApiKey, setMinimaxApiKey] = useState(apiConfig.minimaxApiKey || ''); // MiniMax API Key
  const [proxy, setProxy] = useState(apiConfig.proxy || '');
  // 行级注释：projectId 从 URL 自动获取，不再由用户手动设置
  const [workflowId, setWorkflowId] = useState(apiConfig.workflowId || '');
  const [sessionId, setSessionId] = useState(apiConfig.sessionId || '');
  const [accountTier, setAccountTier] = useState<'pro' | 'ultra'>(apiConfig.accountTier || 'pro');
  const [isSyncingCredentials, setIsSyncingCredentials] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // 行级注释：保存中状态
  
  // 行级注释：首次加载时从云端同步 API Key 配置（只执行一次）
  const hasLoadedCloudKeysRef = useRef(false);
  
  useEffect(() => {
    if (hasLoadedCloudKeysRef.current) return;
    
    const loadCloudKeys = async () => {
      const session = await getCachedSession();
      if (!session) return;
      
      hasLoadedCloudKeysRef.current = true;
      
      const cloudKeys = await loadApiKeysFromCloud(session.access_token);
      if (cloudKeys) {
        // 行级注释：用云端配置更新本地（只更新云端有值且本地没有的字段）
        const updates: Record<string, string> = {};
        
        if (cloudKeys.hailuoApiKey && !apiConfig.hailuoApiKey) {
          updates.hailuoApiKey = cloudKeys.hailuoApiKey;
          setHailuoApiKey(cloudKeys.hailuoApiKey);
        }
        if (cloudKeys.sora2ApiKey && !apiConfig.sora2ApiKey) {
          updates.sora2ApiKey = cloudKeys.sora2ApiKey;
          setSora2ApiKey(cloudKeys.sora2ApiKey);
        }
        if (cloudKeys.falApiKey && !apiConfig.falApiKey) {
          updates.falApiKey = cloudKeys.falApiKey;
          setFalApiKey(cloudKeys.falApiKey);
        }
        
        if (Object.keys(updates).length > 0) {
          setApiConfig(updates);
          console.log('✅ 已从云端同步 API Key 配置');
        }
      }
    };
    
    loadCloudKeys();
  }, [apiConfig, setApiConfig]);
  
  // 行级注释：彩蛋触发器 - 点击 5 次切换开发者模式
  const handleEasterEggClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 清除之前的计时器
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    
    clickCountRef.current += 1;
    console.log('[Easter Egg] Click count:', clickCountRef.current); // 调试日志
    
    if (clickCountRef.current >= 5) {
      // 切换开发者模式
      const newDevMode = !apiConfig.devMode;
      setApiConfig({ devMode: newDevMode });
      clickCountRef.current = 0;
      
      if (newDevMode) {
        toast.success('🚀 开发者模式已开启', { description: '并发限制已关闭' });
      } else {
        toast('开发者模式已关闭', { description: '并发限制已恢复' });
      }
    } else {
      // 2 秒内没有继续点击则重置计数
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
        console.log('[Easter Egg] Click count reset'); // 调试日志
      }, 2000);
    }
  };

  // 同步本地状态 - 当面板打开或 apiConfig 变化时同步
  useEffect(() => {
    if (isOpen) {
      setApiKey(apiConfig.apiKey || '');
      setBearerToken(apiConfig.bearerToken || '');
      setCookie(apiConfig.cookie || '');
      setDashScopeApiKey(apiConfig.dashScopeApiKey || '');
      setHailuoApiKey(apiConfig.hailuoApiKey || ''); // 同步海螺 API Key
      setSora2ApiKey(apiConfig.sora2ApiKey || ''); // 同步 Sora2 API Key
      setFalApiKey(apiConfig.falApiKey || ''); // 同步 fal.ai API Key
      setMinimaxApiKey(apiConfig.minimaxApiKey || ''); // 同步 MiniMax API Key
      setProxy(apiConfig.proxy || '');
      // 行级注释：projectId 从 URL 自动获取，不需要同步
      setWorkflowId(apiConfig.workflowId || '');
      setSessionId(apiConfig.sessionId || '');
      setAccountTier(apiConfig.accountTier || 'pro');
    }
  }, [apiConfig, isOpen]);

  // 手动同步云端 API 授权
  const handleSyncCloudCredentials = async () => {
    setIsSyncingCredentials(true);
    try {
      // 行级注释：使用缓存的 session，减少 API 请求
      const session = await getCachedSession();
      if (!session) {
        toast.error('请先登录');
        return;
      }

      const response = await fetch('/api/activation/activate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.activated && data.credentials) {
          const creds = data.credentials;
          // 行级注释：只更新凭证字段，不覆盖用户的 accountTier、credentialMode、videoModel 设置
          setApiConfig({
            apiKey: creds.apiKey || '',
            bearerToken: creds.bearerToken || '',
            cookie: creds.cookie || '',
            // 行级注释：不设置 projectId，它从 URL 自动获取
            isManaged: true,
            // 行级注释：不再强制覆盖以下设置，保留用户的选择
            // accountTier: 保留用户设置
            // videoModel: 保留用户设置
            // credentialMode: 保留用户设置
          });
          toast.success('API 授权同步成功');
        } else {
          toast.error('未找到有效的 API 授权，请确认邀请码已激活');
        }
      } else {
        toast.error('同步失败，请稍后重试');
      }
    } catch (error) {
      console.error('同步云端凭证失败:', error);
      toast.error('同步失败，请检查网络连接');
    } finally {
      setIsSyncingCredentials(false);
    }
  };

  const handleGenerateContext = () => {
    const context = regenerateFlowContext();
    setWorkflowId(context.workflowId);
    setSessionId(context.sessionId);
    toast.success('New session context generated');
  };

  // 行级注释：切换账号类型并立即保存到 localStorage
  const handleAccountTierChange = (tier: 'pro' | 'ultra') => {
    setAccountTier(tier);
    setApiConfig({
      accountTier: tier,
    });
    toast.success(tier === 'ultra' ? '已切换到 Ultra Plan' : '已切换到 Pro Plan');
  };

  // 保存设置 - 只更新修改的字段，保留其他配置
  // 行级注释：projectId 不在这里设置，它从 URL 自动获取
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // 1. 保存到本地 store
      setApiConfig({
        apiKey: apiKey.trim(),
        bearerToken: bearerToken.trim(),
        cookie: cookie.trim(),
        dashScopeApiKey: dashScopeApiKey.trim(),
        hailuoApiKey: hailuoApiKey.trim(), // 保存海螺 API Key
        sora2ApiKey: sora2ApiKey.trim(), // 保存 Sora2 API Key
        falApiKey: falApiKey.trim(), // 保存 fal.ai API Key
        minimaxApiKey: minimaxApiKey.trim(), // 保存 MiniMax API Key
        proxy: proxy.trim(),
        // 行级注释：不设置 projectId，它从 URL 自动获取，避免覆盖
        workflowId: workflowId.trim(),
        sessionId: sessionId.trim(),
        accountTier,
        credentialMode: 'cloud',  // 行级注释：始终使用云端模式
        isManaged: true,  // 行级注释：始终为托管模式
        videoModel: 'fast',  // 行级注释：邀请码用户只能使用 fast 模式
      });

      // 2. 同步 API Key 到云端（后台执行，不阻塞）
      const session = await getCachedSession();
      if (session) {
        // 行级注释：只同步用户自己配置的 API Key（海螺/Sora2/fal.ai）
        saveApiKeysToCloud(session.access_token, {
          hailuoApiKey: hailuoApiKey.trim(),
          sora2ApiKey: sora2ApiKey.trim(),
          falApiKey: falApiKey.trim(),
        }).then((success) => {
          if (success) {
            console.log('✅ API Key 已同步到云端');
          }
        });
      }

      setIsOpen(false);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('保存设置失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* 设置面板 */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {/* 遮罩层 */}
          <div
            className={`absolute inset-0 bg-white/60 backdrop-blur-xl transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsOpen(false)}
          />

          {/* 设置对话框 */}
          <div className={`relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-2xl overflow-hidden border border-slate-100 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'}`}>
            
            {/* 标题栏 */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                {/* 行级注释：彩蛋触发器 - 点击图标 5 次开启/关闭开发者模式 */}
                <div 
                  className={`p-2.5 rounded-xl cursor-pointer select-none transition-colors active:scale-95 ${
                    apiConfig.devMode 
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                  onMouseDown={handleEasterEggClick}
                >
                    {apiConfig.devMode ? (
                      <Zap className="w-5 h-5 text-white" />
                    ) : (
                    <Settings className="w-5 h-5 text-slate-900" />
                    )}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Settings</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {apiConfig.devMode ? '🚀 Dev Mode Active' : 'Configure your API preferences'}
                    </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 表单内容 */}
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

              {/* API 授权同步 */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Cloud className="w-4 h-4 text-sky-500" />
                  API Authorization
                </label>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="w-4 h-4" />
                    <span className="font-bold">Cloud Mode</span>
                  </div>
                  <div className="text-xs text-sky-100">
                    API settings synced from your invitation code
                  </div>
                  <div className="absolute top-4 right-4 w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
                <button
                  onClick={handleSyncCloudCredentials}
                  disabled={isSyncingCredentials}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncingCredentials ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {isSyncingCredentials ? 'Syncing...' : 'Sync API Authorization'}
                </button>
                <p className="text-xs text-slate-400 font-medium">
                  Click the button above to refresh your API credentials from the cloud.
                </p>
              </div>
              
              {/* 账号类型 */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Shield className="w-4 h-4 text-violet-500" />
                  Account Tier
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAccountTierChange('pro')}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left group ${
                      accountTier === 'pro'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold mb-1">Pro Plan</div>
                    <div className={`text-xs ${accountTier === 'pro' ? 'text-slate-300' : 'text-slate-400'}`}>Standard generation speed</div>
                    {accountTier === 'pro' && <div className="absolute top-4 right-4 w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
                  </button>
                  <button
                    onClick={() => handleAccountTierChange('ultra')}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left group ${
                      accountTier === 'ultra'
                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 border-transparent text-white shadow-lg shadow-violet-500/30'
                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold mb-1">Ultra Plan</div>
                    <div className={`text-xs ${accountTier === 'ultra' ? 'text-violet-200' : 'text-slate-400'}`}>Fastest generation speed</div>
                    {accountTier === 'ultra' && <div className="absolute top-4 right-4 w-2 h-2 bg-white rounded-full animate-pulse" />}
                  </button>
                </div>
              </div>

              {/* 代理设置 */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Globe className="w-4 h-4 text-blue-500" />
                  Proxy Configuration
                </label>
                <div className="relative">
                    <input
                    type="text"
                    value={proxy}
                    onChange={(e) => setProxy(e.target.value)}
                    placeholder="http://127.0.0.1:10808"
                    className="w-full px-4 py-3.5 bg-slate-50 border-transparent focus:bg-white border focus:border-slate-200 rounded-xl outline-none text-sm font-mono text-slate-600 placeholder:text-slate-400 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2 py-1 rounded">OPTIONAL</div>
                </div>
              </div>

              {/* DashScope Configuration */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] bg-orange-500 text-white rounded font-mono">Q</span>
                  DashScope (Qwen)
                </label>
                <p className="text-xs text-slate-500 font-medium">API Key for Qwen AI Assistant.</p>
                <input
                  type="password"
                  value={dashScopeApiKey}
                  onChange={(e) => setDashScopeApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3.5 bg-slate-50 border-transparent focus:bg-white border focus:border-slate-200 rounded-xl outline-none text-sm font-mono text-slate-600 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* 海螺 Hailuo Video Configuration */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] bg-cyan-500 text-white rounded font-mono">H</span>
                  Hailuo Video (海螺视频)
                </label>
                <p className="text-xs text-slate-500 font-medium">
                  DMXAPI Key for Hailuo video generation. Get it from{' '}
                  <a 
                    href="https://www.dmxapi.cn/register?aff=pS4M" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:text-cyan-700 underline"
                  >
                    dmxapi.cn
                  </a>
                </p>
                <input
                  type="password"
                  value={hailuoApiKey}
                  onChange={(e) => setHailuoApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3.5 bg-slate-50 border-transparent focus:bg-white border focus:border-slate-200 rounded-xl outline-none text-sm font-mono text-slate-600 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Sora2 Video Configuration */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] bg-purple-500 text-white rounded font-mono">S</span>
                  Sora 2 Video
                </label>
                <p className="text-xs text-slate-500 font-medium">
                  API Key for Sora 2 video generation. Get it from{' '}
                  <a 
                    href="https://apimart.ai/register?aff=EqGJ" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 underline"
                  >
                    apimart.ai
                  </a>
                </p>
                <input
                  type="password"
                  value={sora2ApiKey}
                  onChange={(e) => setSora2ApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3.5 bg-slate-50 border-transparent focus:bg-white border focus:border-slate-200 rounded-xl outline-none text-sm font-mono text-slate-600 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* fal.ai Upscale Configuration */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] bg-green-500 text-white rounded font-mono">F</span>
                  fal.ai (高清放大)
                </label>
                <p className="text-xs text-slate-500 font-medium">
                  API Key for image upscaling. Get it from{' '}
                  <a 
                    href="https://fal.ai/dashboard/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 underline"
                  >
                    fal.ai
                  </a>
                </p>
                <input
                  type="password"
                  value={falApiKey}
                  onChange={(e) => setFalApiKey(e.target.value)}
                  placeholder="fal_..."
                  className="w-full px-4 py-3.5 bg-slate-50 border-transparent focus:bg-white border focus:border-slate-200 rounded-xl outline-none text-sm font-mono text-slate-600 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* MiniMax TTS Configuration */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span className="w-4 h-4 flex items-center justify-center text-[10px] bg-violet-500 text-white rounded font-mono">M</span>
                  MiniMax (语音合成)
                </label>
                <p className="text-xs text-slate-500 font-medium">
                  API Key for TTS speech synthesis. Get it from{' '}
                  <a 
                    href="https://platform.minimaxi.com/user-center/basic-information/interface-key" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 underline"
                  >
                    platform.minimaxi.com
                  </a>
                </p>
                <input
                  type="password"
                  value={minimaxApiKey}
                  onChange={(e) => setMinimaxApiKey(e.target.value)}
                  placeholder="eyJh..."
                  className="w-full px-4 py-3.5 bg-slate-50 border-transparent focus:bg-white border focus:border-slate-200 rounded-xl outline-none text-sm font-mono text-slate-600 placeholder:text-slate-400 transition-all"
                />
              </div>

              {/* Workflow & Session */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Workflow className="w-4 h-4 text-orange-500" />
                        Flow Context
                    </label>
                    <button
                        onClick={handleGenerateContext}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                    </button>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workflow ID</span>
                        <div className="px-3 py-2.5 bg-white rounded-xl border border-slate-200/50 font-mono text-xs text-slate-600 truncate shadow-sm">
                            {workflowId || 'Not Generated'}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session ID</span>
                        <div className="px-3 py-2.5 bg-white rounded-xl border border-slate-200/50 font-mono text-xs text-slate-600 truncate shadow-sm">
                            {sessionId || 'Not Generated'}
                        </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    Context IDs ensure continuity across multiple generations. Regenerate if you encounter consistency issues.
                  </p>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
      </div>
    </>
  );
}