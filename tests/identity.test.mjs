import assert from "node:assert/strict";
import { test } from "node:test";
import { avatarOptions, readIdentity, rememberIdentity } from "../src/lib/collaboration/participants.ts";

function mockStorage(t, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  });
}

function storage(t, entries = {}) {
  const values = new Map(Object.entries(entries));
  mockStorage(t, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  });
  return values;
}

test("missing or whitespace-only identity requires onboarding", (t) => {
  const values = storage(t);
  assert.equal(readIdentity(), null);
  values.set("foxey-display-name", "   ");
  assert.equal(readIdentity(), null);
});

test("existing identity is trimmed and accepts every supported avatar", (t) => {
  const values = storage(t, { "foxey-display-name": "  Ava  " });
  for (let avatar = 0; avatar < avatarOptions.length; avatar++) {
    values.set("foxey-avatar", String(avatar));
    assert.deepEqual(readIdentity(), { name: "Ava", avatar });
  }
});

test("legacy names and malformed avatars use the default fox", (t) => {
  const values = storage(t, { "foxey-display-name": "A".repeat(50) });
  for (const avatar of [null, "", " ", "-1", String(avatarOptions.length), "2.5", "NaN", "frog"]) {
    if (avatar === null) values.delete("foxey-avatar");
    else values.set("foxey-avatar", avatar);
    assert.deepEqual(readIdentity(), { name: "A".repeat(40), avatar: 6 });
  }
});

test("settings persist both identity fields using existing storage keys", (t) => {
  storage(t);
  rememberIdentity({ name: "Liam", avatar: 8 });
  assert.deepEqual(readIdentity(), { name: "Liam", avatar: 8 });
});

test("blocked storage still lets an onboarded user enter in this session", (t) => {
  mockStorage(t, {
    getItem() { throw new Error("Storage blocked"); },
    setItem() { throw new Error("Storage blocked"); },
  });
  rememberIdentity({ name: "Offline Ava", avatar: 6 });
  assert.deepEqual(readIdentity(), { name: "Offline Ava", avatar: 6 });
});
