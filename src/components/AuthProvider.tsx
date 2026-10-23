"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { identityToMigrate, normalizeIdentity, rememberProfileIdentity, type Profile } from "@/lib/auth/profile";
import type { Identity } from "@/lib/collaboration/participants";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  saveIdentity: (identity: Identity) => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let generation = 0;
    async function load(nextUser: User | null) {
      if (nextUser?.id && loadedUserId.current === nextUser.id) return;
      const current = ++generation;
      if (!active) return;
      setLoading(true);
      setUser(nextUser);
      setProfile(null);
      setError("");
      loadedUserId.current = null;
      if (nextUser) {
        const { data, error: readError } = await supabase.from("profiles").select("*").eq("id", nextUser.id).single();
        if (!active || current !== generation) return;
        if (readError || !data) setError(readError?.code === "PGRST205" ? "Your account is confirmed, but profiles are not set up yet. You can still use coding rooms." : "Your profile could not be loaded. Please try again.");
        else {
          let resolved = data as Profile;
          const migrated = identityToMigrate(resolved);
          if (migrated) {
            const { data: updated, error: updateError } = await supabase.from("profiles").update({ display_name: migrated.name, avatar: migrated.avatar }).eq("id", nextUser.id).select("*").single();
            if (!active || current !== generation) return;
            if (updateError || !updated) setError("Your saved identity could not be added to your profile.");
            else resolved = updated as Profile;
          }
          setProfile(resolved);
          rememberProfileIdentity(resolved);
          loadedUserId.current = nextUser.id;
        }
      }
      if (active && current === generation) setLoading(false);
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase warns against awaiting another Supabase call inside this callback.
      setTimeout(() => { void load(session?.user ?? null); }, 0);
    });
    void supabase.auth.getSession().then(({ data }) => { if (active && generation === 0) void load(data.session?.user ?? null); });
    return () => { active = false; generation++; listener.subscription.unsubscribe(); };
  }, []);

  const saveIdentity = useCallback(async (identity: Identity) => {
    if (!user) throw new Error("Sign in to save your profile.");
    const clean = normalizeIdentity(identity.name, identity.avatar);
    if (!clean) throw new Error("Enter a display name.");
    const { data, error: updateError } = await supabase.from("profiles").update({ display_name: clean.name, avatar: clean.avatar }).eq("id", user.id).select("*").single();
    if (updateError || !data) throw new Error(updateError?.message || "Could not save your profile.");
    setProfile(data as Profile);
    rememberProfileIdentity(data as Profile);
  }, [user]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setUser(null);
    setProfile(null);
    loadedUserId.current = null;
  }, []);

  return <AuthContext.Provider value={{ user, profile, loading, error, saveIdentity, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is missing.");
  return context;
}
