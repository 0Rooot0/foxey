let javascriptWorker: Worker | null = null;
let cancelActiveRun: (() => void) | null = null;

export function cancelJavaScript(): void {
  cancelActiveRun?.();
}

export function runJavaScript(code: string): Promise<string> {
  return new Promise((resolve) => {
    const workerCode = `
      self.onmessage = function(event) {
        const logs = [];

        console.log = function(...args) {
          logs.push(args.join(" "));
        };

        try {
          eval(event.data);

          self.postMessage({
            type: "success",
            output: logs.join("\\n")
          });
        } catch (error) {
          self.postMessage({
            type: "error",
            output: String(error)
          });
        }
      };
    `;

    const blob = new Blob([workerCode], {
      type: "application/javascript",
    });

    const workerUrl = URL.createObjectURL(blob);

    javascriptWorker = new Worker(workerUrl);
    const worker = javascriptWorker;

    let finished = false;

    const finish = (result: string) => {
      if (finished) {
        return;
      }

      finished = true;
      cancelActiveRun = null;
      resolve(result);
    };

    const timeout = setTimeout(() => {
      worker.terminate();
      javascriptWorker = null;
      URL.revokeObjectURL(workerUrl);
      finish("Execution timed out.");
    }, 2000);

    cancelActiveRun = () => {
      clearTimeout(timeout);
      worker.terminate();
      javascriptWorker = null;
      URL.revokeObjectURL(workerUrl);
      finish("Execution cancelled.");
    };

    worker.onmessage = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      javascriptWorker = null;
      URL.revokeObjectURL(workerUrl);

      finish(
        event.data.output ||
          "Code finished with no output."
      );
    };

    worker.postMessage(code);
  });
}