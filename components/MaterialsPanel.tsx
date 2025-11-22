'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Search, Plus, Image, Video, Download, Trash2, Grid, List, RefreshCw, FolderOpen } from 'lucide-react';
import { useMaterialsStore } from '@/lib/materials-store';
import { useCanvasStore } from '@/lib/store';
import { loadMaterialsFromProject } from '@/lib/project-materials';
import { MaterialItem, MaterialType } from '@/lib/types-materials';
import { MaterialsIcon } from './icons/MaterialsIcon';

interface MaterialsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MaterialsPanel({ isOpen, onClose }: MaterialsPanelProps) {
  // Store hooks
  const {
    materials,
    selectedMaterials,
    isLoading,
    loadingMessage,
    activeTab,
    setActiveTab,
    selectMaterial,
    selectMaterials,
    clearSelection,
    removeMaterial,
    addToCanvas,
  } = useMaterialsStore();
  const currentProjectId = useCanvasStore((state) => state.apiConfig.projectId);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 使用 useMemo 进行过滤和排序，避免无限循环
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((m) => {
        if (!currentProjectId) return true;
        if (!m.projectId) return true;
        return m.projectId === currentProjectId;
      })
      // 按类型过滤
      .filter((m) => m.type === activeTab)
      // 排序 - 默认按时间倒序
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [materials, currentProjectId, activeTab]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSyncMaterials = useCallback(async () => {
    if (!currentProjectId) {
      setSyncError('请先在 API 设置中选择项目 ID');
      return;
    }
    setSyncError(null);
    setIsSyncing(true);
    try {
      await loadMaterialsFromProject(currentProjectId);
    } catch (error) {
      console.error('同步素材失败:', error);
      setSyncError(error instanceof Error ? error.message : '同步素材失败，请稍后再试');
    } finally {
      setIsSyncing(false);
    }
  }, [currentProjectId]);

  // 处理素材点击（添加到画布）
  const handleMaterialClick = useCallback(
    async (material: MaterialItem) => {
      await addToCanvas(material.id);
      selectMaterial(material.id);
    },
    [addToCanvas, selectMaterial]
  );

  // 处理素材双击（选中）
  const handleMaterialDoubleClick = useCallback(
    (material: MaterialItem) => {
      if (selectedMaterials.includes(material.id)) {
        selectMaterials(selectedMaterials.filter(id => id !== material.id));
      } else {
        selectMaterials([...selectedMaterials, material.id]);
      }
    },
    [selectedMaterials, selectMaterials, selectMaterials]
  );

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedMaterials.length === 0) return;

    if (window.confirm(`确认删除 ${selectedMaterials.length} 个素材吗？`)) {
      selectedMaterials.forEach(id => removeMaterial(id));
      clearSelection();
    }
  }, [selectedMaterials, removeMaterial, clearSelection]);

  // 渲染素材项
  const renderMaterialItem = (material: MaterialItem) => {
    const isSelected = selectedMaterials.includes(material.id);

    if (viewMode === 'grid') {
      return (
        <div
          key={material.id}
          className={`
            relative group cursor-pointer rounded-xl overflow-hidden
            border transition-all duration-300
            ${isSelected 
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
              : 'border-gray-100 hover:border-gray-300 hover:shadow-lg hover:-translate-y-1 bg-white'}
          `}
          onClick={() => handleMaterialClick(material)}
          onDoubleClick={() => handleMaterialDoubleClick(material)}
        >
          {/* 缩略图 */}
          <div className="aspect-square bg-gray-50 relative overflow-hidden">
            {material.type === 'image' ? (
              <img
                src={material.thumbnail || material.src}
                alt={material.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-image.svg';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-400">
                <Video className="w-12 h-12 opacity-50" />
              </div>
            )}

            {/* 悬浮遮罩 & 按钮 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
              <button
                className="w-full py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg text-xs font-semibold hover:bg-white transition-all shadow-lg transform translate-y-4 group-hover:translate-y-0 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMaterialClick(material);
                }}
              >
                添加到画布
              </button>
            </div>
          </div>

          {/* 信息 */}
          <div className="p-2.5 bg-white/50 backdrop-blur-sm">
            <p className="text-xs font-medium text-gray-700 truncate group-hover:text-gray-900 transition-colors">
              {material.name}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{material.type}</p>
              {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
            </div>
          </div>
        </div>
      );
    } else {
      // List view
      return (
        <div
          key={material.id}
          className={`
            flex items-center gap-3 p-2 rounded-xl cursor-pointer
            border transition-all duration-200 group
            ${isSelected 
              ? 'border-blue-500 bg-blue-50/30' 
              : 'border-transparent hover:bg-white hover:shadow-sm hover:border-gray-100'}
          `}
          onClick={() => handleMaterialClick(material)}
          onDoubleClick={() => handleMaterialDoubleClick(material)}
        >
          {/* 缩略图 */}
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100 shadow-sm">
            {material.type === 'image' ? (
              <img
                src={material.thumbnail || material.src}
                alt={material.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-image.svg';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <Video className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate transition-colors">{material.name}</p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
              <span>{material.type}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>{new Date(material.createdAt).toLocaleDateString()}</span>
            </p>
          </div>

          {/* 操作按钮 */}
          <button
            className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transform translate-x-2 group-hover:translate-x-0"
            onClick={(e) => {
              e.stopPropagation();
              handleMaterialClick(material);
            }}
            title="添加到画布"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      );
    }
  };

  return (
    <>
      {/* 遮罩层 (可选，如果不想要完全模态可以去掉 pointer-events) */}
      <div 
        className={`
          fixed inset-0 bg-black/5 z-[45] transition-opacity duration-500 ease-in-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* 面板 - 右侧抽屉 */}
      <div
        className={`
          fixed right-0 top-0 bottom-0 w-[380px] bg-white/80 backdrop-blur-2xl z-[50] 
          border-l border-white/50 shadow-[-20px_0_60px_rgba(0,0,0,0.05)]
          transform transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100/50 rounded-xl">
              <FolderOpen className="w-5 h-5 text-gray-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">素材库</h2>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
              {filteredMaterials.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页切换 - Segmented Control */}
        <div className="px-6 py-4">
          <div className="flex p-1 bg-gray-100/80 rounded-xl relative isolate">
            {/* 滑动背景块 */}
            <div 
              className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-all duration-300 ease-in-out z-[-1]"
              style={{
                left: activeTab === 'image' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
            />
            
            <button
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors z-10
                ${activeTab === 'image' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
              `}
              onClick={() => setActiveTab('image')}
            >
              <Image className="w-4 h-4" />
              图片素材
            </button>
            <button
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors z-10
                ${activeTab === 'video' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
              `}
              onClick={() => setActiveTab('video')}
            >
              <Video className="w-4 h-4" />
              视频素材
            </button>
          </div>
        </div>

        {/* 工具栏 - 极简版 */}
        <div className="px-6 pb-4 flex items-center justify-between gap-3">
          
          {/* 左侧：刷新按钮 */}
          <button
            onClick={handleSyncMaterials}
            disabled={!currentProjectId || isLoading || isSyncing}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium border
              ${isSyncing 
                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
            `}
            title="同步最新素材"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '同步中...' : '同步素材'}
          </button>

          {/* 右侧：视图切换 */}
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-100 p-0.5">
            <button
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setViewMode('grid')}
              title="网格视图"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(loadingMessage || syncError) && (
          <div className="px-6 pb-2">
             <div className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
               syncError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
             }`}>
               <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
               {syncError || loadingMessage}
             </div>
          </div>
        )}

        {/* 批量操作栏 (浮动) */}
        {selectedMaterials.length > 0 && (
          <div className="px-6 pb-3">
             <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                <span className="text-xs font-medium pl-1">已选中 {selectedMaterials.length} 项</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={clearSelection}
                    className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* 素材列表 - 滚动区域 */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
          {isLoading && materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">正在加载素材...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm font-medium text-gray-500">暂无{activeTab === 'image' ? '图片' : '视频'}素材</p>
              <p className="text-xs text-gray-400 mt-1">上传或生成内容后将在此显示</p>
            </div>
          ) : (
            <div className={`
              ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-2'}
              animate-in fade-in duration-500
            `}>
              {filteredMaterials.map(renderMaterialItem)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
