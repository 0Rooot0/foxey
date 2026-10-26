/// <reference lib="webworker" />

const PYODIDE_BASE_URL =
  "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";

type PyodideRuntime = {
  globals: { set: (name: string, value: string) => void };
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: {
    batched: (text: string) => void;
  }) => void;
  setStderr: (options: {
    batched: (text: string) => void;
  }) => void;
};

type PyodideLoader = (options: {
  indexURL: string;
}) => Promise<PyodideRuntime>;

const workerScope = self as DedicatedWorkerGlobalScope & {
  loadPyodide?: PyodideLoader;
};

let pyodidePromise: Promise<PyodideRuntime> | null = null;

async function getPyodide(): Promise<PyodideRuntime> {
  if (!workerScope.loadPyodide) {
    workerScope.importScripts(
      `${PYODIDE_BASE_URL}pyodide.js`
    );
  }

  if (!workerScope.loadPyodide) {
    throw new Error("Pyodide failed to load.");
  }

  // Reuse one Pyodide runtime inside the worker after the first initialization.
  if (!pyodidePromise) {
    pyodidePromise = workerScope.loadPyodide({
      indexURL: PYODIDE_BASE_URL,
    });
  }

  return pyodidePromise;
}

workerScope.onmessage = async (
  event: MessageEvent<{ code: string; type?: "diagnostics" | "practice"; id?: number }>
) => {
  const output: string[] = [];

  try {
    const pyodide = await getPyodide();
    if (event.data.type === "diagnostics") {
      pyodide.globals.set("_foxey_source", event.data.code);
      const result = await pyodide.runPythonAsync(`
import ast, json
try:
    compile(_foxey_source, "main.py", "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    _foxey_error = None
except SyntaxError as error:
    _foxey_error = dict(message=f"{type(error).__name__}: {error.msg}",
        lineno=error.lineno, offset=error.offset,
        end_lineno=error.end_lineno, end_offset=error.end_offset)
json.dumps(_foxey_error)
`);
      workerScope.postMessage({ id: event.data.id, error: JSON.parse(String(result)) });
      return;
    }
    workerScope.postMessage({ type: "ready" });

    pyodide.setStdout({
      batched: (text) => output.push(text),
    });

    pyodide.setStderr({
      batched: (text) => output.push(text),
    });

    if (event.data.type === "practice") {
      const result = await pyodide.runPythonAsync(event.data.code);
      workerScope.postMessage(JSON.parse(String(result)));
      return;
    }
    await pyodide.runPythonAsync(event.data.code);

    workerScope.postMessage({
      output:
        output.join("\n") ||
        "Code finished with no output.",
    });
  } catch (error) {
  if (event.data.type === "diagnostics") { workerScope.postMessage({ id: event.data.id, failed: true }); return; }
  if (event.data.type === "practice") { workerScope.postMessage({ status: "error", stdout: output.join("\n"), error: String(error) }); return; }
  const message = String(error);

  // Keep only useful traceback lines and report the student's source line
  // together with the final Python error.
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const errorLine = lines.at(-1) ?? message;

  const sourceLine = [...lines]
    .reverse()
    .find((line) => line.includes('File "<exec>", line '));

  const lineNumber =
    sourceLine?.match(/line (\d+)/)?.[1];

  const formattedOutput = lineNumber
    ? `Line ${lineNumber} — ${errorLine}`
    : errorLine;

  workerScope.postMessage({
    output: formattedOutput,
  });
}
};
