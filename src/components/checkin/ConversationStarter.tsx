import { CheckCircle2, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ContactMedium, InteractionHistory, Person } from "../../types";
import { getRelationLine } from "../../utils/saramdam";
import { ConversationTopic } from "./ConversationTopicCard";

export interface StarterSet {
  natural: string;
  friendly: string;
  polite: string;
}

interface Props {
  person: Person;
  topic: ConversationTopic;
  starters: StarterSet | null;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onRegenerate: (tone: "casual" | "polite" | "short") => void;
  onContactComplete: (history: InteractionHistory) => void;
}

const mediumOptions: Array<{ label: string; value: ContactMedium }> = [
  { label: "카카오톡", value: "카톡" },
  { label: "전화", value: "통화" },
  { label: "문자", value: "메시지" },
  { label: "직접 만남", value: "대면" },
  { label: "기타", value: "기타" }
];

export default function ConversationStarter({
  person,
  topic,
  starters,
  isLoading,
  error,
  onBack,
  onRegenerate,
  onContactComplete
}: Props) {
  const [toast, setToast] = useState("");
  const [showComplete, setShowComplete] = useState(false);
  const [medium, setMedium] = useState<ContactMedium>("카톡");
  const showError = Boolean(error && !starters && !isLoading);
  const showFallbackNotice = Boolean(error && starters && !isLoading);

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setToast("문구를 복사했어요 🌿");
    setShowComplete(true);
    window.setTimeout(() => setToast(""), 1800);
  };

  const saveContact = () => {
    onContactComplete({
      id: `h_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      medium,
      summary: `${topic.topic} 주제로 안부를 전함.\n근거: ${topic.source}\n사용자가 직접 연락 완료로 기록함.`
    });
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm font-medium text-[#8d5b45]">← 주제 다시 선택</button>
      <section>
        <p className="text-sm font-semibold text-[#d85b36]">{person.name}에게 · {getRelationLine(person)}</p>
        <h1 className="mt-1 text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">어떻게 말을 꺼내볼까요?</h1>
      </section>

      <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
        <p className="text-sm text-[#7c6252]">선택한 주제</p>
        <h2 className="mt-1 text-[17px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{topic.icon} {topic.topic}</h2>
        <p className="mt-2 text-sm leading-[1.6] text-[#5e473a]">{topic.reason}</p>
        <p className="mt-3 rounded-xl bg-[#fff6ee] px-3 py-2 text-xs text-[#8f7564]">기록 근거: {topic.source}</p>
      </section>

      {isLoading && (
        <div className="rounded-[16px] border border-[#ead8c9] bg-[#fff6ee] p-4 text-center">
          <RotateCcw className="mx-auto h-8 w-8 animate-spin text-[#d85b36]" />
          <p className="mt-3 font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">자연스러운 첫 문장을 고르고 있어요 🌿</p>
        </div>
      )}

      {showError && (
        <div className="rounded-2xl border border-[#ead8c9] bg-[#fff1e8] p-4">
          <p className="font-medium text-[#c95735]">문구를 불러오는 데 잠시 문제가 생겼어요.</p>
          <button onClick={() => onRegenerate("casual")} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#c95735]">다시 시도</button>
        </div>
      )}

      {showFallbackNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#ead8c9] bg-[#fff6ee] px-3 py-2.5">
          <p className="text-xs font-medium leading-[1.5] text-[#8d5b45]">{error}</p>
          <button onClick={() => onRegenerate("casual")} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#c95735]">다시 시도</button>
        </div>
      )}

      {starters && (
        <div className="space-y-3">
          <StarterCard label="자연스럽게" text={starters.natural} onCopy={copyText} />
          <StarterCard label="친근하게" text={starters.friendly} onCopy={copyText} />
          <StarterCard label="담백하게" text={starters.polite} onCopy={copyText} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => onRegenerate("casual")} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#5a392a]">더 편하게</button>
        <button onClick={() => onRegenerate("polite")} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#5a392a]">더 정중하게</button>
        <button onClick={() => onRegenerate("short")} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#5a392a]">더 짧게</button>
      </div>

      {toast && <p className="rounded-full bg-[#eaf0dc] px-4 py-3 text-center text-sm font-semibold text-[#4f6f3e]">{toast}</p>}

      {showComplete && (
        <section className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
          <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">안부를 전했나요?</h2>
          <p className="mt-1 text-sm text-[#7c6252]">복사만으로는 연락 기록이 업데이트되지 않아요.</p>
          <select value={medium} onChange={(event) => setMedium(event.target.value as ContactMedium)} className="saram-input mt-3 py-3 text-sm">
            {mediumOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={saveContact} className="rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white">
              <CheckCircle2 className="mr-1 inline h-4 w-4" /> 네, 연락했어요
            </button>
            <button onClick={() => setShowComplete(false)} className="rounded-full border border-[#ead8c9] bg-white py-3 text-sm font-medium text-[#5a392a]">아직이에요</button>
          </div>
        </section>
      )}
    </div>
  );
}

function StarterCard({ label, text, onCopy }: { label: string; text: string; onCopy: (text: string) => void }) {
  return (
    <article className="rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#a24c31]">{label}</p>
        <button onClick={() => onCopy(text)} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-medium text-[#5a392a]">
          <Copy className="mr-1 inline h-3.5 w-3.5" /> 복사
        </button>
      </div>
      <p className="whitespace-pre-line text-[15px] leading-[1.65] text-[#2f1b12]">“{text}”</p>
    </article>
  );
}
