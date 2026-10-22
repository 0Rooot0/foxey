import * as Y from "yjs";
import { supabase } from "@/lib/supabase/client";

export type Participant = { id: string; name: string };
export type ConnectionStatus = "connecting" | "connected" | "disconnected";
type RoomOptions = {
  onParticipants?: (participants: Participant[]) => void;
  onStatus?: (status: ConnectionStatus) => void;
};

export function connectRoomToSupabase(
  roomId: string,
  ydoc: Y.Doc,
  options: RoomOptions = {}
) {
  const id = String(ydoc.clientID);
  const channel = supabase.channel(`room:${roomId}`, {
    config: { presence: { key: id } },
  });
  let connected = false;
  let disposed = false;

  function applyRemote(update: unknown) {
    if (!Array.isArray(update) || !update.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) return;
    try { Y.applyUpdate(ydoc, new Uint8Array(update), "remote"); } catch { /* Ignore malformed peer updates without interrupting the room. */ }
  }

  channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
    applyRemote(payload.update);
  });

  // A joining or reconnecting peer requests the state it missed while offline.
  channel.on("broadcast", { event: "yjs-sync-request" }, ({ payload }) => {
    if (typeof payload.clientId !== "string" || !Array.isArray(payload.vector)) return;
    try {
      const update = Y.encodeStateAsUpdate(ydoc, new Uint8Array(payload.vector));
      void channel.send({
        type: "broadcast", event: "yjs-sync-response",
        payload: { target: payload.clientId, update: Array.from(update) },
      });
    } catch { /* Other peers can still complete the state exchange. */ }
  });
  channel.on("broadcast", { event: "yjs-sync-response" }, ({ payload }) => {
    if (payload.target === id) applyRemote(payload.update);
  });

  channel.on("presence", { event: "sync" }, () => {
    const people = Object.entries(channel.presenceState<{ name: string }>()).map(([key, entries]) => ({
      id: key,
      name: typeof entries[0]?.name === "string" ? entries[0].name.slice(0, 40) : "Guest",
    }));
    options.onParticipants?.(people);
  });

  const handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || !connected) return;
    void channel.send({
      type: "broadcast", event: "yjs-update",
      payload: { update: Array.from(update) },
    });
  };
  ydoc.on("update", handleLocalUpdate);
  options.onStatus?.("connecting");

  channel.subscribe(async (status) => {
    if (disposed) return;
    connected = status === "SUBSCRIBED";
    options.onStatus?.(connected ? "connected" : "disconnected");
    if (!connected) { options.onParticipants?.([]); return; }
    await channel.track({ name: `Guest ${id.slice(-4)}` });
    if (disposed) return;
    void channel.send({
      type: "broadcast", event: "yjs-sync-request",
      payload: { clientId: id, vector: Array.from(Y.encodeStateVector(ydoc)) },
    });
    // Merge edits made before subscription or during a temporary disconnection.
    void channel.send({
      type: "broadcast", event: "yjs-update",
      payload: { update: Array.from(Y.encodeStateAsUpdate(ydoc)) },
    });
  });

  return () => {
    disposed = true;
    connected = false;
    ydoc.off("update", handleLocalUpdate);
    void supabase.removeChannel(channel);
  };
}
