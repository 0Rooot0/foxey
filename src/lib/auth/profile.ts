import { avatarOptions, readIdentity, rememberIdentity, type Identity } from "../collaboration/participants";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar: number | null;
  role: string;
  created_at: string;
  updated_at: string;
};

export function normalizeIdentity(name: string, avatar: number): Identity | null {
  const cleanName = name.trim().slice(0, 40);
  if (!cleanName) return null;
  return { name: cleanName, avatar: Number.isInteger(avatar) && avatar >= 0 && avatar < avatarOptions.length ? avatar : 6 };
}

export function profileIdentity(profile: Profile | null): Identity | null {
  return profile?.display_name ? normalizeIdentity(profile.display_name, profile.avatar ?? 6) : null;
}

export function identityToMigrate(profile: Profile, local = readIdentity()): Identity | null {
  if (!local || (profile.display_name && profile.avatar !== null)) return null;
  return normalizeIdentity(profile.display_name || local.name, profile.avatar ?? local.avatar);
}

export function rememberProfileIdentity(profile: Profile) {
  const identity = profileIdentity(profile);
  if (identity) rememberIdentity(identity);
}
