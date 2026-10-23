"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";
import "@/app/auth/auth.css";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";

export default function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headings: Record<Mode, string> = { "sign-in": "Sign in to Foxey", "sign-up": "Create your account", forgot: "Reset your password", reset: "Choose a new password" };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "sign-up") {
        if (password !== confirm) throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } });
        if (error) throw error;
        if (data.session) router.push("/account");
        else setMessage("Check your email to confirm your account, then sign in.");
      } else if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset` });
        if (error) throw error;
        setMessage("If that email has an account, a password reset link is on its way.");
      } else {
        if (password !== confirm) throw new Error("Passwords do not match.");
        if (!user) throw new Error("Open the reset link from your email first.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. You can continue to your account.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><div className="auth-card">
    <Link href="/">← Foxey home</Link><h1>{headings[mode]}</h1>
    <form onSubmit={submit}>
      {mode !== "reset" && <><label htmlFor="auth-email">Email</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></>}
      {mode !== "forgot" && <><label htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}</label><input id="auth-password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={event => setPassword(event.target.value)} /></>}
      {(mode === "sign-up" || mode === "reset") && <><label htmlFor="auth-confirm">Confirm password</label><input id="auth-confirm" type="password" autoComplete="new-password" required minLength={6} value={confirm} onChange={event => setConfirm(event.target.value)} /></>}
      <button type="submit" disabled={busy || (mode === "reset" && authLoading)}>{busy ? "Please wait…" : mode === "sign-up" ? "Sign Up" : mode === "sign-in" ? "Sign In" : mode === "forgot" ? "Send reset link" : "Update password"}</button>
    </form>
    {error && <p role="alert" className="auth-error">{error}</p>}{message && <p role="status">{message}</p>}
    {mode === "sign-in" && <p><Link href="/auth/forgot">Forgot password?</Link> · <Link href="/auth/sign-up">Create an account</Link></p>}
    {mode === "sign-up" && <p>Already have an account? <Link href="/auth/sign-in">Sign In</Link></p>}
    {mode === "forgot" && <p><Link href="/auth/sign-in">Back to Sign In</Link></p>}
    {mode === "reset" && <p><Link href="/account">Go to account</Link></p>}
  </div></main>;
}
