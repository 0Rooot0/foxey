/// <reference lib="webworker" />

const PYODIDE_BASE_URL =
  "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";

type PyodideRuntime = {
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
  event: MessageEvent<{ code: string }>
) => {
  const output: string[] = [];

  try {
    const pyodide = await getPyodide();

    pyodide.setStdout({
      batched: (text) => output.push(text),
    });

    pyodide.setStderr({
      batched: (text) => output.push(text),
    });

    await pyodide.runPythonAsync(event.data.code);

    workerScope.postMessage({
      output:
        output.join("\n") ||
        "Code finished with no output.",
    });
  } catch (error) {
    workerScope.postMessage({
      output: String(error),
    });
  }
};