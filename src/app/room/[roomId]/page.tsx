import CodeWorkspace from "@/components/CodeWorkspace";

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
    <div className="bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 px-6 py-3">
        <p className="text-sm text-zinc-400">
          Room: {roomId}
        </p>
      </div>

      <CodeWorkspace />
    </div>
  );
}