import { CheckCircle2, MoreHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ContactMedium, InteractionHistory, Person } from "../../types";
import { findPendingFollowUpForRecord, inferFollowUpText } from "../../utils/followUps";
import { formatDateKo } from "../../utils/saramdam";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

interface Props {
  person: Person;
  onUpdateHistory: (history: InteractionHistory, followUpText?: string | null) => void;
  onDeleteHistory: (historyId: string) => void;
}

const mediumOptions: ContactMedium[] = ["식사", "통화", "카톡", "메시지", "대면", "기타"];

export default function PersonTimeline({ person, onUpdateHistory, onDeleteHistory }: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<InteractionHistory | null>(null);
  const [viewing, setViewing] = useState<InteractionHistory | null>(null);

  useEffect(() => {
    const onOverlayBack = (event: Event) => {
      if (!editing && !viewing && !menuId) return;
      event.preventDefault();
      setEditing(null);
      setViewing(null);
      setMenuId(null);
    };

    window.addEventListener("saramdam:overlay-back", onOverlayBack);
    return () => window.removeEventListener("saramdam:overlay-back", onOverlayBack);
  }, [editing, viewing, menuId]);

  if (!person.history.length) {
    return <p className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center text-xs text-[#7c6252]">아직 최근 이야기가 없어요.</p>;
  }

  return (
    <>
      <div className="space-y-4 border-l-2 border-[#e4c7b6] pl-4">
        {person.history.map((item) => (
          <article key={item.id} className="relative">
            <span className="absolute -left-[22px] top-2 h-2.5 w-2.5 rounded-full bg-[#d85b36] ring-4 ring-[#fff8ef]" />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setViewing(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setViewing(item);
                }
              }}
              className="block w-full rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3 text-left shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[13px] font-medium text-[#2f1b12]">{formatDateKo(item.date)} · {item.medium}</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuId(menuId === item.id ? null : item.id);
                    }}
                    className="rounded-full p-1 text-[#8d5b45]"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {menuId === item.id && (
                    <div className="absolute right-0 top-8 z-10 w-28 overflow-hidden rounded-xl border border-[#ead8c9] bg-white shadow-soft">
                      <button type="button" onClick={(event) => { event.stopPropagation(); setEditing(item); setMenuId(null); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#2f1b12]">기록 수정</button>
                      <button type="button" onClick={(event) => { event.stopPropagation(); setMenuId(null); onDeleteHistory(item.id); }} className="w-full px-3 py-2 text-left text-sm font-medium text-[#c95735]">기록 삭제</button>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-[1.65] text-[#3f2a20]">{item.summary}</p>
            </div>
          </article>
        ))}
      </div>
      {viewing && (
        <HistoryDetail
          history={viewing}
          person={person}
          onClose={() => setViewing(null)}
          onSave={(history, followUpText) => {
            onUpdateHistory(history, followUpText);
            setViewing(null);
          }}
        />
      )}
      {editing && (
        <HistoryEditor
          history={editing}
          person={person}
          onClose={() => setEditing(null)}
          onSave={(history, followUpText) => {
            onUpdateHistory(history, followUpText);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function HistoryDetail({
  history,
  person,
  onClose,
  onSave
}: {
  history: InteractionHistory;
  person: Person;
  onClose: () => void;
  onSave: (history: InteractionHistory, followUpText?: string | null) => void;
}) {
  useBodyScrollLock();
  const existingFollowUp = findPendingFollowUpForRecord(person, history.id);

  return (
    <div className="saram-sheet-overlay" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()} className="saram-sheet p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">기록 상세</h2>
            <p className="mt-1 text-sm font-medium text-[#8d5b45]">{formatDateKo(history.date)} · {history.medium}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f6eadf] p-2 text-[#2f1b12]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="max-h-[44dvh] overflow-y-auto whitespace-pre-line rounded-2xl border border-[#ead8c9] bg-white/70 p-3 text-[15px] leading-[1.7] text-[#3f2a20]">
          {history.summary}
        </p>
        <section className="mt-3 rounded-2xl border border-[#ead8c9] bg-white/70 p-3.5">
          <p className="text-sm font-semibold text-[#2f1b12]">다음에 챙기기</p>
          <p className="mt-1 text-sm leading-[1.6] text-[#7c6252]">
            {existingFollowUp ? existingFollowUp.text : "이 기록을 다음 연락 때 챙길 이야기로 남길 수 있어요."}
          </p>
          <button
            type="button"
            disabled={Boolean(existingFollowUp)}
            onClick={() => onSave(history, inferFollowUpText(history.summary))}
            className={`mt-3 w-full rounded-full py-3 text-sm font-semibold ${existingFollowUp ? "border border-[#dfa98f] bg-white text-[#c95735]" : "bg-[#d85b36] text-white"}`}
          >
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            {existingFollowUp ? "챙길 이야기로 등록됨" : "다음에 챙기기"}
          </button>
        </section>
      </section>
    </div>
  );
}

function HistoryEditor({
  history,
  person,
  onClose,
  onSave
}: {
  history: InteractionHistory;
  person: Person;
  onClose: () => void;
  onSave: (history: InteractionHistory, followUpText?: string | null) => void;
}) {
  useBodyScrollLock();
  const existingFollowUp = findPendingFollowUpForRecord(person, history.id);
  const [date, setDate] = useState(history.date);
  const [medium, setMedium] = useState<ContactMedium>(history.medium);
  const [summary, setSummary] = useState(history.summary);
  const [followUpEnabled, setFollowUpEnabled] = useState(Boolean(existingFollowUp));
  const [followUpText, setFollowUpText] = useState(existingFollowUp?.text || "");

  return (
    <div className="saram-sheet-overlay" onClick={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!summary.trim()) return;
          onSave(
            { ...history, date, medium, summary: summary.trim() },
            followUpEnabled ? followUpText.trim() || inferFollowUpText(summary) : null
          );
        }}
        onClick={(event) => event.stopPropagation()}
        className="saram-sheet flex max-h-[85dvh] flex-col p-4"
      >
        <h2 className="shrink-0 text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">기록 수정</h2>
        <div className="mt-4 grid shrink-0 grid-cols-2 gap-3">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="saram-input py-3 text-sm" />
          <select value={medium} onChange={(event) => setMedium(event.target.value as ContactMedium)} className="saram-input py-3 text-sm">
            {mediumOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="saram-input mt-3 min-h-56 flex-1 resize-none overflow-y-auto text-[15px] leading-[1.65]" />
        <section className="mt-3 shrink-0 rounded-2xl border border-[#ead8c9] bg-white/70 p-3.5">
          <label className="flex items-center gap-2 text-sm font-semibold text-[#2f1b12]">
            <input
              type="checkbox"
              checked={followUpEnabled}
              onChange={(event) => {
                setFollowUpEnabled(event.target.checked);
                if (event.target.checked && !followUpText.trim()) setFollowUpText(inferFollowUpText(summary));
              }}
              className="h-5 w-5 accent-[#d85b36]"
            />
            다음에 챙기기
          </label>
          {followUpEnabled && (
            <input
              value={followUpText}
              onChange={(event) => setFollowUpText(event.target.value)}
              placeholder="예) 승진 심사 결과"
              className="saram-input mt-3 py-3 text-sm"
            />
          )}
        </section>
        <div className="mt-4 grid shrink-0 grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-[#ead8c9] bg-white py-3 font-medium text-[#5a392a]">취소</button>
          <button className="rounded-full bg-[#d85b36] py-3 font-semibold text-white">저장</button>
        </div>
      </form>
    </div>
  );
}
