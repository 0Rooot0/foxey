import { loadProblems } from "@/lib/practice/server";
import ProblemLibrary from "@/components/ProblemLibrary";
export default async function PracticePage() {
  return <ProblemLibrary problems={await loadProblems()} />;
}
