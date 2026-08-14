import { Person } from "../../types";

interface AvatarProps {
  person: Person;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "h-9 w-9 text-lg",
  md: "h-[52px] w-[52px] text-2xl",
  lg: "h-20 w-20 text-4xl"
};

const presetEmoji = {
  man: "👨",
  woman: "👩",
  neutral: "🙂",
  plant: "🌱",
  heart: "🧡"
};

export default function Avatar({ person, size = "md" }: AvatarProps) {
  const fallback = person.avatarPreset ? presetEmoji[person.avatarPreset] : person.avatarEmoji || "🙂";

  return (
    <div className={`${sizeClass[size]} shrink-0 overflow-hidden rounded-full border border-[#ead8c9] ${person.avatarBg || "bg-[#f3dfd1]"} flex items-center justify-center shadow-[0_4px_12px_rgba(93,55,32,0.06)]`}>
      {person.avatarImageDataUrl ? (
        <img src={person.avatarImageDataUrl} alt={`${person.name} 프로필`} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </div>
  );
}
