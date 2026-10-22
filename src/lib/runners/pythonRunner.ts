const PYTHON_TIMEOUT_MS = 5000;
const PYTHON_STARTUP_TIMEOUT_MS = 30000;

let pythonWorker: Worker | null = null;
let cancelActiveRun: (() => void) | null = null;

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
  // Terminating the worker immediately stops any Python currently running.
  pythonWorker?.terminate();
  pythonWorker = null;
}

export function cancelPython(): void {
  cancelActiveRun?.();
}

export function runPython(code: string): Promise<string> {
  return new Promise((resolve) => {
    const worker = getPythonWorker();

    let finished = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: string) => {
      if (finished) {
        return;
      }

      finished = true;

      if (timeout) {
        clearTimeout(timeout);
      }

      cancelActiveRun = null;

      resolve(result);
    };

    cancelActiveRun = () => {
      resetPythonWorker();
      finish("Execution cancelled.");
    };

    timeout = setTimeout(() => {
      resetPythonWorker();
      finish("Python could not load in time. Check your connection and try again.");
    }, PYTHON_STARTUP_TIMEOUT_MS);

    worker.onmessage = (event) => {
      if (event.data.type === "ready") {
        if (timeout) clearTimeout(timeout);
        // Runtime download time should not consume the student's execution budget.
        timeout = setTimeout(() => {
          resetPythonWorker();
          finish("Execution timed out.");
        }, PYTHON_TIMEOUT_MS);
        return;
      }
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
