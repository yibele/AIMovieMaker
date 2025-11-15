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
            border-2 transition-all duration-200
            ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
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
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <Video className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {/* 悬浮按钮 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                className="bg-white text-gray-900 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-100"
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
          <div className="p-2">
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
            ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
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
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <Video className="w-6 h-6 text-gray-400" />
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
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
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
      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* 面板 */}
      <div
        className={`
          fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MaterialsIcon className="w-5 h-5" />
            <h2 className="text-lg font-semibold">素材库</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索素材..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            className={`
              flex-1 py-3 px-4 font-medium text-sm transition-colors
              ${activeTab === 'image'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
            onClick={() => setActiveTab('image')}
          >
            <Image className="w-4 h-4 inline mr-2" />
            图片
          </button>
          <button
            className={`
              flex-1 py-3 px-4 font-medium text-sm transition-colors
              ${activeTab === 'video'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
            onClick={() => setActiveTab('video')}
          >
            <Video className="w-4 h-4 inline mr-2" />
            视频
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
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
              className="text-sm border rounded px-2 py-1"
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
              <span className="text-sm text-gray-500">
                已选 {selectedMaterials.length} 项
              </span>
              <button
                onClick={handleBatchDelete}
                className="p-1 rounded hover:bg-red-50 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-gray-500 hover:text-gray-700"
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-12">
              <MaterialsIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无{activeTab === 'image' ? '图片' : '视频'}素材</p>
              <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">
                <Plus className="w-4 h-4 inline mr-1" />
                添加素材
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
              {filteredMaterials.map(renderMaterialItem)}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t">
          <button className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            从项目导入素材
          </button>
        </div>
      </div>
    </>
  );
}