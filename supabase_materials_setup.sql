-- Create materials table for the 'Selection Library'
create table if not exists public.materials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  project_id text, -- Optional, to link to a specific project context
  type text not null check (type in ('image', 'video')),
  url text not null, -- The Google/Cloud URL
  thumbnail_url text,
  prompt text,
  meta jsonb default '{}'::jsonb, -- Store extra metadata like aspectRatio, seed, flow IDs
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.materials enable row level security;

-- Policies
create policy "Users can view their own materials"
  on public.materials for select
  using (auth.uid() = user_id);

create policy "Users can insert their own materials"
  on public.materials for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own materials"
  on public.materials for update
  using (auth.uid() = user_id);

create policy "Users can delete their own materials"
  on public.materials for delete
  using (auth.uid() = user_id);

-- Create index for faster queries
create index if not exists materials_user_id_idx on public.materials (user_id);
create index if not exists materials_project_id_idx on public.materials (project_id);
create index if not exists materials_type_idx on public.materials (type);
