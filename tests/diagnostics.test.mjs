import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { pythonMarker } from "../src/lib/diagnostics/pythonMarker.ts";

const error = (values = {}) => ({ message: "SyntaxError: invalid syntax", lineno: 1, offset: 1, end_lineno: 1, end_offset: 2, ...values });
test("Python markers preserve messages and multiline ranges", () => {
  assert.deepEqual(pythonMarker("x = (\n  bad", error({ offset: 5, end_lineno: 2, end_offset: 6 })), {
    message: "SyntaxError: invalid syntax", severity: 8, source: "Python",
    startLineNumber: 1, startColumn: 5, endLineNumber: 2, endColumn: 6,
  });
});
test("Python columns convert Unicode code points to UTF-16", () => {
  const marker = pythonMarker('"😀" + )', error({ offset: 7, end_offset: 8 }));
  assert.equal(marker.startColumn, 8);
  assert.equal(marker.endColumn, 9);
});
test("missing, reversed, and out-of-bounds Python positions are clamped", () => {
  const marker = pythonMarker("abc\r\ndef", error({ lineno: 90, offset: 90, end_lineno: 1, end_offset: -1 }));
  assert.equal(marker.startLineNumber, 2);
  assert.equal(marker.startColumn, 4);
  assert.equal(marker.endLineNumber, 2);
  assert.equal(marker.endColumn, 4);
  assert.equal(pythonMarker("abc", error({ offset: null, end_offset: null })).endColumn, 2);
  assert.equal(pythonMarker("", error()).startColumn, 1);
});

const source = await readFile(new URL("../src/lib/diagnostics/editorDiagnostics.ts", import.meta.url), "utf8");
const markerUrl = new URL("../src/lib/diagnostics/pythonMarker.ts", import.meta.url).href;
const compiled = ts.transpileModule(source.replace('"./pythonMarker"', JSON.stringify(markerUrl)).replace('new URL("../runners/pythonWorker.ts", import.meta.url)', '"worker"'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { attachDiagnostics, configureJavaScript } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

function setup(t) {
  const workers = [];
  const oldWorker = globalThis.Worker;
  globalThis.Worker = class {
    messages = [];
    terminated = false;
    constructor() { workers.push(this); }
    postMessage(value) { this.messages.push(value); }
    terminate() { this.terminated = true; }
    emit(data) { this.onmessage({ data }); }
  };
  t.after(() => { globalThis.Worker = oldWorker; });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let value = "broken";
  let change;
  let markers;
  const model = {
    getLanguageId: () => "python", isDisposed: () => false, getValue: () => value,
    onDidChangeContent: (callback) => { change = callback; return { dispose() {} }; },
    onWillDispose: () => ({ dispose() {} }),
  };
  const dispose = attachDiagnostics({ editor: { setModelMarkers: (_model, _owner, next) => { markers = next; } } }, model);
  return { workers, dispose, markers: () => markers, edit: (next) => { value = next; change(); } };
}
test("model edits debounce, discard stale results, and clear corrected markers", (t) => {
  const s = setup(t);
  t.mock.timers.tick(349);
  assert.equal(s.workers.length, 0);
  t.mock.timers.tick(1);
  const worker = s.workers[0];
  s.edit("fixed");
  worker.emit({ id: 1, error: error() });
  assert.deepEqual(s.markers(), []);
  t.mock.timers.tick(350);
  worker.emit({ id: 2, error: error() });
  assert.equal(s.markers().length, 1);
  s.edit("corrected");
  assert.deepEqual(s.markers(), []);
  t.mock.timers.tick(350);
  worker.emit({ id: 3, error: null });
  assert.deepEqual(s.markers(), []);
  s.dispose();
});
test("busy Python checks coalesce edits and cleanup prevents late markers", (t) => {
  const s = setup(t);
  t.mock.timers.tick(350);
  const worker = s.workers[0];
  s.edit("second"); t.mock.timers.tick(350);
  s.edit("latest"); t.mock.timers.tick(350);
  assert.equal(worker.messages.length, 1);
  worker.emit({ id: 1, error: error() });
  assert.equal(worker.messages[1].code, "latest");
  s.dispose();
  assert.equal(worker.terminated, true);
  worker.emit({ id: 3, error: error() });
  assert.deepEqual(s.markers(), []);
});
test("worker timeout and failure allow a fresh check on the next edit", (t) => {
  const s = setup(t);
  t.mock.timers.tick(350); t.mock.timers.tick(30000);
  assert.equal(s.workers[0].terminated, true);
  s.edit("retry"); t.mock.timers.tick(350);
  assert.equal(s.workers.length, 2);
  s.workers[1].onerror();
  s.edit("retry again"); t.mock.timers.tick(350);
  assert.equal(s.workers.length, 3);
  s.dispose();
});
test("failed Python checks restart the worker and send the latest queued edit", (t) => {
  const s = setup(t);
  t.mock.timers.tick(350);
  const worker = s.workers[0];
  s.edit("latest"); t.mock.timers.tick(350);
  worker.emit({ id: 1, failed: true });
  assert.equal(worker.terminated, true);
  assert.equal(s.workers.length, 2);
  assert.equal(s.workers[1].messages[0].code, "latest");
  worker.emit({ id: 1, failed: true });
  assert.equal(s.workers[1].terminated, false);
  s.workers[1].emit({ id: 2, error: error() });
  assert.equal(s.markers().length, 1);
  s.dispose();
});
test("blocked worker creation does not recurse", (t) => {
  const oldWorker = globalThis.Worker;
  globalThis.Worker = class { constructor() { throw new Error("blocked"); } };
  t.after(() => { globalThis.Worker = oldWorker; });
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let markers;
  const model = {
    getLanguageId: () => "python", isDisposed: () => false, getValue: () => "broken",
    onDidChangeContent: () => ({ dispose() {} }),
    onWillDispose: () => ({ dispose() {} }),
  };
  const dispose = attachDiagnostics({ editor: { setModelMarkers: (_model, _owner, next) => { markers = next; } } }, model);
  assert.doesNotThrow(() => t.mock.timers.tick(350));
  assert.deepEqual(markers, []);
  dispose();
});
test("JavaScript enables native syntax diagnostics without type-checking noise", () => {
  let options;
  configureJavaScript({ languages: { typescript: { javascriptDefaults: { setDiagnosticsOptions: (value) => { options = value; } } } } });
  assert.equal(options.noSyntaxValidation, false);
  assert.equal(options.noSemanticValidation, true);
});
