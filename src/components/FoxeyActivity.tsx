"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type RecentRoom = { id: string; name: string };

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function readRooms() {
  try { return localStorage.getItem("foxey-recent-rooms") || "[]"; } catch { return "[]"; }
}

export default function FoxeyActivity() {
  const stored = useSyncExternalStore(subscribe, readRooms, () => "[]");
  let rooms: RecentRoom[] = [];
  try {
    const value = JSON.parse(stored);
    if (Array.isArray(value)) rooms = value.filter((room) => typeof room?.id === "string" && typeof room?.name === "string").slice(0, 5);
  } catch {}
  return <div className="activity-layout">
    <div className="activity-metrics">
      {["Rooms joined", "Rooms created", "Problems solved", "Learning progress"].map((label) =>
        <div className="activity-metric" key={label}><span>{label}</span><strong>Coming soon</strong></div>)}
    </div>
    <div className="activity-detail-grid">
      <section className="activity-detail">
        <h3>Recent rooms</h3>
        <p>Rooms opened on this browser. This history is saved on this device, not your account.</p>
        {rooms.length ? <ul>{rooms.map((room) => <li key={room.id}><Link href={`/room/${encodeURIComponent(room.id)}?name=${encodeURIComponent(room.name)}`}>{room.name}</Link></li>)}</ul> : <p className="activity-empty">No recent rooms on this browser yet.</p>}
      </section>
      <section className="activity-detail">
        <h3>Languages</h3>
        <p>Python and JavaScript are available in the editor. Personal language progress is coming soon.</p>
        <div className="language-tags"><span>Python</span><span>JavaScript</span></div>
      </section>
    </div>
  </div>;
}