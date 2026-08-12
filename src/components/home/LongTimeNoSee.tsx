import { Plus } from "lucide-react";
import Avatar from "../common/Avatar";
import { Person } from "../../types";
import { daysSince } from "../../utils/saramdam";

interface Props {
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onAddPerson: () => void;
}

export default function LongTimeNoSee({ people, onOpenPerson, onAddPerson }: Props) {
  const longTime = [...people].sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate)).slice(0, 4);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-[#2f1b12]">오래 연락 못한 사람</h2>
        <button className="text-sm font-semibold text-[#8d5b45]">더보기</button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {longTime.map((person) => (
          <button key={person.id} onClick={() => onOpenPerson(person.id)} className="w-20 shrink-0 text-center">
            <Avatar person={person} size="sm" />
            <span className="mt-2 block truncate text-sm font-extrabold text-[#2f1b12]">{person.name}</span>
            <span className="block text-xs text-[#7c6252]">{daysSince(person.lastContactDate)}일 전</span>
          </button>
        ))}
        <button onClick={onAddPerson} className="flex w-20 shrink-0 flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8c9] bg-[#fff6eb] text-[#9a6044]">
            <Plus className="h-5 w-5" />
          </span>
          <span className="mt-2 block text-sm font-extrabold text-[#5a392a]">더 보기</span>
        </button>
      </div>
    </section>
  );
}
