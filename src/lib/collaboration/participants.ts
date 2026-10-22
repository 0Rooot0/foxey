export type Participant = { id: string; name: string; color: string; avatar: number };

export function participantAppearance(id: string) {
  const value = Number(id) || 0;
  return {
    color: `hsl(${Math.round((value * 137.508) % 360)} 82% 58%)`,
    avatar: value % 6,
  };
}
