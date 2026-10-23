"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AccountNav from "@/components/AccountNav";
import FoxeyActivity from "@/components/FoxeyActivity";
import FoxeyBrand from "@/components/FoxeyBrand";
import StudentAvatar from "@/components/StudentAvatar";
import "../account/account.css";

function memberSince(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export default function ProfilePage() {
  const { user, profile, loading, error } = useAuth();
  return <main className="account-shell">
    <header className="account-header"><Link href="/" aria-label="Foxey home"><FoxeyBrand /></Link><AccountNav /></header>
    <div className="account-container">
      <nav className="account-back" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Profile</span></nav>
      {loading ? <div className="account-panel"><p role="status">Loading your profile…</p></div> : !user ? <div className="account-panel"><h1>Your Foxey profile</h1><p><Link href="/auth/sign-in?next=/profile">Sign in</Link> to see your profile.</p></div> : <>
        {error && <p role="alert" className="account-feedback error">{error}</p>}
        {profile ? <>
          <section className="profile-hero">
            <div className="profile-hero-top"><p className="account-eyebrow">Foxey member profile</p><Link className="account-button secondary" href="/account#edit-profile">Edit profile</Link></div>
            <div className="profile-hero-body"><div className="profile-avatar"><StudentAvatar variant={profile.avatar ?? 6} name={profile.display_name || "Account"} size={112} /></div><div className="profile-identity"><h1>{profile.display_name || "Add your name"}</h1><span className="role-badge">{profile.role}</span><p>Here to learn, build, and code together.</p></div></div>
            <div className="profile-facts"><div><span>Member since</span><strong>{memberSince(profile.created_at)}</strong></div><div><span>Email · visible only to you</span><strong>{user.email || "No email available"}</strong></div></div>
          </section>
          <section className="account-panel account-activity"><div className="account-section-heading"><div><p className="account-eyebrow">Your activity</p><h2>Your Foxey journey</h2><p>Only information Foxey currently keeps is shown here.</p></div></div><FoxeyActivity /></section>
        </> : !error && <div className="account-panel"><p role="status">Loading your profile…</p></div>}
      </>}
    </div>
  </main>;
}