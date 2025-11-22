'use client';

import { useState, useEffect } from 'react';
import { Settings, X, Shield, Globe, Workflow, RefreshCw, Save } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { toast } from 'sonner';

export default function SettingsPanel() {
  const isOpen = useCanvasStore((state) => state.isSettingsOpen);
  const setIsOpen = useCanvasStore((state) => state.setIsSettingsOpen);
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);
  const regenerateFlowContext = useCanvasStore(
    (state) => state.regenerateFlowContext
  );

  const [apiKey, setApiKey] = useState(apiConfig.apiKey || '');
  const [bearerToken, setBearerToken] = useState(apiConfig.bearerToken || '');
  const [cookie, setCookie] = useState(apiConfig.cookie || '');
  const [proxy, setProxy] = useState(apiConfig.proxy || '');
  const [projectId, setProjectId] = useState(apiConfig.projectId || '');
  const [workflowId, setWorkflowId] = useState(apiConfig.workflowId || '');
  const [sessionId, setSessionId] = useState(apiConfig.sessionId || '');
  const [accountTier, setAccountTier] = useState<'pro' | 'ultra'>(apiConfig.accountTier || 'pro');

  // 同步本地状态
  useEffect(() => {
    setApiKey(apiConfig.apiKey || '');
    setBearerToken(apiConfig.bearerToken || '');
    setCookie(apiConfig.cookie || '');
    setProxy(apiConfig.proxy || '');
    setProjectId(apiConfig.projectId || '');
    setWorkflowId(apiConfig.workflowId || '');
    setSessionId(apiConfig.sessionId || '');
    setAccountTier(apiConfig.accountTier || 'pro');
  }, [apiConfig]);

  const handleGenerateContext = () => {
    const context = regenerateFlowContext();
    setWorkflowId(context.workflowId);
    setSessionId(context.sessionId);
    toast.success('New session context generated');
  };

  // 保存设置 - 只更新修改的字段，保留其他配置
  const handleSave = () => {
    setApiConfig({
      apiKey: apiKey.trim(),
      bearerToken: bearerToken.trim(),
      cookie: cookie.trim(),
      proxy: proxy.trim(),
      projectId: projectId.trim(),
      workflowId: workflowId.trim(),
      sessionId: sessionId.trim(),
      accountTier,
      // 行级注释：保留 generationCount 和 imageModel，不在设置面板中修改它们
    });
    setIsOpen(false);
    toast.success('Configuration saved successfully');
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
                <div className="p-2.5 bg-slate-100 rounded-xl">
                    <Settings className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Settings</h2>
                    <p className="text-xs text-slate-500 font-medium">Configure your API preferences</p>
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
              
              {/* 账号类型 */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Shield className="w-4 h-4 text-violet-500" />
                  Account Tier
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAccountTier('pro')}
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
                    onClick={() => setAccountTier('ultra')}
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
                className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
      </div>
    </>
  );
}
