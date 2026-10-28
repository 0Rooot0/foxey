import Link from "next/link";
import { loadCompanies } from "@/lib/companies/server";
import { companyHref } from "@/lib/companies/companies";

export default async function CompaniesPage() {
  const companies = await loadCompanies();
  return (
    <>
      <p className="practice-eyebrow">Find your next focus.</p>
      <h1>Companies</h1>
      <p>Explore original Foxey problems by company association and build your interview skills.</p>
      <p>Associations come from community reports and may be incomplete or outdated.
        They are not verified interview questions. Foxey is not affiliated with or endorsed by these companies.</p>
      <div className="problem-list">
        {companies.map((company) => (
          <Link className="problem-card" key={company.id} href={companyHref(company.slug)}>
            <h2>{company.name}</h2>
            <p>{company.problems.length} {company.problems.length === 1 ? "problem" : "problems"}</p>
            <span>Explore problems →</span>
          </Link>
        ))}
      </div>
      {!companies.length && <p>No companies published yet. Check back soon.</p>}
    </>
  );
}
