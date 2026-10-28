begin;
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) > 0),
  published boolean not null default false
);
create table public.problem_companies (
  company_id uuid not null references public.companies(id) on delete cascade,
  problem_id uuid not null references public.problems(id) on delete cascade,
  -- Reference for association and algorithm identity only, never problem content.
  source_url text not null check (source_url like 'https://%'),
  reviewed_on date not null,
  primary key (company_id, problem_id)
);
create index problem_companies_problem_id_idx on public.problem_companies(problem_id);
alter table public.companies enable row level security;
alter table public.problem_companies enable row level security;
revoke all on public.companies, public.problem_companies from anon, authenticated;
grant select on public.companies, public.problem_companies to anon, authenticated;
create policy "Read published companies" on public.companies
  for select to anon, authenticated using (published);
create policy "Read published company problems" on public.problem_companies
  for select to anon, authenticated using (
    exists (select 1 from public.companies c where c.id = company_id and c.published)
    and exists (select 1 from public.problems p where p.id = problem_id and p.published)
  );
commit;
