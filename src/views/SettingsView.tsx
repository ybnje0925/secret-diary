import {
  Bell,
  BellRing,
  ChevronRight,
  CloudDownload,
  CloudUpload,
  Cpu,
  Database,
  FileDown,
  FlaskConical,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  Send,
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
import useBodyScrollLock from "../hooks/useBodyScrollLock";
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
  onReplaceData: (people: Person[], groups: CustomGroup[]) => void;
  onClearAll: () => void;
  onRequestConfirm: (options: ConfirmDialogOptions & { onConfirm: () => void }) => void;
  onLock: () => void;
  onVaultRekey: (key: CryptoKey, data: VaultData) => void;
  onOpenPerson: (personId: string) => void;
}

type TestNotificationScenario =
  | "due"
  | "overdue"
  | "longTime"
  | "eventTomorrow"
  | "eventToday"
  | "followUp"
  | "general";

type NotificationPermissionState = NotificationPermission | "unsupported";

type AiDiagnostics = {
  httpStatus?: number;
  googleErrorCode?: string | number;
  googleErrorStatus?: string;
  message?: string;
};

type AiHealthResult = {
  success: boolean;
  configured?: boolean;
  provider?: string;
  model?: string;
  reason?: string;
  diagnostics?: AiDiagnostics;
  endpoints?: {
    summarize?: string;
    personBriefing?: string;
    checkInSuggestions?: string;
    checkInStarters?: string;
  };
  meta?: {
    provider?: string;
    model?: string;
    fallback?: boolean;
    reason?: string;
    diagnostics?: AiDiagnostics;
  };
};

export default function SettingsView({
  people,
  customGroups,
  vaultKey,
  appSettings,
  onSettingsChange,
  onImport,
  onReplaceData,
  onClearAll,
  onRequestConfirm,
  onLock,
  onVaultRekey,
  onOpenPerson
}: Props) {
  const testToolsEnabled =
    import.meta.env.VITE_ENABLE_TEST_TOOLS === "true";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [restoreBackup, setRestoreBackup] = useState<{ salt: string; payload: string } | null>(null);
  const [restorePin, setRestorePin] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [aiInfoOpen, setAiInfoOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>("default");
  const [notificationScenario, setNotificationScenario] = useState<TestNotificationScenario>("overdue");
  const [notificationStatus, setNotificationStatus] = useState("");
  const [aiHealth, setAiHealth] = useState<AiHealthResult | null>(null);
  const [aiHealthError, setAiHealthError] = useState("");
  const [aiHealthCheckedAt, setAiHealthCheckedAt] = useState("");
  const [aiHealthLoading, setAiHealthLoading] = useState(false);

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

  useEffect(() => {
    if (!testToolsEnabled) return;
    setNotificationPermission(getNotificationPermissionState());
  }, [testToolsEnabled]);

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

  const handleCreateTestData = () => {
    if (!testToolsEnabled) return;
    onRequestConfirm({
      title: "테스트 데이터를 생성할까요?",
      message: "현재 이 테스트 환경에 저장된 사람과 이야기 데이터가 테스트용 데이터로 교체됩니다.",
      confirmLabel: "테스트 데이터 생성",
      danger: true,
      onConfirm: async () => {
        const { createTestSeedData } = await import("../dev/testSeed");
        const testData = createTestSeedData();
        onReplaceData(testData.people, testData.customGroups);
        showToast("테스트 데이터로 교체했어요.");
      }
    });
  };

  const handleClearTestData = () => {
    if (!testToolsEnabled) return;
    onRequestConfirm({
      title: "테스트 데이터를 모두 비울까요?",
      message: "테스트 환경에 저장된 사람과 이야기 데이터가 모두 삭제됩니다. PIN은 유지됩니다.",
      confirmLabel: "테스트 데이터 초기화",
      danger: true,
      onConfirm: () => {
        onReplaceData([], []);
        showToast("테스트 데이터를 비웠어요.");
      }
    });
  };

  const handleCheckAiHealth = async () => {
    if (!testToolsEnabled || aiHealthLoading) return;
    setAiHealthLoading(true);
    setAiHealthError("");
    setAiHealth(null);
    try {
      const response = await fetch("/api/ai-health", { method: "GET" });
      const contentType = response.headers.get("content-type") || "unknown";
      const text = await response.text();
      let data: AiHealthResult;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`AI 상태 API가 JSON이 아닌 응답을 반환했습니다. (status ${response.status}, ${contentType})`);
      }
      if (!response.ok || !data.success) {
        throw new Error("AI 상태 확인에 실패했어요.");
      }
      setAiHealth(data);
      setAiHealthCheckedAt(formatDateTime(new Date()));
    } catch (error: any) {
      setAiHealthError(error?.message || "AI 상태 확인에 실패했어요.");
    } finally {
      setAiHealthLoading(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (!testToolsEnabled) return;
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setNotificationStatus("현재 브라우저에서는 시스템 알림 테스트를 지원하지 않아요.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setNotificationStatus(permission === "granted" ? "알림 권한이 허용됐어요." : "알림 권한이 허용되지 않았어요.");
  };

  const handleSendTestNotification = () => {
    if (!testToolsEnabled) return;
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setNotificationStatus("현재 브라우저에서는 시스템 알림 테스트를 지원하지 않아요.");
      return;
    }
    if (Notification.permission !== "granted") {
      setNotificationPermission(Notification.permission);
      setNotificationStatus("먼저 알림 권한을 허용해주세요.");
      return;
    }

    const payload = createTestNotificationPayload(notificationScenario, people);
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: `saramdam-test-${notificationScenario}`,
      data: { personId: payload.person?.id || "" }
    });
    notification.onclick = () => {
      window.focus();
      if (payload.person) onOpenPerson(payload.person.id);
      notification.close();
    };
    setNotificationStatus(payload.person ? `${payload.person.name}님 기준으로 테스트 알림을 보냈어요.` : "조건에 맞는 테스트 데이터가 없어 일반 알림을 보냈어요.");
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
          <div className="text-right">
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
            <p className="mt-1 text-[11px] leading-[1.4] text-[#8f7564]">짧은 앱 전환은 10분까지 유지돼요.</p>
          </div>
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

      {testToolsEnabled && (
        <Section title="개발자 테스트">
          <div className="border-b border-[#f0dfd1] px-3.5 py-3">
            <p className="text-[12px] leading-[1.5] text-[#8f7564]">Preview 테스트 환경에서만 표시됩니다.</p>
          </div>
          <SettingButton icon={<Database />} label="테스트 데이터 생성" value="20명 · 400개 기록" onClick={handleCreateTestData} />
          <SettingButton icon={<Trash2 />} label="테스트 데이터 초기화" value="PIN 유지" danger onClick={handleClearTestData} />
          <SettingButton icon={<Cpu />} label="AI 상태 확인" value={aiHealthLoading ? "확인 중" : "Gemini 연결 진단"} onClick={handleCheckAiHealth} />
          {(aiHealth || aiHealthError) && (
            <div className="border-b border-[#f0dfd1] px-3.5 py-3">
              <h3 className="text-[13px] font-semibold text-[#2f1b12]">AI 연결 상태</h3>
              {aiHealthError ? (
                <p className="mt-2 text-[12px] leading-[1.5] text-[#b53c2f]">{aiHealthError}</p>
              ) : aiHealth ? (
                <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-[12px] leading-[1.5]">
                  <dt className="font-medium text-[#8f7564]">Provider</dt>
                  <dd className="font-semibold text-[#2f1b12]">{providerLabel(aiHealth.provider || aiHealth.meta?.provider)}</dd>
                  <dt className="font-medium text-[#8f7564]">Model</dt>
                  <dd className="text-[#5a392a]">{aiHealth.model || aiHealth.meta?.model || "-"}</dd>
                  <dt className="font-medium text-[#8f7564]">API Key</dt>
                  <dd className="text-[#5a392a]">{aiHealth.configured ? "정상" : "없음"}</dd>
                  <dt className="font-medium text-[#8f7564]">이야기 정리</dt>
                  <dd className="text-[#5a392a]">{endpointLabel(aiHealth.endpoints?.summarize)}</dd>
                  <dt className="font-medium text-[#8f7564]">최근 브리핑</dt>
                  <dd className="text-[#5a392a]">{endpointLabel(aiHealth.endpoints?.personBriefing)}</dd>
                  <dt className="font-medium text-[#8f7564]">중지된 추천 API</dt>
                  <dd className="text-[#5a392a]">{endpointLabel(aiHealth.endpoints?.checkInSuggestions)}</dd>
                  <dt className="font-medium text-[#8f7564]">중지된 문구 API</dt>
                  <dd className="text-[#5a392a]">{endpointLabel(aiHealth.endpoints?.checkInStarters)}</dd>
                  {(aiHealth.reason || aiHealth.meta?.reason) && (
                    <>
                      <dt className="font-medium text-[#8f7564]">사유</dt>
                      <dd className="text-[#b53c2f]">{reasonLabel(aiHealth.reason || aiHealth.meta?.reason || "")}</dd>
                    </>
                  )}
                  <AiDiagnosticsRows diagnostics={aiHealth.diagnostics || aiHealth.meta?.diagnostics} />
                  {aiHealthCheckedAt && (
                    <>
                      <dt className="font-medium text-[#8f7564]">마지막 확인</dt>
                      <dd className="text-[#5a392a]">{aiHealthCheckedAt}</dd>
                    </>
                  )}
                </dl>
              ) : null}
            </div>
          )}
          <SettingControl icon={<BellRing />} label="알림 상태">
            <span className="text-xs font-medium text-[#7c6252]">{notificationPermissionLabel(notificationPermission)}</span>
          </SettingControl>
          <SettingButton icon={<Bell />} label="알림 권한 요청" value="직접 실행" onClick={handleRequestNotificationPermission} />
          <SettingControl icon={<FlaskConical />} label="알림 유형">
            <select
              value={notificationScenario}
              onChange={(event) => setNotificationScenario(event.target.value as TestNotificationScenario)}
              className="max-w-[12rem] rounded-full border border-[#ead8c9] bg-[#fffaf3] px-3 py-1.5 text-xs font-medium text-[#5a392a] outline-none"
            >
              <option value="due">안부 주기 도래</option>
              <option value="overdue">안부 주기 초과</option>
              <option value="longTime">오래 연락 못한 사람</option>
              <option value="eventTomorrow">기념일 D-1</option>
              <option value="eventToday">기념일 당일</option>
              <option value="followUp">지난 이야기 후속 확인</option>
              <option value="general">일반 사람談 알림</option>
            </select>
          </SettingControl>
          <SettingButton icon={<Send />} label="테스트 알림 보내기" value="브라우저 Notification" onClick={handleSendTestNotification} />
          {notificationStatus && (
            <div className="px-3.5 py-3 text-[12px] leading-[1.5] text-[#7c6252]">
              {notificationStatus}
            </div>
          )}
        </Section>
      )}

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
              사용자가 직접 입력하거나 붙여넣은 텍스트에서 핵심 정보, 가족, 관심사, 일정 같은 기억할 내용을 정리합니다. 저장 여부는 사용자가 마지막에 선택합니다.
            </InfoBlock>
            <InfoBlock title="최근 기록 브리핑">
              사용자가 버튼을 누를 때만 최근 기록 일부를 보내 2~4줄 브리핑을 만들고, 같은 기록이면 저장된 결과를 다시 보여줍니다.
            </InfoBlock>
            <InfoBlock title="AI를 끄면">
              사람 등록, 직접 기록, 검색, 상세보기, 백업/복원은 계속 사용할 수 있고 AI 기록 정리와 최근 브리핑만 비활성화됩니다.
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
  useBodyScrollLock();

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-hidden bg-black/30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
      <section className="max-h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-[22px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-[0_14px_40px_rgba(47,27,18,0.16)]">
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

function getNotificationPermissionState(): NotificationPermissionState {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function notificationPermissionLabel(permission: NotificationPermissionState) {
  if (permission === "granted") return "알림 허용됨";
  if (permission === "denied") return "알림 차단됨";
  if (permission === "unsupported") return "지원 안 함";
  return "아직 선택하지 않음";
}

function providerLabel(provider?: string) {
  if (provider === "gemini") return "Gemini";
  if (provider === "local" || provider === "local-fallback") return "Local fallback";
  return "-";
}

function endpointLabel(status?: string) {
  if (status === "ok") return "정상";
  if (status === "fallback") return "fallback";
  if (status === "disabled") return "사용 안 함";
  return "-";
}

function AiDiagnosticsRows({ diagnostics }: { diagnostics?: AiDiagnostics }) {
  if (!diagnostics) return null;
  return (
    <>
      <dt className="font-medium text-[#8f7564]">Gemini HTTP</dt>
      <dd className="text-[#5a392a]">{diagnostics.httpStatus || "-"}</dd>
      <dt className="font-medium text-[#8f7564]">Google code</dt>
      <dd className="text-[#5a392a]">{diagnostics.googleErrorCode || "-"}</dd>
      <dt className="font-medium text-[#8f7564]">Error status</dt>
      <dd className="text-[#5a392a]">{diagnostics.googleErrorStatus || "-"}</dd>
      <dt className="font-medium text-[#8f7564]">Error message</dt>
      <dd className="break-words text-[#5a392a]">{diagnostics.message || "-"}</dd>
    </>
  );
}

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    GEMINI_API_KEY_MISSING: "GEMINI_API_KEY가 Preview 환경에 없습니다.",
    GEMINI_API_KEY_PLACEHOLDER: "GEMINI_API_KEY가 placeholder 값입니다.",
    GEMINI_REQUEST_FAILED: "Gemini 요청에 실패했습니다.",
    GEMINI_EMPTY_RESPONSE: "Gemini가 빈 응답을 반환했습니다.",
    INVALID_RESPONSE: "Gemini 응답 형식이 올바르지 않습니다.",
    RATE_LIMIT: "Gemini quota 또는 rate limit에 걸렸습니다.",
    QUOTA_EXCEEDED: "Gemini quota가 초과되었습니다.",
    MODEL_ERROR: "Gemini 모델명 또는 모델 접근에 문제가 있습니다.",
    MODEL_NOT_FOUND: "Gemini 모델을 찾을 수 없거나 접근할 수 없습니다.",
    INVALID_API_KEY: "Gemini API Key가 잘못되었거나 권한이 없습니다.",
    PERMISSION_DENIED: "Gemini API Key 권한이 거부되었습니다.",
    NO_CANDIDATES: "추천에 사용할 저장 기록이 부족합니다."
  };
  return labels[reason] || reason;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createTestNotificationPayload(scenario: TestNotificationScenario, people: Person[]) {
  const today = new Date();
  const peopleWithDays = people
    .filter((person) => person.lastContactDate)
    .map((person) => ({ person, daysSinceContact: daysSince(person.lastContactDate, today) }));

  if (scenario === "due") {
    const match = peopleWithDays.find(({ person, daysSinceContact }) => person.remindIntervalDays === daysSinceContact);
    return contactPayload(match?.person, match?.daysSinceContact);
  }

  if (scenario === "overdue") {
    const match = peopleWithDays
      .filter(({ person, daysSinceContact }) => daysSinceContact >= (person.remindIntervalDays || 0))
      .sort((a, b) => (a.daysSinceContact - (a.person.remindIntervalDays || 0)) - (b.daysSinceContact - (b.person.remindIntervalDays || 0)))[0];
    return contactPayload(match?.person, match?.daysSinceContact);
  }

  if (scenario === "longTime") {
    const match = peopleWithDays.sort((a, b) => b.daysSinceContact - a.daysSinceContact)[0];
    return contactPayload(match?.person, match?.daysSinceContact, "longTime");
  }

  if (scenario === "eventTomorrow" || scenario === "eventToday") {
    const dayOffset = scenario === "eventTomorrow" ? 1 : 0;
    const match = findEventByOffset(people, today, dayOffset);
    if (match && scenario === "eventTomorrow") {
      return {
        person: match.person,
        title: `내일은 ${match.person.name}님의 ${eventDisplayName(match.event.note, match.event.amountOrGift)}이에요 🎂`,
        body: "잊기 전에 마음을 준비해볼까요?"
      };
    }
    if (match) {
      return {
        person: match.person,
        title: `오늘 ${match.person.name}님에게 마음을 전해볼까요?`,
        body: "사람談에 기억해둔 특별한 날이에요."
      };
    }
  }

  if (scenario === "followUp") {
    const match = findFollowUpStory(people);
    if (match) {
      return {
        person: match.person,
        title: "지난 이야기를 이어볼까요? 💬",
        body: `${match.person.name}님이 지난번에 ${match.topic} 이야기를 했어요.`
      };
    }
  }

  const fallbackPerson = people[0];
  return {
    person: fallbackPerson,
    title: fallbackPerson ? `${fallbackPerson.name}님에게 안부를 건네볼까요?` : "사람談 테스트 알림",
    body: fallbackPerson ? "가볍게 떠오른 사람에게 마음을 남겨보세요." : "테스트 데이터 생성 후 다시 시도해보세요."
  };
}

function contactPayload(person?: Person, daysSinceContact?: number, variant?: "longTime") {
  if (!person || typeof daysSinceContact !== "number") {
    return {
      person,
      title: "사람談 테스트 알림",
      body: "조건에 맞는 테스트 인물을 찾지 못했어요."
    };
  }

  return {
    person,
    title: variant === "longTime" ? `${person.name}님과 오래 연락하지 못했어요 🌿` : `${person.name}님에게 안부를 건넬 때가 되었어요 🌿`,
    body: `마지막으로 이야기한 지 ${daysSinceContact}일이 지났어요.`
  };
}

function findEventByOffset(people: Person[], referenceDate: Date, daysOffset: number) {
  const target = new Date(referenceDate);
  target.setDate(target.getDate() + daysOffset);
  const targetMonth = target.getMonth();
  const targetDate = target.getDate();

  for (const person of people) {
    const event = person.eventsHistory.find((item) => {
      const eventDate = new Date(item.date);
      return eventDate.getMonth() === targetMonth && eventDate.getDate() === targetDate;
    });
    if (event) return { person, event };
  }

  return null;
}

function findFollowUpStory(people: Person[]) {
  const keywords = [
    "복식대회",
    "하프마라톤",
    "캠핑장 예약",
    "어린이집 입학",
    "입학식",
    "검진",
    "제주도 여행",
    "출장 결과",
    "공연 후기",
    "면접 결과",
    "가족여행"
  ];

  for (const keyword of keywords) {
    for (const person of people) {
      const story = person.history.find((item) => item.summary.includes(keyword));
      if (story) return { person, topic: keyword };
    }
  }

  return null;
}

function eventDisplayName(note: string, amountOrGift: string) {
  if (note.includes("생일") || amountOrGift.includes("생일")) return "생일";
  if (note.includes("입학")) return "입학식";
  if (note.includes("공연")) return "공연";
  return amountOrGift || "기념일";
}

function daysSince(dateText: string, referenceDate: Date) {
  const date = new Date(dateText);
  return Math.floor((referenceDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}
