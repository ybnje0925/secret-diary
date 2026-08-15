import { HeartHandshake, Home, Plus, Settings, Users } from "lucide-react";

export type AppTab = "home" | "people" | "checkin" | "settings";

interface Props {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  onQuickRecord: () => void;
}

const items = [
  { id: "home" as const, label: "홈", icon: Home },
  { id: "people" as const, label: "사람들", icon: Users },
  { id: "checkin" as const, label: "안부", icon: HeartHandshake },
  { id: "settings" as const, label: "설정", icon: Settings }
];

export default function BottomNavigation({ activeTab, onChangeTab, onQuickRecord }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8c9] bg-[#fffaf3]/95 px-5 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onChangeTab(item.id)} className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${active ? "text-[#d85b36]" : "text-[#8f7564]"}`}>
              <Icon className="h-[19px] w-[19px]" />
              {item.label}
            </button>
          );
        })}
        <button onClick={onQuickRecord} aria-label="이야기 담기" className="-mt-7 flex h-14 w-14 items-center justify-center justify-self-center rounded-full bg-[#d85b36] text-white shadow-[0_10px_20px_rgba(216,91,54,0.26)]">
          <Plus className="h-7 w-7" />
        </button>
        {items.slice(2).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onChangeTab(item.id)} className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${active ? "text-[#d85b36]" : "text-[#8f7564]"}`}>
              <Icon className="h-[19px] w-[19px]" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
