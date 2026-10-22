export const avatarOptions = [
  { label: "Curious coder" }, { label: "Space explorer" }, { label: "Professor Specs" },
  { label: "Idea maker" }, { label: "Laughing learner" }, { label: "Night owl" },
  { label: "Clever fox", emoji: "🦊" }, { label: "Robot helper", emoji: "🤖" },
  { label: "Happy frog", emoji: "🐸" }, { label: "Space alien", emoji: "👽" },
  { label: "Busy octopus", emoji: "🐙" }, { label: "Rainbow unicorn", emoji: "🦄" },
] as const;

export type Participant = { id: string; name: string; color: string; avatar: number };

export function participantAppearance(id: string) {
  const value = Number(id) || 0;
  return {
    color: `hsl(${Math.round((value * 137.508) % 360)} 82% 58%)`,
    avatar: value % 6,
  };
}
