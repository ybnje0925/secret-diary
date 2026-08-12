import { Person } from "../../types";

interface AvatarProps {
  person: Person;
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "h-11 w-11 text-xl",
  md: "h-16 w-16 text-3xl",
  lg: "h-24 w-24 text-5xl"
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
    <div className={`${sizeClass[size]} shrink-0 overflow-hidden rounded-full border border-[#ead8c9] ${person.avatarBg || "bg-[#f3dfd1]"} flex items-center justify-center shadow-[0_6px_18px_rgba(93,55,32,0.08)]`}>
      {person.avatarImageDataUrl ? (
        <img src={person.avatarImageDataUrl} alt={`${person.name} 프로필`} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </div>
  );
}
