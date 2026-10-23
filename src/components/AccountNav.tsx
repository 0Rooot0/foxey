"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import StudentAvatar from "./StudentAvatar";
import "@/app/account/account.css";

export default function AccountNav() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  if (loading) return <span className="account-nav" aria-label="Loading account" />;
  if (!user) return <div className="account-nav"><Link href="/auth/sign-in">Sign In</Link><Link href="/auth/sign-up">Sign Up</Link></div>;
  return <div className="account-nav">
    <details className="account-menu">
      <summary className="account-menu-trigger">
        <StudentAvatar variant={profile?.avatar ?? 6} name={profile?.display_name || "Account"} size={30} />
        <span>{profile?.display_name || "Account"}</span><span aria-hidden="true">⌄</span>
      </summary>
      <div className="account-menu-panel">
        <Link href="/profile">Profile</Link>
        <Link href="/account">Account / Settings</Link>
        <button type="button" onClick={async () => { setError(""); try { await signOut(); router.replace("/"); } catch { setError("Could not sign out."); } }}>Sign Out</button>
      </div>
    </details>
    {error && <span role="alert" className="account-menu-error">{error}</span>}
  </div>;
}