import { ArrowLeft, CalendarDays, CheckCircle2, Edit3, HeartHandshake, MoreHorizontal, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import Avatar from "../components/common/Avatar";
import EventHistorySection from "../components/person/EventHistorySection";
import MemorySummaryCard from "../components/person/MemorySummaryCard";
import PersonInfoSection from "../components/person/PersonInfoSection";
import PersonTimeline from "../components/person/PersonTimeline";
import QuickRecordPanel from "../components/person/QuickRecordPanel";
import type { StorySavePayload } from "../components/person/StoryCaptureSheet";
import { EventHistoryItem, FollowUpItem, InteractionHistory, Person, PersonAiBriefing } from "../types";
import { getCompletedFollowUps, getPendingFollowUps } from "../utils/followUps";
import { daysSince, formatDateKo, getRelationLine } from "../utils/saramdam";
import type { EditSection } from "./AddPersonView";

interface Props {
  person: Person;
  onBack: () => void;
  onEdit: (section?: EditSection) => void;
  onDeletePerson: () => void;
  onStartStory: () => void;
  onStartCheckIn: () => void;
  aiEnabled?: boolean;
  onSaveStory: (payload: StorySavePayload) => void;
  onUpdateHistory: (history: InteractionHistory, followUpText?: string | null) => void;
  onDeleteHistory: (historyId: string) => void;
  onSaveBriefing: (briefing: PersonAiBriefing) => void;
  onSaveEvent: (event: EventHistoryItem) => void;
  onDeleteEvent: (eventId: string) => void;
  onCompleteFollowUp: (followUpId: string) => void;
  onDeleteFollowUp: (followUpId: string) => void;
  onSaveFollowUp: (sourceRecordId: string, text: string) => void;
  onStartFollowUpStory: (followUpId: string, referenceText: string) => void;
}

const tabs = ["최근 이야기", "전체 기록", "빠른 기록", "정보", "함께한 마음"] as const;
type DetailTab = typeof tabs[number];

export default function PersonDetailView({
  person,
  onBack,
  onEdit,
  onDeletePerson,
  onStartStory,
  onStartCheckIn,
  aiEnabled,
  onSaveStory,
  onUpdateHistory,
  onDeleteHistory,
  onSaveBriefing,
  onSaveEvent,
  onDeleteEvent,
  onCompleteFollowUp,
  onDeleteFollowUp,
  onSaveFollowUp,
  onStartFollowUpStory
}: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("최근 이야기");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-full p-2 text-[#2f1b12]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 text-[#2f1b12]" />
          <div className="relative">
            <button onClick={() => setMenuOpen((value) => !value)} className="rounded-full p-2 text-[#2f1b12]">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-2xl border border-[#ead8c9] bg-white shadow-soft">
                <button onClick={() => { setMenuOpen(false); onEdit(); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[#2f1b12]">
                  <Edit3 className="h-4 w-4" /> 사람 정보 수정
                </button>
                <button onClick={() => { setMenuOpen(false); onDeletePerson(); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[#c95735]">
                  <Trash2 className="h-4 w-4" /> 사람 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="text-center">
        <div className="flex justify-center">
          <Avatar person={person} size="lg" />
        </div>
        <h1 className="mt-2 text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">{person.name}</h1>
        <p className="mt-0.5 text-[13px] font-medium text-[#5e473a]">{getRelationLine(person)}</p>
        {person.phone && (
          <a href={`tel:${person.phone}`} className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#ead8c9] bg-white px-3 py-1.5 text-xs font-medium text-[#5a392a]">
            <Phone className="h-4 w-4" /> 연락처
          </a>
        )}
      </section>

      <div className="flex items-center justify-between rounded-full bg-[#fff5ed] px-3 py-2 text-xs font-medium text-[#5a392a]">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> 마지막 연락 {daysSince(person.lastContactDate)}일 전 · {person.lastContactMedium}
        </span>
      </div>

      <MemorySummaryCard
        person={person}
        aiEnabled={aiEnabled}
        onCompleteFollowUp={onCompleteFollowUp}
        onDeleteFollowUp={onDeleteFollowUp}
        onSaveFollowUp={onSaveFollowUp}
        onSaveBriefing={onSaveBriefing}
      />

      {person.history.length === 0 && !person.preferences.notes && (
        <section className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center shadow-soft">
          <h2 className="text-[18px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">아직 담긴 이야기가 많지 않아요.</h2>
          <p className="mt-2 text-sm leading-[1.6] text-[#7c6252]">
            {person.name}님과 다음에 이야기를 나눈 뒤 작은 기억부터 하나씩 담아보세요.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={onStartStory} className="rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white">첫 이야기 담기</button>
            <button onClick={() => onEdit()} className="rounded-full border border-[#dfa98f] bg-white py-3 text-sm font-medium text-[#c95735]">정보 조금 더 추가하기</button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onStartStory} className="rounded-full bg-[#d85b36] py-3 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(216,91,54,0.16)]">
          <Plus className="mr-1 inline h-4 w-4" /> 이야기 담기
        </button>
        <button onClick={onStartCheckIn} className="rounded-full border border-[#dfa98f] bg-white py-3 text-xs font-semibold text-[#c95735]">
          <HeartHandshake className="mr-1 inline h-4 w-4" /> 안부 시작하기
        </button>
      </div>

      <div className="flex gap-5 overflow-x-auto border-b border-[#ead8c9]">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 pb-2.5 text-xs font-semibold ${activeTab === tab ? "border-b-2 border-[#d85b36] text-[#d85b36]" : "text-[#2f1b12]"}`}>
            {tab}
          </button>
        ))}
      </div>

      {(activeTab === "최근 이야기" || activeTab === "전체 기록") && (
        <PersonTimeline person={person} onUpdateHistory={onUpdateHistory} onDeleteHistory={onDeleteHistory} />
      )}
      {activeTab === "빠른 기록" && <QuickRecordPanel person={person} aiEnabled={aiEnabled} onSave={onSaveStory} />}
      {activeTab === "정보" && <PersonInfoSection person={person} onEdit={onEdit} />}
      {activeTab === "함께한 마음" && <EventHistorySection person={person} onSaveEvent={onSaveEvent} onDeleteEvent={onDeleteEvent} />}
    </div>
  );
}

function FollowUpSection({
  person,
  onComplete,
  onDelete,
  onStartStory
}: {
  person: Person;
  onComplete: (followUpId: string) => void;
  onDelete: (followUpId: string) => void;
  onStartStory: (followUpId: string, referenceText: string) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedPrompt, setCompletedPrompt] = useState<FollowUpItem | null>(null);
  const pending = getPendingFollowUps(person);
  const completed = getCompletedFollowUps(person);

  return (
    <section className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">챙길 이야기</h2>
        {completed.length > 0 && (
          <button onClick={() => setShowCompleted((value) => !value)} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-medium text-[#5a392a]">
            완료된 이야기 {completed.length}
          </button>
        )}
      </div>

      {completedPrompt && (
        <section className="mb-3 rounded-2xl border border-[#ead8c9] bg-[#fff8ef] p-3">
          <p className="text-sm font-semibold text-[#d85b36]">물어봤어요 ✓</p>
          <h3 className="mt-1 text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">새로 알게 된 내용이 있나요?</h3>
          <p className="mt-1 text-sm leading-[1.6] text-[#7c6252]">“{completedPrompt.text}”에 이어지는 이야기를 남길 수 있어요.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onStartStory(completedPrompt.id, completedPrompt.text);
                setCompletedPrompt(null);
              }}
              className="rounded-full bg-[#d85b36] py-2 text-xs font-semibold text-white"
            >
              기록 남기기
            </button>
            <button onClick={() => setCompletedPrompt(null)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#5a392a]">
              그냥 완료
            </button>
          </div>
        </section>
      )}

      {pending.length === 0 ? (
        <p className="text-sm leading-[1.6] text-[#7c6252]">다음에 챙길 이야기가 아직 없어요.</p>
      ) : (
        <div className="space-y-2.5">
          {pending.map((item) => (
            <div key={item.id}>
              <FollowUpRow
                item={item}
                onComplete={(followUpId) => {
                  onComplete(followUpId);
                  setCompletedPrompt(item);
                }}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      )}

      {showCompleted && completed.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-[#ead8c9] pt-3">
          {completed.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/70 px-3 py-2.5">
              <p className="text-sm font-medium leading-[1.55] text-[#5a392a]">{item.text}</p>
              <p className="mt-1 text-xs text-[#8f7564]">물어본 날 {item.completedAt ? formatDateKo(item.completedAt.slice(0, 10)) : "-"}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FollowUpRow({
  item,
  onComplete,
  onDelete
}: {
  item: FollowUpItem;
  onComplete: (followUpId: string) => void;
  onDelete: (followUpId: string) => void;
}) {
  return (
    <article className="rounded-2xl bg-white/70 p-3">
      <p className="text-[14px] font-medium leading-[1.6] text-[#2f1b12]">{item.text}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => onComplete(item.id)} className="rounded-full bg-[#d85b36] py-2 text-xs font-semibold text-white">
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> 물어봤어요
        </button>
        <button onClick={() => onDelete(item.id)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#c95735]">
          삭제
        </button>
      </div>
    </article>
  );
}
