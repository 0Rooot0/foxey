"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeProvider";
import "./home.css";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    router.push(`/room/${crypto.randomUUID()}?name=${encodeURIComponent(name)}`);
  }

  function handleJoinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roomId.trim()) router.push(`/room/${encodeURIComponent(roomId.trim())}`);
  }

  return (
    <main className="home">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="home-header">
        <Link href="/" className="brand" aria-label="Foxey home"><span className="brand-mark" aria-hidden="true">⌁</span>Foxey<span className="brand-dot">.</span></Link>
        <button className="menu-toggle button" aria-expanded={menuOpen} aria-controls="home-nav" onClick={() => setMenuOpen(!menuOpen)}>Menu</button>
        <nav id="home-nav" aria-label="Main navigation" className={menuOpen ? "home-nav is-open" : "home-nav"}>
          <a href="#workspace" onClick={() => setMenuOpen(false)}>Workspace</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Why Foxey</a>
          <a href="#classroom" onClick={() => setMenuOpen(false)}>For classrooms</a>
        </nav>
        <div className="nav-actions"><ThemeToggle /><Link href="/code" className="button button-primary">Open workspace <span aria-hidden="true">↗</span></Link></div>
      </header>

      <section id="main-content" className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> A shared space for your next idea</p>
          <h1>Great code starts<br />with <em>great company.</em></h1>
          <p className="hero-description">Collaborative coding for classrooms and teams. Bring your ideas, find your people, and build something together.</p>
          <div className="hero-actions"><Link href="/code" className="button button-primary">Start coding <span aria-hidden="true">→</span></Link><a href="#classroom" className="button" onClick={() => setCreatingRoom(true)}>Create a class room</a></div>
          <p className="hero-note">Python & JavaScript <span>·</span> In your browser <span>·</span> Together in real time</p>
        </div>
        <div className="hero-art">
          <Image src="/foxey-logo.png" alt="Foxey fox mascot" width={1536} height={1024} priority sizes="(max-width: 760px) 90vw, 45vw" />
          <span className="art-caption">A little curiosity. A lot of possibility.</span>
        </div>
      </section>

      <section id="workspace" className="product-section" aria-labelledby="preview-title">
        <div className="section-heading"><div><p className="eyebrow">Your ideas, in sync</p><h2 id="preview-title">One room. A shared flow.</h2></div><p>Edit together. Run your code.<br />See the same result.</p></div>
        <Link href="/code" className="product-preview" aria-label="Open the coding workspace shown in this illustrative preview">
          <div className="preview-top"><span><b className="brand-dot">●</b> Foxey <strong>EDU</strong></span><span>Python practice <small> / Workspace preview</small></span><span className="preview-run">▶ Run code</span></div>
          <div className="preview-body">
            <div className="preview-sidebar"><span className="selected">⌘ &nbsp; Classroom</span><span>▦ &nbsp; Rooms</span><span>▤ &nbsp; Assignments</span><span>↗ &nbsp; Progress</span></div>
            <div className="preview-code"><div className="preview-tab">main.py <span>Python</span></div><pre><span className="code-muted">1 &nbsp; # Better ideas start together</span>{"\n"}<span className="code-muted">2</span>{"\n"}3 &nbsp; <span className="code-purple">def</span> greet(name):{"\n"}4 &nbsp; &nbsp; &nbsp; <span className="code-purple">return</span> <span className="code-green">f&quot;Hello, &#123;name&#125;!&quot;</span>{"\n"}<span className="code-muted">5</span>{"\n"}6 &nbsp; print(greet(<span className="code-green">&quot;Foxey&quot;</span>))</pre><div className="preview-output"><small>OUTPUT</small><p>Hello, Foxey!</p><span>Ready for the next idea.</span></div></div>
            <div className="preview-team"><p>Built for shared moments</p><div className="avatar-stack"><span>Y</span><span>+</span></div><h3>Make room<br />for everyone.</h3><p>Share a room link and work on the same code.</p></div>
          </div>
        </Link>
      </section>

      <section id="features" className="features-section">
        <p className="eyebrow">Less setup. More discovery.</p><h2>Stay close to the code.<br />And to each other.</h2>
        <div className="feature-grid">
          <article><span className="feature-icon">⌘</span><h3>Think together</h3><p>A shared editor keeps everyone on the same page, whether you’re pairing up or learning as a group.</p></article>
          <article><span className="feature-icon">▷</span><h3>Try it. See it. Learn it.</h3><p>Run Python and JavaScript right in your browser, with output shared across your room.</p></article>
          <article><span className="feature-icon">↗</span><h3>A link brings you together</h3><p>Name your room, share an invite, and give your next coding session a place to happen.</p></article>
        </div>
      </section>

      <section id="classroom" className="classroom-section">
        <div><p className="eyebrow">Foxey for education</p><h2>Big breakthroughs.<br />Small beginnings.</h2><p>Give your classroom a space to explore code together. Start a named room or join your team’s session.</p><span className="classroom-note">Your next “I get it” moment starts here.</span></div>
        <div className="room-card">
          <h3>Meet in a coding room</h3><p>Have a room ID? You’re one step away.</p>
          <form onSubmit={handleJoinRoom}><label htmlFor="room-id">Room ID</label><div className="input-row"><input id="room-id" required value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="Enter room ID" /><button className="button" disabled={!roomId.trim()}>Join →</button></div></form>
          <div className="room-divider">or start something new</div>
          {creatingRoom ? <form onSubmit={handleCreateRoom}><label htmlFor="room-name">Room name</label><input id="room-name" required maxLength={80} value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="e.g. Python practice" /><div className="input-row"><button className="button button-primary" disabled={!roomName.trim()}>Create room</button><button type="button" className="button" onClick={() => setCreatingRoom(false)}>Cancel</button></div></form> : <button className="button button-primary full-width" onClick={() => setCreatingRoom(true)}>Create a new room <span>+</span></button>}
        </div>
      </section>
      <footer className="home-footer"><Link href="/" className="brand">Foxey<span className="brand-dot">.</span></Link><p>A space to build, by Foxey Labs.</p><Link href="/code">Let’s make something →</Link></footer>
    </main>
  );
}
