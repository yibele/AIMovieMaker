'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Search, Plus, Image, Video, Download, Trash2, Grid, List, RefreshCw, FolderOpen, Check, RotateCcw, Ban, LayoutList } from 'lucide-react';
import { useMaterialsStore } from '@/lib/materials-store';
import { useCanvasStore } from '@/lib/store';
import { loadMaterialsFromProject } from '@/lib/project-materials'; // This now loads into projectHistory
import { MaterialItem, MaterialType } from '@/lib/types-materials';
import { MaterialsIcon } from './icons/MaterialsIcon';
import { supabase } from '@/lib/supabaseClient'; // 用于获取 user_id

interface MaterialsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MaterialsPanel({ isOpen, onClose }: MaterialsPanelProps) {
  // Store hooks
  const {
    materials,         // 我的精选 (Supabase)
    projectHistory,    // 项目历史 (Google API)
    trash,             // 废片库 (本地)
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
    restoreFromTrash,
    deleteFromTrash,
    clearTrash,
    loadCloudMaterials, // 新增的加载精选素材 action
    // loadProjectHistory, // 从 useMaterialsStore 引入，但实际调用在 project-materials 中
  } = useMaterialsStore();
  const currentProjectId = useCanvasStore((state) => state.apiConfig.projectId);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 获取当前用户 ID
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {

      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
        useCanvasStore.getState().setApiConfig({ userId: data.user.id }); // 更新到 canvasStore
      } else if (error) {
        console.error('Failed to get user:', error);
        setUserId(null);
      }
    };
    fetchUser();
  }, []);

  // 加载精选素材和项目历史
  useEffect(() => {
    if (isOpen && userId) {
      loadCloudMaterials(userId, currentProjectId); // 加载我的精选
      // loadMaterialsFromProject(currentProjectId); // 调用 project-materials 中的 loadMaterialsFromProject
    }
  }, [isOpen, userId, currentProjectId, loadCloudMaterials]);


  // 根据当前 activeTab 和类型过滤素材
  const getFilteredMaterials = useCallback(() => {
    let sourceMaterials: MaterialItem[] = [];

    if (activeTab === 'trash') {
      sourceMaterials = trash;
    } else if (activeTab === 'library_image') {
      sourceMaterials = materials.filter(m => m.type === 'image');
    } else if (activeTab === 'library_video') {
      sourceMaterials = materials.filter(m => m.type === 'video');
    } else if (activeTab === 'project_history') {
      sourceMaterials = projectHistory;
    }

    // 过滤掉不属于当前项目的（如果 material 有 projectId 字段）
    return sourceMaterials
      .filter((m) => {
        if (!currentProjectId) return true; // 没有项目 ID，则显示所有
        return m.projectId === currentProjectId;
      })
      // 排序 - 默认按时间倒序
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [materials, projectHistory, trash, activeTab, currentProjectId]);

  const filteredMaterials = useMemo(() => getFilteredMaterials(), [getFilteredMaterials]);

  // 默认使用 grid 视图，满足用户“每行三个”的需求
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSyncMaterials = useCallback(async () => {
    if (!currentProjectId) {
      setSyncError('请先在 API 设置中选择项目 ID');
      return;
    }
    setSyncError(null);
    setIsSyncing(true);
    try {
      // await loadMaterialsFromProject(currentProjectId); // 现在同步的是项目历史
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

    if (activeTab === 'trash') {
      if (window.confirm(`⚠️ 彻底删除 ${selectedMaterials.length} 个项目？此操作无法撤销！`)) {
        selectedMaterials.forEach(id => deleteFromTrash(id));
        clearSelection();
      }
    } else if (activeTab.startsWith('library')) {
      // 对于精选库的删除
      if (window.confirm(`确认删除 ${selectedMaterials.length} 个精选素材吗？这将从云端删除！`)) {
        selectedMaterials.forEach(id => removeMaterial(id));
        clearSelection();
      }
    } else if (activeTab === 'project_history') {
      // 对于项目历史的删除，目前不允许批量删除
      alert('暂不支持批量删除项目历史素材。');
      clearSelection();
    }
  }, [selectedMaterials, activeTab, removeMaterial, deleteFromTrash, clearSelection]);

  return (
    <>
      {/* 移除遮罩层，实现非模态 */}

      {/* 面板 - 右侧抽屉 - 调整宽度和位置 */}
      <div
        className={`
          fixed right-[80px] top-4 bottom-4 w-[440px] max-w-[90vw] bg-white/90 backdrop-blur-2xl z-[50] 
          rounded-3xl border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden
          transform transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          flex flex-col
          ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}
        `}
      >
        {/* 头部 */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 flex flex-col gap-4 bg-white/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-colors ${activeTab === 'trash' ? 'bg-red-500 shadow-red-500/20' : 'bg-gradient-to-tr from-blue-500 to-sky-500 shadow-blue-500/20'
                }`}>
                {activeTab === 'trash' ? <Trash2 size={18} strokeWidth={2.5} /> : <FolderOpen size={18} strokeWidth={2.5} />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                  {activeTab === 'trash' ? '回收站' : '素材库'}
                </h2>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  {activeTab === 'trash' ? 'Trash Bin' : 'Project Assets'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs - 紧凑型 Segment Control */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all duration-300
                ${activeTab === 'library_image' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
              onClick={() => setActiveTab('library_image')}
            >
              <Image size={14} className={activeTab === 'library_image' ? 'text-blue-600' : ''} />
              图片
            </button>
            <button
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all duration-300
                ${activeTab === 'library_video' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
              `}
              onClick={() => setActiveTab('library_video')}
            >
              <Video size={14} className={activeTab === 'library_video' ? 'text-blue-600' : ''} />
              视频
            </button>

            {/* 回收站 Tab */}
            <button
              className={`
                flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all duration-300
                ${activeTab === 'trash' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-gray-400 hover:text-red-500 hover:bg-red-50/50'}
              `}
              onClick={() => setActiveTab('trash')}
              title="查看废片库"
            >
              <Trash2 size={14} />
              <span className="text-xs">{trash.length > 0 ? trash.length : ''}</span>
            </button>
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {activeTab === 'trash' ? (
              <button
                onClick={() => {
                  if (window.confirm('确定要清空废片库吗？此操作无法撤销！')) {
                    clearTrash();
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium border flex-1 justify-center bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空回收站
              </button>
            ) : (
              <button
                onClick={handleSyncMaterials}
                disabled={!currentProjectId || isLoading || isSyncing}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-medium border flex-1 justify-center
                  ${isSyncing
                    ? 'bg-blue-50 text-blue-600 border-blue-100'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'}
                `}
                title="同步最新素材"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '同步中...' : '同步远端素材'}
              </button>
            )}

            {/* 视图切换按钮 - 恢复显示 */}
            <div className="flex items-center bg-gray-100/80 rounded-lg p-0.5">
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
            <div className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${syncError ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : 'bg-blue-500 animate-pulse'}`} />
              {syncError || loadingMessage}
            </div>
          )}
        </div>

        {/* 批量操作栏 (浮动) */}
        {selectedMaterials.length > 0 && (
          <div className="px-6 pb-3 pt-2">
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
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 custom-scrollbar">
          {isLoading && materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">正在加载素材...</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <div className={`w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ${activeTab === 'trash' ? 'text-red-200' : 'text-gray-200'}`}>
                {activeTab === 'trash' ? <Trash2 className="w-8 h-8" /> : <FolderOpen className="w-8 h-8" />}
              </div>
              <p className="text-sm font-medium text-gray-500">
                {activeTab === 'trash' ? '回收站为空' : `暂无${activeTab === 'library_image' ? '图片' : '视频'}素材`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {activeTab === 'trash' ? '删除的素材会暂时存放在这里' : '上传或生成内容后将在此显示'}
              </p>
            </div>
          ) : (
            <div className={`
               ${viewMode === 'grid' ? 'grid grid-cols-3 gap-3' : 'flex flex-col gap-3'}
               animate-in fade-in duration-500
            `}>
              {filteredMaterials.map((material) => {
                const isSelected = selectedMaterials.includes(material.id);

                if (viewMode === 'grid') {
                  return (
                    <div
                      key={material.id}
                      onClick={() => handleMaterialClick(material)}
                      onDoubleClick={() => handleMaterialDoubleClick(material)}
                      className={`
                        group relative aspect-square bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden
                        ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 hover:border-blue-200'}
                      `}
                    >
                      {material.type === 'image' ? (
                        <img
                          src={material.thumbnail || material.src}
                          alt={material.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.svg';
                          }}
                        />
                      ) : (
                        <img
                          src={material.thumbnail || material.src}
                          alt={material.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.svg';
                          }}
                        />
                      )}

                      {/* 悬浮遮罩 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-2">
                        <div className="flex justify-between items-end w-full">
                          <span className="text-[10px] text-white/90 font-medium truncate max-w-[70%]">{material.name}</span>

                          <div className="flex gap-1">
                            {activeTab === 'trash' ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    restoreFromTrash(material.id);
                                  }}
                                  className="p-1 bg-white/20 hover:bg-green-500 rounded text-white backdrop-blur-sm transition-colors"
                                  title="恢复到素材库"
                                >
                                  <RotateCcw size={10} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('彻底删除？无法恢复')) deleteFromTrash(material.id);
                                  }}
                                  className="p-1 bg-white/20 hover:bg-red-500 rounded text-white backdrop-blur-sm transition-colors"
                                  title="彻底删除"
                                >
                                  <Ban size={10} />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('确认删除该素材？')) removeMaterial(material.id);
                                }}
                                className="p-1 bg-white/20 hover:bg-red-500/80 rounded text-white backdrop-blur-sm transition-colors"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 选中标记 */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5 shadow-sm z-10">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                }

                // List View
                return (
                  <div
                    key={material.id}
                    onClick={() => handleMaterialClick(material)}
                    onDoubleClick={() => handleMaterialDoubleClick(material)}
                    className={`
                      group relative bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex
                      ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-100 hover:border-blue-200'}
                    `}
                  >
                    {/* 左侧：小封面图 */}
                    <div className="w-20 h-20 relative flex-shrink-0 bg-gray-100">
                      {material.type === 'image' ? (
                        <img
                          src={material.thumbnail || material.src}
                          alt={material.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.svg';
                          }}
                        />
                      ) : (
                        <img
                          src={material.thumbnail || material.src}
                          alt={material.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder-image.svg';
                          }}
                        />
                      )}
                      {/* 选中标记 */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center backdrop-blur-[1px]">
                          <div className="bg-white rounded-full p-1 shadow-sm">
                            <Check size={12} className="text-blue-600" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 右侧：内容 */}
                    <div className="flex-1 p-3 min-w-0 flex flex-col">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                          {material.name}
                        </h3>

                        {/* 悬浮操作 (只在Hover时显示) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {activeTab === 'trash' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  restoreFromTrash(material.id);
                                }}
                                className="p-1 hover:bg-green-50 rounded text-gray-400 hover:text-green-600"
                                title="恢复"
                              >
                                <RotateCcw size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('彻底删除？')) deleteFromTrash(material.id);
                                }}
                                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                                title="彻底删除"
                              >
                                <Ban size={12} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('确认删除该素材？')) removeMaterial(material.id);
                              }}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                              title="删除"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 uppercase text-[10px] font-medium tracking-wider">{material.type}</span>
                        <span>{new Date(material.createdAt).toLocaleDateString()}</span>
                      </p>

                      <div className="mt-auto pt-2 flex justify-end items-center">
                        <span className="text-[10px] text-blue-500 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                          {activeTab === 'trash' ? '点击恢复' : '添加到画布'} <Plus size={10} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
