let pythonWorker: Worker | null = null;

function getPythonWorker(): Worker {
  // Create the worker once and reuse it so Pyodide stays initialized.
  if (!pythonWorker) {
    pythonWorker = new Worker(
      new URL("./pythonWorker.ts", import.meta.url)
    );
  }

  return pythonWorker;
}

export function runPython(code: string): Promise<string> {
  return new Promise((resolve) => {
    const worker = getPythonWorker();

    worker.onmessage = (event) => {
      resolve(
        event.data.output ||
          "Code finished with no output."
      );
    };

    // Convert worker-level failures into a readable result for the UI.
    worker.onerror = () => {
      resolve("Python execution failed.");
    };

    worker.postMessage({ code });
  });
}