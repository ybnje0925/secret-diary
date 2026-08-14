import { Building2, Heart, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Person } from "../../types";

interface Props {
  person: Person;
  onEdit: () => void;
}

export default function PersonInfoSection({ person, onEdit }: Props) {
  return (
    <section className="space-y-3">
      <InfoRow icon={<Users />} label="관계 / 그룹" value={[person.category, ...person.groups].filter(Boolean).join(" · ") || "기록 없음"} />
      <InfoRow icon={<Building2 />} label="회사 / 소속" value={person.company || "기록 없음"} />
      <InfoRow icon={<Heart />} label="가족" value={[person.familyInfo.spouseName, ...person.familyInfo.children.map((child) => `${child.name}${child.memo ? ` · ${child.memo}` : ""}`)].filter(Boolean).join("\n") || "기록 없음"} />
      <InfoRow icon={<Sparkles />} label="취향" value={[person.preferences.food, person.preferences.hobbies, person.preferences.notes].filter(Boolean).join("\n") || "기록 없음"} />
      <button onClick={onEdit} className="mt-2 w-full rounded-full bg-[#d85b36] py-3 text-sm font-extrabold text-white">정보 수정하기</button>
    </section>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3 shadow-soft">
      <p className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-[#8d5b45]"><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</p>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#2f1b12]">{value}</p>
    </div>
  );
}
