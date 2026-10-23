"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import FoxeyBrand from "@/components/FoxeyBrand";
import AccountNav from "@/components/AccountNav";
import { publicRoomClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeProvider";
import "../home.css";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function readRooms() {
  try { return localStorage.getItem("foxey-recent-rooms") || "[]"; } catch { return "[]"; }
}
type RecentRoom = { id: string; name: string };
export default function RoomsPage() {
  const router = useRouter();
  const [joinError, setJoinError] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const stored = useSyncExternalStore(subscribe, readRooms, () => "[]");
  let rooms: RecentRoom[] = [];
  try {
    const value = JSON.parse(stored);
    if (Array.isArray(value)) rooms = value.filter((r) => typeof r?.id === "string" && typeof r?.name === "string");
  } catch {}

  async function handleJoinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get("id") || "").trim();
    if (!id || joiningRoom) return;
    setJoinError("");
    setJoiningRoom(true);
    try {
      const { data, error } = await publicRoomClient.from("room_states").select("room_id").eq("room_id", id).maybeSingle();
      if (error) { setJoinError("Could not check the room. Please try again."); return; }
      if (!data) { setJoinError("Room not found. Check the room ID or use an invite link."); return; }
      router.push(`/room/${encodeURIComponent(id)}`);
    } catch {
      setJoinError("Could not check the room. Please try again.");
    } finally {
      setJoiningRoom(false);
    }
  }

  return <main className="home">
    <header className="home-header"><Link href="/" aria-label="Foxey home"><FoxeyBrand /></Link><ThemeToggle /><AccountNav /></header>
    <section className="classroom-section">
      <div><p className="eyebrow">Your classroom</p><h1>Rooms</h1><p>Return to a recent room or start coding together.</p>
        <ul>{rooms.map((room) => <li key={room.id}><Link href={`/room/${encodeURIComponent(room.id)}?name=${encodeURIComponent(room.name)}`}>{room.name || room.id}</Link></li>)}</ul>
        {!rooms.length && <p>Rooms you visit on this browser will appear here.</p>}
      </div>
      <div className="room-card"><h2>Create a Room</h2><p>Name your room so classmates know where to meet.</p>
        <form className="room-create-form" onSubmit={(event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get("name") || "").trim(); if (name) router.push(`/code?name=${encodeURIComponent(name)}`); }}>
          <label htmlFor="room-name">Room name</label><input id="room-name" name="name" required maxLength={80} placeholder="e.g. Python classroom" /><button type="submit" className="button button-primary full-width">Create Room →</button>
        </form>
        <div className="room-divider">or join an existing room</div>
        <h2 className="room-join-heading">Join a Room</h2>
        <form onSubmit={handleJoinRoom}>
          <label htmlFor="room-id">Room ID</label><input id="room-id" name="id" required onChange={() => setJoinError("")} /><button type="submit" className="button" disabled={joiningRoom}>{joiningRoom ? "Checking..." : "Join →"}</button>
        </form>
        {joinError && <p role="alert" className="room-error">{joinError}</p>}
      </div>
    </section>
  </main>;
}
