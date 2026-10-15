let pyodideReadyPromise: Promise<void> | null = null;

declare global {
  interface Window {
    loadPyodide?: (options: {
      indexURL: string;
    }) => Promise<{
      runPythonAsync: (code: string) => Promise<unknown>;
      setStdout: (options: {
        batched: (text: string) => void;
      }) => void;
      setStderr: (options: {
        batched: (text: string) => void;
      }) => void;
    }>;
  }
}

async function loadPyodideRuntime() {
  if (window.loadPyodide) {
    return;
  }

  if (!pyodideReadyPromise) {
    pyodideReadyPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/pyodide.js";

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Pyodide."));

      document.head.appendChild(script);
    });
  }

  await pyodideReadyPromise;
}

export async function runPython(code: string): Promise<string> {
  await loadPyodideRuntime();

  if (!window.loadPyodide) {
    return "Pyodide failed to load.";
  }

  const output: string[] = [];

  const pyodide = await window.loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/",
  });

  pyodide.setStdout({
    batched: (text) => output.push(text),
  });

  pyodide.setStderr({
    batched: (text) => output.push(text),
  });

  try {
    await pyodide.runPythonAsync(code);

    return output.join("\n") || "Code finished with no output.";
  } catch (error) {
    return String(error);
  }
}