import Avatar from "../common/Avatar";
import { Person } from "../../types";
import { daysSince, formatRemindInterval } from "../../utils/saramdam";

interface Props {
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onViewAll: () => void;
}

export default function LongTimeNoSee({ people, onOpenPerson, onViewAll }: Props) {
  const longTime = [...people].sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate)).slice(0, 5);

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">오래 연락 못한 사람</h2>
        <button onClick={onViewAll} className="text-xs font-semibold text-[#8d5b45]">더보기</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {longTime.map((person) => (
          <button key={person.id} onClick={() => onOpenPerson(person.id)} className="w-[72px] shrink-0 text-center">
            <Avatar person={person} size="sm" />
            <span className="mt-1.5 block truncate text-xs font-semibold text-[#2f1b12]">{person.name}</span>
            <span className="block text-xs text-[#7c6252]">마지막 연락 {daysSince(person.lastContactDate)}일 전</span>
            <span className="mt-0.5 block truncate text-[11px] text-[#8f7564]">{formatRemindInterval(person.remindIntervalDays)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
