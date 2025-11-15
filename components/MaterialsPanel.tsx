'use client';

import { useState, useCallback } from 'react';
import { X, Search, Plus, Image, Video, Download, Trash2, Grid, List } from 'lucide-react';
import { useMaterialsStore, useFilteredMaterials } from '@/lib/materials-store';
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
    searchQuery,
    activeTab,
    sortBy,
    sortOrder,
    setSearchQuery,
    setActiveTab,
    setSortBy,
    setSortOrder,
    selectMaterial,
    selectMaterials,
    clearSelection,
    removeMaterial,
    addToCanvas,
  } = useMaterialsStore();

  const filteredMaterials = useFilteredMaterials();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 处理搜索
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  // 处理素材点击（添加到画布）
  const handleMaterialClick = useCallback(
    (material: MaterialItem) => {
      addToCanvas(material.id);
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
            relative group cursor-pointer rounded-lg overflow-hidden
            border transition-all duration-200
            ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
          `}
          onClick={() => handleMaterialClick(material)}
          onDoubleClick={() => handleMaterialDoubleClick(material)}
        >
          {/* 缩略图 */}
          <div className="aspect-square bg-gray-100 relative">
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
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Video className="w-12 h-12 text-gray-500" />
              </div>
            )}

            {/* 悬浮按钮 */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                className="bg-white text-gray-900 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-100 transition-all shadow-lg"
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
          <div className="p-2 bg-white">
            <p className="text-xs font-medium text-gray-900 truncate">{material.name}</p>
            <p className="text-xs text-gray-500">{material.type}</p>
          </div>
        </div>
      );
    } else {
      // List view
      return (
        <div
          key={material.id}
          className={`
            flex items-center gap-3 p-3 rounded-lg cursor-pointer
            border transition-all duration-200
            ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}
          `}
          onClick={() => handleMaterialClick(material)}
          onDoubleClick={() => handleMaterialDoubleClick(material)}
        >
          {/* 缩略图 */}
          <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
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
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Video className="w-6 h-6 text-gray-500" />
              </div>
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{material.name}</p>
            <p className="text-xs text-gray-500">
              {material.type} • {new Date(material.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* 操作按钮 */}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              handleMaterialClick(material);
            }}
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      );
    }
  };

  return (
    <>
      {/* 面板 - 悬浮毛玻璃卡片 */}
      <div
        className={`
          fixed right-20 top-12 w-[420px] h-[calc(100vh-6rem)] bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl z-50 border border-gray-200/50
          transform transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'}
        `}
      >
        {/* 标签页 */}
        <div className="flex border-b border-gray-200/50">
          <button
            className={`
              flex-1 py-3 px-4 pt-4 pb-4 font-medium text-sm transition-all
              ${activeTab === 'image'
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            onClick={() => setActiveTab('image')}
          >
            <Image className="w-4 h-4 inline mr-2" />
            图片
          </button>
          <button
            className={`
              flex-1 py-3 px-4 pt-4 pb-4 font-medium text-sm transition-all
              ${activeTab === 'video'
                ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
            onClick={() => setActiveTab('video')}
          >
            <Video className="w-4 h-4 inline mr-2" />
            视频
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4 text-gray-700" />
              </button>
              <button
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* 排序 */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('_');
                setSortBy(sort as any);
                setSortOrder(order as any);
              }}
              className="text-sm border border-gray-200 bg-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <option value="createdAt_desc">最新优先</option>
              <option value="createdAt_asc">最旧优先</option>
              <option value="name_asc">名称 A-Z</option>
              <option value="name_desc">名称 Z-A</option>
            </select>
          </div>

          {/* 批量操作 */}
          {selectedMaterials.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                已选 {selectedMaterials.length} 项
              </span>
              <button
                onClick={handleBatchDelete}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {/* 素材列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <MaterialsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无{activeTab === 'image' ? '图片' : '视频'}素材</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
              {filteredMaterials.map(renderMaterialItem)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}