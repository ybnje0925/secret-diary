import { ArrowLeft, CalendarDays, Edit3, HeartHandshake, MoreHorizontal, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import Avatar from "../components/common/Avatar";
import EventHistorySection from "../components/person/EventHistorySection";
import MemorySummaryCard from "../components/person/MemorySummaryCard";
import PersonInfoSection from "../components/person/PersonInfoSection";
import PersonTimeline from "../components/person/PersonTimeline";
import { EventHistoryItem, InteractionHistory, Person } from "../types";
import { daysSince, getRelationLine } from "../utils/saramdam";

interface Props {
  person: Person;
  onBack: () => void;
  onEdit: () => void;
  onDeletePerson: () => void;
  onStartStory: () => void;
  onStartCheckIn: () => void;
  onUpdateHistory: (history: InteractionHistory) => void;
  onDeleteHistory: (historyId: string) => void;
  onSaveEvent: (event: EventHistoryItem) => void;
  onDeleteEvent: (eventId: string) => void;
}

const tabs = ["최근 이야기", "전체 기록", "정보", "함께한 마음"] as const;
type DetailTab = typeof tabs[number];

export default function PersonDetailView({
  person,
  onBack,
  onEdit,
  onDeletePerson,
  onStartStory,
  onStartCheckIn,
  onUpdateHistory,
  onDeleteHistory,
  onSaveEvent,
  onDeleteEvent
}: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("최근 이야기");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="rounded-full p-2 text-[#2f1b12]">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-[#2f1b12]" />
          <div className="relative">
            <button onClick={() => setMenuOpen((value) => !value)} className="rounded-full p-2 text-[#2f1b12]">
              <MoreHorizontal className="h-6 w-6" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-2xl border border-[#ead8c9] bg-white shadow-soft">
                <button onClick={() => { setMenuOpen(false); onEdit(); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[#2f1b12]">
                  <Edit3 className="h-4 w-4" /> 사람 정보 수정
                </button>
                <button onClick={() => { setMenuOpen(false); onDeletePerson(); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[#c95735]">
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
        <h1 className="mt-3 text-3xl font-black text-[#2f1b12]">{person.name}</h1>
        <p className="mt-1 text-[15px] font-medium text-[#5e473a]">{getRelationLine(person)}</p>
        {person.phone && (
          <a href={`tel:${person.phone}`} className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#ead8c9] bg-white px-4 py-2 text-sm font-bold text-[#5a392a]">
            <Phone className="h-4 w-4" /> 연락처
          </a>
        )}
      </section>

      <div className="flex items-center justify-between rounded-full bg-[#fff5ed] px-4 py-3 text-sm font-bold text-[#5a392a]">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" /> 마지막 연락 {daysSince(person.lastContactDate)}일 전 · {person.lastContactMedium}
        </span>
        <button onClick={onEdit} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8c9] bg-white text-[#9a6044]">
          <Edit3 className="h-5 w-5" />
        </button>
      </div>

      <MemorySummaryCard person={person} onEdit={onEdit} />

      {person.history.length === 0 && !person.preferences.notes && (
        <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-5 text-center shadow-soft">
          <h2 className="text-xl font-black text-[#2f1b12]">아직 담긴 이야기가 많지 않아요.</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#7c6252]">
            {person.name}님과 다음에 이야기를 나눈 뒤 작은 기억부터 하나씩 담아보세요.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={onStartStory} className="rounded-full bg-[#d85b36] py-3 text-sm font-extrabold text-white">첫 이야기 담기</button>
            <button onClick={onEdit} className="rounded-full border border-[#dfa98f] bg-white py-3 text-sm font-extrabold text-[#c95735]">정보 조금 더 추가하기</button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onStartStory} className="rounded-full bg-[#d85b36] py-4 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(216,91,54,0.22)]">
          <Plus className="mr-1 inline h-4 w-4" /> 이야기 담기
        </button>
        <button onClick={onStartCheckIn} className="rounded-full border border-[#dfa98f] bg-white py-4 text-sm font-extrabold text-[#c95735]">
          <HeartHandshake className="mr-1 inline h-4 w-4" /> 안부 시작하기
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto border-b border-[#ead8c9]">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 pb-3 text-sm font-extrabold ${activeTab === tab ? "border-b-2 border-[#d85b36] text-[#d85b36]" : "text-[#2f1b12]"}`}>
            {tab}
          </button>
        ))}
      </div>

      {(activeTab === "최근 이야기" || activeTab === "전체 기록") && (
        <PersonTimeline person={person} onUpdateHistory={onUpdateHistory} onDeleteHistory={onDeleteHistory} />
      )}
      {activeTab === "정보" && <PersonInfoSection person={person} onEdit={onEdit} />}
      {activeTab === "함께한 마음" && <EventHistorySection person={person} onSaveEvent={onSaveEvent} onDeleteEvent={onDeleteEvent} />}
    </div>
  );
}
