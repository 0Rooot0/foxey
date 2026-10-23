"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { publicRoomClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeProvider";
import FoxeyBrand from "@/components/FoxeyBrand";
import AccountNav from "@/components/AccountNav";
import WorkspacePreview from "@/components/WorkspacePreview";
import Icon from "@/components/Icon";
import "./home.css";

export default function Home() {
  const router = useRouter();
  const [joinError, setJoinError] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = roomName.trim();
    if (name) router.push(`/code?name=${encodeURIComponent(name)}`);
  }

  async function handleJoinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = roomId.trim();
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

  return (
    <main className="home" id="home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="home-header">
        <Link href="/" aria-label="Foxey home"><FoxeyBrand /></Link>
        <button className="menu-toggle button" aria-expanded={menuOpen} aria-controls="home-nav" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
        <nav id="home-nav" aria-label="Main navigation" className={menuOpen ? "home-nav is-open" : "home-nav"}>
          <a href="#home" className="nav-active" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#classroom" onClick={() => setMenuOpen(false)}>For Classrooms</a>
          <a href="#teams" onClick={() => setMenuOpen(false)}>For Teams</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
        </nav>
        <div className="nav-actions"><ThemeToggle /><AccountNav /><Link href="/code" className="button button-primary">Get Started</Link></div>
      </header>

      <section id="main-content" className="hero">
        <Image className="hero-landscape" src="/foxey-landscape.png" alt="" width={1536} height={1024} priority sizes="85vw" />
        <div className="hero-copy">
          <p className="eyebrow">Code together, go further</p>
          <h1>Collaborative coding<br /><em>for classrooms<br />and teams</em></h1>
          <p className="hero-description">Foxey makes it easy to code together <i>in real time.</i> Teach, learn, build, and solve problems side by side — all in your browser.</p>
          <div className="hero-actions">
            <Link href="/code" className="button button-primary">Start Coding <Icon name="arrow" /></Link>
            <a href="#classroom" className="button button-secondary"><Icon name="people" /> Join a Room</a>
          </div>
          <div className="hero-benefits"><span><i>✓</i>No installation</span><span><i><Icon name="bolt" size={19} /></i>Real-time collaboration</span><span><i><Icon name="shield" size={18} /></i>Built for education</span></div>
        </div>
        <div className="hero-scene">
          <Link href="/code" className="demo-link" aria-label="Open Foxey EDU coding workspace"><WorkspacePreview /></Link>
          <Image className="coding-mascot" src="/foxey-coding-mascot.png" alt="A little orange fox coding on a laptop" width={1448} height={1086} priority sizes="(max-width: 760px) 45vw, 25vw" />
          <span className="demo-caption">Workspace preview · example students</span>
        </div>
      </section>

      <section id="teams" className="feature-grid" aria-label="Why code with Foxey">
        <article><span className="feature-icon orange"><Icon name="people" size={32} /></span><div><h2>Real-Time Collaboration</h2><p>Code together with live cursors, instant updates, and built-in chat.</p></div></article>
        <article><span className="feature-icon purple"><Icon name="code" size={32} /></span><div><h2>Built for Learning</h2><p>Perfect for classrooms, tutoring, and study groups.</p></div></article>
        <article><span className="feature-icon green"><Icon name="cap" size={34} /></span><div><h2>Simple and Accessible</h2><p>No setup, no installation.<br />Just create a room and start coding.</p></div></article>
        <article><span className="feature-icon pink"><Icon name="heart" size={32} /></span><div><h2>Flexible for Any Team</h2><p>Use it for classes, clubs, hackathons, or professional projects.</p></div></article>
      </section>

      <section id="classroom" className="classroom-section">
        <div><p className="eyebrow">One link. Your whole team.</p><h2>Make room for<br />your next idea.</h2><p>Create a named coding room and share the invite. Everyone gets their own avatar and live cursor, with the same code and output.</p><p className="session-note">Room code and output are saved automatically. Check the save status before leaving.</p></div>
        <div className="room-card">
          <h3>Create a Room</h3><p>Name your room so classmates know where to meet.</p>
          <form className="room-create-form" onSubmit={handleCreateRoom}>
            <label htmlFor="room-name">Room name</label>
            <input id="room-name" required maxLength={80} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="e.g. Python classroom" />
            <button type="submit" className="button button-primary full-width" disabled={!roomName.trim()}>Create Room →</button>
          </form>
          <div className="room-divider">or join an existing room</div>
          <h3 className="room-join-heading">Join a Room</h3>
          <form onSubmit={handleJoinRoom}><label htmlFor="room-id">Room ID</label><div className="input-row"><input id="room-id" required value={roomId} onChange={(event) => { setRoomId(event.target.value); setJoinError(""); }} placeholder="Enter room ID" /><button type="submit" className="button" disabled={joiningRoom || !roomId.trim()}>{joiningRoom ? "Checking..." : "Join →"}</button></div></form>
          {joinError && <p role="alert" className="room-error">{joinError}</p>}
        </div>
      </section>
      <footer id="about" className="home-footer"><Link href="/" aria-label="Foxey home"><FoxeyBrand /></Link><p>Code together, go further. By Foxey Labs.</p><Link href="/code">Start Coding →</Link></footer>
    </main>
  );
}
