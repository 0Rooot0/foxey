import WorkspaceEntry from "@/components/WorkspaceEntry";

type RoomPageProps = {
  searchParams: Promise<{
    name?: string | string[];
  }>;

  params: Promise<{
    roomId: string;
  }>;
};

export default async function RoomPage({
  params,
  searchParams,
}: RoomPageProps) {
  const { roomId } = await params;

  const query = await searchParams;

  const roomName =
    typeof query.name === "string"
      ? query.name.trim().slice(0, 80)
      : undefined;

  return (
    <WorkspaceEntry
      key={roomId}
      roomId={roomId}
      roomName={roomName}
    />
  );
}