import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCompanies } from "@/lib/companies/server";
import ProblemLibrary from "@/components/ProblemLibrary";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [company] = await loadCompanies(slug);
  if (!company) notFound();
  return (
    <>
      <Link href="/companies">← All companies</Link>
      <ProblemLibrary problems={company.problems} companyName={company.name} />
    </>
  );
}
