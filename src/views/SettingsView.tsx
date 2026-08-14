import {
  Bell,
  Calendar,
  Check,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  FileDown,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  Palette,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { CustomGroup, Person } from "../types";
import { AppSettings } from "../utils/appSettings";
import {
  changeVaultPin,
  decryptBackupPayload,
  encryptBackupPayload,
  parseBackupFile,
  VaultData
} from "../vault";

interface Props {
  people: Person[];
  customGroups: CustomGroup[];
  vaultKey: CryptoKey;
  appSettings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onImport: (people: Person[], groups: CustomGroup[]) => void;
  onClearAll: () => void;
  onLock: () => void;
  onVaultRekey: (key: CryptoKey, data: VaultData) => void;
}

export default function SettingsView({
  people,
  customGroups,
  vaultKey,
  appSettings,
  onSettingsChange,
  onImport,
  onClearAll,
  onLock,
  onVaultRekey
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<{ salt: string; payload: string } | null>(null);
  const [restorePin, setRestorePin] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const downloadJson = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleEncryptedBackup = async () => {
    try {
      const { salt, payload } = await encryptBackupPayload(vaultKey, { people, customGroups });
      downloadJson(`saramdam-backup-${todayString()}.json`, {
        version: "2.0",
        encrypted: true,
        exportDate: new Date().toISOString(),
        salt,
        payload
      });
      showToast("암호화 백업 파일을 만들었어요.");
    } catch {
      showToast("백업 파일을 만드는 데 실패했어요.");
    }
  };

  const handlePlainExport = () => {
    const confirmed = window.confirm(
      "읽을 수 있는 JSON으로 내보내면 파일 안의 사람 이야기와 정보가 암호화되지 않습니다.\n\n계속 내보낼까요?"
    );
    if (!confirmed) return;
    downloadJson(`saramdam-data-export-${todayString()}.json`, {
      format: "saramdam-readable-export",
      exportDate: new Date().toISOString(),
      people,
      customGroups
    });
    showToast("읽을 수 있는 데이터 파일을 내보냈어요.");
  };

  const handleRestoreFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseBackupFile(String(reader.result || ""));
        if (!window.confirm("현재 사람談 데이터가 백업 파일 내용으로 바뀔 수 있어요.\n\n계속 복원할까요?")) return;

        if (parsed.format === "plain") {
          onImport(parsed.data.people, parsed.data.customGroups);
          showToast("백업 데이터를 복원했어요.");
          return;
        }

        setRestoreBackup({ salt: parsed.salt, payload: parsed.payload });
        setRestorePin("");
        setRestoreError("");
      } catch {
        showToast("백업 파일을 읽을 수 없어요. 파일 형식을 확인해주세요.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleRestoreEncrypted = async (event: FormEvent) => {
    event.preventDefault();
    if (!restoreBackup) return;
    setRestoreError("");
    try {
      const data = await decryptBackupPayload(restorePin, restoreBackup.salt, restoreBackup.payload);
      onImport(data.people, data.customGroups);
      setRestoreBackup(null);
      setRestorePin("");
      showToast("암호화 백업을 복원했어요.");
    } catch {
      setRestoreError("PIN이 맞지 않거나 백업 파일을 열 수 없어요.");
    }
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "모든 사람과 함께 담아둔 이야기를 삭제할까요?\n\n삭제 전 암호화 백업을 먼저 만들어두는 것을 권장해요."
    );
    if (confirmed) onClearAll();
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-[22px] font-black text-[#2f1b12]">설정</h1>
        <p className="text-xs leading-relaxed text-[#7c6252]">보안, 백업, AI 사용 여부를 사람談에 맞게 정리해요.</p>
      </header>

      <Section title="보안">
        <SettingButton icon={<Lock />} label="앱 잠금" value="PIN 사용 중" onClick={onLock} />
        <SettingButton icon={<KeyRound />} label="PIN 변경" value="현재 PIN 확인 후 변경" onClick={() => setPinModalOpen(true)} />
        <SettingControl icon={<ShieldCheck />} label="자동 잠금">
          <select
            value={appSettings.autoLockMinutes}
            onChange={(event) => onSettingsChange({ autoLockMinutes: event.target.value as AppSettings["autoLockMinutes"] })}
            className="rounded-full border border-[#ead8c9] bg-[#fffaf3] px-3 py-2 text-sm font-bold text-[#5a392a] outline-none"
          >
            <option value="off">사용 안 함</option>
            <option value="1">1분 후</option>
            <option value="5">5분 후</option>
            <option value="15">15분 후</option>
            <option value="30">30분 후</option>
          </select>
        </SettingControl>
      </Section>

      <Section title="데이터 관리">
        <SettingButton icon={<CloudUpload />} label="데이터 백업" value="암호화 파일 저장" onClick={handleEncryptedBackup} />
        <SettingButton icon={<CloudDownload />} label="데이터 복원" value="백업 파일 선택" onClick={() => fileInputRef.current?.click()} />
        <SettingButton icon={<FileDown />} label="모든 데이터 내보내기" value="읽을 수 있는 JSON" onClick={handlePlainExport} />
        <SettingButton icon={<Trash2 />} label="모든 데이터 삭제" value="확인 후 삭제" danger onClick={handleClearAll} />
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleRestoreFile} />
      </Section>

      <Section title="AI 및 개인정보">
        <SettingControl icon={<Sparkles />} label="AI 기능 사용">
          <button
            type="button"
            onClick={() => onSettingsChange({ aiEnabled: !appSettings.aiEnabled })}
            className={`rounded-full px-4 py-2 text-sm font-extrabold ${appSettings.aiEnabled ? "bg-[#d85b36] text-white" : "bg-[#f4e8dc] text-[#7c6252]"}`}
          >
            {appSettings.aiEnabled ? "사용 중" : "꺼짐"}
          </button>
        </SettingControl>
        <InfoCard>
          AI로 이야기 정리를 사용하면 입력한 대화 텍스트가 분석을 위해 AI 서비스로 전송됩니다. 안부 추천은 선택한 사람의 일부 프로필과 최근 기록만 사용하며, 전체 vault를 통째로 보내지 않습니다.
        </InfoCard>
        {!appSettings.aiEnabled && (
          <InfoCard tone="quiet">AI 기능이 꺼져 있어요. 직접 기록하기와 저장된 기록 기반의 기본 안부 문구는 계속 사용할 수 있습니다.</InfoCard>
        )}
      </Section>

      <Section title="알림">
        <ToggleRow
          icon={<Calendar />}
          label="기념일 알림"
          checked={appSettings.eventReminder}
          onChange={() => onSettingsChange({ eventReminder: !appSettings.eventReminder })}
        />
        <ToggleRow
          icon={<Bell />}
          label="오랜만인 사람 알림"
          checked={appSettings.checkInReminder}
          onChange={() => onSettingsChange({ checkInReminder: !appSettings.checkInReminder })}
        />
        <ToggleRow
          icon={<ShieldCheck />}
          label="연락 주기 참고 표시"
          checked={appSettings.contactCycleReminder}
          onChange={() => onSettingsChange({ contactCycleReminder: !appSettings.contactCycleReminder })}
        />
        <SettingControl icon={<Bell />} label="새 사람 기본 연락 주기">
          <select
            value={appSettings.defaultRemindIntervalDays}
            onChange={(event) => onSettingsChange({ defaultRemindIntervalDays: Number(event.target.value) as AppSettings["defaultRemindIntervalDays"] })}
            className="rounded-full border border-[#ead8c9] bg-[#fffaf3] px-3 py-2 text-sm font-bold text-[#5a392a] outline-none"
          >
            <option value={30}>30일</option>
            <option value={60}>60일</option>
            <option value={90}>90일</option>
          </select>
        </SettingControl>
        <InfoCard tone="quiet">현재 알림은 앱 안에서 참고용으로 보여드려요. 휴대폰 OS 푸시 알림은 아직 연결되어 있지 않습니다.</InfoCard>
      </Section>

      <Section title="기타">
        <SettingControl icon={<Palette />} label="테마 설정">
          <select
            value={appSettings.theme}
            onChange={(event) => onSettingsChange({ theme: event.target.value as AppSettings["theme"] })}
            className="rounded-full border border-[#ead8c9] bg-[#fffaf3] px-3 py-2 text-sm font-bold text-[#5a392a] outline-none"
          >
            <option value="warm">따뜻한 테마</option>
            <option value="system">시스템 기본</option>
          </select>
        </SettingControl>
        <InfoCard>
          사람談은 소중한 사람들과 나눈 작은 이야기를 암호화 vault에 보관합니다. 백업 파일은 PIN을 잊으면 복원할 수 없으니 따로 기억해주세요.
        </InfoCard>
        <SettingButton icon={<HelpCircle />} label="정보 및 도움말" value="백업과 개인정보 안내" onClick={() => showToast("도움말 화면은 다음 단계에서 더 자세히 연결할게요.")} />
        <SettingButton icon={<Info />} label="앱 정보" value="사람談 v2" />
      </Section>

      {pinModalOpen && (
        <PinChangeModal
          onClose={() => setPinModalOpen(false)}
          onChanged={(key, data) => {
            onVaultRekey(key, data);
            setPinModalOpen(false);
            showToast("PIN을 변경했어요.");
          }}
        />
      )}

      {restoreBackup && (
        <RestorePinModal
          pin={restorePin}
          error={restoreError}
          onPinChange={setRestorePin}
          onSubmit={handleRestoreEncrypted}
          onClose={() => {
            setRestoreBackup(null);
            setRestorePin("");
            setRestoreError("");
          }}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 top-5 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full border border-[#ead8c9] bg-[#fffaf3] px-5 py-3 text-center text-sm font-extrabold text-[#5a392a] shadow-soft">
          {toast}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-extrabold text-[#2f1b12]">{title}</h2>
      <div className="overflow-hidden rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] shadow-soft">{children}</div>
    </section>
  );
}

function SettingButton({
  icon,
  label,
  value,
  danger,
  onClick
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="flex min-h-11 w-full items-center gap-2.5 border-b border-[#f0dfd1] px-3.5 py-3 text-left last:border-b-0">
      <IconSlot danger={danger}>{icon}</IconSlot>
      <span className={`flex-1 text-[13px] font-bold ${danger ? "text-[#b53c2f]" : "text-[#2f1b12]"}`}>{label}</span>
      {value && <span className="max-w-[45%] truncate text-xs text-[#8f7564]">{value}</span>}
      {onClick && <ChevronRight className="h-5 w-5 text-[#8f7564]" />}
    </button>
  );
}

function SettingControl({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 w-full items-center gap-2.5 border-b border-[#f0dfd1] px-3.5 py-3 last:border-b-0">
      <IconSlot>{icon}</IconSlot>
      <span className="flex-1 text-[13px] font-bold text-[#2f1b12]">{label}</span>
      {children}
    </div>
  );
}

function ToggleRow({ icon, label, checked, onChange }: { icon?: ReactNode; label: string; checked: boolean; onChange: () => void }) {
  return (
    <SettingControl icon={icon} label={label}>
      <button
        type="button"
        onClick={onChange}
        className={`flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? "bg-[#d85b36]" : "bg-[#ead8c9]"}`}
        aria-pressed={checked}
      >
        <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-5" : ""}`} />
      </button>
    </SettingControl>
  );
}

function IconSlot({ children, danger }: { children?: ReactNode; danger?: boolean }) {
  return (
    <span className={`flex h-7 w-7 items-center justify-center ${danger ? "text-[#b53c2f]" : "text-[#5a392a]"} [&>svg]:h-5 [&>svg]:w-5`}>
      {children}
    </span>
  );
}

function InfoCard({ children, tone = "peach" }: { children: ReactNode; tone?: "peach" | "quiet" }) {
  return (
    <div className={`border-b border-[#f0dfd1] px-3.5 py-3 text-xs leading-relaxed last:border-b-0 ${tone === "peach" ? "bg-[#fff2e7] text-[#6d4735]" : "bg-[#fffaf3] text-[#8f7564]"}`}>
      {children}
    </div>
  );
}

function PinChangeModal({ onClose, onChanged }: { onClose: () => void; onChanged: (key: CryptoKey, data: VaultData) => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (currentPin.length !== 4 || nextPin.length !== 4) {
      setError("PIN은 4자리로 입력해주세요.");
      return;
    }
    if (nextPin !== confirmPin) {
      setError("새 PIN이 서로 달라요.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await changeVaultPin(currentPin, nextPin);
      onChanged(result.key, result.data);
    } catch {
      setError("현재 PIN이 맞지 않아요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell title="PIN 변경" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <PinInput label="현재 PIN" value={currentPin} onChange={setCurrentPin} autoFocus />
        <PinInput label="새 PIN" value={nextPin} onChange={setNextPin} />
        <PinInput label="새 PIN 확인" value={confirmPin} onChange={setConfirmPin} />
        {error && <p className="rounded-xl bg-[#fff2e7] px-4 py-3 text-sm font-bold text-[#b53c2f]">{error}</p>}
        <button disabled={isSaving} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-extrabold text-white disabled:opacity-50">
          {isSaving ? "변경 중..." : "변경사항 저장"}
        </button>
      </form>
    </ModalShell>
  );
}

function RestorePinModal({
  pin,
  error,
  onPinChange,
  onSubmit,
  onClose
}: {
  pin: string;
  error: string;
  onPinChange: (pin: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="백업 PIN 입력" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <p className="text-sm leading-relaxed text-[#7c6252]">이 백업을 만들 때 사용한 PIN을 입력해주세요.</p>
        <PinInput label="백업 PIN" value={pin} onChange={onPinChange} autoFocus />
        {error && <p className="rounded-xl bg-[#fff2e7] px-4 py-3 text-sm font-bold text-[#b53c2f]">{error}</p>}
        <button disabled={pin.length !== 4} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-extrabold text-white disabled:opacity-50">
          복원하기
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/30 px-4 pb-4 sm:items-center sm:justify-center">
      <section className="w-full max-w-sm rounded-[22px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-[0_14px_40px_rgba(47,27,18,0.16)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-black text-[#2f1b12]">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-[#f4e8dc] p-2 text-[#5a392a]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function PinInput({ label, value, autoFocus, onChange }: { label: string; value: string; autoFocus?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#5a392a]">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        type="password"
        inputMode="numeric"
        maxLength={4}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        className="h-11 w-full rounded-[16px] border border-[#ead8c9] bg-white px-4 text-base font-black tracking-[0.3em] text-[#2f1b12] outline-none focus:border-[#d85b36]"
      />
    </label>
  );
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}
