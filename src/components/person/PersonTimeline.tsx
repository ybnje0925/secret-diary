import { MoreHorizontal } from "lucide-react";
import { Person } from "../../types";
import { formatDateKo } from "../../utils/saramdam";

interface Props {
  person: Person;
}

export default function PersonTimeline({ person }: Props) {
  if (!person.history.length) {
    return <p className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-6 text-center text-sm text-[#7c6252]">아직 최근 이야기가 없어요.</p>;
  }

  return (
    <div className="space-y-5 border-l-2 border-[#e4c7b6] pl-5">
      {person.history.map((item) => (
        <article key={item.id} className="relative">
          <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full bg-[#d85b36] ring-4 ring-[#fff8ef]" />
          <div className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-[#2f1b12]">{formatDateKo(item.date)} · {item.medium}</h3>
              </div>
              <MoreHorizontal className="h-5 w-5 shrink-0 text-[#8d5b45]" />
            </div>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#3f2a20]">{item.summary}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
