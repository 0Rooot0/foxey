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
import { publicRoomClient } from "@/lib/supabase/client";
import { Awareness } from "y-protocols/awareness";
import StudentAvatar from "./StudentAvatar";
import { readIdentity, rememberIdentity, type Identity } from "@/lib/collaboration/participants";
import FoxeyBrand from "./FoxeyBrand";
import AccountNav from "./AccountNav";
import { useAuth } from "./AuthProvider";
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

import AvatarChoices from "./AvatarChoices";

type Language = "python" | "javascript";

type CodeWorkspaceProps = {
  roomId?: string;
  roomName?: string;
  initialIdentity?: Identity;
};

export default function CodeWorkspace({
  roomId,
  roomName,
  initialIdentity,
}: CodeWorkspaceProps) {
  const { theme } = useTheme();
  const { user, saveIdentity } = useAuth();
  const initialIdentityRef = useRef(initialIdentity);
  const [identityError, setIdentityError] = useState("");
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
  const [selectedAvatar, setSelectedAvatar] = useState(initialIdentity?.avatar ?? 6);
  const [displayName, setDisplayName] = useState(initialIdentity?.name || "");

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
    awareness.setLocalStateField("user", initialIdentityRef.current);

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

    const persistence = persistRoom(ydoc, supabaseRoomStore(publicRoomClient, roomId), {
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

  useEffect(() => {
    if (initialIdentity) awarenessRef.current?.setLocalStateField("user", initialIdentity);
  }, [initialIdentity]);

  useEffect(() => {
    function syncIdentity(event: StorageEvent) {
      if (event.key !== "foxey-display-name" && event.key !== "foxey-avatar") return;
      const next = readIdentity();
      if (!next) return;
      awarenessRef.current?.setLocalStateField("user", next);
      setDisplayName(next.name);
      setSelectedAvatar(next.avatar);
    }
    window.addEventListener("storage", syncIdentity);
    return () => window.removeEventListener("storage", syncIdentity);
  }, []);

  async function updateAppearance(name: string, avatar: number) {
    const cleanName = name.trim().slice(0, 40);
    if (!cleanName) return;
    setIdentityError("");
    if (user) {
      try { await saveIdentity({ name: cleanName, avatar }); }
      catch (cause) { setIdentityError(cause instanceof Error ? cause.message : "Could not save your profile."); return; }
    }
    awarenessRef.current?.setLocalStateField("user", { name: cleanName, avatar });
    setDisplayName(cleanName);
    setSelectedAvatar(avatar);
    rememberIdentity({ name: cleanName, avatar });
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

  return (
    <main className="edu">
      <style>{participants.filter((person) => /^\d+$/.test(person.id)).map((person) => `
        .yRemoteSelection-${person.id} { background: ${person.color.replace(")", " / .2)")}; }
        .yRemoteSelectionHead-${person.id} { border-color: ${person.color}; }
      `).join("\n")}</style>
      <a className="edu-skip" href="#code-editor">Skip to editor</a>
      <header className="edu-header">
        <Link href="/" className="edu-brand" aria-label="Foxey home"><FoxeyBrand edu /></Link>
        <div className="edu-room"><span>WORKSPACE</span><h1>{roomName || (roomId ? `Room ${roomId}` : "Personal workspace")}</h1>{roomId && <small className="workspace-room-id">Room ID: {roomId}</small>}</div>
        <div className="edu-header-actions">
          <ThemeToggle />
          <AccountNav />
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
              <input id="student-name" name="name" maxLength={40} required placeholder="e.g. Ava" defaultValue={displayName} />
              <button className="edu-button" type="submit">Update name</button>
              <p>Your avatar</p>
              <AvatarChoices selected={selectedAvatar} onSelect={(avatar) => { void updateAppearance(displayName, avatar); }} />
              {identityError && <p role="alert">{identityError}</p>}
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
