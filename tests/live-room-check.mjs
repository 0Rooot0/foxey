import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import { supabaseRoomStore } from '../src/lib/collaboration/supabaseRoomStore.ts';
import { saveMergedState, decodeState } from '../src/lib/collaboration/roomPersistence.ts';
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const id = crypto.randomUUID();
const store = supabaseRoomStore(client, id);
try {
  const a = new Y.Doc(); const b = new Y.Doc();
  a.getText('code:python').insert(0, 'test A'); b.getText('code:python').insert(0, 'test B');
  await Promise.all([saveMergedState(store, Y.encodeStateAsUpdate(a)), saveMergedState(store, Y.encodeStateAsUpdate(b))]);
  const restored = new Y.Doc(); Y.applyUpdate(restored, decodeState((await store.read()).state));
  assert.equal(restored.getText('code:python').length, 12);
  assert.equal(await supabaseRoomStore(client, crypto.randomUUID()).read(), undefined);
  console.log('PASS: live Supabase insert, select, atomic conflict retry, concurrent merge, and isolation');
  a.destroy(); b.destroy(); restored.destroy();
} finally {
  const { data, error } = await client.from('room_states').delete().eq('room_id', id).select('room_id');
  console.log(error || !data?.length ? 'Test row cleanup unavailable: '+id : 'Test row removed');
}
