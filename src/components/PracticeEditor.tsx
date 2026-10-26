"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { practiceContract } from "@/lib/practice/contracts";
import { createPracticeRunner } from "@/lib/practice/runner";
import type { CaseResult } from "@/lib/practice/harness";
import Editor from "@monaco-editor/react";
import { useTheme } from "./ThemeProvider";
import {
  attachDiagnostics,
  configureJavaScript,
} from "@/lib/diagnostics/editorDiagnostics";
import {
  starterCode,
  type Language,
  type Problem,
} from "@/lib/practice/problems";
export default function PracticeEditor({ problem }: { problem: Problem }) {
  const { theme } = useTheme();
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(() => ({
    python: starterCode(problem, "python"),
    javascript: starterCode(problem, "javascript"),
  }));
  const { contract, reason } = practiceContract(problem);
  const runner = useRef<ReturnType<typeof createPracticeRunner> | null>(null);
  const runId = useRef(0);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<(CaseResult | undefined)[]>([]);
  const [notice, setNotice] = useState("");
  const invalidate = (message = "") => {
    runId.current++;
    runner.current?.cancel();
    setRunning(false);
    setResults([]);
    setNotice(message);
  };
  const run = async () => {
    if (!contract) return;
    invalidate();
    runner.current ??= createPracticeRunner();
    const id = runId.current;
    setRunning(true);
    setNotice("Running visible cases…");
    await runner.current.run(language, code[language], contract, (result, index) => {
      if (id === runId.current) setResults(previous => { const next = [...previous]; next[index] = result; return next; });
    });
    if (id === runId.current) { setRunning(false); setNotice("Visible case run complete."); }
  };
  useEffect(() => () => { runId.current++; runner.current?.cancel(); }, []);
  const diagnostics = useRef<(() => void) | null>(null);
  useEffect(() => () => diagnostics.current?.(), []);
  return (
    <>
      <Link href="/practice">← Problem Library</Link>
      <div className="practice-panes">
        <article className="practice-description">
          <h1>{problem.title}</h1>
          <span className={"difficulty " + problem.difficulty}>
            {problem.difficulty}
          </span>
          <div className="practice-tags">
            {problem.problem_tags.map(({ tag }) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <h2>Description &amp; examples</h2>
          <div className="practice-prose">{problem.description}</div>
          <h2>Constraints</h2>
          <div className="practice-prose">{problem.constraints}</div>
        </article>
        <section className="practice-work" aria-label="Practice editor">
          <div className="practice-toolbar">
            <label>
              Language{" "}
              <select
                value={language}
                onChange={(e) => { invalidate(); setLanguage(e.target.value as Language); }}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </label>
            <button disabled={!contract || running} onClick={run}>Run visible cases</button>
            {running && <button onClick={() => {
              runId.current++;
              runner.current?.cancel();
              setRunning(false);
              setNotice("Execution cancelled.");
              setResults(previous => contract!.cases.map((test, index) => previous[index] ?? { ...test, status: "cancelled", stdout: "", error: "Execution cancelled before this case completed." }));
            }}>Cancel</button>}
          </div>
          <p className="practice-note">
            Drafts stay on this page only. Leaving or reloading resets your
            code.
          </p>
          <Editor
            key={language}
            height="460px"
            language={language}
            value={code[language]}
            theme={theme === "dark" ? "foxey-dark" : "foxey-light"}
            beforeMount={(monaco) => {
              configureJavaScript(monaco);
              monaco.editor.defineTheme("foxey-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                  "editor.background": "#0a1120",
                  "editor.lineHighlightBackground": "#111d30",
                  "editorLineNumber.foreground": "#61728e",
                  "editor.selectionBackground": "#254b80",
                },
              });
              monaco.editor.defineTheme("foxey-light", {
                base: "vs",
                inherit: true,
                rules: [],
                colors: {
                  "editor.background": "#ffffff",
                  "editor.lineHighlightBackground": "#f3f6fc",
                  "editorLineNumber.foreground": "#8190a8",
                },
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 20 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            onMount={(editor, monaco) => {
              diagnostics.current?.();
              const model = editor.getModel();
              diagnostics.current = model
                ? attachDiagnostics(monaco, model)
                : null;
            }}
            onChange={(value) => {
              invalidate();
              setCode((previous) => ({ ...previous, [language]: value ?? "" }));
            }}
          />
          <section className="practice-tests">
            <h2>Visible test cases</h2>
            {reason && <p>{reason}</p>}
            {contract && <>
              <p>Contract v{contract.version}: implement <code>{contract.functions[language]}({contract.parameters.join(", ")})</code> and return a JSON value synchronously. Arguments are positional; arrays keep their order and object key order does not matter. Each case starts fresh.</p>
              <p>Only the cases below run locally in your browser. These results are for practice, not a trusted submission. JavaScript has 2 seconds per case; Python has 5 seconds after loading (up to 30 seconds). Timeout or cancellation may lose buffered logs.</p>
              <p role="status">{notice}</p>
              {contract.cases.map((test, index) => {
                const result = results[index];
                return <div className="practice-case" key={index}>
                  <h3>Case {index + 1} · {result?.status ?? "Not run"}</h3>
                  <pre>Arguments: {JSON.stringify(test.args)}{"\n"}Expected: {JSON.stringify(test.expected)}{"\n"}Actual: {result && "actual" in result ? JSON.stringify(result.actual) : "—"}</pre>
                  {result?.error && <pre>{result.error}</pre>}
                  {result?.stdout && <pre>stdout / logs:{"\n"}{result.stdout}</pre>}
                </div>;
              })}
            </>}
          </section>
        </section>
      </div>
    </>
  );
}
