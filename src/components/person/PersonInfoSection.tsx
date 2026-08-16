import { Building2, ChevronRight, Heart, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Person } from "../../types";
import type { EditSection } from "../../views/AddPersonView";

interface Props {
  person: Person;
  onEdit: (section?: EditSection) => void;
}

export default function PersonInfoSection({ person, onEdit }: Props) {
  return (
    <section className="space-y-3">
      <InfoRow icon={<Users />} label="관계 / 그룹" value={[person.category, ...person.groups].filter(Boolean).join(" · ") || "기록 없음"} onClick={() => onEdit("relation")} />
      <InfoRow icon={<Building2 />} label="회사 / 소속" value={person.company || "기록 없음"} onClick={() => onEdit("company")} />
      <InfoRow icon={<Heart />} label="가족" value={formatFamilyInfo(person)} onClick={() => onEdit("family")} />
      <InfoRow icon={<Sparkles />} label="취향" value={[person.preferences.food, person.preferences.hobbies, person.preferences.notes].filter(Boolean).join("\n") || "기록 없음"} onClick={() => onEdit("preferences")} />
      <button onClick={() => onEdit()} className="mt-2 w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white">정보 수정하기</button>
    </section>
  );
}

function InfoRow({ icon, label, value, onClick }: { icon: ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3 text-left shadow-soft transition active:scale-[0.99] active:bg-[#fff6ee]">
      <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#8d5b45]">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 text-[#b99884]" />
      </p>
      <p className="whitespace-pre-line text-[14px] leading-[1.65] text-[#2f1b12]">{value}</p>
    </button>
  );
}

function formatFamilyInfo(person: Person) {
  const rows = [
    person.familyInfo.spouseName ? `배우자 · ${person.familyInfo.spouseName}` : "",
    ...person.familyInfo.children.map((child) => [
      child.name,
      child.ageOrBirth || child.birthDate,
      child.memo
    ].filter(Boolean).join(" · "))
  ].filter(Boolean);

  return rows.join("\n") || "기록 없음";
}
