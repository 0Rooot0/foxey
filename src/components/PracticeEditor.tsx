"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </label>
            <button disabled>Run · Coming soon</button>
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
            onChange={(value) =>
              setCode((previous) => ({ ...previous, [language]: value ?? "" }))
            }
          />
          <section className="practice-tests">
            <h2>Test Cases</h2>
            <p>Running code and testing examples are coming in PRACTICE-02.</p>
          </section>
        </section>
      </div>
    </>
  );
}
