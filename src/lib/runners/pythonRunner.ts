type PyodideRuntime = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: {
    batched: (text: string) => void;
  }) => void;
  setStderr: (options: {
    batched: (text: string) => void;
  }) => void;
};

declare global {
  interface Window {
    loadPyodide?: (options: {
      indexURL: string;
    }) => Promise<PyodideRuntime>;
  }
}

let scriptReadyPromise: Promise<void> | null = null;
let pyodidePromise: Promise<PyodideRuntime> | null = null;

async function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) {
    return;
  }

  if (!scriptReadyPromise) {
    scriptReadyPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/pyodide.js";

      script.onload = () => resolve();

      script.onerror = () => {
        scriptReadyPromise = null;
        reject(new Error("Failed to load Pyodide."));
      };

      document.head.appendChild(script);
    });
  }

  await scriptReadyPromise;
}

async function getPyodide(): Promise<PyodideRuntime> {
  await loadPyodideScript();

  if (!window.loadPyodide) {
    throw new Error("Pyodide failed to load.");
  }

  if (!pyodidePromise) {
    pyodidePromise = window.loadPyodide({
      indexURL:
        "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/",
    });
  }

  return pyodidePromise;
}

export async function runPython(code: string): Promise<string> {
  try {
    const pyodide = await getPyodide();

    const output: string[] = [];

    pyodide.setStdout({
      batched: (text) => output.push(text),
    });

    pyodide.setStderr({
      batched: (text) => output.push(text),
    });

    await pyodide.runPythonAsync(code);

    return output.join("\n") || "Code finished with no output.";
  } catch (error) {
    return String(error);
  }
}