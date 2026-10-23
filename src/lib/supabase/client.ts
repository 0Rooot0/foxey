import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

// Public rooms remain accessible when a visitor also has a Foxey account.
export const publicRoomClient = createClient(
  supabaseUrl,
  supabasePublishableKey,
  { auth: { storageKey: "foxey-public-rooms", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);
