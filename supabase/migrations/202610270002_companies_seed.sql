-- Small editorial seed: community-reported associations, not verified interview claims.
-- Only company names, associations and underlying algorithm identities were researched.
-- Existing original Foxey statements, examples, difficulty and execution contracts are unchanged.
begin;
insert into public.companies (slug, name, published) values
  ('amazon', 'Amazon', true), ('meta', 'Meta', true), ('microsoft', 'Microsoft', true);

-- Fail visibly if this seed is run without the expected Practice catalog.
do $$
begin
  if (select count(*) from public.problems where slug in
    ('two-number-sum', 'merge-sorted-lists', 'valid-brackets')) <> 3 then
    raise exception 'Companies seed requires the three existing Practice problems';
  end if;
end;
$$;

insert into public.problem_companies (company_id, problem_id, source_url, reviewed_on)
select c.id, p.id,
  'https://github.com/liquidslr/leetcode-company-wise-problems/blob/2b71796266751b4736a7ef180efb6847879166ee/'
    || seed.source_company || '/5.%20All.csv',
  date '2026-10-27'
from (values
  ('amazon', 'two-number-sum', 'Amazon'),
  ('amazon', 'merge-sorted-lists', 'Amazon'),
  ('microsoft', 'two-number-sum', 'Microsoft'),
  ('meta', 'valid-brackets', 'Meta')
) as seed(company_slug, problem_slug, source_company)
join public.companies c on c.slug = seed.company_slug
join public.problems p on p.slug = seed.problem_slug;
commit;
