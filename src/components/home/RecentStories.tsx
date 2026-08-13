import { useState } from "react";
import Avatar from "../common/Avatar";
import { Person } from "../../types";
import { daysSince, getLastStoryDate, getRelationLine } from "../../utils/saramdam";

interface Props {
  people: Person[];
  onOpenPerson: (personId: string) => void;
}

export default function RecentStories({ people, onOpenPerson }: Props) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...people].sort((a, b) => new Date(getLastStoryDate(b)).getTime() - new Date(getLastStoryDate(a)).getTime());
  const visible = showAll ? sorted : sorted.slice(0, 5);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-[#2f1b12]">최근 이야기</h2>
        {sorted.length > 5 && (
          <button onClick={() => setShowAll((value) => !value)} className="text-sm font-semibold text-[#8d5b45]">
            {showAll ? "접기" : "전체 보기"}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#ead8c9] bg-[#fffaf3] shadow-soft">
        {visible.map((person) => (
          <button key={person.id} onClick={() => onOpenPerson(person.id)} className="flex w-full items-center gap-3 border-b border-[#f0dfd1] px-4 py-3 text-left last:border-b-0">
            <Avatar person={person} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-[#2f1b12]">{person.name}</span>
              <span className="line-clamp-1 block text-sm text-[#5e473a]">{getRelationLine(person) || "소속 기록 없음"}</span>
            </span>
            <span className="shrink-0 text-xs text-[#8f7564]">{daysSince(person.lastContactDate)}일 전</span>
          </button>
        ))}
      </div>
    </section>
  );
}
