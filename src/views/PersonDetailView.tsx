import { ArrowLeft, CalendarDays, Edit3, MoreHorizontal, Phone, Star } from "lucide-react";
import Avatar from "../components/common/Avatar";
import MemorySummaryCard from "../components/person/MemorySummaryCard";
import PersonTimeline from "../components/person/PersonTimeline";
import { Person } from "../types";
import { daysSince, getRelationLine } from "../utils/saramdam";

interface Props {
  person: Person;
  onBack: () => void;
  onEdit: () => void;
}

const tabs = ["최근 이야기", "가족", "취향", "경조사", "전체 기록"];

export default function PersonDetailView({ person, onBack, onEdit }: Props) {
  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-[#2f1b12]" />
          <MoreHorizontal className="h-6 w-6 text-[#2f1b12]" />
        </div>
      </header>

      <section className="text-center">
        <div className="flex justify-center">
          <Avatar person={person} size="lg" />
        </div>
        <h1 className="mt-3 text-3xl font-black text-[#2f1b12]">{person.name}</h1>
        <p className="mt-1 text-[15px] font-medium text-[#5e473a]">{getRelationLine(person)}</p>
        {person.phone && (
          <a href={`tel:${person.phone}`} className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#ead8c9] bg-white px-4 py-2 text-sm font-bold text-[#5a392a]">
            <Phone className="h-4 w-4" /> 연락처
          </a>
        )}
      </section>

      <div className="flex items-center justify-between rounded-full bg-[#fff5ed] px-4 py-3 text-sm font-bold text-[#5a392a]">
        <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> 마지막 연락 {daysSince(person.lastContactDate)}일 전 · {person.lastContactMedium}</span>
        <button onClick={onEdit} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8c9] bg-white text-[#9a6044]">
          <Edit3 className="h-5 w-5" />
        </button>
      </div>

      <MemorySummaryCard person={person} onEdit={onEdit} />

      <div className="flex gap-6 overflow-x-auto border-b border-[#ead8c9]">
        {tabs.map((tab, index) => (
          <button key={tab} className={`shrink-0 pb-3 text-sm font-extrabold ${index === 0 ? "border-b-2 border-[#d85b36] text-[#d85b36]" : "text-[#2f1b12]"}`}>
            {tab}
          </button>
        ))}
      </div>

      <PersonTimeline person={person} />
    </div>
  );
}
