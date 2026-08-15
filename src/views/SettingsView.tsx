import {
  Bell,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  FileDown,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { ConfirmDialogOptions } from "../components/common/ConfirmDialog";
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
  onRequestConfirm: (options: ConfirmDialogOptions & { onConfirm: () => void }) => void;
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
  onRequestConfirm,
  onLock,
  onVaultRekey
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<{ salt: string; payload: string } | null>(null);
  const [restorePin, setRestorePin] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [aiInfoOpen, setAiInfoOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onOverlayBack = (event: Event) => {
      if (!pinModalOpen && !restoreBackup && !aiInfoOpen) return;
      event.preventDefault();
      setPinModalOpen(false);
      setRestoreBackup(null);
      setRestorePin("");
      setRestoreError("");
      setAiInfoOpen(false);
    };

    window.addEventListener("saramdam:overlay-back", onOverlayBack);
    return () => window.removeEventListener("saramdam:overlay-back", onOverlayBack);
  }, [aiInfoOpen, pinModalOpen, restoreBackup]);

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
      showToast("암호화된 백업 파일을 만들었어요.");
    } catch {
      showToast("백업 파일을 만드는 데 실패했어요.");
    }
  };

  const handlePlainExport = () => {
    onRequestConfirm({
      title: "읽을 수 있는 데이터 파일을 내보낼까요?",
      message: "이 파일에는 사람과 관련된 개인정보가 포함될 수 있으며 암호화되지 않습니다.",
      confirmLabel: "내보내기",
      danger: true,
      onConfirm: () => {
        downloadJson(`saramdam-data-export-${todayString()}.json`, {
          format: "saramdam-readable-export",
          exportDate: new Date().toISOString(),
          people,
          customGroups
        });
        showToast("읽을 수 있는 데이터 파일을 내보냈어요.");
      }
    });
  };

  const handleRestoreFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseBackupFile(String(reader.result || ""));
        onRequestConfirm({
          title: "백업 파일을 복원할까요?",
          message: "현재 기록이 백업 파일의 내용으로 변경될 수 있어요.",
          confirmLabel: "복원",
          danger: true,
          onConfirm: () => {
            if (parsed.format === "plain") {
              onImport(parsed.data.people, parsed.data.customGroups);
              showToast("백업 데이터를 복원했어요.");
              return;
            }

            setRestoreBackup({ salt: parsed.salt, payload: parsed.payload });
            setRestorePin("");
            setRestoreError("");
          }
        });
      } catch {
        showToast("백업 파일을 읽을 수 없어요.");
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
    onClearAll();
  };

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">설정</h1>
        <p className="text-[13px] leading-[1.6] text-[#7c6252]">사람談을 안전하게 쓰기 위한 기본 설정이에요.</p>
      </header>

      <Section title="보안">
        <SettingButton icon={<Lock />} label="앱 잠금" value="지금 잠그기" onClick={onLock} />
        <SettingButton icon={<KeyRound />} label="PIN 변경" value="현재 PIN 확인 후 변경" onClick={() => setPinModalOpen(true)} />
        <SettingControl icon={<ShieldCheck />} label="자동 잠금">
          <select
            value={appSettings.autoLockMinutes}
            onChange={(event) => onSettingsChange({ autoLockMinutes: event.target.value as AppSettings["autoLockMinutes"] })}
            className="rounded-full border border-[#ead8c9] bg-[#fffaf3] px-3 py-1.5 text-xs font-medium text-[#5a392a] outline-none"
          >
            <option value="off">사용 안 함</option>
            <option value="1">1분</option>
            <option value="5">5분</option>
            <option value="15">15분</option>
            <option value="30">30분</option>
          </select>
        </SettingControl>
      </Section>

      <Section title="데이터">
        <SettingButton icon={<CloudUpload />} label="백업" value="암호화 파일 만들기" onClick={handleEncryptedBackup} />
        <SettingButton icon={<CloudDownload />} label="복원" value="백업 파일 선택" onClick={() => fileInputRef.current?.click()} />
        <SettingButton icon={<FileDown />} label="내 데이터 내보내기" value="읽을 수 있는 JSON" onClick={handlePlainExport} />
        <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleRestoreFile} />
      </Section>

      <Section title="AI">
        <SettingControl icon={<Sparkles />} label="AI 기능">
          <button
            type="button"
            onClick={() => onSettingsChange({ aiEnabled: !appSettings.aiEnabled })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${appSettings.aiEnabled ? "bg-[#d85b36] text-white" : "bg-[#f4e8dc] text-[#7c6252]"}`}
          >
            {appSettings.aiEnabled ? "사용 중" : "꺼짐"}
          </button>
        </SettingControl>
        <SettingButton icon={<Info />} label="AI가 사용하는 정보" value="자세히" onClick={() => setAiInfoOpen(true)} />
      </Section>

      <Section title="알림 및 기억">
        <ToggleRow
          icon={<Bell />}
          label="안부 기준"
          checked={appSettings.checkInReminder}
          onChange={() => onSettingsChange({ checkInReminder: !appSettings.checkInReminder })}
        />
        <ToggleRow
          icon={<Bell />}
          label="기념일"
          checked={appSettings.eventReminder}
          onChange={() => onSettingsChange({ eventReminder: !appSettings.eventReminder })}
        />
        <SettingControl icon={<Bell />} label="기본 연락주기">
          <select
            value={appSettings.defaultRemindIntervalDays}
            onChange={(event) => onSettingsChange({ defaultRemindIntervalDays: Number(event.target.value) as AppSettings["defaultRemindIntervalDays"] })}
            className="rounded-full border border-[#ead8c9] bg-[#fffaf3] px-3 py-1.5 text-xs font-medium text-[#5a392a] outline-none"
          >
            <option value={30}>30일</option>
            <option value={60}>60일</option>
            <option value={90}>90일</option>
          </select>
        </SettingControl>
      </Section>

      <Section title="사람談">
        <SettingButton icon={<HelpCircle />} label="도움말" value="준비 중" onClick={() => showToast("도움말은 준비 중이에요.")} />
        <SettingButton icon={<Info />} label="개인정보 안내" value="기기 안 암호화 보관" onClick={() => showToast("기록은 암호화 vault에 보관됩니다.")} />
        <SettingButton icon={<Info />} label="앱 정보" value="사람談 v2" />
      </Section>

      <section className="pt-1">
        <h2 className="mb-2 text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#b53c2f]">데이터 초기화</h2>
        <div className="overflow-hidden rounded-[16px] border border-[#f0c7bd] bg-[#fff7f3] shadow-soft">
          <SettingButton icon={<Trash2 />} label="모든 데이터 삭제" value="되돌릴 수 없음" danger onClick={handleClearAll} />
        </div>
      </section>

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

      {aiInfoOpen && (
        <ModalShell title="AI가 사용하는 정보" onClose={() => setAiInfoOpen(false)}>
          <div className="space-y-4 text-sm leading-relaxed text-[#5e473a]">
            <InfoBlock title="이야기 정리">
              사용자가 직접 입력하거나 붙여넣은 텍스트를 분석합니다. 저장 여부는 사용자가 마지막에 선택합니다.
            </InfoBlock>
            <InfoBlock title="안부 추천">
              선택한 사람의 일부 기록과 프로필 정보만 사용합니다. 전체 vault를 AI로 전송하지 않습니다.
            </InfoBlock>
            <InfoBlock title="AI를 끄면">
              사람 등록, 직접 기록, 검색, 상세보기, 백업/복원은 계속 사용할 수 있고 AI 정리와 AI 안부 문구만 비활성화됩니다.
            </InfoBlock>
          </div>
        </ModalShell>
      )}

      {toast && (
        <div className="fixed left-1/2 top-[calc(1.25rem+env(safe-area-inset-top))] z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full border border-[#ead8c9] bg-[#fffaf3] px-5 py-3 text-center text-sm font-semibold text-[#5a392a] shadow-soft">
          {toast}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{title}</h2>
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
      <span className={`flex-1 text-[13px] font-medium ${danger ? "text-[#b53c2f]" : "text-[#2f1b12]"}`}>{label}</span>
      {value && <span className="max-w-[45%] truncate text-xs text-[#8f7564]">{value}</span>}
      {onClick && <ChevronRight className="h-4 w-4 text-[#8f7564]" />}
    </button>
  );
}

function SettingControl({ icon, label, children }: { icon?: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 w-full items-center gap-2.5 border-b border-[#f0dfd1] px-3.5 py-3 last:border-b-0">
      <IconSlot>{icon}</IconSlot>
      <span className="flex-1 text-[13px] font-medium text-[#2f1b12]">{label}</span>
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
    <span className={`flex h-7 w-7 items-center justify-center ${danger ? "text-[#b53c2f]" : "text-[#5a392a]"} [&>svg]:h-4 [&>svg]:w-4`}>
      {children}
    </span>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[16px] bg-[#fff6ee] p-3">
      <h3 className="text-sm font-semibold text-[#2f1b12]">{title}</h3>
      <p className="mt-1 text-[13px] leading-[1.6] text-[#7c6252]">{children}</p>
    </section>
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
        {error && <p className="rounded-xl bg-[#fff2e7] px-4 py-3 text-sm font-medium text-[#b53c2f]">{error}</p>}
        <button disabled={isSaving} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-50">
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
        {error && <p className="rounded-xl bg-[#fff2e7] px-4 py-3 text-sm font-medium text-[#b53c2f]">{error}</p>}
        <button disabled={pin.length !== 4} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-50">
          복원하기
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:justify-center">
      <section className="w-full max-w-sm rounded-[22px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-[0_14px_40px_rgba(47,27,18,0.16)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">{title}</h2>
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
      <span className="mb-2 block text-sm font-semibold text-[#5a392a]">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        type="password"
        inputMode="numeric"
        maxLength={4}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
        className="h-11 w-full rounded-[16px] border border-[#ead8c9] bg-white px-4 text-base font-semibold tracking-[0.3em] text-[#2f1b12] outline-none focus:border-[#d85b36]"
      />
    </label>
  );
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}
