import { MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { ContactMedium, InteractionHistory, Person } from "../../types";
import { formatDateKo } from "../../utils/saramdam";

interface Props {
  person: Person;
  onUpdateHistory: (history: InteractionHistory) => void;
  onDeleteHistory: (historyId: string) => void;
}

const mediumOptions: ContactMedium[] = ["식사", "통화", "카톡", "메시지", "대면", "기타"];

export default function PersonTimeline({ person, onUpdateHistory, onDeleteHistory }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<InteractionHistory | null>(null);

  useEffect(() => {
    const onOverlayBack = (event: Event) => {
      if (!editing && !menuId) return;
      event.preventDefault();
      setEditing(null);
      setMenuId(null);
    };

    window.addEventListener("saramdam:overlay-back", onOverlayBack);
    return () => window.removeEventListener("saramdam:overlay-back", onOverlayBack);
  }, [editing, menuId]);

  if (!person.history.length) {
    return <p className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center text-xs text-[#7c6252]">아직 최근 이야기가 없어요.</p>;
  }

  return (
    <>
      <div className="space-y-4 border-l-2 border-[#e4c7b6] pl-4">
        {person.history.map((item) => (
          <article key={item.id} className="relative">
            <span className="absolute -left-[22px] top-2 h-2.5 w-2.5 rounded-full bg-[#d85b36] ring-4 ring-[#fff8ef]" />
            <div className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[13px] font-medium text-[#2f1b12]">{formatDateKo(item.date)} · {item.medium}</h3>
                <div className="relative">
                  <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} className="rounded-full p-1 text-[#8d5b45]">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {menuId === item.id && (
                    <div className="absolute right-0 top-8 z-10 w-28 overflow-hidden rounded-xl border border-[#ead8c9] bg-white shadow-soft">
                      <button onClick={() => { setEditing(item); setMenuId(null); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#2f1b12]">기록 수정</button>
                      <button onClick={() => { setMenuId(null); onDeleteHistory(item.id); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#c95735]">기록 삭제</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-[1.65] text-[#3f2a20]">{item.summary}</p>
            </div>
          </article>
        ))}
      </div>
      {editing && (
        <HistoryEditor
          history={editing}
          onClose={() => setEditing(null)}
          onSave={(history) => {
            onUpdateHistory(history);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function HistoryEditor({ history, onClose, onSave }: { history: InteractionHistory; onClose: () => void; onSave: (history: InteractionHistory) => void }) {
  const [date, setDate] = useState(history.date);
  const [medium, setMedium] = useState<ContactMedium>(history.medium);
  const [summary, setSummary] = useState(history.summary);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2f1b12]/35 px-3" onClick={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!summary.trim()) return;
          onSave({ ...history, date, medium, summary: summary.trim() });
        }}
        onClick={(event) => event.stopPropagation()}
        className="mb-[max(0.75rem,env(safe-area-inset-bottom))] w-full max-w-md rounded-[22px] bg-[#fffaf3] p-4 shadow-[0_14px_40px_rgba(47,27,18,0.18)]"
      >
        <h2 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">기록 수정</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="saram-input py-3 text-sm" />
          <select value={medium} onChange={(event) => setMedium(event.target.value as ContactMedium)} className="saram-input py-3 text-sm">
            {mediumOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="saram-input mt-3 min-h-36 resize-none text-[15px] leading-[1.65]" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#ead8c9] bg-white py-3 font-medium text-[#5a392a]">취소</button>
          <button className="rounded-full bg-[#d85b36] py-3 font-semibold text-white">저장</button>
        </div>
      </form>
    </div>
  );
}
