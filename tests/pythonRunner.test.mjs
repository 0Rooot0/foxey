import assert from "node:assert/strict";
import { test } from "node:test";

let moduleId = 0;

async function setup(t) {
  const workers = [];
  const previousWorker = globalThis.Worker;
  globalThis.Worker = class {
    terminated = false;
    constructor() { workers.push(this); }
    postMessage(message) { this.message = message; }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage({ data }); }
  };
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.after(() => {
    if (previousWorker === undefined) delete globalThis.Worker;
    else globalThis.Worker = previousWorker;
  });
  const runner = await import(`../src/lib/runners/pythonRunner.ts?test=${moduleId++}`);
  return { ...runner, workers };
}

test("Python startup can take longer than the execution budget", async (t) => {
  const { runPython, workers } = await setup(t);
  const result = runPython('print("ready")');
  t.mock.timers.tick(10000);
  assert.equal(workers[0].terminated, false);
  workers[0].emit({ type: "ready" });
  workers[0].emit({ output: "ready" });
  assert.equal(await result, "ready");
});

test("Python startup has a bounded timeout", async (t) => {
  const { runPython, workers } = await setup(t);
  const result = runPython("pass");
  t.mock.timers.tick(30000);
  assert.match(await result, /could not load in time/);
  assert.equal(workers[0].terminated, true);
});

test("Python execution still stops after five seconds", async (t) => {
  const { runPython, workers } = await setup(t);
  const result = runPython("while True: pass");
  t.mock.timers.tick(12000);
  workers[0].emit({ type: "ready" });
  t.mock.timers.tick(4999);
  assert.equal(workers[0].terminated, false);
  t.mock.timers.tick(1);
  assert.equal(await result, "Execution timed out.");
  assert.equal(workers[0].terminated, true);
});

test("Cancellation works during startup and execution", async (t) => {
  const { runPython, cancelPython, workers } = await setup(t);
  const startup = runPython("pass");
  cancelPython();
  assert.equal(await startup, "Execution cancelled.");
  assert.equal(workers[0].terminated, true);
  const execution = runPython("while True: pass");
  workers[1].emit({ type: "ready" });
  cancelPython();
  assert.equal(await execution, "Execution cancelled.");
  assert.equal(workers[1].terminated, true);
});

test("Successful runs reuse the initialized Python worker", async (t) => {
  const { runPython, workers } = await setup(t);
  const first = runPython('print("one")');
  workers[0].emit({ type: "ready" });
  workers[0].emit({ output: "one" });
  assert.equal(await first, "one");
  const second = runPython('print("two")');
  assert.equal(workers.length, 1);
  workers[0].emit({ type: "ready" });
  workers[0].emit({ output: "two" });
  assert.equal(await second, "two");
  t.mock.timers.tick(30000);
  assert.equal(workers[0].terminated, false);
});

test("Worker errors are surfaced and the next run gets a fresh worker", async (t) => {
  const { runPython, cancelPython, workers } = await setup(t);
  const failed = runPython("pass");
  workers[0].onerror();
  assert.equal(await failed, "Python execution failed.");
  assert.equal(workers[0].terminated, true);
  const retry = runPython("pass");
  assert.equal(workers.length, 2);
  cancelPython();
  assert.equal(await retry, "Execution cancelled.");
});
