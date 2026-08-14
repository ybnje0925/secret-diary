import { Bell, CalendarDays, HeartHandshake, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Person } from "../types";
import { BrandTitle } from "../components/LockScreen";
import TodayPersonCard from "../components/home/TodayPersonCard";
import RecentStories from "../components/home/RecentStories";
import LongTimeNoSee from "../components/home/LongTimeNoSee";
import { daysSince } from "../utils/saramdam";

interface Props {
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onAddPerson: () => void;
  onStartCheckIn: (personId: string) => void;
}

export default function HomeView({ people, onOpenPerson, onAddPerson, onStartCheckIn }: Props) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const alertCount = people.filter((person) => daysSince(person.lastContactDate) >= (person.remindIntervalDays || 60)).length;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <BrandTitle />
          <p className="mt-0.5 text-[13px] font-semibold text-[#d85b36]">오늘도 소중한 사람을 기억해볼까요?</p>
        </div>
        <button onClick={() => setNotificationsOpen(true)} className="relative rounded-full p-1.5 text-[#2f1b12]" aria-label="알림 보기">
          <Bell className="h-5 w-5" />
          {alertCount > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#d85b36]" />}
        </button>
      </header>

      <TodayPersonCard people={people} onOpenPerson={onOpenPerson} onStartCheckIn={onStartCheckIn} />
      <RecentStories people={people} onOpenPerson={onOpenPerson} />
      <LongTimeNoSee people={people} onOpenPerson={onOpenPerson} onAddPerson={onAddPerson} />

      {notificationsOpen && (
        <NotificationSheet people={people} onClose={() => setNotificationsOpen(false)} onOpenPerson={onOpenPerson} onStartCheckIn={onStartCheckIn} />
      )}
    </div>
  );
}

function NotificationSheet({ people, onClose, onOpenPerson, onStartCheckIn }: { people: Person[]; onClose: () => void; onOpenPerson: (personId: string) => void; onStartCheckIn: (personId: string) => void }) {
  const overdue = useMemo(() => people.filter((person) => daysSince(person.lastContactDate) >= (person.remindIntervalDays || 60)).slice(0, 5), [people]);
  const events = useMemo(() => people.flatMap((person) => person.eventsHistory.map((event) => ({ person, event }))).slice(0, 5), [people]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2f1b12]/35 px-3" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()} className="mb-3 w-full max-w-md rounded-[22px] bg-[#fffaf3] p-4 shadow-[0_14px_40px_rgba(47,27,18,0.18)]">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-black text-[#2f1b12]">알림</h2>
            <p className="mt-1 text-sm text-[#7c6252]">챙겨볼 안부와 함께한 마음을 모았어요.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-[#fff1e8] p-2 text-[#5a392a]"><X className="h-5 w-5" /></button>
        </header>

        <div className="mt-4 space-y-3">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#2f1b12]"><HeartHandshake className="h-4 w-4 text-[#d85b36]" /> 안부가 필요한 사람</h3>
            {overdue.length === 0 ? <p className="rounded-2xl bg-white/70 p-4 text-sm text-[#7c6252]">지금은 새 알림이 없어요.</p> : overdue.map((person) => (
              <button key={person.id} onClick={() => { onClose(); onStartCheckIn(person.id); }} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-[#ead8c9] bg-white/70 p-3 text-left last:mb-0">
                <span>
                  <b className="block text-[#2f1b12]">{person.name}</b>
                  <small className="text-[#7c6252]">마지막 연락 {daysSince(person.lastContactDate)}일 전</small>
                </span>
                <span className="text-xs font-extrabold text-[#c95735]">안부</span>
              </button>
            ))}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-[#2f1b12]"><CalendarDays className="h-4 w-4 text-[#d85b36]" /> 함께한 마음</h3>
            {events.length === 0 ? <p className="rounded-2xl bg-white/70 p-4 text-sm text-[#7c6252]">기념일이나 선물 기록이 아직 없어요.</p> : events.map(({ person, event }) => (
              <button key={`${person.id}-${event.id}`} onClick={() => { onClose(); onOpenPerson(person.id); }} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-[#ead8c9] bg-white/70 p-3 text-left last:mb-0">
                <span>
                  <b className="block text-[#2f1b12]">{event.amountOrGift || event.type}</b>
                  <small className="text-[#7c6252]">{person.name} · {event.date}</small>
                </span>
                <span className="text-xs font-extrabold text-[#8d5b45]">보기</span>
              </button>
            ))}
          </section>
        </div>
      </section>
    </div>
  );
}
