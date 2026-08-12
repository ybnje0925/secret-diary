import { Edit3 } from "lucide-react";
import { Person } from "../../types";
import { makeMemoryBullets } from "../../utils/saramdam";

interface Props {
  person: Person;
  onEdit: () => void;
}

const icons = ["👨‍👩‍👧", "🎾", "🥩", "❤️"];

export default function MemorySummaryCard({ person, onEdit }: Props) {
  const bullets = makeMemoryBullets(person);

  return (
    <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-extrabold text-[#2f1b12]">✨ 다음 만남 전에 기억할 것</h2>
        <button onClick={onEdit} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-bold text-[#5a392a]">
          <Edit3 className="mr-1 inline h-3 w-3" /> 편집
        </button>
      </div>
      <div className="space-y-3">
        {bullets.length > 0 ? bullets.map((bullet, index) => (
          <p key={`${bullet}-${index}`} className="flex gap-2 text-[15px] leading-relaxed text-[#2f1b12]">
            <span>{icons[index] || "🌿"}</span>
            <span>{bullet}</span>
          </p>
        )) : (
          <p className="text-sm text-[#7c6252]">아직 기억 카드에 담긴 이야기가 없어요.</p>
        )}
      </div>
    </section>
  );
}
