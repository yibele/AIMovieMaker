'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { Key, X, Gift, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { supabase } from '@/lib/supabaseClient';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setApiConfig = useCanvasStore((state) => state.setApiConfig);

  if (!isOpen) return null;

  const handleActivate = async () => {
    if (!code.trim()) {
      toast.error('Please enter an invitation code');
      return;
    }

    setIsLoading(true);
    try {
      // 获取当前 session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login first');
        return;
      }

      // 调用激活接口
      const response = await fetch('/api/activation/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          code: code.trim() 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      // 成功！更新本地配置
      if (data.credentials) {
        const creds = data.credentials;
        setApiConfig({
          apiKey: creds.apiKey || '',
          bearerToken: creds.bearerToken || '',
          cookie: creds.cookie || '',
          projectId: creds.projectId || '',
          // 保留其他配置不变或设置默认值
          accountTier: 'ultra', // 默认给 Ultra 体验? 或者根据 credentials 里的字段? 暂时默认 Ultra
          isManaged: true, // 标记为托管模式
          videoModel: 'fast', // 托管模式下强制使用 Fast 模型
        });
        
        toast.success('🎉 Activation successful! Premium features unlocked.');
        onSuccess?.();
        onClose();
        setCode('');
      } else {
        throw new Error('No credentials returned from server');
      }
      
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error(error.message || 'Activation failed, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* 激活卡片 */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-300 border border-white/20 overflow-hidden">
        
        {/* 装饰背景 */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-fuchsia-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 标题区域 */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white mb-6 shadow-lg shadow-violet-500/30 transform rotate-3">
            <Gift className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Redeem Invite Code</h2>
          <p className="text-slate-500 mt-2 font-medium">Unlock premium access with your exclusive code</p>
        </div>

        {/* 输入区域 */}
        <div className="space-y-4 relative z-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER-YOUR-CODE-HERE"
              className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all font-mono tracking-wider text-lg uppercase"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleActivate();
                }
              }}
            />
          </div>

          <button
            onClick={handleActivate}
            disabled={isLoading || !code.trim()}
            className="w-full group relative flex items-center justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : (
              <>
                Activate Now
                <ArrowRight className="ml-2 -mr-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Includes
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Unlimited Generations • 4K Video Export • Priority Support
          </p>
        </div>
      </div>
    </div>
  );
};
