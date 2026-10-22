import * as Y from "yjs";
import { supabase } from "@/lib/supabase/client";

import { applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates, type Awareness } from "y-protocols/awareness";
import { avatarOptions, participantAppearance, type Participant } from "./participants";
export type { Participant } from "./participants";
export type ConnectionStatus = "connecting" | "connected" | "disconnected";
type RoomOptions = {
  awareness?: Awareness;
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
  const awareness = options.awareness;
  let previousPeers = new Set<string>();
  let participantSnapshot = "";

  function publishParticipants() {
    const people = Object.entries(channel.presenceState<{ name: string }>())
      .filter(([key]) => /^\d+$/.test(key))
      .map(([key, entries]) => {
        const user = awareness?.getStates().get(Number(key))?.user;
        return {
          id: key,
          name: typeof user?.name === "string" ? user.name.slice(0, 40) : typeof entries[0]?.name === "string" ? entries[0].name.slice(0, 40) : "Guest",
          ...participantAppearance(key),
          avatar: Number.isInteger(user?.avatar) && user.avatar >= 0 && user.avatar < avatarOptions.length ? user.avatar : participantAppearance(key).avatar,
        };
      });
    const snapshot = JSON.stringify(people);
    if (snapshot !== participantSnapshot) {
      participantSnapshot = snapshot;
      options.onParticipants?.(people);
    }
  }

  function broadcastAwareness() {
    if (!awareness || !connected) return;
    void channel.send({
      type: "broadcast", event: "awareness-update",
      payload: { update: Array.from(encodeAwarenessUpdate(awareness, [ydoc.clientID])) },
    });
  }

  const handleAwareness = (_changes: unknown, origin: unknown) => {
    publishParticipants();
    if (origin !== "remote") broadcastAwareness();
  };
  awareness?.on("update", handleAwareness);
  channel.on("broadcast", { event: "awareness-update" }, ({ payload }) => {
    if (!awareness || !Array.isArray(payload.update)) return;
    try { applyAwarenessUpdate(awareness, new Uint8Array(payload.update), "remote"); } catch { /* Ignore malformed presence packets. */ }
  });

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
    const peers = new Set(Object.keys(channel.presenceState()));
    if (awareness) {
      const departed = [...previousPeers].filter((key) => key !== id && !peers.has(key)).map(Number);
      removeAwarenessStates(awareness, departed, "remote");
    }
    previousPeers = peers;
    publishParticipants();
    broadcastAwareness();
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
    if (!connected) {
      participantSnapshot = "";
      options.onParticipants?.([]);
      if (awareness) removeAwarenessStates(awareness, [...awareness.getStates().keys()].filter((key) => key !== ydoc.clientID), "remote");
      return;
    }
    await channel.track({ name: `Guest ${id.slice(-4)}` });
    if (disposed) return;
    broadcastAwareness();
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
    awareness?.setLocalState(null);
    awareness?.off("update", handleAwareness);
    disposed = true;
    connected = false;
    ydoc.off("update", handleLocalUpdate);
    void supabase.removeChannel(channel);
  };
}
