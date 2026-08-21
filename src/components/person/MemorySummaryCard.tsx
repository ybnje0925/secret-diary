import { CheckCircle2 } from "lucide-react";
import { Person } from "../../types";
import { getPendingFollowUps } from "../../utils/followUps";

interface Props {
  person: Person;
  onCompleteFollowUp: (followUpId: string) => void;
  onDeleteFollowUp: (followUpId: string) => void;
}

export default function MemorySummaryCard({
  person,
  onCompleteFollowUp,
  onDeleteFollowUp
}: Props) {
  const pendingFollowUps = getPendingFollowUps(person);

  return (
    <section className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">챙길 이야기</h2>
      </div>

      {pendingFollowUps.length === 0 ? (
        <p className="text-sm text-[#7c6252]">다음에 챙길 이야기가 아직 없어요.</p>
      ) : (
        <div className="space-y-2.5">
          {pendingFollowUps.map((item) => (
            <article key={item.id} className="rounded-2xl bg-white/70 p-3">
              <p className="text-[14px] font-medium leading-[1.6] text-[#2f1b12]">{item.text}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => onCompleteFollowUp(item.id)} className="rounded-full bg-[#d85b36] py-2 text-xs font-semibold text-white">
                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> 물어봤어요
                </button>
                <button onClick={() => onDeleteFollowUp(item.id)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#c95735]">
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
