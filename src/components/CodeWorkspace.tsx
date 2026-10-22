"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";
import "./workspace.css";
import type { editor } from "monaco-editor";
import * as Y from "yjs";
import { connectRoomToSupabase } from "@/lib/collaboration/roomSync";
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

  const bindingRef =
    useRef<import("y-monaco").MonacoBinding | null>(null);

  const sharedOutputRef = useRef<Y.Text | null>(null);

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

    const sharedOutput = ydoc.getText("shared-output");
    sharedOutputRef.current = sharedOutput;

    const handleSharedOutput = () => {
      const value = sharedOutput.toString();

      if (value) {
        setOutput(value);
      }
    };

    sharedOutput.observe(handleSharedOutput);

    const disconnect = connectRoomToSupabase(
      roomId,
      ydoc
    );

    return () => {
      sharedOutput.unobserve(handleSharedOutput);

      bindingRef.current?.destroy();
      disconnect();
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
      <a className="edu-skip" href="#code-editor">Skip to editor</a>
      <header className="edu-header">
        <Link href="/" className="edu-brand">Foxey<span>.</span><small>EDU</small></Link>
        <div className="edu-room"><span>WORKSPACE</span><h1>{roomName || (roomId ? `Room ${roomId}` : "Personal workspace")}</h1></div>
        <div className="edu-header-actions">
          <ThemeToggle />
          {roomId && <button className="edu-button" onClick={copyInviteLink}>Invite people ↗</button>}
          <span className="edu-avatar" aria-label="You">Y</span>
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
          {settingsOpen && <div id="workspace-settings" className="edu-settings"><p>Appearance</p><ThemeToggle /><p>Theme applies to your workspace and editor.</p></div>}
          <div className="edu-nav-bottom"><span className="edu-brand-accent">A little curiosity.</span><p>A lot of possibility.</p><small>Foxey Labs</small></div>
        </nav>
        <section className="edu-center" aria-label="Coding workspace">
          <div className="edu-toolbar">
            <div><span className="file-dot" /> <strong>{language === "python" ? "main.py" : "main.js"}</strong><span className="edu-toolbar-label">{roomId ? "Shared editor" : "Personal editor"}</span></div>
            <div className="edu-run-actions">
              <select aria-label="Programming language" value={language} disabled={isRunning} onChange={(event) => setLanguage(event.target.value as Language)}><option value="python">Python</option><option value="javascript">JavaScript</option></select>
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
              theme={theme === "dark" ? "vs-dark" : "light"}
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
                  new Set([editorInstance])
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
        <aside className="edu-social" aria-label="Room collaboration">
          <h2>Participants</h2><p className="edu-empty">{roomId ? "Your room’s collaboration panel." : "You’re in a personal workspace. Create a room to code with others."}</p>
          <Link href="/#classroom" className="edu-button">Browse rooms →</Link>
        </aside>
      </div>
    </main>
  );
}

