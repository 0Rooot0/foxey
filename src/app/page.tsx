"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomName, setRoomName] = useState("");

  function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    const newRoomId = crypto.randomUUID();
    router.push(`/room/${newRoomId}?name=${encodeURIComponent(name)}`);
  }

  function handleJoinRoom() {
    const cleanedRoomId = roomId.trim();

    if (!cleanedRoomId) {
      return;
  }

    router.push(`/room/${cleanedRoomId}`);
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-black dark:bg-black dark:text-white">
      <h1 className="w-full max-w-lg">
        <Image
          src="/foxey-logo.png"
          alt="Foxey"
          width={1536}
          height={1024}
          sizes="(min-width: 560px) 512px, calc(100vw - 48px)"
          className="h-auto w-full rounded-lg"
        />
      </h1>

      <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Collaborative coding for classrooms and teams.
      </p>
      <div className="mt-8 flex flex-col items-center gap-8">
  <div className="flex flex-wrap justify-center gap-3">
    <Link
      href="/code"
      className="cursor-pointer rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
    >
      Start Coding
    </Link>

    <button
      className="cursor-pointer rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-900"
    >
      Create a Class
    </button>
  </div>

  <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
    <h2 className="text-center text-sm font-medium text-white">
      Join a coding room
    </h2>

    <p className="mt-1 text-center text-xs text-zinc-500">
      Enter a room ID or create a new room.
    </p>

    <div className="mt-4 flex gap-2">
      <input
        value={roomId}
        onChange={(event) => setRoomId(event.target.value)}
        placeholder="Enter room ID"
        className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-zinc-500"
      />

      <button
        onClick={handleJoinRoom}
        className="cursor-pointer rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Join
      </button>
    </div>

    {creatingRoom ? (
      <form onSubmit={handleCreateRoom} className="mt-4 text-left">
        <label htmlFor="room-name" className="text-sm font-medium text-white">Room name</label>
        <input
          id="room-name"
          autoFocus
          required
          maxLength={80}
          value={roomName}
          onChange={(event) => setRoomName(event.target.value)}
          placeholder="e.g. Python Practice"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white"
        />
        <div className="mt-3 flex gap-2">
          <button type="submit" disabled={!roomName.trim()} className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50">Create Room</button>
          <button type="button" onClick={() => setCreatingRoom(false)} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-white">Cancel</button>
        </div>
      </form>
    ) : (
    <button
      onClick={() => setCreatingRoom(true)}
      className="mt-3 w-full cursor-pointer rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
    >
      Create New Room
    </button>
    )}
  </div>
</div>
    </main>
  );
}