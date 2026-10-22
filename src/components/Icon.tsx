type IconName = "people" | "code" | "cap" | "heart" | "bolt" | "shield" | "arrow";

const paths: Record<IconName, string[]> = {
  people: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M16 3a4 4 0 0 1 0 8", "M22 21v-2a4 4 0 0 0-3-3.87", "M9 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8"],
  code: ["m8 5-6 7 6 7", "m16 5 6 7-6 7", "m14 3-4 18"],
  cap: ["m2 9 10-5 10 5-10 5Z", "M6 11v6c4 3 8 3 12 0v-6", "M22 9v7"],
  heart: ["M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"],
  bolt: ["m13 2-9 12h7l-1 8 10-13h-7Z"],
  shield: ["M12 3 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z"],
  arrow: ["M4 12h16", "m14 6 6 6-6 6"],
};

export default function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name].map((path, index) => <path d={path} key={index} />)}</svg>;
}
