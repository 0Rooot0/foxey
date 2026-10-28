import type { Problem } from "../practice/problems";

export type CompanyProblem = Pick<Problem, "id" | "slug" | "title" | "difficulty" | "problem_tags">;
export type Company = { id: string; slug: string; name: string; problems: CompanyProblem[] };

export function isCompanySlug(slug: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

export function companyHref(slug: string) {
  if (!isCompanySlug(slug)) throw new Error("Invalid company slug");
  return `/companies/${slug}`;
}

export function sortCompanyProblems(problems: CompanyProblem[], sort: string) {
  const rank = { easy: 0, medium: 1, hard: 2 };
  return [...problems].sort((a, b) => {
    const difference = rank[a.difficulty] - rank[b.difficulty];
    if (sort === "difficulty-asc" && difference) return difference;
    if (sort === "difficulty-desc" && difference) return -difference;
    return a.title.localeCompare(b.title) || a.slug.localeCompare(b.slug);
  });
}

// Validate the public query shape before rendering. Do not silently hide bad data.
export function mapCompanies(data: unknown): Company[] {
  const invalid = () => { throw new Error("Company content is unavailable."); };
  if (!Array.isArray(data)) return invalid();
  return data.map((row) => {
    if (!row || typeof row !== "object" || typeof row.id !== "string" ||
        typeof row.slug !== "string" || !isCompanySlug(row.slug) ||
        typeof row.name !== "string" || !row.name.trim() ||
        !Array.isArray(row.problem_companies)) return invalid();
    const problems = new Map<string, CompanyProblem>();
    for (const entry of row.problem_companies) {
      if (!entry || typeof entry !== "object" || !("problems" in entry)) return invalid();
      const p = entry.problems;
      // RLS can hide an unpublished problem on a left join.
      if (p === null) continue;
      if (!p || typeof p !== "object" || typeof p.id !== "string" ||
          typeof p.slug !== "string" || !isCompanySlug(p.slug) ||
          typeof p.title !== "string" || !p.title.trim() ||
          !["easy", "medium", "hard"].includes(p.difficulty) ||
          !Array.isArray(p.problem_tags) || !p.problem_tags.every(
            (tag: unknown) => !!tag && typeof tag === "object" &&
              "tag" in tag && typeof tag.tag === "string",
          )) return invalid();
      problems.set(p.id, p as CompanyProblem);
    }
    return { id: row.id, slug: row.slug, name: row.name,
      problems: sortCompanyProblems([...problems.values()], "title") };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
