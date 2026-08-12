import { MessageCircle } from "lucide-react";
import Avatar from "../common/Avatar";
import { Person } from "../../types";
import { daysSince, getRecentMemory } from "../../utils/saramdam";

interface Props {
  person: Person;
  onSelect: (personId: string) => void;
}

export default function CheckInPersonCard({ person, onSelect }: Props) {
  return (
    <div className="w-36 shrink-0 rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 text-center shadow-soft">
      <div className="flex justify-center">
        <Avatar person={person} size="md" />
      </div>
      <h3 className="mt-3 font-extrabold text-[#2f1b12]">{person.name}</h3>
      <p className="mt-1 text-xs font-bold text-[#c95735]">{daysSince(person.lastContactDate)}일 전</p>
      <p className="mt-2 line-clamp-2 h-10 text-xs leading-relaxed text-[#5e473a]">{getRecentMemory(person)}</p>
      <button onClick={() => onSelect(person.id)} className="mt-3 rounded-full border border-[#f0c9b6] bg-[#fff5ed] px-3 py-2 text-xs font-extrabold text-[#c95735]">
        <MessageCircle className="mr-1 inline h-3.5 w-3.5" /> 안부 전하기
      </button>
    </div>
  );
}
