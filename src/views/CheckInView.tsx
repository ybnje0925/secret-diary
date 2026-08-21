import { ArrowLeft, Bell, CalendarDays, CheckCircle2, Clock3, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../components/common/Avatar";
import { FollowUpItem, InteractionHistory, Person } from "../types";
import { getPendingFollowUps } from "../utils/followUps";
import { daysSince, formatDateKo, getRecentMemory, getRelationLine } from "../utils/saramdam";

interface Props {
  people: Person[];
  initialPersonId?: string | null;
  onContactComplete: (personId: string, history: InteractionHistory) => void;
  onCompleteFollowUp: (personId: string, followUpId: string) => void;
  onDeleteFollowUp: (personId: string, followUpId: string) => void;
  onStartFollowUpStory: (personId: string, followUpId: string, referenceText: string) => void;
}

type Step = "main" | "picker" | "person";
type UpcomingEvent = { id: string; label: string; date: string; daysUntil: number };
type CarePerson = { person: Person; pending: FollowUpItem[]; upcoming: UpcomingEvent[]; staleDays: number; score: number };

const staleThresholdDays = 90;
const upcomingWindowDays = 30;

export default function CheckInView({
  people,
  initialPersonId,
  onCompleteFollowUp,
  onDeleteFollowUp,
  onStartFollowUpStory
}: Props) {
  const [step, setStep] = useState<Step>(initialPersonId ? "person" : "main");
  const [selectedId, setSelectedId] = useState<string | null>(initialPersonId || null);
  const [completedPrompt, setCompletedPrompt] = useState<{ person: Person; item: FollowUpItem } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const stepRef = useRef(step);

  const carePeople = useMemo(() => people.map(buildCarePerson).filter(shouldShowCarePerson).sort(sortCarePeople), [people]);
  const selectedCare = useMemo(() => {
    const selected = people.find((person) => person.id === selectedId);
    return selected ? buildCarePerson(selected) : null;
  }, [people, selectedId]);
  const searchedPeople = people.filter((person) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [person.name, person.category, person.company, ...person.groups].join(" ").toLowerCase().includes(query);
  });

  useEffect(() => {
    if (initialPersonId) {
      setSelectedId(initialPersonId);
      setStep("person");
    }
  }, [initialPersonId]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    const onRootBack = (event: Event) => {
      if (stepRef.current === "main") return;
      event.preventDefault();
      setStep("main");
    };

    window.addEventListener("saramdam:root-back", onRootBack);
    return () => window.removeEventListener("saramdam:root-back", onRootBack);
  }, []);

  const choosePerson = (personId: string) => {
    setSelectedId(personId);
    setStep("person");
  };

  const completeFollowUp = (person: Person, item: FollowUpItem) => {
    onCompleteFollowUp(person.id, item.id);
    setCompletedPrompt({ person, item });
  };

  if (!people.length) {
    return <p className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center text-sm text-[#7c6252]">안부를 챙길 사람이 아직 없어요.</p>;
  }

  if (step === "picker") {
    return (
      <div className="space-y-5">
        <button onClick={() => setStep("main")} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
        <section>
          <h1 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">누구를 챙겨볼까요?</h1>
          <p className="mt-2 text-[13px] leading-[1.6] text-[#7c6252]">저장된 이야기와 기록을 살펴볼 사람을 선택할 수 있어요.</p>
        </section>
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8f7564]" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="이름, 관계, 그룹 검색" className="h-11 w-full rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] pl-10 pr-3 text-[16px] text-[#2f1b12] outline-none focus:border-[#d85b36]" />
        </label>
        <div className="space-y-3">
          {searchedPeople.map((person) => (
            <div key={person.id}>
              <PersonSelectCard care={buildCarePerson(person)} onSelect={choosePerson} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "person" && selectedCare) {
    return (
      <CarePersonDetail
        care={selectedCare}
        onBack={() => setStep("main")}
        onComplete={completeFollowUp}
        onDelete={(person, item) => onDeleteFollowUp(person.id, item.id)}
        onStartStory={(person, item) => {
          onStartFollowUpStory(person.id, item.id, item.text);
          setCompletedPrompt(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">안부를 전해볼까요?</h1>
          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.6] text-[#7c6252]">챙겨야 할 사람과 이야기를{"\n"}한곳에서 확인해요.</p>
        </div>
        <button className="relative rounded-full p-2 text-[#2f1b12]"><Bell className="h-6 w-6" />{carePeople.length > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#d85b36]" />}</button>
      </header>

      {completedPrompt && (
        <FollowUpCompletedPrompt
          person={completedPrompt.person}
          item={completedPrompt.item}
          onWrite={() => {
            onStartFollowUpStory(completedPrompt.person.id, completedPrompt.item.id, completedPrompt.item.text);
            setCompletedPrompt(null);
          }}
          onDismiss={() => setCompletedPrompt(null)}
        />
      )}

      <section>
        <h2 className="mb-2.5 text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">챙길 사람과 이야기</h2>
        {carePeople.length ? (
          <div className="space-y-3">
            {carePeople.slice(0, 8).map((care) => (
              <div key={care.person.id}>
                <CarePersonCard care={care} onSelect={choosePerson} onComplete={completeFollowUp} />
              </div>
            ))}
          </div>
        ) : (
          <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center shadow-soft">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[#d85b36]" />
            <h3 className="mt-3 text-[17px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">지금 챙길 이야기는 없어요.</h3>
            <p className="mt-2 text-sm leading-[1.6] text-[#7c6252]">다음에 챙길 이야기를 기록에서 직접 관리할 수 있습니다.</p>
          </section>
        )}
      </section>

      <button onClick={() => setStep("picker")} className="w-full rounded-full border border-[#ead8c9] bg-white py-3 text-sm font-medium text-[#5a392a] shadow-soft">
        다른 사람 살펴보기
      </button>
      <CareNotice />
    </div>
  );
}

function CarePersonCard({ care, onSelect, onComplete }: { care: CarePerson; onSelect: (personId: string) => void; onComplete: (person: Person, item: FollowUpItem) => void }) {
  const firstPending = care.pending[0];

  return (
    <article className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
      <button onClick={() => onSelect(care.person.id)} className="w-full text-left">
        <div className="flex gap-4">
          <Avatar person={care.person} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#2f1b12]">{care.person.name}</h3>
            <p className="mt-1 text-sm font-medium text-[#5e473a]">{getRelationLine(care.person)}</p>
            <p className="mt-2 text-sm font-semibold leading-[1.45] text-[#c95735]">{getHeadline(care)}</p>
          </div>
        </div>
      </button>
      <CareBadges care={care} />
      {firstPending ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => onComplete(care.person, firstPending)} className="rounded-full bg-[#d85b36] py-2 text-xs font-semibold text-white">
            <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> 물어봤어요
          </button>
          <button onClick={() => onSelect(care.person.id)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#5a392a]">
            모두 보기
          </button>
        </div>
      ) : (
        <button onClick={() => onSelect(care.person.id)} className="mt-4 w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white">살펴보기</button>
      )}
    </article>
  );
}

function CarePersonDetail({
  care,
  onBack,
  onComplete,
  onDelete,
  onStartStory
}: {
  care: CarePerson;
  onBack: () => void;
  onComplete: (person: Person, item: FollowUpItem) => void;
  onDelete: (person: Person, item: FollowUpItem) => void;
  onStartStory: (person: Person, item: FollowUpItem) => void;
}) {
  const [localPrompt, setLocalPrompt] = useState<FollowUpItem | null>(null);
  const latest = getLatestHistory(care.person);

  const complete = (item: FollowUpItem) => {
    onComplete(care.person, item);
    setLocalPrompt(item);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
      <section>
        <p className="text-sm font-semibold text-[#d85b36]">{care.person.name}에게</p>
        <h1 className="mt-1 text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">무엇을 챙길까요?</h1>
        <p className="mt-1.5 whitespace-pre-line text-[13px] leading-[1.6] text-[#7c6252]">직접 남겨둔 이야기와{"\n"}날짜 정보를 함께 확인해요.</p>
      </section>

      {localPrompt && (
        <FollowUpCompletedPrompt
          person={care.person}
          item={localPrompt}
          onWrite={() => {
            onStartStory(care.person, localPrompt);
            setLocalPrompt(null);
          }}
          onDismiss={() => setLocalPrompt(null)}
        />
      )}

      <article className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
        <div className="flex gap-4">
          <Avatar person={care.person} size="md" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold leading-[1.4] tracking-[-0.015em] text-[#2f1b12]">{care.person.name}</h2>
            <p className="mt-1 text-sm font-medium text-[#5e473a]">{getRelationLine(care.person)}</p>
            <p className="mt-2 text-sm font-semibold text-[#c95735]">{getHeadline(care)}</p>
          </div>
        </div>
        <CareBadges care={care} />
      </article>

      <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">챙길 이야기</h2>
        {care.pending.length ? (
          <div className="mt-3 space-y-2.5">
            {care.pending.map((item) => (
              <div key={item.id} className="rounded-xl bg-white/75 p-3">
                <p className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{item.text}</p>
                <p className="mt-1 text-xs text-[#8f7564]">등록일 {formatDateKo(item.createdAt.slice(0, 10))}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => complete(item)} className="rounded-full bg-[#d85b36] py-2 text-xs font-semibold text-white">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> 물어봤어요
                  </button>
                  <button onClick={() => onDelete(care.person, item)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#c95735]">
                    <Trash2 className="mr-1 inline h-3.5 w-3.5" /> 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-xl bg-white/75 p-3 text-sm leading-[1.6] text-[#7c6252]">다음에 챙길 이야기를 관리할 수 있습니다.</p>
        )}
      </section>

      {care.upcoming.length > 0 && (
        <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
          <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">다가오는 일정</h2>
          <div className="mt-3 space-y-2">
            {care.upcoming.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/75 px-3 py-2">
                <span className="min-w-0 text-sm font-medium text-[#5a392a]">{event.label}</span>
                <span className="shrink-0 text-xs font-semibold text-[#c95735]">{formatDday(event.daysUntil)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">최근 기록</h2>
        <p className="mt-2 text-sm leading-[1.6] text-[#7c6252]">{latest ? `${formatDateKo(latest.date)} · ${latest.medium}` : `최근 기록 ${care.staleDays}일 없음`}</p>
        <blockquote className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-sm leading-relaxed text-[#5a392a]">“{getRecentMemory(care.person).split("\n")[0]}”</blockquote>
      </section>
    </div>
  );
}

function PersonSelectCard({ care, onSelect }: { care: CarePerson; onSelect: (personId: string) => void }) {
  return (
    <button onClick={() => onSelect(care.person.id)} className="flex w-full items-center gap-3 rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3 text-left shadow-soft">
      <Avatar person={care.person} size="sm" />
      <span className="min-w-0 flex-1">
        <b className="block font-semibold text-[#2f1b12]">{care.person.name}</b>
        <small className="block text-[#7c6252]">{getRelationLine(care.person)}</small>
      </span>
      <span className="shrink-0 text-xs font-medium text-[#c95735]">{getSmallStatus(care)}</span>
    </button>
  );
}

function CareBadges({ care }: { care: CarePerson }) {
  const badges: { icon: "check" | "calendar" | "clock"; text: string }[] = [];
  if (care.pending.length) badges.push({ icon: "check", text: `챙길 이야기 ${care.pending.length}개` });
  if (care.upcoming[0]) badges.push({ icon: "calendar", text: `${care.upcoming[0].label} ${formatDday(care.upcoming[0].daysUntil)}` });
  if (care.staleDays >= staleThresholdDays) badges.push({ icon: "clock", text: `최근 기록 ${care.staleDays}일 없음` });

  if (!badges.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span key={`${badge.icon}-${badge.text}`} className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#8d5b45]">
          {badge.icon === "check" && <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-[#d85b36]" />}
          {badge.icon === "calendar" && <CalendarDays className="mr-1 h-3.5 w-3.5 text-[#d85b36]" />}
          {badge.icon === "clock" && <Clock3 className="mr-1 h-3.5 w-3.5 text-[#d85b36]" />}
          {badge.text}
        </span>
      ))}
    </div>
  );
}

function FollowUpCompletedPrompt({ person, item, onWrite, onDismiss }: { person: Person; item: FollowUpItem; onWrite: () => void; onDismiss: () => void }) {
  return (
    <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
      <p className="text-sm font-semibold text-[#d85b36]">물어봤어요 ✓</p>
      <h2 className="mt-1 text-[17px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">새로 알게 된 내용이 있나요?</h2>
      <p className="mt-1.5 text-sm leading-[1.6] text-[#7c6252]">{person.name}님과 “{item.text}”에 대해 나눈 내용을 이어서 기록할 수 있어요.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={onWrite} className="rounded-full bg-[#d85b36] py-2.5 text-sm font-semibold text-white">기록 남기기</button>
        <button onClick={onDismiss} className="rounded-full border border-[#ead8c9] bg-white py-2.5 text-sm font-medium text-[#5a392a]">그냥 완료</button>
      </div>
    </section>
  );
}

function CareNotice() {
  return <p className="rounded-2xl bg-[#fff1df] p-3 text-xs leading-relaxed text-[#7c6252]">안부 탭은 저장된 챙길 이야기, 날짜, 기념일을 기준으로 정리됩니다.</p>;
}

function buildCarePerson(person: Person): CarePerson {
  const pending = getPendingFollowUps(person);
  const upcoming = getUpcomingEvents(person);
  const staleDays = getStaleDays(person);
  const score = pending.length * 1000 + (upcoming[0] ? 500 - upcoming[0].daysUntil : 0) + (staleDays >= staleThresholdDays ? Math.min(staleDays, 180) : 0);
  return { person, pending, upcoming, staleDays, score };
}

function shouldShowCarePerson(care: CarePerson) {
  return care.pending.length > 0 || care.upcoming.length > 0 || care.staleDays >= staleThresholdDays;
}

function sortCarePeople(a: CarePerson, b: CarePerson) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.pending.length !== a.pending.length) return b.pending.length - a.pending.length;
  if ((a.upcoming[0]?.daysUntil ?? 999) !== (b.upcoming[0]?.daysUntil ?? 999)) {
    return (a.upcoming[0]?.daysUntil ?? 999) - (b.upcoming[0]?.daysUntil ?? 999);
  }
  return b.staleDays - a.staleDays;
}

function getHeadline(care: CarePerson) {
  if (care.pending[0]) return care.pending[0].text;
  if (care.upcoming[0]) return `${care.upcoming[0].label} ${formatDday(care.upcoming[0].daysUntil)}`;
  if (care.staleDays >= staleThresholdDays) return `최근 기록 ${care.staleDays}일 없음`;
  return getRecentMemory(care.person).split("\n")[0];
}

function getSmallStatus(care: CarePerson) {
  if (care.pending.length) return `${care.pending.length}개`;
  if (care.upcoming[0]) return formatDday(care.upcoming[0].daysUntil);
  return `${care.staleDays}일 전`;
}

function getStaleDays(person: Person) {
  const latest = getLatestHistory(person);
  return daysSince(latest?.date || person.lastContactDate);
}

function getLatestHistory(person: Person) {
  return [...person.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
}

function getUpcomingEvents(person: Person): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];

  person.eventsHistory.forEach((event) => {
    const annual = isAnnualEvent(event.type, event.amountOrGift, event.note);
    const daysUntil = getDaysUntilEvent(event.date, annual);
    if (daysUntil === null || daysUntil > upcomingWindowDays) return;
    events.push({
      id: `event-${event.id}`,
      label: event.type || event.amountOrGift || "다가오는 일정",
      date: event.date,
      daysUntil
    });
  });

  person.familyInfo.children.forEach((child, index) => {
    if (!child.birthDate) return;
    const daysUntil = getDaysUntilEvent(child.birthDate, true);
    if (daysUntil === null || daysUntil > upcomingWindowDays) return;
    events.push({
      id: `child-${index}-${child.birthDate}`,
      label: `${child.name || "자녀"} 생일`,
      date: child.birthDate,
      daysUntil
    });
  });

  return events.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 3);
}

function isAnnualEvent(...values: string[]) {
  return values.some((value) => /생일|기념/.test(value || ""));
}

function getDaysUntilEvent(dateText: string, annual: boolean) {
  if (!dateText) return null;
  const source = new Date(dateText);
  if (Number.isNaN(source.getTime())) return null;

  const today = startOfDay(new Date());
  const target = startOfDay(new Date(source));
  if (annual) {
    target.setFullYear(today.getFullYear());
    if (target < today) target.setFullYear(today.getFullYear() + 1);
  }
  if (target < today) return null;
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDday(days: number) {
  return days === 0 ? "D-Day" : `D-${days}`;
}
