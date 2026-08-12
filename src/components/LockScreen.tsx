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

  const submit = async (nextPin = pin) => {
    if (isSubmitting || mode === "checking") return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "unlock") {
        const { key, data } = await unlockVault(nextPin);
        onUnlocked(key, data);
      } else {
        if (nextPin.length < 4) throw new Error("PIN은 4자리 이상으로 설정해주세요.");
        if (nextPin !== confirmPin) throw new Error("PIN 확인이 일치하지 않습니다.");
        const initialData = legacyExists ? readLegacyPlaintextData() : { people: [], customGroups: [] };
        const key = await createVault(nextPin, initialData);
        clearLegacyPlaintextData();
        onUnlocked(key, initialData);
      }
    } catch (err: any) {
      setError(err.message || "PIN을 확인하고 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDigit = (digit: string) => {
    if (mode === "setup" && pin.length >= 4 && confirmPin.length < 4) {
      setConfirmPin((value) => value + digit);
      return;
    }
    if (pin.length < 8) setPin((value) => value + digit);
  };

  const erase = () => {
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
  const helper = mode === "unlock" ? "PIN을 눌러 잠금을 해제해주세요." : pin.length < 4 ? "새 PIN을 입력해주세요." : "확인을 위해 한 번 더 입력해주세요.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fff8ef] px-7 py-8 text-[#2f1b12]">
      <section className="flex min-h-[760px] w-full max-w-md flex-col items-center rounded-[34px] border border-[#ead8c9] bg-[#fffaf3] px-9 py-8 shadow-[0_18px_45px_rgba(91,62,43,0.16)]">
        <div className="mb-10 flex w-full items-center justify-between text-sm font-bold">
          <span>9:41</span>
          <span>●●●</span>
        </div>

        <div className="mt-10 flex flex-1 flex-col items-center text-center">
          <div className="relative mb-6 h-16 w-20">
            <span className="absolute left-2 top-2 h-11 w-14 rounded-2xl bg-[#e78f70]" />
            <span className="absolute right-1 top-6 h-11 w-14 rounded-2xl bg-[#f1b69d]" />
            <span className="absolute left-6 top-4 text-2xl">🧡</span>
          </div>

          <h1 className="text-4xl font-black">사람담</h1>
          <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-[#5e473a]">
            소중한 사람들의 이야기를{"\n"}안전하게 담아두세요.
          </p>

          <p className="mt-8 text-sm font-semibold text-[#8d5b45]">{helper}</p>
          <div className="mt-5 flex gap-5">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={`h-4 w-4 rounded-full border border-[#cdb7a7] ${activeDots > index ? "bg-[#d85b36]" : "bg-white"}`} />
            ))}
          </div>

          {error && <p className="mt-4 rounded-full bg-[#fff1e8] px-4 py-2 text-sm font-bold text-[#c95735]">{error}</p>}

          <div className="mt-12 grid w-full grid-cols-3 gap-x-9 gap-y-5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <div key={digit}>
                <KeyButton digit={digit} onClick={() => addDigit(digit)} />
              </div>
            ))}
            <button type="button" className="flex h-16 w-16 items-center justify-center rounded-full border border-[#ead8c9] bg-[#fffaf3] text-[#8f7564]">
              <Fingerprint className="h-8 w-8" />
            </button>
            <KeyButton digit="0" onClick={() => addDigit("0")} />
            <button type="button" onClick={erase} className="flex h-16 w-16 items-center justify-center rounded-full text-[#2f1b12]">
              <Delete className="h-8 w-8" />
            </button>
          </div>

          <button
            onClick={() => submit()}
            disabled={isSubmitting || (mode === "unlock" ? pin.length < 4 : confirmPin.length < 4)}
            className="mt-8 w-full rounded-full bg-[#d85b36] py-4 text-base font-extrabold text-white disabled:opacity-40"
          >
            {mode === "unlock" ? "잠금 해제" : "PIN 설정하고 시작하기"}
          </button>
        </div>

        <p className="flex items-center gap-2 text-xs font-semibold text-[#7c6252]">
          <ShieldCheck className="h-4 w-4" /> 기록은 암호화되어 안전하게 보관됩니다.
        </p>
      </section>
    </main>
  );
}

function KeyButton({ digit, onClick }: { digit: string; onClick: () => void }) {
  const letters: Record<string, string> = { "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL", "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ" };
  return (
    <button type="button" onClick={onClick} className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-[#ead8c9] bg-[#fffaf3] text-3xl font-medium text-[#2f1b12]">
      <span>{digit}</span>
      {letters[digit] && <span className="text-[10px] font-bold tracking-widest">{letters[digit]}</span>}
    </button>
  );
}
