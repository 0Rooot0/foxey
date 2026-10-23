import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/auth/profile.ts", import.meta.url), "utf8");
const participantsUrl = new URL("../src/lib/collaboration/participants.ts", import.meta.url).href;
const compiled = ts.transpileModule(source.replace('"../collaboration/participants"', JSON.stringify(participantsUrl)), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { normalizeIdentity, profileIdentity, identityToMigrate } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

function profile(overrides = {}) {
  return { id: "user-1", display_name: null, avatar: null, role: "student", created_at: "", updated_at: "", ...overrides };
}

test("migration uses the local identity only for missing profile fields", () => {
  const local = { name: "  Ava  ", avatar: 7 };
  assert.deepEqual(identityToMigrate(profile(), local), { name: "Ava", avatar: 7 });
  assert.deepEqual(identityToMigrate(profile({ display_name: "Saved", avatar: null }), local), { name: "Saved", avatar: 7 });
  assert.deepEqual(identityToMigrate(profile({ display_name: "Saved", avatar: 3 }), local), null);
});

test("profile identity is normalized and invalid names require onboarding", () => {
  assert.deepEqual(profileIdentity(profile({ display_name: "  Lin  ", avatar: 99 })), { name: "Lin", avatar: 6 });
  assert.equal(profileIdentity(profile({ display_name: "   " })), null);
  assert.equal(normalizeIdentity("", 2), null);
});
