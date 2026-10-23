import StudentAvatar from "./StudentAvatar";
import "./AvatarChoices.css";
import { avatarOptions } from "@/lib/collaboration/participants";

export default function AvatarChoices({ selected, onSelect }: { selected: number; onSelect: (avatar: number) => void }) {
  return <div className="avatar-choices" role="group" aria-label="Choose an avatar">
    {avatarOptions.map((option, index) => <button key={option.label} type="button" className={selected === index ? "avatar-option selected" : "avatar-option"} aria-pressed={selected === index} aria-label={option.label} onClick={() => onSelect(index)}>
      <StudentAvatar variant={index} name={option.label} size={42} color={selected === index ? "#ff7e2d" : "#7d91ae"} />
      <span className="avatar-option-label">{option.label}</span>
    </button>)}
  </div>;
}
