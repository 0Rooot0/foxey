import { createClient } from "@supabase/supabase-js";
import { isCompanySlug, mapCompanies, type Company } from "./companies";

export async function loadCompanies(slug?: string): Promise<Company[]> {
  if (slug !== undefined && !isCompanySlug(slug)) return [];
  // Public catalog access never uses the visitor's authentication session.
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
    },
  );
  let query = client.from("companies").select(
    "id,slug,name,problem_companies(problems(id,slug,title,difficulty,problem_tags(tag)))",
  ).eq("published", true).order("name");
  if (slug) query = query.eq("slug", slug);
  const { data, error } = await query;
  if (error) throw new Error("Company content is unavailable.");
  return mapCompanies(data);
}
