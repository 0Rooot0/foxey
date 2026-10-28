# Companies

## Behavior

`/companies` lists published companies and their published problem counts.
`/companies/[slug]` supports title, difficulty and topic filters, plus title or
difficulty sorting. Cards open the existing Practice editor. Intentionally blocked
runners show a compact `Visible Run unavailable` badge from shared contract metadata;
cards remain clickable and the editor keeps its detailed reason.
Unknown or unpublished companies show Company not found. Database failures show a
retry screen; empty companies show an explicit empty state.

## Schema

Apply `202610270001_companies.sql`, then `202610270002_companies_seed.sql`, after
Practice migrations and explicit hosted-database review and approval. Until applied,
Companies shows its unavailable screen; Practice remains independent.
`companies` and `problem_companies` use a composite association key and cascading
foreign keys. RLS permits anonymous/authenticated reads of published companies and
problems only, with no client writes. Associations retain a source URL and review date.

## Provenance

The seed keeps four associations: Amazon → Two Number Sum and Merge Sorted Lists;
Microsoft → Two Number Sum; Meta → Valid Brackets. Association and algorithm identity
were reviewed on October 27, 2026 against the Amazon, Microsoft and Meta `5. All.csv`
files in [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems/tree/2b71796266751b4736a7ef180efb6847879166ee).
The migration pins each company CSV to that revision. Two Sum maps to Two Number Sum,
Merge Two Sorted Lists to Merge Sorted Lists, and Valid Parentheses to Valid Brackets.
These are unverified community reports, may be outdated, and imply no frequency or
interview likelihood. No third-party statements, examples, explanations, solutions
or frequency data are imported. Foxey content and runner contracts remain unchanged.
Company names use neutral Foxey styling, without logos or affiliation/endorsement claims.

## Maintenance and limits

Review association identity, pinned source URLs and review dates when changing the
seed. Keep problem wording original and review execution contracts separately.
Check publication RLS, duplicate pairs, foreign keys and seed prerequisites when
changing migrations. Run lint, full tests, build, TypeScript and whitespace checks;
verify company filters, links, empty/error states and blocked-Run badges.
Hints, solutions, hidden tests, trusted Submit, frequency claims, progress and bulk
imports remain outside this phase. Hosted migrations and production verification
require a separate approved rollout.
