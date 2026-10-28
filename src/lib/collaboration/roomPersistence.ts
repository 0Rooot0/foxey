import * as Y from "yjs";
import { applyRoomUpdate } from "./sharedModel";

export type SavedState = { format: "yjs-v1"; update: number[] };
export type StoredRoom = { state: unknown; revision: string };
export type RoomStore = {
  read: () => Promise<StoredRoom | undefined>;
  compareAndSwap: (previous: StoredRoom | undefined, next: SavedState) => Promise<boolean>;
};
export type SaveStatus = "loading" | "saving" | "saved" | "error";
export function decodeState(state: unknown): Uint8Array {
  const value = (typeof state === "string" ? JSON.parse(state) : state) as Partial<SavedState> | null;
  if (value?.format !== "yjs-v1" || !Array.isArray(value.update) || !value.update.every((b) => Number.isInteger(b) && b >= 0 && b <= 255)) throw new Error("Unsupported room state. Keep the original data for migration.");
  return new Uint8Array(value.update);
}
// Compare revisions atomically. Stale writers merge the winning Yjs state and retry.
export async function saveMergedState(store: RoomStore, update: Uint8Array) {
  let merged = update;
  for (let attempt = 0; attempt < 12; attempt++) {
    const previous = await store.read();
    if (previous?.state != null) merged = Y.mergeUpdates([decodeState(previous.state), merged]);
    if (await store.compareAndSwap(previous, { format: "yjs-v1", update: Array.from(merged) })) return merged;
  }
  throw new Error("Room changed repeatedly while saving; retry required.");
}
export function persistRoom(doc: Y.Doc, store: RoomStore, options: {
  onStatus: (status: SaveStatus) => void;
  readLocal: () => unknown;
  writeLocal: (state: SavedState) => void;
}) {
  let stopped = false;
  let pending: Uint8Array | undefined;
  let running: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const origin = {};
  function status(value: SaveStatus) { if (!stopped) options.onStatus(value); }
  function cache(update: Uint8Array) {
    try { options.writeLocal({ format: "yjs-v1", update: Array.from(update) }); } catch { /* Cloud save remains available when local storage is full. */ }
  }
  async function flush(): Promise<void> {
    if (running) { await running; return; }
    running = (async () => {
      while (pending) {
        const update = pending;
        pending = undefined;
        status("saving");
        try {
          const saved = await saveMergedState(store, update);
          if (!stopped) {
            applyRoomUpdate(doc, saved, origin);
            cache(Y.encodeStateAsUpdate(doc));
          }
          if (!pending) status("saved");
        } catch {
          pending = pending ? Y.mergeUpdates([update, pending]) : update;
          status("error");
          if (!stopped) timer = setTimeout(() => { void flush(); }, 3000);
          break;
        }
      }
    })();
    await running;
    running = undefined;
  }
  function changed(_update: Uint8Array, source: unknown) {
    if (source === origin) return;
    pending = Y.encodeStateAsUpdate(doc);
    cache(pending);
    status("saving");
    clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, 250);
  }
  status("loading");
  try {
    const local = options.readLocal();
    if (local) { applyRoomUpdate(doc, decodeState(local), origin); pending = Y.encodeStateAsUpdate(doc); }
  } catch { status("error"); }
  doc.on("update", changed);
  async function hydrate() {
    try {
      const saved = await store.read();
      if (stopped) return;
      if (saved?.state != null) applyRoomUpdate(doc, decodeState(saved.state), origin);
      cache(Y.encodeStateAsUpdate(doc));
      if (pending || running) { if (pending) pending = Y.encodeStateAsUpdate(doc); await flush(); }
      else status("saved");
    } catch {
      status("error");
      if (!stopped) loadTimer = setTimeout(() => { void hydrate(); }, 3000);
    }
  }
  const ready = hydrate();
  return {
    ready, flush,
    stop() {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(loadTimer);
      doc.off("update", changed);
      // Pending state is captured before the workspace destroys the document.
      return flush();
    },
  };
}
