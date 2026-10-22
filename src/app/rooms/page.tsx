"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import FoxeyBrand from "@/components/FoxeyBrand";
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
  const stored = useSyncExternalStore(subscribe, readRooms, () => "[]");
  let rooms: RecentRoom[] = [];
  try {
    const value = JSON.parse(stored);
    if (Array.isArray(value)) rooms = value.filter((r) => typeof r?.id === "string" && typeof r?.name === "string");
  } catch {}
  return <main className="home">
    <header className="home-header"><Link href="/" aria-label="Foxey home"><FoxeyBrand /></Link><ThemeToggle /></header>
    <section className="classroom-section">
      <div><p className="eyebrow">Your classroom</p><h1>Rooms</h1><p>Return to a recent room or start coding together.</p>
        <ul>{rooms.map((room) => <li key={room.id}><Link href={`/room/${encodeURIComponent(room.id)}?name=${encodeURIComponent(room.name)}`}>{room.name || room.id}</Link></li>)}</ul>
        {!rooms.length && <p>Rooms you visit on this browser will appear here.</p>}
      </div>
      <div className="room-card"><h2>Join a coding room</h2>
        <form onSubmit={(event) => { event.preventDefault(); const id = String(new FormData(event.currentTarget).get("id") || "").trim(); if (id) router.push(`/room/${encodeURIComponent(id)}`); }}>
          <label htmlFor="room-id">Room ID</label><input id="room-id" name="id" required /><button className="button">Join →</button>
        </form><div className="room-divider">or create a room</div>
        <form onSubmit={(event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get("name") || "").trim(); if (name) router.push(`/room/${crypto.randomUUID()}?name=${encodeURIComponent(name)}`); }}>
          <label htmlFor="room-name">Room name</label><input id="room-name" name="name" required maxLength={80} /><button className="button button-primary">Create room</button>
        </form>
      </div>
    </section>
  </main>;
}
