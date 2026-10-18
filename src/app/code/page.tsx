"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  cancelJavaScript,
  runJavaScript,
} from "@/lib/runners/javascriptRunner";
import {
  cancelPython,
  runPython,
} from "@/lib/runners/pythonRunner";

export default function CodePage() {
  type Language = "python" | "javascript";

  const [language, setLanguage] = useState<Language>("python");

  const [code, setCode] = useState({
    python: "# Start coding with Foxey",
    javascript: "// Start coding with Foxey",
  });

  const [output, setOutput] = useState(
    "Run your code to see output."
  );

  const [isRunning, setIsRunning] = useState(false);

  async function handleRun() {
    setIsRunning(true);
    setOutput("Running...");

    try {
      if (language === "javascript") {
        const result = await runJavaScript(code.javascript);
        setOutput(result);
        return;
      }

      if (language === "python") {
        const result = await runPython(code.python);
        setOutput(result);
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
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">
            Foxey Workspace
          </h1>

          <p className="text-sm text-zinc-400">
            Untitled session
          </p>
        </div>

        <div className="flex items-center gap-3">
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