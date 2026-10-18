type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function RoomPage({
  params,
}: RoomPageProps) {
  const { roomId } = await params;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <h1 className="text-2xl font-semibold">
          Foxey Room
        </h1>

        <p className="mt-2 text-zinc-400">
          Room ID: {roomId}
        </p>
      </div>
    </main>
  );
}