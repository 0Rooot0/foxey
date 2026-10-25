import type { editor } from "monaco-editor";
import { pythonMarker, type PythonSyntaxError } from "./pythonMarker";

type Monaco = typeof import("monaco-editor");
const OWNER = "foxey-python";

export function configureJavaScript(monaco: Monaco) {
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSyntaxValidation: false, noSemanticValidation: true, noSuggestionDiagnostics: true,
  });
}

export function attachDiagnostics(monaco: Monaco, model: editor.ITextModel) {
  if (model.getLanguageId() !== "python") return () => {};
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let timeout: ReturnType<typeof setTimeout>;
  let disposed = false;
  let busy = false;
  let revision = 0;
  let pending: { id: number; code: string } | undefined;

  const clear = () => { if (!model.isDisposed()) monaco.editor.setModelMarkers(model, OWNER, []); };
  const reset = () => {
    clearTimeout(timeout);
    worker?.terminate();
    worker = undefined;
    busy = false;
    clear();
    if (!disposed && pending) send();
  };
  const send = () => {
    if (disposed || busy || !pending) return;
    try {
      if (!worker) {
        // Separate runtime from Run: syntax checks never execute student code.
        worker = new Worker(new URL("../runners/pythonWorker.ts", import.meta.url));
        const currentWorker = worker;
        worker.onerror = () => { if (worker === currentWorker) reset(); };
        worker.onmessage = (event: MessageEvent<{ id: number; error?: PythonSyntaxError | null; failed?: boolean }>) => {
          if (worker !== currentWorker || disposed) return;
          if (event.data.failed) { reset(); return; }
          clearTimeout(timeout);
          busy = false;
          if (!disposed && !model.isDisposed() && event.data.id === revision) {
            monaco.editor.setModelMarkers(model, OWNER, event.data.error ? [pythonMarker(model.getValue(), event.data.error)] : []);
          }
          send();
        };
      }
      busy = true;
      worker.postMessage({ type: "diagnostics", ...pending });
      pending = undefined;
      timeout = setTimeout(reset, 30000);
    } catch { pending = undefined; reset(); }
  };
  const schedule = () => {
    revision++;
    pending = undefined;
    clearTimeout(timer);
    clear();
    timer = setTimeout(() => {
      if (disposed || model.isDisposed()) return;
      pending = { id: revision, code: model.getValue() };
      send();
    }, 350);
  };
  const changes = model.onDidChangeContent(schedule);
  const dispose = () => {
    disposed = true;
    clearTimeout(timer);
    reset();
    changes.dispose();
    disposal.dispose();
  };
  const disposal = model.onWillDispose(dispose);
  schedule();
  return dispose;
}
