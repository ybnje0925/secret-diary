import { Delete, Fingerprint, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  clearLegacyPlaintextData,
  createVault,
  hasLegacyPlaintextData,
  hasVault,
  readLegacyPlaintextData,
  unlockVault,
  VaultData
} from "../vault";

interface LockScreenProps {
  onUnlocked: (key: CryptoKey, data: VaultData) => void;
}

export default function LockScreen({ onUnlocked }: LockScreenProps) {
  const [mode, setMode] = useState<"checking" | "setup" | "unlock">("checking");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(hasVault() ? "unlock" : "setup");
  }, []);

  const legacyExists = hasLegacyPlaintextData();

  const submit = async (nextPin = pin, nextConfirmPin = confirmPin) => {
    if (isSubmitting || mode === "checking") return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "unlock") {
        const { key, data } = await unlockVault(nextPin);
        onUnlocked(key, data);
      } else {
        if (nextPin.length < 4) throw new Error("PIN은 4자리 이상으로 설정해주세요.");
        if (nextPin !== nextConfirmPin) throw new Error("PIN 확인이 일치하지 않습니다.");
        const initialData = legacyExists ? readLegacyPlaintextData() : { people: [], customGroups: [] };
        const key = await createVault(nextPin, initialData);
        clearLegacyPlaintextData();
        onUnlocked(key, initialData);
      }
    } catch (err: any) {
      setError(err.message || "PIN을 확인하고 다시 시도해주세요.");
      setPin("");
      setConfirmPin("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDigit = (digit: string) => {
    if (isSubmitting) return;
    if (mode === "unlock") {
      const next = (pin + digit).slice(0, 4);
      setPin(next);
      if (next.length === 4) window.setTimeout(() => submit(next), 80);
      return;
    }

    if (pin.length >= 4 && confirmPin.length < 4) {
      const nextConfirm = confirmPin + digit;
      setConfirmPin(nextConfirm);
      if (nextConfirm.length === 4) window.setTimeout(() => submit(pin, nextConfirm), 80);
      return;
    }
    if (pin.length < 4) setPin((value) => value + digit);
  };

  const erase = () => {
    setError(null);
    if (mode === "setup" && confirmPin.length > 0) {
      setConfirmPin((value) => value.slice(0, -1));
      return;
    }
    setPin((value) => value.slice(0, -1));
  };

  if (mode === "checking") {
    return <div className="min-h-screen bg-[#fff8ef]" />;
  }

  const activeDots = mode === "setup" && pin.length >= 4 ? confirmPin.length : pin.length;
  const helper = mode === "unlock"
    ? "PIN 4자리를 입력하면 자동으로 열려요."
    : pin.length < 4
      ? "새 PIN 4자리를 입력해주세요."
      : "확인을 위해 한 번 더 입력해주세요.";

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#fff8ef] px-4 py-2.5 text-[#2f1b12]">
      <section className="flex min-h-[calc(100svh-1.25rem)] w-full max-w-md flex-col items-center rounded-[24px] border border-[#ead8c9] bg-[#fffaf3] px-6 py-4 shadow-[0_12px_32px_rgba(91,62,43,0.12)]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative mb-3 h-[52px] w-16">
            <span className="absolute left-1 top-1 h-10 w-12 rounded-2xl bg-[#e78f70]" />
            <span className="absolute right-0 top-5 h-10 w-12 rounded-2xl bg-[#f1b69d]" />
            <span className="absolute left-5 top-3 text-xl">💗</span>
          </div>

          <BrandTitle size="lg" />
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[#5e473a]">
            소중한 사람들의 이야기를{"\n"}안전하게 담아두세요.
          </p>

          <p className="mt-4 text-xs font-semibold text-[#8d5b45]">{helper}</p>
          <div className="mt-3 flex gap-3.5">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={`h-4 w-4 rounded-full border border-[#cdb7a7] ${activeDots > index ? "bg-[#d85b36]" : "bg-white"}`} />
            ))}
          </div>

          {error && <p className="mt-3 rounded-full bg-[#fff1e8] px-4 py-2 text-sm font-medium text-[#c95735]">{error}</p>}

          <div className="mt-5 grid w-full grid-cols-3 place-items-center gap-x-5 gap-y-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <div key={digit}>
                <KeyButton digit={digit} onClick={() => addDigit(digit)} />
              </div>
            ))}
            <button type="button" className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#ead8c9] bg-[#fffaf3] text-[#8f7564] sm:h-14 sm:w-14">
              <Fingerprint className="h-6 w-6" />
            </button>
            <KeyButton digit="0" onClick={() => addDigit("0")} />
            <button type="button" onClick={erase} className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-[#2f1b12] sm:h-14 sm:w-14">
              <Delete className="h-6 w-6" />
            </button>
          </div>

          {mode === "setup" && (
            <button
              onClick={() => submit()}
              disabled={isSubmitting || confirmPin.length < 4}
              className="mt-4 w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              PIN 설정하고 시작하기
            </button>
          )}
        </div>

        <p className="flex items-center gap-2 text-xs font-semibold text-[#7c6252]">
          <ShieldCheck className="h-4 w-4" /> 기록은 암호화되어 안전하게 보관됩니다.
        </p>
      </section>
    </main>
  );
}

export function BrandTitle({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <h1 className={`${size === "lg" ? "text-[32px] tracking-[-0.03em]" : "text-[22px] tracking-[-0.025em]"} font-bold leading-[1.2]`}>
      <span className="text-[#2f1b12]">사람</span>
      <span className="text-[#d85b36]">談</span>
    </h1>
  );
}

function KeyButton({ digit, onClick }: { digit: string; onClick: () => void }) {
  const letters: Record<string, string> = { "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ" };
  return (
    <button type="button" onClick={onClick} className="flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full border border-[#ead8c9] bg-[#fffaf3] text-[22px] font-medium text-[#2f1b12] sm:h-14 sm:w-14 sm:text-2xl">
      <span>{digit}</span>
      {letters[digit] && <span className="text-[9px] font-medium tracking-normal sm:text-[10px]">{letters[digit]}</span>}
    </button>
  );
}
