"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import "./workspace.css";
import type { editor } from "monaco-editor";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import StudentAvatar from "./StudentAvatar";
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

type CodeWorkspaceProps = {
  roomId?: string;
  roomName?: string;
};

export default function CodeWorkspace({
  roomId,
  roomName,
}: CodeWorkspaceProps) {
  const { theme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("python");

  const editorRef =
    useRef<editor.IStandaloneCodeEditor | null>(null);

  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  const bindingRef =
    useRef<import("y-monaco").MonacoBinding | null>(null);

  const sharedOutputRef = useRef<Y.Text | null>(null);
  const chatRef = useRef<Y.Array<ChatMessage> | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selfId, setSelfId] = useState<string>();

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

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;
    let name = `Guest ${String(ydoc.clientID).slice(-4)}`;
    try { name = localStorage.getItem("foxey-display-name")?.trim().slice(0, 40) || name; } catch {}
    awareness.setLocalStateField("user", { name });

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
      sharedOutput.unobserve(handleSharedOutput);
      chat.unobserve(handleChat);
      chatRef.current = null;

      bindingRef.current?.destroy();
      disconnect();
      awareness.destroy();
      awarenessRef.current = null;
      ydoc.destroy();

      bindingRef.current = null;
      ydocRef.current = null;
      sharedOutputRef.current = null;
    };
  }, [roomId]);

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
    setIsRunning(true);
    updateOutput("Running...");

    try {
      if (language === "javascript") {
        const result = await runJavaScript(code.javascript);
        updateOutput(result);
        return;
      }

      if (language === "python") {
        const result = await runPython(code.python);
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
        .yRemoteSelectionHead-${person.id}::after { background: ${person.color}; content: ${JSON.stringify(person.name)}; }
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
          <Link href="/#classroom"><span>▦</span> Rooms</Link>
          <button disabled title="Assignments are not available yet"><span>▤</span> Assignments <small>Soon</small></button>
          <button disabled title="Progress tracking is not available yet"><span>↗</span> Progress <small>Soon</small></button>
          <button onClick={() => setSettingsOpen(!settingsOpen)} aria-expanded={settingsOpen} aria-controls="workspace-settings"><span>⚙</span> Settings</button>
          {settingsOpen && <div id="workspace-settings" className="edu-settings"><p>Appearance</p><ThemeToggle /><p>Theme applies to your workspace and editor.</p>
            {roomId && <form onSubmit={(event) => {
              event.preventDefault();
              const name = String(new FormData(event.currentTarget).get("name") || "").trim().slice(0, 40);
              if (!name) return;
              awarenessRef.current?.setLocalStateField("user", { name });
              try { localStorage.setItem("foxey-display-name", name); } catch {}
            }}>
              <label htmlFor="student-name">Your display name</label>
              <input id="student-name" name="name" maxLength={40} required placeholder="e.g. Ava" defaultValue={participants.find((person) => person.id === selfId)?.name} />
              <button className="edu-button" type="submit">Update name</button>
            </form>}</div>}
          <div className="edu-room-list"><p>ROOMS</p><a href="#code-editor" className="current-room"><i />{roomName || "Current session"}</a><Link href="/#classroom">+ Create or join a room</Link></div>
          <div className="edu-nav-bottom"><span className="edu-brand-accent">A little curiosity.</span><p>A lot of possibility.</p><small>Foxey Labs</small></div>
        </nav>
        <section className="edu-center" aria-label="Coding workspace">
          <div className="edu-toolbar">
            <div><span className="file-dot" /> <strong>{language === "python" ? "main.py" : "main.js"}</strong><span className="edu-toolbar-label">{roomId ? "Shared editor" : "Personal editor"}</span></div>
            <div className="edu-run-actions">
              <select aria-label="Programming language" value={language} disabled={isRunning} onChange={(event) => { bindingRef.current?.destroy(); bindingRef.current = null; awarenessRef.current?.setLocalStateField("selection", null); setLanguage(event.target.value as Language); }}><option value="python">Python</option><option value="javascript">JavaScript</option></select>
              <button className="edu-button edu-run" onClick={handleRun} disabled={isRunning}>{isRunning ? "Running…" : "▶ Run code"}</button>
              {isRunning && <button className="edu-button" onClick={handleCancel}>Cancel</button>}
            </div>
          </div>
          <div id="code-editor" className="edu-editor" tabIndex={-1}>
            <Editor
              key={language}
              height="100%"
              language={language}
              value={code[language]}
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
              options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 20 }, scrollBeyondLastLine: false, automaticLayout: true }}
              onMount={async (editorInstance) => {
                editorRef.current = editorInstance;

                if (!roomId || !ydocRef.current) {
                  return;
                }

                bindingRef.current?.destroy();

                const ytext = ydocRef.current.getText(
                  `code:${language}`
                );

                const { MonacoBinding } =
                  await import("y-monaco");

                if (editorRef.current !== editorInstance || editorInstance.getModel()?.isDisposed()) return;
                bindingRef.current = new MonacoBinding(
                  ytext,
                  editorInstance.getModel()!,
                  new Set([editorInstance]),
                  awarenessRef.current
                );
              }}
              onChange={(value) =>
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
          <footer className="edu-status"><span>{roomId ? "Room workspace" : "Personal workspace"}</span><span>{language === "python" ? "Python" : "JavaScript"} · UTF-8</span></footer>
        </section>
        <RoomPanel roomId={roomId} status={connectionStatus} participants={participants} messages={messages} selfId={selfId} onSend={sendMessage} />
      </div>
    </main>
  );
}
