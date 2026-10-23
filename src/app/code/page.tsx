import WorkspaceEntry from "@/components/WorkspaceEntry";

export default async function CodePage({ searchParams }: { searchParams: Promise<{ name?: string | string[] }> }) {
  const query = await searchParams;
  const roomName = typeof query.name === "string" ? query.name.trim().slice(0, 80) : undefined;
  return <WorkspaceEntry roomName={roomName} />;
}
