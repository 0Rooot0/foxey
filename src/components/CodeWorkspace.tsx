"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import "./workspace.css";
import type { editor } from "monaco-editor";
import * as Y from "yjs";
import { persistRoom, type SaveStatus } from "@/lib/collaboration/roomPersistence";
import { supabaseRoomStore } from "@/lib/collaboration/supabaseRoomStore";
import { supabase } from "@/lib/supabase/client";
import { Awareness } from "y-protocols/awareness";
import StudentAvatar from "./StudentAvatar";
import { avatarOptions, participantAppearance } from "@/lib/collaboration/participants";
import FoxeyBrand from "./FoxeyBrand";
import { connectRoomToSupabase, type Participant, type ConnectionStatus } from "@/lib/collaboration/roomSync";
import RoomPanel, { type ChatMessage } from "@/components/RoomPanel";
import {
  cancelJavaScript,
  runJavaScript,
} from "@/lib/runners/javascriptRunner";
import {
  cancelPython,
  runPython,
} from "@/lib/runners/pythonRunner";

type Language = "python" | "javascript";

function AvatarChoices({ selected, onSelect }: { selected: number; onSelect: (avatar: number) => void }) {
  return <div className="avatar-choices" role="group" aria-label="Choose an avatar">
    {avatarOptions.map((option, index) => <button key={option.label} type="button" className={selected === index ? "avatar-option selected" : "avatar-option"} aria-pressed={selected === index} aria-label={option.label} onClick={() => onSelect(index)}>
      <StudentAvatar variant={index} name={option.label} size={42} color={selected === index ? "#ff7e2d" : "#7d91ae"} />
      <span className="avatar-option-label">{option.label}</span>
    </button>)}
  </div>;
}

type CodeWorkspaceProps = {
  roomId?: string;
  roomName?: string;
};

export default function CodeWorkspace({
  roomId,
  roomName,
}: CodeWorkspaceProps) {
  const { theme } = useTheme();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("python");

  const editorRef =
    useRef<editor.IStandaloneCodeEditor | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  const bindingRef =
    useRef<import("y-monaco").MonacoBinding | null>(null);
  const bindingGenerationRef = useRef(0);
  const [bindingReady, setBindingReady] = useState(false);

  const sharedOutputRef = useRef<Y.Text | null>(null);
  const chatRef = useRef<Y.Array<ChatMessage> | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selfId, setSelfId] = useState<string>();
  const [avatarSetupOpen, setAvatarSetupOpen] = useState(Boolean(roomId));
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [displayName, setDisplayName] = useState("");

  const [code, setCode] = useState({
    python: "# Start coding with Foxey",
    javascript: "// Start coding with Foxey",
  });

  const [output, setOutput] = useState(
    "Run your code to see output."
  );

  const [isRunning, setIsRunning] = useState(false);
  const [inviteStatus, setInviteStatus] = useState("");
  const [manualInvite, setManualInvite] = useState("");

  async function copyInviteLink() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    if (roomName) url.searchParams.set("name", roomName);
    try {
      await navigator.clipboard.writeText(url.toString());
      setManualInvite("");
      setInviteStatus("Invite link copied!");
    } catch {
      setManualInvite(url.toString());
      setInviteStatus("Select and copy the invite link below.");
    }
  }

  useEffect(() => {
    if (!roomId) return;
    const bindingGeneration = bindingGenerationRef;

    try {
      const previous = JSON.parse(localStorage.getItem("foxey-recent-rooms") || "[]");
      const rooms = Array.isArray(previous) ? previous.filter((room) => typeof room?.id === "string" && typeof room?.name === "string" && room.id !== roomId) : [];
      localStorage.setItem("foxey-recent-rooms", JSON.stringify([{ id: roomId, name: roomName || `Room ${roomId}` }, ...rooms].slice(0, 30)));
    } catch {}
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;
    let name = `Guest ${String(ydoc.clientID).slice(-4)}`;
    try { name = localStorage.getItem("foxey-display-name")?.trim().slice(0, 40) || name; } catch {}
    let avatar = participantAppearance(String(ydoc.clientID)).avatar;
    try {
      const saved = localStorage.getItem("foxey-avatar");
      if (saved !== null && Number.isInteger(Number(saved)) && Number(saved) >= 0 && Number(saved) < avatarOptions.length) avatar = Number(saved);
    } catch {}
    const appearanceTimer = window.setTimeout(() => { setDisplayName(name); setSelectedAvatar(avatar); }, 0);
    awareness.setLocalStateField("user", { name, avatar });

    const sharedOutput = ydoc.getText("shared-output");
    sharedOutputRef.current = sharedOutput;

    const handleSharedOutput = () => {
      const value = sharedOutput.toString();

      if (value) {
        setOutput(value);
      }
    };

    sharedOutput.observe(handleSharedOutput);
    const chat = ydoc.getArray<ChatMessage>("room-chat");
    chatRef.current = chat;
    const handleChat = () => setMessages(chat.toArray().filter((message) =>
      message && typeof message.id === "string" && typeof message.author === "string" && typeof message.text === "string"
    ).slice(-100));
    chat.observe(handleChat);

    const persistence = persistRoom(ydoc, supabaseRoomStore(supabase, roomId), {
      onStatus: setSaveStatus,
      readLocal: () => JSON.parse(localStorage.getItem(`foxey-room:${roomId}`) || "null"),
      writeLocal: (state) => localStorage.setItem(`foxey-room:${roomId}`, JSON.stringify(state)),
    });
    const handlePageHide = () => { void persistence.flush(); };
    window.addEventListener("pagehide", handlePageHide);

    const disconnect = connectRoomToSupabase(
      roomId,
      ydoc,
      {
        awareness,
        onParticipants: (people) => { setParticipants(people); setSelfId(String(ydoc.clientID)); },
        onStatus: setConnectionStatus,
      }
    );

    return () => {
      window.clearTimeout(appearanceTimer);
      window.removeEventListener("pagehide", handlePageHide);
      void persistence.stop();
      sharedOutput.unobserve(handleSharedOutput);
      chat.unobserve(handleChat);
      chatRef.current = null;

      bindingGeneration.current++;
      bindingRef.current?.destroy();
      bindingRef.current = null;
      editorRef.current = null;
      disconnect();
      awareness.destroy();
      awarenessRef.current = null;
      ydoc.destroy();

      bindingRef.current = null;
      ydocRef.current = null;
      sharedOutputRef.current = null;
    };
  }, [roomId, roomName]);

  function updateAppearance(name: string, avatar: number) {
    const cleanName = name.trim().slice(0, 40);
    if (!cleanName) return;
    awarenessRef.current?.setLocalStateField("user", { name: cleanName, avatar });
    setDisplayName(cleanName);
    setSelectedAvatar(avatar);
    try {
      localStorage.setItem("foxey-display-name", cleanName);
      localStorage.setItem("foxey-avatar", String(avatar));
    } catch {}
  }

  function updateOutput(value: string) {
    setOutput(value);

    if (!roomId || !sharedOutputRef.current) {
      return;
    }

    const sharedOutput = sharedOutputRef.current;

    sharedOutput.doc?.transact(() => {
      sharedOutput.delete(0, sharedOutput.length);
      sharedOutput.insert(0, value);
    });
  }

  function sendMessage(text: string) {
    const doc = ydocRef.current;
    if (!doc || !chatRef.current || connectionStatus !== "connected") return;
    chatRef.current.push([{ id: crypto.randomUUID(), author: awarenessRef.current?.getLocalState()?.user?.name || `Guest ${String(doc.clientID).slice(-4)}`, text: text.slice(0, 1000) }]);
  }

  async function handleRun() {
    const source = roomId ? ydocRef.current?.getText(`code:${language}`).toString() ?? "" : code[language];
    setIsRunning(true);
    updateOutput("Running...");

    try {
      if (language === "javascript") {
        const result = await runJavaScript(source);
        updateOutput(result);
        return;
      }

      if (language === "python") {
        const result = await runPython(source);
        updateOutput(result);
        return;
      }
    } catch (error) {
      updateOutput(error instanceof Error ? error.message : "Execution failed.");
    } finally {
      setIsRunning(false);
    }
  }

  function handleCancel() {
    if (language === "python") {
      cancelPython();
      return;
    }

    if (language === "javascript") {
      cancelJavaScript();
    }
  }

  if (roomId && avatarSetupOpen) return <main className="edu avatar-entry">
    <form className="avatar-entry-card" onSubmit={(event) => { event.preventDefault(); if (!displayName.trim()) return; updateAppearance(displayName, selectedAvatar); setAvatarSetupOpen(false); }}>
      <span className="avatar-entry-eyebrow">{roomName || "Your coding room"}</span>
      <h1>Choose your room avatar</h1>
      <p>Pick a face for the room. Your classmates will see it beside your name.</p>
      <label htmlFor="room-display-name">Your name</label>
      <input id="room-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} required autoFocus placeholder="e.g. Ava" />
      <AvatarChoices selected={selectedAvatar} onSelect={setSelectedAvatar} />
      <button className="edu-button edu-run" type="submit">Enter room →</button>
    </form>
  </main>;

  return (
    <main className="edu">
      <style>{participants.filter((person) => /^\d+$/.test(person.id)).map((person) => `
        .yRemoteSelection-${person.id} { background: ${person.color.replace(")", " / .2)")}; }
        .yRemoteSelectionHead-${person.id} { border-color: ${person.color}; }
      `).join("\n")}</style>
      <a className="edu-skip" href="#code-editor">Skip to editor</a>
      <header className="edu-header">
        <Link href="/" className="edu-brand" aria-label="Foxey home"><FoxeyBrand edu /></Link>
        <div className="edu-room"><span>WORKSPACE</span><h1>{roomName || (roomId ? `Room ${roomId}` : "Personal workspace")}</h1></div>
        <div className="edu-header-actions">
          <ThemeToggle />
          {roomId && <button className="edu-button" onClick={copyInviteLink}>Invite people ↗</button>}
          <div className="live-avatar-stack" aria-label="Students in this room">
            {participants.slice(0, 5).map((person) => <StudentAvatar key={person.id} variant={person.avatar} color={person.color} name={person.name} />)}
            {participants.length > 5 && <span className="more-students">+{participants.length - 5}</span>}
          </div>
        </div>
      </header>
      {inviteStatus && <div role="status" className="invite-status">{inviteStatus}{manualInvite && <input aria-label="Invite link" readOnly value={manualInvite} onFocus={(event) => event.target.select()} />}</div>}
      <div className="edu-layout">
        <nav className="edu-nav" aria-label="Classroom navigation">
          <p>YOUR WORKSPACE</p>
          <a className="active" href="#code-editor" aria-current="page"><span>⌘</span> Classroom</a>
          <Link href="/rooms"><span>▦</span> Rooms</Link>
          <button disabled title="Assignments are not available yet"><span>▤</span> Assignments <small>Soon</small></button>
          <button disabled title="Progress tracking is not available yet"><span>↗</span> Progress <small>Soon</small></button>
          <button onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-controls="workspace-settings"><span>⚙</span> Settings</button>
          {settingsOpen && <div id="workspace-settings" className="edu-settings"><p>Appearance</p><ThemeToggle /><p>Theme applies to your workspace and editor.</p>
            {roomId && <form onSubmit={(event) => {
              event.preventDefault();
              const name = String(new FormData(event.currentTarget).get("name") || "").trim().slice(0, 40);
              if (!name) return;
              updateAppearance(name, selectedAvatar);
            }}>
              <label htmlFor="student-name">Your display name</label>
              <input id="student-name" name="name" maxLength={40} required placeholder="e.g. Ava" defaultValue={participants.find((person) => person.id === selfId)?.name} />
              <button className="edu-button" type="submit">Update name</button>
              <p>Your avatar</p>
              <AvatarChoices selected={selectedAvatar} onSelect={(avatar) => updateAppearance(displayName, avatar)} />
            </form>}</div>}
          <div className="edu-room-list"><p>ROOMS</p><a href="#code-editor" className="current-room"><i />{roomName || "Current session"}</a><Link href="/rooms">+ Create or join a room</Link></div>
          <div className="edu-nav-bottom"><span className="edu-brand-accent">A little curiosity.</span><p>A lot of possibility.</p><small>Foxey Labs</small></div>
        </nav>
        <section className="edu-center" aria-label="Coding workspace">
          <div className="edu-toolbar">
            <div><span className="file-dot" /> <strong>{language === "python" ? "main.py" : "main.js"}</strong><span className="edu-toolbar-label">{roomId ? "Shared editor" : "Personal editor"}</span></div>
            <div className="edu-run-actions">
              <select aria-label="Programming language" value={language} disabled={isRunning} onChange={(event) => { bindingGenerationRef.current++; bindingRef.current?.destroy(); bindingRef.current = null; editorRef.current = null; setBindingReady(false); awarenessRef.current?.setLocalStateField("selection", null); setLanguage(event.target.value as Language); }}><option value="python">Python</option><option value="javascript">JavaScript</option></select>
              <button className="edu-button edu-run" onClick={handleRun} disabled={isRunning}>{isRunning ? "Running…" : "▶ Run code"}</button>
              {isRunning && <button className="edu-button" onClick={handleCancel}>Cancel</button>}
            </div>
          </div>
          <div id="code-editor" className="edu-editor" tabIndex={-1}>
            <Editor
              key={language}
              height="100%"
              language={language}
              value={roomId ? undefined : code[language]}
              theme={theme === "dark" ? "foxey-dark" : "foxey-light"}
              beforeMount={(monaco) => {
                monaco.editor.defineTheme("foxey-dark", {
                  base: "vs-dark", inherit: true, rules: [],
                  colors: { "editor.background": "#0a1120", "editor.lineHighlightBackground": "#111d30", "editorLineNumber.foreground": "#61728e", "editor.selectionBackground": "#254b80" },
                });
                monaco.editor.defineTheme("foxey-light", {
                  base: "vs", inherit: true, rules: [],
                  colors: { "editor.background": "#ffffff", "editor.lineHighlightBackground": "#f3f6fc", "editorLineNumber.foreground": "#8190a8" },
                });
              }}
              options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 20 }, scrollBeyondLastLine: false, automaticLayout: true, readOnly: Boolean(roomId && !bindingReady) }}
              onMount={async (editorInstance) => {
                editorRef.current = editorInstance;
                if (!roomId || !ydocRef.current) return;

                const generation = ++bindingGenerationRef.current;
                const doc = ydocRef.current;
                const model = editorInstance.getModel();
                bindingRef.current?.destroy();
                bindingRef.current = null;
                if (!model) return;

                const { MonacoBinding } = await import("y-monaco");
                if (generation !== bindingGenerationRef.current || editorRef.current !== editorInstance || ydocRef.current !== doc || editorInstance.getModel() !== model || model.isDisposed()) return;
                bindingRef.current = new MonacoBinding(doc.getText(`code:${language}`), model, new Set([editorInstance]), awarenessRef.current);
                setBindingReady(true);
              }}
              onChange={roomId ? undefined : (value) =>
                setCode((previousCode) => ({
                  ...previousCode,
                  [language]: value ?? "",
                }))
              }
            />
          </div>
          <section className="edu-output" aria-labelledby="output-heading">
            <div className="edu-output-header"><h2 id="output-heading">Output</h2><span>{isRunning ? "Running…" : "Ready"} · {roomId ? "Shared with room" : "Only you"}</span></div>
            <pre aria-live="polite" aria-atomic="true">{output}</pre>
          </section>
          <footer className="edu-status"><span role="status">{roomId ? ({ loading: "Loading saved room…", saving: "Saving…", saved: "Saved", error: "Cloud save unavailable — keep a copy of your code" })[saveStatus] : "Personal workspace"}</span><span>{language === "python" ? "Python" : "JavaScript"} · UTF-8</span></footer>
        </section>
        <RoomPanel roomId={roomId} status={connectionStatus} participants={participants} messages={messages} selfId={selfId} onSend={sendMessage} />
      </div>
    </main>
  );
}
