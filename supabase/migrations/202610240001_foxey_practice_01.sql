begin;
create table public.problems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  starter_code_python text not null,
  starter_code_javascript text not null,
  constraints text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.problem_tags (
  problem_id uuid not null references public.problems(id) on delete cascade,
  tag text not null check (length(trim(tag)) > 0),
  primary key (problem_id, tag)
);
create index problems_published_title_idx on public.problems(title) where published;
create index problem_tags_tag_idx on public.problem_tags(tag);
create function public.touch_problem_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger problems_updated_at before update on public.problems for each row execute function public.touch_problem_updated_at();
alter table public.problems enable row level security;
alter table public.problem_tags enable row level security;
revoke all on public.problems, public.problem_tags from anon, authenticated;
grant select on public.problems, public.problem_tags to anon, authenticated;
create policy "Read published problems" on public.problems for select to anon, authenticated using (published);
create policy "Read published problem tags" on public.problem_tags for select to anon, authenticated using (exists (select 1 from public.problems p where p.id = problem_id and p.published));
revoke execute on function public.touch_problem_updated_at() from public, anon, authenticated;
commit;
