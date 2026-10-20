import * as Y from "yjs";
import { supabase } from "@/lib/supabase/client";

export function connectRoomToSupabase(
  roomId: string,
  ydoc: Y.Doc
) {
  const channel = supabase.channel(`room:${roomId}`);

  channel.on(
    "broadcast",
    { event: "yjs-update" },
    ({ payload }) => {
      const update = new Uint8Array(payload.update);
      Y.applyUpdate(ydoc, update, "remote");
    }
  );

  const handleLocalUpdate = (
    update: Uint8Array,
    origin: unknown
  ) => {
    if (origin === "remote") return;

    channel.send({
      type: "broadcast",
      event: "yjs-update",
      payload: {
        update: Array.from(update),
      },
    });
  };

  ydoc.on("update", handleLocalUpdate);

  channel.subscribe();

  return () => {
    ydoc.off("update", handleLocalUpdate);
    supabase.removeChannel(channel);
  };
}