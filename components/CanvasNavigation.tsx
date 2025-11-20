'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Home, FolderOpen, Sparkles, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '@/lib/store';
import { getVideoCreditStatus } from '@/lib/direct-google-api';

export default function CanvasNavigation() {
  const apiConfig = useCanvasStore((state) => state.apiConfig);
  const credits = useCanvasStore((state) => state.credits); // 行级注释：从 store 读取积分
  const setCredits = useCanvasStore((state) => state.setCredits);
  
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // 行级注释：获取积分状态
  const fetchCredits = async () => {
    if (!apiConfig.bearerToken) {
      return;
    }
    
    setIsLoadingCredits(true);
    try {
      const result = await getVideoCreditStatus(apiConfig.bearerToken);
      setCredits(result.credits);
    } catch (error) {
      console.error('获取积分失败:', error);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  // 行级注释：初始加载积分
  useEffect(() => {
    if (credits === null && apiConfig.bearerToken) {
      fetchCredits();
    }
  }, [apiConfig.bearerToken]);

  return (
    <>
      {/* 左上角：返回按钮 */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={() => window.location.href = '/'}
          className="inline-flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <Home className="w-4 h-4" />
          返回项目
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="inline-flex items-center gap-2 rounded-xl bg-white/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-gray-700 shadow-lg hover:bg-white transition-all"
        >
          <FolderOpen className="w-4 h-4" />
          项目列表
        </button>
      </div>

      {/* 右上角：积分显示 */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => fetchCredits()}
          disabled={isLoadingCredits}
          className={`inline-flex items-center gap-2 rounded-xl backdrop-blur-sm px-4 py-2 text-sm font-medium shadow-lg transition-all ${
            apiConfig.accountTier === 'ultra'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } ${isLoadingCredits ? 'opacity-70 cursor-wait' : ''}`}
          title="点击刷新积分"
        >
          {isLoadingCredits ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>
            {credits !== null ? `${credits} Credits` : '-- Credits'}
          </span>
        </button>
      </div>
    </>
  );
}