import type { Contract, VisibleCase } from "./contracts";
import type { Language } from "./problems";
import { javascriptHarness, pythonHarness, type CaseResult } from "./harness";

// Instance-owned cancellation never touches the shared-room runner singletons.
export function createPracticeRunner() {
  let cancelCase: (() => void) | undefined;
  let generation = 0;
  const cancel = () => { generation++; cancelCase?.(); };
  const runCase = (language: Language, code: string, name: string, test: VisibleCase): Promise<CaseResult> => new Promise((resolve) => {
    let worker: Worker | undefined;
    let url: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let finished = false;
    const finish = (result: Omit<CaseResult, "args" | "expected">) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      cancelCase = undefined;
      resolve({ ...test, ...result });
    };
    cancelCase = () => finish({ status: "cancelled", stdout: "", error: "Execution cancelled." });
    try {
      if (language === "python") worker = new Worker(new URL("../runners/pythonWorker.ts", import.meta.url));
      else {
        url = URL.createObjectURL(new Blob([javascriptHarness(code, name, test)], { type: "application/javascript" }));
        worker = new Worker(url);
      }
      timer = setTimeout(() => finish({ status: "timeout", stdout: "", error: language === "python" ? "Python could not load in time (30 seconds)." : "Execution timed out (2 seconds)." }), language === "python" ? 30000 : 2000);
      worker.onmessage = (event) => {
        if (finished) return;
        if (event.data.type === "ready") {
          clearTimeout(timer);
          timer = setTimeout(() => finish({ status: "timeout", stdout: "", error: "Execution timed out (5 seconds)." }), 5000);
        } else finish(event.data);
      };
      worker.onerror = () => finish({ status: "error", stdout: "", error: "Execution worker failed." });
      if (language === "python") worker.postMessage({ type: "practice", code: pythonHarness(code, name, test) });
    } catch (error) { finish({ status: "error", stdout: "", error: String(error) }); }
  });
  return {
    cancel,
    async run(language: Language, code: string, contract: Contract, onCase: (result: CaseResult, index: number) => void) {
      cancel();
      const current = generation;
      for (let index = 0; index < contract.cases.length; index++) {
        if (current !== generation) return;
        const result = await runCase(language, code, contract.functions[language], contract.cases[index]);
        if (current !== generation) return;
        onCase(result, index);
      }
    },
  };
}
