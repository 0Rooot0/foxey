export const avatarOptions = [
  { label: "Curious coder" }, { label: "Space explorer" }, { label: "Professor Specs" },
  { label: "Idea maker" }, { label: "Laughing learner" }, { label: "Night owl" },
  { label: "Clever fox", emoji: "🦊" }, { label: "Robot helper", emoji: "🤖" },
  { label: "Happy frog", emoji: "🐸" }, { label: "Space alien", emoji: "👽" },
  { label: "Busy octopus", emoji: "🐙" }, { label: "Rainbow unicorn", emoji: "🦄" },
  { label: "Panda pal", emoji: "🐼" }, { label: "Dancing penguin", emoji: "🐧" },
  { label: "Brave dragon", emoji: "🐉" }, { label: "Wise turtle", emoji: "🐢" },
  { label: "Sunny sunflower", emoji: "🌻" }, { label: "Friendly dino", emoji: "🦕" },
] as const;

export type Participant = { id: string; name: string; color: string; avatar: number };

export function participantAppearance(id: string) {
  const value = Number(id) || 0;
  return {
    color: `hsl(${Math.round((value * 137.508) % 360)} 82% 58%)`,
    avatar: value % avatarOptions.length,
  };
}

export type Identity = { name: string; avatar: number };

// Keep onboarding usable when browser storage is unavailable.
let sessionIdentity: Identity | null = null;

export function readIdentity(): Identity | null {
  try {
    const name = localStorage.getItem("foxey-display-name")?.trim().slice(0, 40);
    if (!name) return null;
    const saved = localStorage.getItem("foxey-avatar");
    const avatar = saved !== null && saved.trim() !== "" ? Number(saved) : NaN;
    return { name, avatar: Number.isInteger(avatar) && avatar >= 0 && avatar < avatarOptions.length ? avatar : 6 };
  } catch { return sessionIdentity; }
}

export function rememberIdentity(identity: Identity) {
  sessionIdentity = identity;
  try {
    localStorage.setItem("foxey-display-name", identity.name);
    localStorage.setItem("foxey-avatar", String(identity.avatar));
  } catch {}
}
