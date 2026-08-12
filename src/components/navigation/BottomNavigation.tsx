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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8c9] bg-[#fffaf3]/95 px-5 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onChangeTab(item.id)} className={`flex flex-col items-center gap-1 py-1 text-xs font-bold ${active ? "text-[#d85b36]" : "text-[#8f7564]"}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
        <button onClick={onQuickRecord} className="-mt-8 flex h-16 w-16 items-center justify-center justify-self-center rounded-full bg-[#d85b36] text-white shadow-[0_12px_24px_rgba(216,91,54,0.35)]">
          <Plus className="h-8 w-8" />
        </button>
        {items.slice(2).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => onChangeTab(item.id)} className={`flex flex-col items-center gap-1 py-1 text-xs font-bold ${active ? "text-[#d85b36]" : "text-[#8f7564]"}`}>
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
