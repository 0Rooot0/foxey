const PYTHON_TIMEOUT_MS = 5000;

let pythonWorker: Worker | null = null;

function getPythonWorker(): Worker {
  // Reuse one worker so Pyodide stays initialized between successful runs.
  if (!pythonWorker) {
    pythonWorker = new Worker(
      new URL("./pythonWorker.ts", import.meta.url)
    );
  }

  return pythonWorker;
}

function resetPythonWorker(): void {
  // Terminating the worker also stops any Python code currently running.
  pythonWorker?.terminate();
  pythonWorker = null;
}

export function runPython(code: string): Promise<string> {
  return new Promise((resolve) => {
    const worker = getPythonWorker();

    let finished = false;

    const finish = (result: string) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeout);
      resolve(result);
    };

    const timeout = setTimeout(() => {
      resetPythonWorker();
      finish("Execution timed out.");
    }, PYTHON_TIMEOUT_MS);

    worker.onmessage = (event) => {
      finish(
        event.data.output ||
          "Code finished with no output."
      );
    };

    worker.onerror = () => {
      resetPythonWorker();
      finish("Python execution failed.");
    };

    worker.postMessage({ code });
  });
}