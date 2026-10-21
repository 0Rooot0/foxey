"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">
            Foxey Workspace
          </h1>

          <p className="text-sm text-zinc-400">
            {roomName || (roomId ? `Room ${roomId}` : "Untitled session")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {roomId && (
            <div className="flex flex-col gap-1">
              <button onClick={copyInviteLink} className="cursor-pointer rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium">Copy invite link</button>
              <span role="status" className="text-xs text-zinc-400">{inviteStatus}</span>
              {manualInvite && <input aria-label="Invite link" readOnly value={manualInvite} onFocus={(event) => event.target.select()} className="rounded border border-zinc-700 bg-zinc-900 p-2 text-sm" />}
            </div>
          )}
          <select
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language)
            }
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="python">
              Python
            </option>

            <option value="javascript">
              JavaScript
            </option>
          </select>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="cursor-pointer rounded-md bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run"}
          </button>

          {isRunning && (
            <button
              onClick={handleCancel}
              className="cursor-pointer rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-white"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-73px)] grid-cols-1 lg:grid-cols-[2fr_1fr]">
        <div className="border-b border-zinc-800 p-6 lg:border-b-0 lg:border-r">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Editor
          </h2>

          <div className="h-[500px] overflow-hidden rounded-lg border border-zinc-800">
            <Editor
              key={language}
              height="100%"
              language={language}
              value={code[language]}
              theme="vs-dark"
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
        </div>

        <aside className="p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Output
          </h2>

          <div className="min-h-[250px] whitespace-pre-wrap rounded-lg border border-zinc-800 bg-black p-4 font-mono text-sm text-zinc-400">
            {output}
          </div>
        </aside>
      </section>
    </main>
  );
}