"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AvatarChoices from "./AvatarChoices";
import CodeWorkspace from "./CodeWorkspace";
import AccountNav from "./AccountNav";
import { useAuth } from "./AuthProvider";
import { profileIdentity } from "@/lib/auth/profile";
import { readIdentity, rememberIdentity, type Identity } from "@/lib/collaboration/participants";
import "./workspace.css";

export default function WorkspaceEntry({ roomId, roomName }: { roomId?: string; roomName?: string }) {
  const router = useRouter();
  const { user, profile, loading: authLoading, error: profileError, saveIdentity } = useAuth();
  const [entryError, setEntryError] = useState("");
  const [ready, setReady] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(6);
  const [newRoomName, setNewRoomName] = useState(roomName || "");
  const [creating, setCreating] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = user && profile ? profileIdentity(profile) : readIdentity();
      setIdentity(saved);
      setName(saved?.name || "");
      setAvatar(saved?.avatar ?? 6);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user, profile, authLoading]);

  if (!ready || authLoading) return <main className="edu avatar-entry"><p role="status">Preparing your workspace…</p></main>;
  if (roomId && identity) return <CodeWorkspace roomId={roomId} roomName={roomName} initialIdentity={identity} />;

  return <main className="edu avatar-entry">
    <form className="avatar-entry-card" onSubmit={async (event) => {
      event.preventDefault();
      const next = identity || { name: name.trim().slice(0, 40), avatar };
      if (!next.name || submitted.current) return;
      submitted.current = true;
      try {
        if (!identity) {
          if (user && profile) await saveIdentity(next);
          else rememberIdentity(next);
        }
      } catch (cause) {
        setEntryError(cause instanceof Error ? cause.message : "Could not save your identity.");
        submitted.current = false;
        return;
      }
      setIdentity(next);
      if (!roomId) {
        setCreating(true);
        const label = newRoomName.trim();
        router.push('/room/' + crypto.randomUUID() + (label ? '?name=' + encodeURIComponent(label) : ''));
      }
    }}>
      <AccountNav />
      <span className="avatar-entry-eyebrow">{roomName || "Foxey workspace"}</span>
      <h1>{roomId ? "Join this workspace" : "Start coding together"}</h1>
      {!identity ? <>
        <p>Your name and avatar appear to everyone in the room. You can change them in Settings.</p>
        <label htmlFor="room-display-name">Your name</label>
        <input id="room-display-name" autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required autoFocus placeholder="e.g. Ava" />
        <p>Choose an avatar, or keep the selected one.</p>
        <AvatarChoices selected={avatar} onSelect={setAvatar} />
      </> : <p>Joining as {identity.name}. You can change your name and avatar in Settings.</p>}
      {!roomId && <>
        <label htmlFor="new-room-name">Room name (optional)</label>
        <input id="new-room-name" value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} maxLength={80} placeholder="e.g. Python practice" />
        <p>Your workspace is ready for collaboration. Invite others whenever you like.</p>
      </>}
      {entryError && <p role="alert">{entryError}</p>}
      {user && profileError && <p role="status">Your account profile is unavailable right now. You can still create and join rooms with this browser identity.</p>}
      <button className="edu-button edu-run" type="submit" disabled={(!identity && !name.trim()) || creating}>{creating ? "Opening workspace…" : roomId ? "Enter room →" : "Start Coding →"}</button>
      <p><Link href="/">Back to home</Link></p>
    </form>
  </main>;
}
