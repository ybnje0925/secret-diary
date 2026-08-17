import { Gift, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EventHistoryItem, EventType, Person } from "../../types";
import { formatDateKo } from "../../utils/saramdam";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

interface Props {
  person: Person;
  onSaveEvent: (event: EventHistoryItem) => void;
  onDeleteEvent: (eventId: string) => void;
}

const eventTypes: EventType[] = ["기념일", "선물", "축의금", "조의금", "기타"];

export default function EventHistorySection({ person, onSaveEvent, onDeleteEvent }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventHistoryItem | "new" | null>(null);

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

  return (
    <section className="space-y-3">
      <button onClick={() => setEditing("new")} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white">
        <Plus className="h-4 w-4" /> 함께한 마음 기록하기
      </button>
      {person.eventsHistory.length === 0 ? (
        <p className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center text-xs text-[#7c6252]">아직 함께한 마음 기록이 없어요.</p>
      ) : (
        person.eventsHistory.map((event) => (
          <article key={event.id} className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff1e8] text-[#d85b36]"><Gift className="h-5 w-5" /></span>
                <div>
                  <p className="text-[14px] font-semibold text-[#2f1b12]">{event.amountOrGift || event.type}</p>
                  <p className="mt-0.5 text-xs text-[#7c6252]">{formatDateKo(event.date)} · {event.type}</p>
                  {event.note && <p className="mt-1.5 text-[13px] leading-[1.6] text-[#3f2a20]">{event.note}</p>}
                </div>
              </div>
              <div className="relative">
                <button onClick={() => setMenuId(menuId === event.id ? null : event.id)} className="rounded-full p-1 text-[#8d5b45]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {menuId === event.id && (
                  <div className="absolute right-0 top-8 z-10 w-28 overflow-hidden rounded-xl border border-[#ead8c9] bg-white shadow-soft">
                    <button onClick={() => { setEditing(event); setMenuId(null); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#2f1b12]">기록 수정</button>
                    <button onClick={() => { setMenuId(null); onDeleteEvent(event.id); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#c95735]">기록 삭제</button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))
      )}
      {editing && (
        <EventEditor
          event={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(event) => {
            onSaveEvent(event);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function EventEditor({ event, onClose, onSave }: { event: EventHistoryItem | null; onClose: () => void; onSave: (event: EventHistoryItem) => void }) {
  useBodyScrollLock();
  const [date, setDate] = useState(event?.date || new Date().toISOString().split("T")[0]);
  const [type, setType] = useState<EventType>(event?.type || "기념일");
  const [amountOrGift, setAmountOrGift] = useState(event?.amountOrGift || "");
  const [note, setNote] = useState(event?.note || "");

  return (
    <div className="saram-sheet-overlay" onClick={onClose}>
      <form
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          onSave({ id: event?.id || `e_${Date.now()}`, date, type, amountOrGift: amountOrGift.trim(), note: note.trim() });
        }}
        onClick={(formEvent) => formEvent.stopPropagation()}
        className="saram-sheet p-4"
      >
        <h2 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">{event ? "함께한 마음 수정" : "함께한 마음 기록"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input type="date" value={date} onChange={(inputEvent) => setDate(inputEvent.target.value)} className="saram-input py-3 text-sm" />
          <select value={type} onChange={(inputEvent) => setType(inputEvent.target.value as EventType)} className="saram-input py-3 text-sm">
            {eventTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <input value={amountOrGift} onChange={(inputEvent) => setAmountOrGift(inputEvent.target.value)} placeholder="선물, 금액 또는 마음 기록" className="saram-input mt-3 py-3 text-sm" />
        <textarea value={note} onChange={(inputEvent) => setNote(inputEvent.target.value)} placeholder="메모" className="saram-input mt-3 min-h-24 resize-none text-sm" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#ead8c9] bg-white py-3 font-medium text-[#5a392a]">취소</button>
          <button className="rounded-full bg-[#d85b36] py-3 font-semibold text-white">저장</button>
        </div>
      </form>
    </div>
  );
}
