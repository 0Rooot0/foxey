import assert from "node:assert/strict";
import { test } from "node:test";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
let persistenceSource = await readFile(new URL('../src/lib/collaboration/roomPersistence.ts', import.meta.url), 'utf8');
persistenceSource = persistenceSource.replace('"./sharedModel"', JSON.stringify(new URL('../src/lib/collaboration/sharedModel.ts', import.meta.url).href)).replace('"yjs"', JSON.stringify(new URL('../node_modules/yjs/dist/yjs.mjs', import.meta.url).href));
const { persistRoom, saveMergedState, decodeState } = await import('data:text/javascript,' + encodeURIComponent(stripTypeScriptTypes(persistenceSource)));

function database() {
  const rows = new Map();
  return (id) => ({
    read: async () => structuredClone(rows.get(id)),
    compareAndSwap: async (previous, next) => {
      if (JSON.stringify(rows.get(id)) !== JSON.stringify(previous)) return false;
      rows.set(id, { state: structuredClone(next), revision: String(Number(previous?.revision || 0) + 1) }); return true;
    },
  });
}
function open(store, local = {}) {
  const doc = new Y.Doc();
  const statuses = [];
  const persistence = persistRoom(doc, store, { onStatus: (s) => statuses.push(s), readLocal: () => local.state, writeLocal: (s) => { local.state = s; } });
  return { doc, statuses, ...persistence };
}
test("leave for Rooms, return, refresh, all clients leave, and room isolation", async () => {
  const db = database();
  let room = open(db("a")); await room.ready;
  room.doc.getText("code:python").insert(0, 'print("saved")');
  room.doc.getText("code:javascript").insert(0, 'console.log("saved")');
  room.doc.getText("shared-output").insert(0, "saved");
  await room.stop(); room.doc.destroy();
  for (let i = 0; i < 3; i++) {
    // New documents and no browser cache simulate return, refresh, and rejoin.
    room = open(db("a")); await room.ready;
    assert.equal(room.doc.getText("code:python").toString(), 'print("saved")');
    assert.equal(room.doc.getText("code:javascript").toString(), 'console.log("saved")');
    assert.equal(room.doc.getText("shared-output").toString(), "saved");
    await room.stop(); room.doc.destroy();
  }
  const other = open(db("b")); await other.ready;
  assert.equal(other.doc.getText("code:python").length, 0);
  await other.stop(); other.doc.destroy();
});
test("concurrent first saves and stale edits merge, including deletion", async () => {
  const store = database()("race");
  const a = new Y.Doc(); const b = new Y.Doc();
  a.getText("code:python").insert(0, "A"); b.getText("code:python").insert(0, "B");
  await Promise.all([saveMergedState(store, Y.encodeStateAsUpdate(a)), saveMergedState(store, Y.encodeStateAsUpdate(b))]);
  const saved = decodeState((await store.read()).state); Y.applyUpdate(a, saved); Y.applyUpdate(b, saved);
  assert.equal(a.getText("code:python").length, 2);
  a.getText("code:python").delete(0, 1); b.getText("code:python").insert(2, "C");
  await Promise.all([saveMergedState(store, Y.encodeStateAsUpdate(a)), saveMergedState(store, Y.encodeStateAsUpdate(b))]);
  const final = new Y.Doc(); Y.applyUpdate(final, decodeState((await store.read()).state));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  assert.equal(final.getText("code:python").toString(), a.getText("code:python").toString());
  a.destroy(); b.destroy(); final.destroy();
});
test("offline edits recover from local cache without awareness", async () => {
  const local = {}; const store = database()("offline");
  const offline = { ...store, read: async () => { throw new Error("offline"); } };
  const room = open(offline, local); await room.ready;
  const awareness = new Awareness(room.doc); awareness.setLocalState({ user: { name: "Private" }, cursor: 12 });
  room.doc.getText("code:python").insert(0, "offline code");
  await room.stop(); awareness.destroy(); room.doc.destroy();
  assert.equal(room.statuses.includes("error"), true);
  const rejoin = open(store, local); await rejoin.ready;
  assert.equal(rejoin.doc.getText("code:python").toString(), "offline code");
  assert.equal(JSON.stringify(Array.from(rejoin.doc.share.keys())).includes("cursor"), false);
  assert.equal(rejoin.statuses.at(-1), "saved");
  await rejoin.stop(); rejoin.doc.destroy();
});
test("unrecognized legacy data is preserved rather than overwritten", async () => {
  let written = false;
  await assert.rejects(saveMergedState({ read: async () => ({ state: { python: "old" }, revision: "1" }), compareAndSwap: async () => { written = true; return true; } }, Y.encodeStateAsUpdate(new Y.Doc())), /Unsupported/);
  assert.equal(written, false);
});

test("edits made during hydration merge with saved code", async () => {
  const store = database()("loading");
  const saved = new Y.Doc(); saved.getText("code:python").insert(0, "saved");
  await saveMergedState(store, Y.encodeStateAsUpdate(saved));
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let first = true;
  const room = open({ ...store, read: async () => { if (first) { first = false; await gate; } return store.read(); } });
  room.doc.getText("code:python").insert(0, "new");
  release(); await room.ready;
  assert.equal(room.doc.getText("code:python").length, 8);
  await room.stop(); room.doc.destroy(); saved.destroy();
});

test("failed save retries without claiming success", async () => {
  const store = database()("failure");
  let fail = true;
  const room = open({ ...store, compareAndSwap: async (...args) => { if (fail) throw new Error("denied"); return store.compareAndSwap(...args); } });
  await room.ready;
  room.doc.getText("code:python").insert(0, "retry");
  await room.flush(); assert.equal(room.statuses.at(-1), "error");
  fail = false; await room.flush(); assert.equal(room.statuses.at(-1), "saved");
  await room.stop(); room.doc.destroy();
});

test("revision advances at microsecond precision even with a future clock", async () => {
  const { nextRevision } = await import("../src/lib/collaboration/supabaseRoomStore.ts");
  assert.equal(nextRevision("2099-01-01T00:00:00.123456+00:00"), "2099-01-01T00:00:00.123457Z");
  assert.equal(nextRevision("2099-01-01T00:00:00.999999+00:00"), "2099-01-01T00:00:01.000000Z");
});
