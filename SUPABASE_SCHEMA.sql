-- 1. Update the profiles table
-- We use 'IF NOT EXISTS' so it won't error if you already created the table
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add the new Time-Based Subscription fields
-- This command is safe to run even if the table already exists
alter table public.profiles 
  add column if not exists subscription_tier text default 'free',
  add column if not exists subscription_expires_at timestamp with time zone;

-- 3. Enable Security (Safe to re-run)
alter table public.profiles enable row level security;

do $$ begin
  create policy "Public profiles are viewable by everyone."
    on profiles for select using ( true );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own profile."
    on profiles for update using ( auth.uid() = id );
exception when duplicate_object then null; end $$;

-- 4. Update the Function (Using CREATE OR REPLACE to fix your error)
-- This will overwrite the existing function with the correct version, so no need to delete it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- 5. Re-bind the trigger (Drop first to avoid error)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
