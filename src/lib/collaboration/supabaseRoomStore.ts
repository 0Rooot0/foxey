import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoomStore } from "./roomPersistence";

// PostgreSQL timestamps retain microseconds. Always advance beyond the old
// revision, even for simultaneous writes or a client with an inaccurate clock.
export function nextRevision(previous?: string): string {
  let micros = BigInt(Date.now()) * BigInt(1000);
  if (previous) {
    const milliseconds = Date.parse(previous);
    if (!Number.isFinite(milliseconds)) throw new Error("Invalid room revision");
    const fraction = /\.(\d+)/.exec(previous)?.[1] || "";
    const old = BigInt(milliseconds) * BigInt(1000) + BigInt(fraction.padEnd(6, "0").slice(3, 6));
    if (old >= micros) micros = old + BigInt(1);
  }
  const iso = new Date(Number(micros / BigInt(1000))).toISOString();
  return iso.replace("Z", `${String(micros % BigInt(1000)).padStart(3, "0")}Z`);
}
export function supabaseRoomStore(client: SupabaseClient, roomId: string): RoomStore {
  return {
    async read() {
      const { data, error } = await client.from("room_states").select("state,updated_at").eq("room_id", roomId).maybeSingle();
      if (error) throw error;
      if (data && typeof data.updated_at !== "string") throw new Error("Room requires an updated_at revision");
      return data ? { state: data.state, revision: data.updated_at } : undefined;
    },
    async compareAndSwap(previous, next) {
      const row = { state: JSON.stringify(next), updated_at: nextRevision(previous?.revision) };
      if (previous === undefined) {
        const { data, error } = await client.from("room_states").insert({ room_id: roomId, ...row }).select("room_id");
        if (error?.code === "23505") return false;
        if (error) throw error;
        if (!data?.length) throw new Error("Room insert was not acknowledged.");
        return true;
      }
      const { data, error } = await client.from("room_states").update(row).eq("room_id", roomId).eq("updated_at", previous.revision).select("room_id");
      if (error) throw error;
      return Boolean(data?.length);
    },
  };
}
