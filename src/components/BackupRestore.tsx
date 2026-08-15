import React, { useRef, useState } from "react";
import { Person, CustomGroup } from "../types";
import { Download, Upload, Trash2, KeyRound } from "lucide-react";
import { encryptBackupPayload, decryptBackupPayload, parseBackupFile } from "../vault";
import ConfirmDialog from "./common/ConfirmDialog";

interface BackupRestoreProps {
  people: Person[];
  customGroups: CustomGroup[];
  vaultKey: CryptoKey;
  onImport: (people: Person[], customGroups: CustomGroup[]) => void;
  onClearAll: () => void;
}

export default function BackupRestore({
  people,
  customGroups,
  vaultKey,
  onImport,
  onClearAll
}: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set only while an imported backup turns out to be encrypted with a PIN
  // that may differ from this device's current one (e.g. an older backup, or
  // one made on another device) — we need that specific PIN to decrypt it.
  const [pendingBackup, setPendingBackup] = useState<{ salt: string; payload: string } | null>(null);
  const [backupPin, setBackupPin] = useState("");
  const [backupError, setBackupError] = useState<string | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Export current data as an encrypted backup file — never plaintext, so a
  // leaked/misplaced backup file alone doesn't expose anyone's information.
  const handleExport = async () => {
    const { salt, payload } = await encryptBackupPayload(vaultKey, { people, customGroups });
    const dataStr = JSON.stringify({
      version: "2.0",
      encrypted: true,
      exportDate: new Date().toISOString(),
      salt,
      payload
    }, null, 2);

    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `사람談_백업_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data from a local backup file — supports both the current
  // encrypted format and the legacy plaintext format from older versions.
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseBackupFile(event.target?.result as string);
        if (parsed.format === "plain") {
          onImport(parsed.data.people, parsed.data.customGroups);
          setStatusMessage("백업 데이터를 가져왔어요.");
        } else {
          setBackupError(null);
          setBackupPin("");
          setPendingBackup({ salt: parsed.salt, payload: parsed.payload });
        }
      } catch (err) {
        setStatusMessage("파일을 읽을 수 없어요. 백업 파일을 확인해 주세요.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDecryptPendingBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingBackup) return;
    setBackupError(null);
    try {
      const data = await decryptBackupPayload(backupPin, pendingBackup.salt, pendingBackup.payload);
      onImport(data.people, data.customGroups);
      setPendingBackup(null);
      setBackupPin("");
      setStatusMessage("백업 데이터를 가져왔어요.");
    } catch (err) {
      setBackupError("이 백업 파일의 비밀번호가 일치하지 않습니다.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const confirmClearAll = () => {
    setClearConfirmOpen(true);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs">
      <div>
        <p className="text-sm font-medium text-slate-900">데이터 백업 및 초기화</p>
        <p className="text-[13px] text-slate-500 mt-1 leading-[1.6]">
          현재 기록된 {people.length}명의 지인 정보와 대화 히스토리를 로컬 파일로 백업해 보관하거나 초기화할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          id="export-backup-btn"
          onClick={handleExport}
          className="py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-200 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-teal-700" /> 백업 파일 다운로드
        </button>

        <button
          id="import-backup-btn"
          onClick={triggerFileInput}
          className="py-2 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-200 transition-all flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-teal-700" /> 백업 가져오기
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </button>

        <button
          id="clear-all-data-btn"
          onClick={confirmClearAll}
          className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium rounded-lg border border-rose-200 transition-all flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> 데이터 전체 삭제
        </button>
      </div>

      {pendingBackup && (
        <form
          onSubmit={handleDecryptPendingBackup}
          className="w-full lg:w-auto flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3"
        >
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 whitespace-nowrap">
            <KeyRound className="w-3.5 h-3.5 text-teal-700" /> 이 백업의 비밀번호:
          </span>
          <input
            id="backup-import-pin-input"
            type="password"
            value={backupPin}
            onChange={(e) => setBackupPin(e.target.value)}
            autoFocus
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600 w-32"
          />
          <button
            type="submit"
            disabled={!backupPin}
            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg text-xs font-medium"
          >
            확인
          </button>
          <button
            type="button"
            onClick={() => { setPendingBackup(null); setBackupPin(""); setBackupError(null); }}
            className="py-1.5 px-3 text-slate-400 hover:text-slate-700 text-xs font-medium"
          >
            취소
          </button>
          {backupError && (
            <span className="text-[11px] text-rose-600 font-medium w-full">{backupError}</span>
          )}
        </form>
      )}
      {statusMessage && <p className="w-full text-[13px] font-medium text-slate-600">{statusMessage}</p>}
      {clearConfirmOpen && (
        <ConfirmDialog
          title="모든 데이터를 삭제할까요?"
          message="사람담에 저장된 사람, 이야기, 관련 정보가 삭제됩니다. 이 작업은 되돌릴 수 없어요."
          confirmLabel="모두 삭제"
          danger
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => {
            setClearConfirmOpen(false);
            onClearAll();
          }}
        />
      )}
    </div>
  );
}
