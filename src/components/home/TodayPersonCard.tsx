import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import Avatar from "../common/Avatar";
import { Person } from "../../types";
import { daysSince, getRecentMemory, getRelationLine } from "../../utils/saramdam";

interface Props {
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onStartCheckIn: (personId: string) => void;
}

export default function TodayPersonCard({ people, onOpenPerson, onStartCheckIn }: Props) {
  const candidates = useMemo(() => [...people].sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate)).slice(0, 5), [people]);
  const [index, setIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const person = candidates[index];

  const finishDrag = (clientX: number) => {
    if (dragStartX === null || candidates.length < 2) return;
    const delta = clientX - dragStartX;
    if (delta < -50) setIndex((value) => Math.min(candidates.length - 1, value + 1));
    if (delta > 50) setIndex((value) => Math.max(0, value - 1));
    setDragStartX(null);
  };

  if (!person) {
    return (
      <section className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <p className="text-sm font-semibold text-[#9a6044]">오늘 떠올려볼 사람이 아직 없어요.</p>
        <p className="mt-2 text-sm text-[#7c6252]">처음에는 한 사람만 담아도 괜찮아요.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-[#2f1b12]">오늘 떠올려볼 사람</h2>
        <button className="text-xs font-semibold text-[#8d5b45]" onClick={() => onOpenPerson(person.id)}>더보기</button>
      </div>
      <div
        className="select-none rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft"
        onTouchStart={(event) => setDragStartX(event.touches[0].clientX)}
        onTouchEnd={(event) => finishDrag(event.changedTouches[0].clientX)}
        onMouseDown={(event) => setDragStartX(event.clientX)}
        onMouseUp={(event) => finishDrag(event.clientX)}
      >
        <div className="flex gap-3">
          <Avatar person={person} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[19px] font-extrabold text-[#2f1b12]">{person.name}</h3>
            <p className="mt-0.5 text-xs font-medium text-[#5e473a]">{getRelationLine(person)}</p>
            <p className="mt-1.5 text-xs text-[#7c6252]">마지막 연락 {daysSince(person.lastContactDate)}일 전</p>
          </div>
        </div>
        <blockquote className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 text-center text-[13px] font-semibold leading-relaxed text-[#5a392a]">
          “{getRecentMemory(person).split(".")[0]}”
        </blockquote>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => onOpenPerson(person.id)} className="rounded-full border border-[#dfa98f] bg-white py-2.5 text-xs font-extrabold text-[#c95735]">
            기억 보기
          </button>
          <button onClick={() => onStartCheckIn(person.id)} className="rounded-full bg-[#d85b36] py-2.5 text-xs font-extrabold text-white shadow-[0_8px_18px_rgba(216,91,54,0.18)]">
            <MessageCircle className="mr-1 inline h-4 w-4" /> 안부 전하기
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {candidates.map((candidate, dotIndex) => (
            <button key={candidate.id} onClick={() => setIndex(dotIndex)} aria-label={`${dotIndex + 1}번째 사람 보기`} className={`h-2 rounded-full transition-all ${dotIndex === index ? "w-5 bg-[#c95735]" : "w-2 bg-[#ead8c9]"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
