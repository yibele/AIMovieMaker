'use client';

import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';

// 模拟项目数据类型
interface Project {
  id: string;
  title: string;
  thumbnail?: string;
  createdAt: string;
  sceneCount?: number;
}

// 模拟数据（实际使用时会从 API 获取）
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Nov 11 - 12:42',
    thumbnail: '/api/placeholder/400/300',
    createdAt: '2024-11-11T12:42:00Z',
    sceneCount: 3,
  },
  {
    id: '2',
    title: 'Nov 05 - 21:36',
    thumbnail: '/api/placeholder/400/300',
    createdAt: '2024-11-05T21:36:00Z',
    sceneCount: 5,
  },
  {
    id: '3',
    title: 'Nov 05 - 15:47',
    thumbnail: '/api/placeholder/400/300',
    createdAt: '2024-11-05T15:47:00Z',
    sceneCount: 2,
  },
];

export default function ProjectsHome() {
  const [projects, setProjects] = useState<Project[]>(mockProjects);

  // 新建项目（暂时只是模拟）
  const handleCreateProject = () => {
    const now = new Date();
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: `${now.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
      createdAt: now.toISOString(),
      sceneCount: 0,
    };
    setProjects([newProject, ...projects]);
    console.log('创建项目:', newProject);
  };

  // 打开项目（暂时只是模拟）
  const handleOpenProject = (projectId: string) => {
    console.log('打开项目:', projectId);
    // 后续这里会跳转到 Canvas 页面
  };

  return (
    <div className="w-full h-full overflow-auto relative">
      {/* 简单的浅灰色背景 */}
      <div className="min-h-full bg-gray-100">
        
        {/* 巨大的 Banner - 视频背景 */}
        <div className="relative w-full h-[420px] overflow-hidden rounded-[24px]">
          {/* 背景视频 - 循环播放 */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover rounded-[24px]"
          >
            <source
              src="https://www.gstatic.com/aitestkitchen/website/flow/banners/flow31_bg_05905f5a.mp4"
              type="video/mp4"
            />
          </video>
          
          {/* 渐变遮罩层 - 让文字更清晰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent rounded-[24px]" />
          
          {/* Banner 内容 */}
          <div className="relative h-full flex flex-col items-start justify-center max-w-7xl mx-auto px-8">
            <div className="max-w-3xl">
              {/* 标题 */}
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">
                AI Movie Maker
              </h1>
              
              {/* 副标题 */}
              <p className="text-xl md:text-2xl text-white/95 leading-relaxed font-medium drop-shadow-lg">
                使用 AI 技术创作惊艳的视频内容，让创意无限延伸
              </p>
            </div>
          </div>
        </div>

        {/* 项目列表区域 */}
        <div className="w-full mx-auto px-8 py-12">
          {/* 项目网格 - 只显示现有项目 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group aspect-[4/3] rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer relative bg-white"
                onClick={() => handleOpenProject(project.id)}
              >
                {/* 项目缩略图 */}
                <div className="w-full h-[70%] bg-gray-200 relative overflow-hidden">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // 无缩略图时显示占位符
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <FolderOpen className="w-12 h-12 text-gray-400" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                {/* 项目信息 */}
                <div className="h-[30%] px-4 py-3 flex flex-col justify-center bg-white">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {project.title}
                  </h3>
                  {project.sceneCount !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      {project.sceneCount} 个场景
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 空状态提示 */}
          {projects.length === 0 && (
            <div className="mt-12 text-center">
              <div className="inline-block px-8 py-6 rounded-xl bg-white shadow">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-gray-700 text-base font-medium mb-1">
                  还没有项目
                </p>
                <p className="text-gray-500 text-sm">
                  点击下方按钮创建你的第一个项目
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部间距 */}
        <div className="h-32" />
      </div>

      {/* 底部中间悬浮的新建项目按钮 - 大卡片式毛玻璃 */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={handleCreateProject}
          className="group flex flex-col items-center justify-center gap-3 w-[250px] h-[132px] rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-2xl hover:bg-white/60 hover:shadow-3xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {/* 加号图标 */}
          <Plus className="w-8 h-8 text-gray-600" strokeWidth={2} />
          
          {/* 文字 */}
          <span className="text-gray-700 font-medium text-base">
            新建项目
          </span>
        </button>
      </div>
    </div>
  );
}

