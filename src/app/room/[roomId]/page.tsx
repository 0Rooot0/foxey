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

  return <CodeWorkspace roomId={roomId} />;
}