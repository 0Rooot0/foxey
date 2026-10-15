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

    const worker = new Worker(workerUrl);

    const timeout = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      resolve("Execution timed out.");
    }, 2000);

    worker.onmessage = (event) => {
      clearTimeout(timeout);

      worker.terminate();

      URL.revokeObjectURL(workerUrl);

      resolve(event.data.output || "Code finished with no output.");
    };

    worker.postMessage(code);
  });
}