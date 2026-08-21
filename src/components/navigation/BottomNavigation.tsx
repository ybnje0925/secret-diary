import { HeartHandshake, Home, Settings, Users } from "lucide-react";

export type AppTab = "home" | "people" | "checkin" | "settings";

interface Props {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
}

const items = [
  { id: "home" as const, label: "홈", icon: Home },
  { id: "people" as const, label: "사람들", icon: Users },
  { id: "checkin" as const, label: "안부", icon: HeartHandshake },
  { id: "settings" as const, label: "설정", icon: Settings }
];

export default function BottomNavigation({ activeTab, onChangeTab }: Props) {
  const selectTab = (tab: AppTab) => {
    if (tab === activeTab) return;
    onChangeTab(tab);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ead8c9] bg-[#fffaf3]/95 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 items-end">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => selectTab(item.id)} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-medium ${active ? "text-[#d85b36]" : "text-[#8f7564]"}`}>
              <Icon className="h-[19px] w-[19px]" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
