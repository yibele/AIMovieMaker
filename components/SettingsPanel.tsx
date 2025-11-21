'use client';

import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
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
    toast.success('已生成新的 Workflow ID 和 Session ID');
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
    toast.success('API 配置已保存');
  };

  return (
    <>
      {/* 设置面板 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* 设置对话框 */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">API 设置</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 表单 */}
            <div className="space-y-6">
              {/* 行级注释：API Key、Bearer Token、Cookie、Project ID 已隐藏，由系统自动配置 */}

              {/* 账号类型 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  账号类型
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAccountTier('pro')}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      accountTier === 'pro'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    🎨 Pro
                  </button>
                  <button
                    onClick={() => setAccountTier('ultra')}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      accountTier === 'ultra'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ✨ Ultra
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  选择你的 Google Labs 账号类型（Pro 或 Ultra），不同账号使用不同的视频模型
                </p>
              </div>

              {/* 代理设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  代理地址（可选）
                </label>
                <input
                  type="text"
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  placeholder="http://127.0.0.1:10808"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  如需通过代理访问 API，请输入代理地址（格式：http://host:port 或 socks5://host:port）
                </p>
              </div>

              {/* Workflow & Session */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Flow 工作流上下文
                  </h3>
                  <button
                    onClick={handleGenerateContext}
                    className="px-3 py-1.5 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                  >
                    生成新的 ID
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Workflow ID
                    </label>
                    <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm text-gray-700 break-all">
                      {workflowId || '尚未生成'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      Session ID
                    </label>
                    <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono text-sm text-gray-700 break-all">
                      {sessionId || '尚未生成'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    所有 Flow 请求都会复用以上 ID，可提升多图融合的连贯性。如需重新设定，请点击“生成新的 ID”。
                  </p>
                </div>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

