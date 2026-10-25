import { createClient } from "@supabase/supabase-js";
import {
  isDifficulty,
  type Problem,
} from "./problems";

function isProblem(value: unknown): value is Problem {
  if (!value || typeof value !== "object") return false;

  const problem = value as Record<string, unknown>;

  return (
    typeof problem.id === "string" &&
    typeof problem.slug === "string" &&
    typeof problem.title === "string" &&
    typeof problem.description === "string" &&
    typeof problem.difficulty === "string" &&
    isDifficulty(problem.difficulty) &&
    typeof problem.starter_code_python === "string" &&
    typeof problem.starter_code_javascript === "string" &&
    typeof problem.constraints === "string" &&
    Array.isArray(problem.problem_tags) &&
    problem.problem_tags.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { tag?: unknown }).tag === "string",
    )
  );
}

// Always use public access, independent of the visitor's authentication session.
export async function loadProblems(slug?: string): Promise<Problem[]> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, options) =>
          fetch(url, {
            ...options,
            cache: "no-store",
          }),
      },
    },
  );

  let query = client
    .from("problems")
    .select(
      "id,slug,title,description,difficulty,starter_code_python,starter_code_javascript,constraints,problem_tags(tag)",
    )
    .eq("published", true)
    .order("title");

  if (slug) {
    query = query.eq("slug", slug);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      "Practice content is unavailable. Please try again later.",
    );
  }

  if (!Array.isArray(data) || !data.every(isProblem)) {
    throw new Error(
      "Practice content is unavailable. Please try again later.",
    );
  }

  return data;
}