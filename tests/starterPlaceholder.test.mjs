import assert from "node:assert/strict";
import { test } from "node:test";
import { createStarterPlaceholders } from "../src/lib/practice/starterPlaceholder.ts";

const starter = "def solve(value):\n    # Write your solution here.\n    pass\n";
function editSession(source = starter) {
  const placeholders = createStarterPlaceholders(source);
  let code = source;
  return {
    get code() { return code; },
    edit(offset, length, text, undoOrRedo = false) {
      code = code.slice(0, offset) + text + code.slice(offset + length);
      const removals = placeholders.update([{ rangeOffset: offset, rangeLength: length, text }], undoOrRedo);
      for (const start of removals.sort((a, b) => b - a)) {
        assert.equal(code.slice(start, start + 4), "pass");
        code = code.slice(0, start) + code.slice(start + 4);
        placeholders.update([{ rangeOffset: start, rangeLength: 4, text: "" }]);
      }
      return removals.length;
    },
  };
}

test("typing before or after the starter pass removes only the original token", () => {
  for (const offset of [starter.indexOf("pass"), starter.indexOf("pass") + 4]) {
    const session = editSession();
    assert.equal(session.edit(offset, 0, "return value"), 1);
    assert.equal(session.code.includes("pass"), false);
    assert.match(session.code, /return value/);
  }
});

test("body edits on another line remove pass; header edits only move its tracked position", () => {
  const session = editSession();
  assert.equal(session.edit(0, 0, "# solution\n"), 0);
  assert.equal(session.edit(session.code.indexOf("    #"), 0, "    return value\n"), 1);
  assert.equal(session.code.includes("pass"), false);
});

test("whitespace alone preserves the placeholder until code is entered", () => {
  const session = editSession();
  assert.equal(session.edit(starter.indexOf("pass"), 0, "\n    "), 0);
  assert.equal(session.edit(session.code.indexOf("pass"), 0, "return value"), 1);
});

test("editing or replacing pass retires it permanently", () => {
  for (const [offset, length, text] of [[starter.indexOf("pass") + 1, 0, "x"], [starter.indexOf("pass"), 4, "pass"]]) {
    const session = editSession();
    assert.equal(session.edit(offset, length, text), 0);
    assert.equal(session.edit(session.code.indexOf("    #"), 0, "    value = 1\n"), 0);
    assert.match(session.code, /p(?:x)?ass/);
  }
});

test("a later intentional pass survives subsequent edits", () => {
  const session = editSession();
  session.edit(starter.indexOf("pass"), 0, "return value");
  session.edit(session.code.length, 0, "    pass\n");
  assert.equal(session.edit(session.code.indexOf("return"), 0, "# "), 0);
  assert.match(session.code, /    pass\n$/);
});

test("undo and redo never re-arm placeholder cleanup", () => {
  const session = editSession();
  session.edit(0, 0, "", true);
  assert.equal(session.edit(starter.indexOf("pass"), 0, "return value"), 0);
  assert.match(session.code, /return valuepass/);
});

test("only Python functions with pass as their sole statement qualify", () => {
  for (const source of ["pass\n", "function solve() { pass }", "def solve():\n    value = 1\n    pass\n", 'def solve():\n    "pass"\n']) {
    const session = editSession(source);
    assert.equal(session.edit(source.length, 0, "return value"), 0);
  }
});

test("each starter function is tracked separately across edits", () => {
  const session = editSession(starter + "\ndef other():\n    pass\n");
  assert.equal(session.edit(session.code.indexOf("pass"), 0, "return value"), 1);
  assert.equal(session.code.match(/pass/g).length, 1);
  assert.equal(session.edit(session.code.indexOf("pass"), 0, "return 2"), 1);
  assert.equal(session.code.includes("pass"), false);
});

test("editing the next function header preserves the previous placeholder", () => {
  const session = editSession(starter + "def other():\n    pass\n");
  assert.equal(session.edit(session.code.indexOf("def other"), 0, "async "), 0);
  assert.equal(session.edit(session.code.lastIndexOf("pass"), 0, "return 2"), 1);
  assert.equal(session.code.match(/pass/g).length, 1);
});

test("CRLF starters and a final pass without a newline are supported", () => {
  for (const source of [starter.replaceAll("\n", "\r\n"), "def solve():\n    pass"]) {
    const session = editSession(source);
    assert.equal(session.edit(source.indexOf("pass") + 4, 0, "return 1"), 1);
    assert.equal(session.code.includes("pass"), false);
  }
});

test("multiple edits use offsets from the same original buffer", () => {
  const tracker = createStarterPlaceholders(starter);
  const offset = starter.indexOf("pass");
  assert.deepEqual(tracker.update([
    { rangeOffset: 0, rangeLength: 0, text: "# note\n" },
    { rangeOffset: offset, rangeLength: 0, text: "return value" },
  ]), [offset + "# note\n".length + "return value".length]);
});
