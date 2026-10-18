-- CHECKMATE CHESS CLUB: Supabase SQL setup
-- Run this in Supabase Dashboard > SQL Editor.
-- Public website keys are safe to use with RLS; never expose a service_role key.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Club member' check (char_length(display_name) between 1 and 32),
  level text not null default 'Beginner' check (level in ('Beginner','Intermediate','Advanced')),
  bio text not null default '' check (char_length(bio) <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are visible to club members" on public.profiles;
create policy "Profiles are visible to club members"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Members can create their own profile" on public.profiles;
create policy "Members can create their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Members can update their own profile" on public.profiles;
create policy "Members can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- The first release stores profiles and provides public account registration.
-- Add events, chat, matchmaking, and chess games only after designing access policies
-- and server-side validation. Do not trust client-submitted ratings or game results.