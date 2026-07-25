import React, { useEffect, useRef, useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, Upload, KeyRound } from "lucide-react";
import { motion } from "motion/react";
import {
  hasVault,
  hasLegacyPlaintextData,
  readLegacyPlaintextData,
  clearLegacyPlaintextData,
  createVault,
  unlockVault,
  parseBackupFile,
  decryptBackupPayload,
  VaultData
} from "../vault";

interface LockScreenProps {
  onUnlocked: (key: CryptoKey, data: VaultData) => void;
}

export default function LockScreen({ onUnlocked }: LockScreenProps) {
  const [mode, setMode] = useState<"checking" | "setup" | "unlock">("checking");
  const [showRestore, setShowRestore] = useState(false);

  // Setup fields
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Unlock fields
  const [pin, setPin] = useState("");

  // Restore-from-backup fields
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreParsed, setRestoreParsed] = useState<
    { format: "plain"; data: VaultData } | { format: "encrypted"; salt: string; payload: string } | null
  >(null);
  const [backupPin, setBackupPin] = useState("");
  const [restoredData, setRestoredData] = useState<VaultData | null>(null);

  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(hasVault() ? "unlock" : "setup");
  }, []);

  const legacyExists = hasLegacyPlaintextData();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { key, data } = await unlockVault(pin);
      onUnlocked(key, data);
    } catch (err) {
      setError("비밀번호가 일치하지 않습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPin.length < 4) {
      setError("비밀번호는 4자리 이상으로 설정해 주세요.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const initialData: VaultData = restoredData
        ? restoredData
        : legacyExists
        ? readLegacyPlaintextData()
        : { people: [], customGroups: [] };

      const key = await createVault(newPin, initialData);
      clearLegacyPlaintextData();
      onUnlocked(key, initialData);
    } catch (err) {
      setError("비밀번호 설정 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setRestoreFile(file);
    setRestoredData(null);
    setRestoreParsed(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseBackupFile(event.target?.result as string);
        setRestoreParsed(parsed);
        if (parsed.format === "plain") {
          setRestoredData(parsed.data);
        }
      } catch (err) {
        setError("백업 파일을 읽을 수 없습니다. 파일이 올바른지 확인해 주세요.");
      }
    };
    reader.readAsText(file);
  };

  const handleDecryptBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreParsed || restoreParsed.format !== "encrypted") return;
    setError(null);
    setIsSubmitting(true);
    try {
      const data = await decryptBackupPayload(backupPin, restoreParsed.salt, restoreParsed.payload);
      setRestoredData(data);
    } catch (err) {
      setError("백업 파일의 비밀번호가 일치하지 않습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === "checking") {
    return <div className="min-h-screen bg-[#fdfaf6]" />;
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-[32px] shadow-xl border border-[#ece5d8] overflow-hidden"
      >
        <div className="h-2.5 bg-gradient-to-r from-[#ff6b6b] to-[#ff9f43]" />

        <div className="p-7 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-14 h-14 bg-[#fdf2f2] text-[#ff6b6b] rounded-2xl border border-[#fecaca] flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-[#352f28]">용쨔의 비밀노트</h1>
            <p className="text-xs text-[#a39788] leading-relaxed">
              {mode === "unlock"
                ? "비밀번호를 입력해 잠금을 해제해 주세요."
                : "이 기기에서만 사용할 비밀번호를 설정하면\n지인 정보가 이 기기 안에서 암호화되어 보관됩니다."}
            </p>
          </div>

          {mode === "unlock" && (
            <form onSubmit={handleUnlock} className="space-y-3">
              <div className="relative">
                <input
                  id="unlock-pin-input"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="비밀번호(PIN) 입력"
                  className="w-full text-sm bg-[#f3f0ea] border-none rounded-2xl pl-4 pr-10 py-3 text-[#352f28] placeholder-[#a39788] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a39788] hover:text-[#352f28]"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-[#ef4444] font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
              )}

              <button
                id="unlock-submit-btn"
                type="submit"
                disabled={isSubmitting || !pin}
                className="w-full py-3.5 bg-[#352f28] hover:bg-black disabled:opacity-40 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> 잠금 해제
              </button>

              <p className="text-[10px] text-[#a39788] text-center leading-relaxed">
                비밀번호는 서버에 저장되지 않으며, 잊어버리면 기기에 저장된 데이터는 복구할 수 없습니다.
              </p>
            </form>
          )}

          {mode === "setup" && !showRestore && (
            <form onSubmit={handleSetup} className="space-y-3">
              {legacyExists && (
                <p className="text-[11px] bg-[#eff6ff] text-[#1e40af] border border-[#dbeafe] rounded-xl p-2.5 leading-relaxed">
                  기존에 저장돼 있던 지인 데이터를 이 비밀번호로 암호화해서 그대로 옮겨드릴게요.
                </p>
              )}
              {restoredData && (
                <p className="text-[11px] bg-[#f0fdf4] text-emerald-800 border border-[#dcfce7] rounded-xl p-2.5 leading-relaxed">
                  백업 파일에서 {restoredData.people.length}명의 지인 데이터를 불러왔습니다. 이제 이 기기에서 쓸 새 비밀번호를 설정해 주세요.
                </p>
              )}

              <div className="relative">
                <input
                  id="new-pin-input"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="새 비밀번호 (4자리 이상)"
                  className="w-full text-sm bg-[#f3f0ea] border-none rounded-2xl pl-4 pr-10 py-3 text-[#352f28] placeholder-[#a39788] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a39788] hover:text-[#352f28]"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <input
                id="confirm-pin-input"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="비밀번호 확인"
                className="w-full text-sm bg-[#f3f0ea] border-none rounded-2xl px-4 py-3 text-[#352f28] placeholder-[#a39788] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]"
              />

              {error && (
                <p className="text-xs text-[#ef4444] font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
              )}

              <button
                id="setup-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#ff6b6b] hover:bg-[#e05a5a] disabled:opacity-40 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> 비밀번호 설정하고 시작하기
              </button>

              {!restoredData && (
                <button
                  type="button"
                  id="show-restore-btn"
                  onClick={() => setShowRestore(true)}
                  className="w-full py-2.5 text-[#7c7267] hover:text-[#352f28] font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> 다른 기기의 백업 파일에서 복원하기
                </button>
              )}

              <p className="text-[10px] text-[#a39788] text-center leading-relaxed">
                ⚠️ 이 비밀번호를 잊으면 기기에 저장된 데이터를 복구할 방법이 없습니다.
              </p>
            </form>
          )}

          {mode === "setup" && showRestore && (
            <div className="space-y-3">
              {!restoreFile && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-[#ece5d8] rounded-2xl text-[#a39788] text-xs font-bold flex flex-col items-center gap-2 hover:border-[#ff6b6b]/40 hover:text-[#ff6b6b] transition-all"
                >
                  <Upload className="w-5 h-5" />
                  백업 파일(.json) 선택하기
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />

              {restoreFile && !restoredData && (
                <p className="text-[11px] text-[#7c7267] bg-[#f3f0ea] rounded-xl p-2.5 truncate">📄 {restoreFile.name}</p>
              )}

              {restoreParsed?.format === "encrypted" && !restoredData && (
                <form onSubmit={handleDecryptBackup} className="space-y-2">
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a39788]" />
                    <input
                      type={showPin ? "text" : "password"}
                      value={backupPin}
                      onChange={(e) => setBackupPin(e.target.value)}
                      placeholder="이 백업 파일의 비밀번호"
                      className="w-full text-sm bg-[#f3f0ea] border-none rounded-2xl pl-10 pr-4 py-3 text-[#352f28] placeholder-[#a39788] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting || !backupPin}
                    className="w-full py-3 bg-[#352f28] hover:bg-black disabled:opacity-40 text-white font-bold rounded-2xl text-xs transition-all"
                  >
                    백업 파일 잠금 해제
                  </button>
                </form>
              )}

              {restoredData && (
                <button
                  type="button"
                  onClick={() => setShowRestore(false)}
                  className="w-full py-3 bg-[#f0fdf4] text-emerald-800 border border-[#dcfce7] font-bold rounded-2xl text-xs"
                >
                  ✓ 복원 완료 — 새 비밀번호 설정하러 가기
                </button>
              )}

              {error && (
                <p className="text-xs text-[#ef4444] font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowRestore(false);
                  setRestoreFile(null);
                  setRestoreParsed(null);
                  setRestoredData(null);
                  setError(null);
                }}
                className="w-full py-2 text-[#a39788] hover:text-[#352f28] text-xs font-bold"
              >
                취소하고 돌아가기
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
