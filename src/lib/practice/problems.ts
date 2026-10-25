export const difficulties = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof difficulties)[number];
export type Language = "python" | "javascript";
export type Problem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  starter_code_python: string;
  starter_code_javascript: string;
  constraints: string;
  problem_tags: { tag: string }[];
};
export function isDifficulty(value: string): value is Difficulty {
  return difficulties.some((item) => item === value);
}
export function starterCode(
  problem: Pick<Problem, "starter_code_python" | "starter_code_javascript">,
  language: Language,
) {
  return language === "python"
    ? problem.starter_code_python
    : problem.starter_code_javascript;
}
export function filterProblems(
  problems: Problem[],
  search: string,
  difficulty: string,
  topic: string,
) {
  return problems.filter(
    (problem) =>
      problem.title.toLowerCase().includes(search.trim().toLowerCase()) &&
      (!difficulty || problem.difficulty === difficulty) &&
      (!topic || problem.problem_tags.some(({ tag }) => tag === topic)),
  );
}
export function problemTopics(problems: Problem[]) {
  return [
    ...new Set(
      problems.flatMap((problem) => problem.problem_tags.map(({ tag }) => tag)),
    ),
  ].sort();
}
