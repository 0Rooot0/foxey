import type { CSSProperties } from "react";

const skins = ["#e7a47d", "#f5c7a1", "#986242", "#d59366", "#f1bc99", "#b97c59"];
const hair = ["#362039", "#683c27", "#262b35", "#40251d", "#aa5c27", "#252033"];
const shirts = ["#a376ef", "#3d9de4", "#38bfa7", "#e59c47", "#db7fa5", "#658ce8"];

export default function StudentAvatar({ variant = 0, color = "#9c6bff", name, size = 32 }: {
  variant?: number; color?: string; name: string; size?: number;
}) {
  const index = variant % skins.length;
  return (
    <span className="student-avatar" role="img" aria-label={name} title={name} style={{ "--avatar-color": color, width: size, height: size } as CSSProperties}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="24" fill={shirts[index]} />
        <path d="M8 48V39c0-8 32-8 32 0v9" fill={index % 2 ? "#233953" : "#f5f1e8"} />
        <path d={index % 2 ? "M12 27V17C12 2 37 2 37 18v12Z" : "M9 34V17C9 1 39 1 39 20v14Z"} fill={hair[index]} />
        <rect x="20" y="29" width="8" height="9" rx="3" fill={skins[index]} />
        <ellipse cx="24" cy="21" rx="11" ry="14" fill={skins[index]} />
        <path d="M12 18C10 3 37 1 36 19c-4-2-6-7-7-10-3 6-11 8-17 9" fill={hair[index]} />
        <circle cx="20" cy="22" r="1.2" fill="#292333" /><circle cx="28" cy="22" r="1.2" fill="#292333" />
        <path d="M20 28q4 4 8 0" fill="none" stroke="#934e44" strokeWidth="1.5" strokeLinecap="round" />
        {index === 2 && <g fill="none" stroke="#222e40" strokeWidth="1.2"><circle cx="19" cy="22" r="4" /><circle cx="29" cy="22" r="4" /><path d="M23 22h2" /></g>}
      </svg>
    </span>
  );
}
