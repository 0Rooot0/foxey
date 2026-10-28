import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import * as Y from "yjs";
import { createTextBuffer } from "monaco-editor/esm/vs/editor/common/model/textModel.js";
import { Range } from "monaco-editor/esm/vs/editor/common/core/range.js";
import { Selection } from "monaco-editor/esm/vs/editor/common/core/selection.js";
import { prepareSharedModel, applyRoomUpdate } from "../src/lib/collaboration/sharedModel.ts";

// Use the installed binding and Monaco text buffer, without a browser renderer.
let bindingSource = await readFile(new URL('../node_modules/y-monaco/src/y-monaco.js', import.meta.url), 'utf8');
bindingSource = bindingSource.replace("import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'", `import { Selection } from '${new URL('../node_modules/monaco-editor/esm/vs/editor/common/core/selection.js', import.meta.url).href}'; const monaco = { Selection };`);
for (const [name, path] of Object.entries({ yjs: '../node_modules/yjs/dist/yjs.mjs', 'lib0/error': '../node_modules/lib0/error.js', 'lib0/mutex': '../node_modules/lib0/mutex.js', 'y-protocols/awareness': '../node_modules/y-protocols/awareness.js' })) {
  bindingSource = bindingSource.replaceAll(`from '${name}'`, `from '${new URL(path, import.meta.url).href}'`);
}
const { MonacoBinding } = await import('data:text/javascript,' + encodeURIComponent(bindingSource));
function model(defaultEOL) {
  let buffer = createTextBuffer('', defaultEOL).textBuffer;
  const listeners = new Set();
  return {
    getValue() { const row = buffer.getLineCount(); return buffer.getValueInRange(new Range(1, 1, row, buffer.getLineLength(row) + 1)); },
    setValue(value) { buffer.dispose(); buffer = createTextBuffer(value, defaultEOL).textBuffer; },
    setEOL(value) { buffer.setEOL(value === 0 ? '\n' : '\r\n'); },
    getPositionAt(offset) { return buffer.getPositionAt(offset); },
    applyEdits(ops) {
      const result = buffer.applyEdits(ops, false, false);
      for (const listener of listeners) listener({ changes: result.changes });
    },
    onDidChangeContent(listener) { listeners.add(listener); return { dispose: () => listeners.delete(listener) }; },
    onWillDispose() { return { dispose() {} }; },
    dispose() { buffer.dispose(); },
  };
}
function session(defaultEOL, prepared = true, doc = new Y.Doc()) {
  const text = doc.getText('code:python');
  const editorModel = model(defaultEOL);
  if (prepared) prepareSharedModel(editorModel, text);
  const binding = new MonacoBinding(text, editorModel);
  return { doc, text, model: editorModel, stop() { binding.destroy(); editorModel.dispose(); doc.destroy(); } };
}
function insert(model, line, column, text) {
  model.applyEdits([{ range: new Selection(line, column, line, column), text, forceMoveMarkers: true }]);
}
function sync(a, b) {
  applyRoomUpdate(b.doc, Y.encodeStateAsUpdate(a.doc), 'remote');
  applyRoomUpdate(a.doc, Y.encodeStateAsUpdate(b.doc), 'remote');
}
test('reproduces offset drift between unprepared Windows and Unix models', () => {
  const windows = session(2, false); const unix = session(1, false);
  insert(unix.model, 1, 1, 'one\ntwo\nthree'); Y.applyUpdate(windows.doc, Y.encodeStateAsUpdate(unix.doc));
  insert(windows.model, 3, 1, '!'); Y.applyUpdate(unix.doc, Y.encodeStateAsUpdate(windows.doc));
  assert.notEqual(windows.model.getValue().replaceAll('\r\n', '\n'), unix.model.getValue());
  windows.stop(); unix.stop();
});
test('Windows and Unix multiline edits, CRLF paste, delete, and concurrent edits stay identical', () => {
  const windows = session(2); const unix = session(1);
  insert(unix.model, 1, 1, 'def greet():\n    print("hello ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¹ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬")\n'); sync(unix, windows);
  insert(windows.model, 2, 5, '# note\r\n    '); sync(windows, unix);
  insert(unix.model, 1, 1, '# unix\n');
  insert(windows.model, 3, 5, '# windows\n    '); sync(unix, windows);
  windows.model.applyEdits([{ range: new Selection(1, 1, 2, 1), text: '', forceMoveMarkers: true }]); sync(windows, unix);
  assert.equal(windows.model.getValue(), unix.model.getValue());
  assert.equal(windows.model.getValue(), windows.text.toString());
  assert.equal(unix.model.getValue(), unix.text.toString());
  assert.equal(windows.model.getValue().includes('\r'), false);
  windows.stop(); unix.stop();
});
test('legacy CRLF room content is normalized without changing code or indentation', () => {
  const doc = new Y.Doc(); const text = doc.getText('code:python');
  text.insert(0, 'def greet():\r\n\tprint("hello")\r\n');
  const saved = Y.encodeStateAsUpdate(doc);
  const room = session(2, true, doc);
  assert.equal(room.model.getValue(), 'def greet():\n\tprint("hello")\n');
  const rejoined = new Y.Doc(); Y.applyUpdate(rejoined, saved); Y.applyUpdate(rejoined, Y.encodeStateAsUpdate(doc));
  assert.equal(rejoined.getText('code:python').toString(), room.model.getValue());
  rejoined.destroy(); room.stop();
});
test('late CRLF hydration and duplicate updates preserve model offsets on both clients', () => {
  const oldDoc = new Y.Doc(); oldDoc.getText('code:python').insert(0, 'one\r\ntwo\r\nthree');
  const update = Y.encodeStateAsUpdate(oldDoc);
  const a = session(2); const b = session(1);
  applyRoomUpdate(a.doc, update, 'saved'); applyRoomUpdate(b.doc, update, 'saved');
  sync(a, b);
  applyRoomUpdate(a.doc, update, 'saved');
  insert(a.model, 3, 1, '!'); sync(a, b);
  assert.equal(a.model.getValue(), 'one\ntwo\n!three');
  assert.equal(a.model.getValue(), b.model.getValue());
  assert.equal(a.text.toString(), b.text.toString());
  assert.equal(a.model.getValue(), a.text.toString());
  a.stop(); b.stop(); oldDoc.destroy();
});
