-- Create a table for user profiles linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  phone_number text,
  gender text,
  date_of_birth date,
  age integer,
  height_cm numeric,
  weight_kg numeric,
  blood_group text,
  avatar_url text,
  activity_level text,
  profession text,
  profile_completed boolean not null default false,
  fitness_goals text,

  constraint username_length check (char_length(username) >= 3)
);

-- Keep existing projects compatible when this script is applied after the table exists.
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists height_cm numeric;
alter table public.profiles add column if not exists weight_kg numeric;
alter table public.profiles add column if not exists blood_group text;
alter table public.profiles add column if not exists activity_level text;
alter table public.profiles add column if not exists profession text;
alter table public.profiles add column if not exists profile_completed boolean not null default false;

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies for access control
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can view their own profile." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

create policy "Users can view their own profile." on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create a trigger function that automatically inserts a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function after user creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional uploaded avatars live here. The app creates a default SVG avatar when no file is chosen.
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own profile avatar." on storage.objects;
drop policy if exists "Users can update their own profile avatar." on storage.objects;
drop policy if exists "Public profile avatars are readable." on storage.objects;

create policy "Users can upload their own profile avatar." on storage.objects
  for insert with check (
    bucket_id = 'profile-avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own profile avatar." on storage.objects
  for update using (
    bucket_id = 'profile-avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public profile avatars are readable." on storage.objects
  for select using (bucket_id = 'profile-avatars');
