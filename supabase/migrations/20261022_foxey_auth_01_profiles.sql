-- FOXEY-AUTH-01: Account identity. Room policies remain unchanged.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or (char_length(trim(display_name)) between 1 and 40)),
  avatar integer check (avatar is null or avatar between 0 and 11),
  role text not null default 'student' check (role in ('student', 'teacher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Role and timestamps cannot be changed by the browser client.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar) on public.profiles to authenticated;

create or replace function public.create_foxey_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_foxey_auth_user_created after insert on auth.users for each row execute function public.create_foxey_profile();

create or replace function public.touch_foxey_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger on_foxey_profile_updated before update on public.profiles for each row execute function public.touch_foxey_profile();

insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

revoke execute on function public.create_foxey_profile() from public, anon, authenticated;
revoke execute on function public.touch_foxey_profile() from public, anon, authenticated;
