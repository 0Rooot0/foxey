"use client";

import { useState } from "react";
import Link from "next/link";
import type { ConnectionStatus, Participant } from "@/lib/collaboration/roomSync";

export type ChatMessage = { id: string; author: string; text: string };

type Props = {
  roomId?: string;
  status: ConnectionStatus;
  participants: Participant[];
  messages: ChatMessage[];
  selfId?: string;
  onSend: (text: string) => void;
};

export default function RoomPanel({ roomId, status, participants, messages, selfId, onSend }: Props) {
  const [draft, setDraft] = useState("");
  return (
    <aside className="edu-social" aria-label="Room collaboration">
      <div className="participant-heading"><h2>Participants</h2><span>{roomId ? participants.length : 1}</span></div>
      <p className="connection-status" role="status"><span className={status === "connected" && roomId ? "online-dot" : "offline-dot"} />{roomId ? (status === "connected" ? "Connected to room" : status === "connecting" ? "Connecting…" : "Disconnected · reconnecting") : "Personal workspace"}</p>
      {roomId ? <ul className="participant-list">{participants.map((person) => <li key={person.id}><span className="edu-avatar">{person.name.slice(0, 1)}</span><span>{person.name}{person.id === selfId && <small> (you)</small>}<small>In this room</small></span><span className="online-dot" /></li>)}</ul> : <div className="personal-room"><span className="edu-avatar">Y</span><span>You</span></div>}
      <div className="room-tip">{roomId ? "Share your invite link to bring someone into this room." : <><p>Create a room to code and chat together.</p><Link className="edu-button" href="/#classroom">Create a room →</Link></>}</div>
      <section className="room-chat" aria-labelledby="chat-heading">
        <h2 id="chat-heading">Room chat <span>↗</span></h2>
        <div className="chat-messages" role="log" aria-label="Room messages" aria-live="polite">
          {messages.length === 0 ? <p className="edu-empty">{roomId ? "A place for questions, ideas, and little breakthroughs. Say hello." : "Chat is available in shared rooms."}</p> : messages.map((message) => <article key={message.id}><strong>{message.author}</strong><p>{message.text}</p></article>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); if (!draft.trim() || status !== "connected" || !roomId) return; onSend(draft.trim()); setDraft(""); }}>
          <label className="sr-only" htmlFor="chat-message">Message your room</label>
          <input id="chat-message" placeholder="Message your room…" maxLength={1000} value={draft} disabled={!roomId || status !== "connected"} onChange={(event) => setDraft(event.target.value)} />
          <button className="edu-button edu-run" disabled={!roomId || status !== "connected" || !draft.trim()} aria-label="Send message">↑</button>
        </form>
        <p className="chat-note">Live session chat · not saved after everyone leaves</p>
      </section>
    </aside>
  );
}
