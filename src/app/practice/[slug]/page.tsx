import { notFound } from "next/navigation";
import { loadProblems } from "@/lib/practice/server";
import PracticeEditor from "@/components/PracticeEditor";
export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [problem] = await loadProblems(slug);
  if (!problem) notFound();
  return <PracticeEditor key={problem.id} problem={problem} />;
}
