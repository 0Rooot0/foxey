"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import AvatarChoices from "@/components/AvatarChoices";
import StudentAvatar from "@/components/StudentAvatar";
import FoxeyActivity from "@/components/FoxeyActivity";
import FoxeyBrand from "@/components/FoxeyBrand";
import AccountNav from "@/components/AccountNav";
import { ThemeToggle } from "@/components/ThemeProvider";
import type { Profile } from "@/lib/auth/profile";
import "./account.css";

export default function AccountPage() {
  const { user, profile, loading, error: profileError, signOut } = useAuth();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState("");
  return <main className="account-shell">
    <header className="account-header"><Link href="/" aria-label="Foxey home"><FoxeyBrand /></Link><AccountNav /></header>
    <div className="account-container">
      <div className="account-heading"><p className="account-eyebrow">Your Foxey space</p><h1>Account &amp; Profile</h1><p>Make your profile yours and manage your account in one place.</p></div>
      {loading ? <div className="account-panel"><p role="status">Loading your account…</p></div> : !user ? <div className="account-panel"><p><Link href="/auth/sign-in?next=/account">Sign in</Link> to manage your account.</p></div> : <>
        {profileError && <p role="alert" className="account-feedback error">{profileError}</p>}
        {profile ? <ProfileEditor key={profile.id} profile={profile} /> : !profileError && <div className="account-panel"><p role="status">Loading your profile…</p></div>}
        <div className="account-secondary-grid">
          <section className="account-panel">
            <div className="account-section-heading"><div><p className="account-eyebrow">Account</p><h2>Security</h2></div></div>
            <div className="account-detail-row"><span>Email</span><strong>{user.email || "No email available"}</strong></div>
            <p className="account-help">Use an email link to choose a new password.</p>
            <div className="account-actions"><Link className="account-button secondary" href="/auth/forgot">Change password</Link><button className="account-button quiet" type="button" onClick={async () => { setSignOutError(""); try { await signOut(); router.replace("/"); } catch { setSignOutError("Could not sign out. Please try again."); } }}>Sign Out</button></div>
            {signOutError && <p role="alert" className="account-feedback error">{signOutError}</p>}
          </section>
          <section className="account-panel">
            <div className="account-section-heading"><div><p className="account-eyebrow">Preferences</p><h2>Make it comfortable</h2></div></div>
            <div className="account-preference"><div><strong>Theme</strong><p>Choose a look for Foxey and the editor.</p></div><ThemeToggle /></div>
            <div className="account-preference"><div><strong>Identity on this device</strong><p>Your signed-in profile follows your account. This browser also remembers your name and avatar for guest rooms.</p></div></div>
          </section>
        </div>
        <section className="account-panel account-activity"><div className="account-section-heading"><div><p className="account-eyebrow">Foxey activity</p><h2>What you’ve been up to</h2></div></div><FoxeyActivity /></section>
      </>}
    </div>
  </main>;
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const { saveIdentity } = useAuth();
  const [name, setName] = useState(profile.display_name || "");
  const [avatar, setAvatar] = useState(profile.avatar ?? 6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  return <section className="account-panel" id="edit-profile">
    <div className="account-section-heading"><div><p className="account-eyebrow">Profile</p><h2>Your identity</h2></div><Link className="account-text-link" href="/profile">View profile →</Link></div>
    <div className="account-profile-preview"><StudentAvatar variant={avatar} name={name || "Your avatar"} size={76} /><div><strong>{name || "Add your name"}</strong><span className="role-badge">{profile.role}</span></div></div>
    <form className="account-form" onSubmit={async event => { event.preventDefault(); setError(""); setSaved(false); setBusy(true); try { await saveIdentity({ name, avatar }); setSaved(true); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your profile."); } finally { setBusy(false); } }}>
      <label htmlFor="profile-name">Display name</label><input id="profile-name" required maxLength={40} autoComplete="nickname" value={name} onChange={event => { setName(event.target.value); setSaved(false); }} />
      <p className="account-field-label">Choose your avatar</p><AvatarChoices selected={avatar} onSelect={value => { setAvatar(value); setSaved(false); }} />
      <div className="account-form-footer"><button className="account-button primary" type="submit" disabled={busy || !name.trim()}>{busy ? "Saving…" : "Save changes"}</button>{saved && <p role="status" className="account-feedback success">Changes saved to your profile.</p>}</div>
      {error && <p role="alert" className="account-feedback error">{error}</p>}
    </form>
  </section>;
}