# 提示词库 (Prompt Library) 数据设计

本文档描述了提示词库功能的数据库设计方案 (基于 Supabase) 以及相关的 API 数据格式。

## 1. 数据库设计 (Supabase)

我们需要两张表来分别存储**系统提示词**和**用户自定义提示词**。

### 1.1 系统提示词表 (`system_prompts`)
存储管理员配置的、所有用户可见的预设提示词。

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | 唯一标识符 |
| `title` | `text` | Not Null | 提示词标题 (如 "电影质感") |
| `content` | `text` | Not Null | 提示词内容 (如 "cinematic lighting...") |
| `cover_image` | `text` | Nullable | 封面图片 URL |
| `category` | `text` | Nullable | 分类 (如 "摄影", "动漫", "3D") |
| `sort_order` | `integer` | Default: 0 | 排序权重 (数字越小越靠前) |
| `created_at` | `timestamptz` | Default: `now()` | 创建时间 |
| `updated_at` | `timestamptz` | Default: `now()` | 更新时间 |

### 1.2 用户提示词表 (`user_prompts`)
存储用户自己创建的提示词。

| 字段名 | 类型 | 约束 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, Default: `gen_random_uuid()` | 唯一标识符 |
| `user_id` | `uuid` | Not Null, Foreign Key -> `auth.users.id` | 关联的用户 ID (RLS 关键字段) |
| `title` | `text` | Not Null | 提示词标题 |
| `content` | `text` | Not Null | 提示词内容 |
| `cover_image` | `text` | Nullable | 封面图片 URL (预留功能) |
| `created_at` | `timestamptz` | Default: `now()` | 创建时间 |
| `updated_at` | `timestamptz` | Default: `now()` | 更新时间 |

---

## 2. SQL 建表语句

请在 Supabase 的 SQL Editor 中运行以下 SQL 语句来创建表并设置权限 (RLS)。

```sql
-- ==========================================
-- 1. 创建系统提示词表
-- ==========================================
create table system_prompts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  cover_image text,
  category text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 开启 RLS
alter table system_prompts enable row level security;

-- 策略：所有人可读
create policy "Public system prompts are viewable by everyone"
  on system_prompts for select
  using ( true );

-- 策略：仅管理员可写 (这里假设只有 service_role 或特定用户能写，暂时仅开放读)
-- 如果需要后台管理，需添加 insert/update/delete 策略

-- ==========================================
-- 2. 创建用户提示词表
-- ==========================================
create table user_prompts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  cover_image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 开启 RLS
alter table user_prompts enable row level security;

-- 策略：用户只能看到自己的提示词
create policy "Users can view their own prompts"
  on user_prompts for select
  using ( auth.uid() = user_id );

-- 策略：用户只能插入自己的提示词
create policy "Users can insert their own prompts"
  on user_prompts for insert
  with check ( auth.uid() = user_id );

-- 策略：用户只能更新自己的提示词
create policy "Users can update their own prompts"
  on user_prompts for update
  using ( auth.uid() = user_id );

-- 策略：用户只能删除自己的提示词
create policy "Users can delete their own prompts"
  on user_prompts for delete
  using ( auth.uid() = user_id );

-- ==========================================
-- 3. 插入一些初始数据 (可选)
-- ==========================================
insert into system_prompts (title, content, category, cover_image, sort_order) values
('电影质感', 'cinematic lighting, 8k, highly detailed, dramatic atmosphere, depth of field, movie still, color graded', '摄影', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80', 1),
('吉卜力风格', 'studio ghibli style, anime, vibrant colors, detailed background, whimsical, hand drawn, cel shaded', '动漫', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&q=80', 2),
('赛博朋克', 'cyberpunk, neon lights, futuristic city, high tech, night time, rain, reflections, sci-fi', '科幻', 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=500&q=80', 3),
('极简主义', 'minimalist, clean lines, simple background, pastel colors, flat design, vector art, high contrast', '设计', 'https://images.unsplash.com/photo-1507643179173-442727e34e3b?w=500&q=80', 4),
('胶片摄影', '35mm film photography, kodak portra 400, grain, vintage look, light leaks, nostalgic, soft focus', '摄影', 'https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?w=500&q=80', 5),
('3D 渲染', '3d render, unreal engine 5, ray tracing, octane render, hyperrealistic, plastic texture, studio lighting', '3D', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&q=80', 6);
```

---

## 3. API 数据格式

前端与后端交互时的数据接口定义（Typescript 接口）。

```typescript
// 单个提示词对象
export interface PromptItem {
  id: string;          // UUID
  title: string;       // 标题
  content: string;     // 提示词内容
  coverImage?: string; // 封面图 URL (可选)
  category?: string;   // 分类 (仅系统提示词有)
  createdAt: string;   // ISO 时间字符串
}

// API 响应结构：获取系统提示词
// GET /api/prompts/system
export type SystemPromptsResponse = PromptItem[];

// API 响应结构：获取用户提示词
// GET /api/prompts/user
export type UserPromptsResponse = PromptItem[];

// API 请求结构：创建/更新用户提示词
// POST /api/prompts/user (创建)
// PUT /api/prompts/user/[id] (更新)
export interface UpsertUserPromptRequest {
  title: string;
  content: string;
  coverImage?: string;
}
```

