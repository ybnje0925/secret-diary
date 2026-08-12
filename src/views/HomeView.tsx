import { Bell } from "lucide-react";
import { Person } from "../types";
import TodayPersonCard from "../components/home/TodayPersonCard";
import RecentStories from "../components/home/RecentStories";
import LongTimeNoSee from "../components/home/LongTimeNoSee";

interface Props {
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onAddPerson: () => void;
  onStartCheckIn: (personId: string) => void;
}

export default function HomeView({ people, onOpenPerson, onAddPerson, onStartCheckIn }: Props) {
  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2f1b12]">사람담</h1>
          <p className="mt-1 text-[15px] font-semibold text-[#d85b36]">오늘도 소중한 사람을 기억해볼까요?</p>
        </div>
        <button className="relative rounded-full p-2 text-[#2f1b12]">
          <Bell className="h-6 w-6" />
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#d85b36]" />
        </button>
      </header>

      <TodayPersonCard people={people} onOpenPerson={onOpenPerson} onStartCheckIn={onStartCheckIn} />
      <RecentStories people={people} onOpenPerson={onOpenPerson} />
      <LongTimeNoSee people={people} onOpenPerson={onOpenPerson} onAddPerson={onAddPerson} />
    </div>
  );
}
