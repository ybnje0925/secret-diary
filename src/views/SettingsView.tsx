import { Bell, Calendar, ChevronRight, CloudDownload, CloudUpload, FileDown, HelpCircle, Info, Lock, Palette, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import BackupRestore from "../components/BackupRestore";
import { CustomGroup, Person } from "../types";

interface Props {
  people: Person[];
  customGroups: CustomGroup[];
  vaultKey: CryptoKey;
  onImport: (people: Person[], groups: CustomGroup[]) => void;
  onClearAll: () => void;
  onLock: () => void;
}

export default function SettingsView({ people, customGroups, vaultKey, onImport, onClearAll, onLock }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-[#2f1b12]">설정</h1>

      <Section title="보안">
        <Setting icon={<Lock />} label="앱 잠금" value="PIN 사용 중" onClick={onLock} />
        <Setting label="PIN 변경" value="" />
        <Setting icon={<ClockIcon />} label="자동 잠금" value="5분 후" />
      </Section>

      <Section title="데이터 관리">
        <Setting icon={<CloudUpload />} label="데이터 백업" value="마지막 백업: 2026. 7. 21" />
        <Setting icon={<CloudDownload />} label="데이터 복원" value="" />
        <Setting icon={<FileDown />} label="모든 데이터 내보내기" value="" />
        <div className="pt-2">
          <BackupRestore people={people} customGroups={customGroups} vaultKey={vaultKey} onImport={onImport} onClearAll={onClearAll} />
        </div>
      </Section>

      <Section title="알림">
        <Setting icon={<Calendar />} label="기념일 알림" value="사용 중" />
        <Setting icon={<Bell />} label="오랜만인 사람 알림" value="사용 중" />
      </Section>

      <Section title="기타">
        <Setting icon={<Sparkles />} label="AI 분석 설정" value="" />
        <Setting icon={<Palette />} label="테마 설정" value="따뜻한 테마" />
        <Setting icon={<HelpCircle />} label="정보 및 도움말" value="" />
        <Setting icon={<Info />} label="앱 정보" value="사람담 v1.0.0" />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-extrabold text-[#2f1b12]">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-[#ead8c9] bg-[#fffaf3] shadow-soft">{children}</div>
    </section>
  );
}

function Setting({ icon, label, value, onClick }: { icon?: ReactNode; label: string; value: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-[#f0dfd1] px-4 py-4 text-left last:border-b-0">
      <span className="flex h-6 w-6 items-center justify-center text-[#5a392a] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <span className="flex-1 font-bold text-[#2f1b12]">{label}</span>
      {value && <span className="text-sm text-[#8f7564]">{value}</span>}
      <ChevronRight className="h-5 w-5 text-[#8f7564]" />
    </button>
  );
}

function ClockIcon() {
  return <span className="text-lg">◷</span>;
}
