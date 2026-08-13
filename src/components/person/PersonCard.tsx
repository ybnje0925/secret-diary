import { ChevronRight } from "lucide-react";
import Avatar from "../common/Avatar";
import { Person } from "../../types";
import { daysSince, getRecentMemory, getRelationLine } from "../../utils/saramdam";

interface Props {
  person: Person;
  onOpen: (personId: string) => void;
  searchReason?: string;
}

export default function PersonCard({ person, onOpen, searchReason }: Props) {
  return (
    <button onClick={() => onOpen(person.id)} className="flex w-full items-center gap-4 rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 text-left shadow-soft">
      <Avatar person={person} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-extrabold text-[#2f1b12]">{person.name}</span>
          <span className="rounded-full bg-[#fff1e8] px-2 py-0.5 text-xs font-bold text-[#c95735]">마지막 연락 {daysSince(person.lastContactDate)}일 전</span>
        </span>
        <span className="mt-1 block text-sm font-medium text-[#5e473a]">{getRelationLine(person)}</span>
        {searchReason && <span className="mt-2 inline-flex rounded-full bg-[#f8eadf] px-2.5 py-1 text-xs font-bold text-[#9a6044]">{searchReason}</span>}
        <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-[#3f2a20]">최근 기억: {getRecentMemory(person)}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#8d5b45]" />
    </button>
  );
}
