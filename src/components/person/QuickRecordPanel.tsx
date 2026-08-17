import { AlertCircle, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ContactMedium, Person, RecordAiAnalysis } from "../../types";
import { formatDateKo } from "../../utils/saramdam";
import type { ApprovedMemoryItem, StorySavePayload } from "./StoryCaptureSheet";
import { analyzeStoryTextForReview } from "./StoryCaptureSheet";
import { inferFollowUpText } from "../../utils/followUps";

interface Props {
  person: Person;
  aiEnabled?: boolean;
  onSave: (payload: StorySavePayload) => void;
}

const mediumOptions: ContactMedium[] = ["통화", "카톡", "식사", "대면", "메시지", "기타"];
const maxQuickTextLength = 2000;

export default function QuickRecordPanel({ person, aiEnabled = true, onSave }: Props) {
  const [text, setText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [medium, setMedium] = useState<ContactMedium>("기타");
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState<ApprovedMemoryItem[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<RecordAiAnalysis | undefined>(undefined);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpText, setFollowUpText] = useState("");

  const trimmedText = text.trim();
  const isTooLong = text.length > maxQuickTextLength;

  const analyze = async () => {
    if (!trimmedText || isAnalyzing) return;
    if (!aiEnabled) {
      setMessage("지금은 AI 기능을 사용하지 않아요. 그대로 기록하기는 계속 사용할 수 있어요.");
      return;
    }
    if (isTooLong) {
      setMessage("빠른 기록은 2,000자 이하로 가볍게 남겨주세요.");
      return;
    }

    setIsAnalyzing(true);
    setMessage(null);
    try {
      const result = await analyzeStoryTextForReview({ person, text: trimmedText, date, medium });
      setDate(result.date);
      setMedium(result.medium);
      setSummary(result.summary);
      setItems(result.items);
      setAiAnalysis(result.aiAnalysis);
      if (!followUpText.trim()) setFollowUpText(inferFollowUpText(result.summary || trimmedText));
      setIsReviewing(true);
    } catch (error: any) {
      setMessage(error?.message || "AI 정리에 실패했어요. 작성한 내용은 그대로 남아 있어요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const buildPlainRecord = () => {
    if (!trimmedText) return;
    save({
      history: {
        id: `h_${Date.now()}`,
        date,
        medium,
        summary: trimmedText,
        rawTranscript: trimmedText,
        aiAnalysis: undefined
      },
      approvedItems: [],
      followUp: {
        enabled: followUpEnabled,
        text: followUpText.trim() || inferFollowUpText(trimmedText)
      }
    });
  };

  const saveReviewed = () => {
    const nextSummary = summary.trim();
    if (!nextSummary) return;
    save({
      history: {
        id: `h_${Date.now()}`,
        date,
        medium,
        summary: nextSummary,
        rawTranscript: trimmedText || undefined,
        aiAnalysis
      },
      approvedItems: items.filter((item) => item.selected && item.text.trim()).map((item) => ({ ...item, text: item.text.trim() })),
      followUp: {
        enabled: followUpEnabled,
        text: followUpText.trim() || inferFollowUpText(nextSummary)
      }
    });
  };

  const save = (payload: StorySavePayload) => {
    onSave(payload);
    setSaved(true);
    setMessage("기록을 담아두었어요.");
    window.setTimeout(() => {
      setText("");
      setSummary("");
      setItems([]);
      setAiAnalysis(undefined);
      setFollowUpEnabled(false);
      setFollowUpText("");
      setIsReviewing(false);
      setSaved(false);
    }, 900);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">빠른 기록</h2>
            <p className="mt-1 text-[13px] leading-[1.6] text-[#7c6252]">{person.name}님과 나눈 이야기를 짧게 적어두면 바로 정리할 수 있어요.</p>
          </div>
          {saved && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf0dc] text-[#5a6d35]">
              <Check className="h-4 w-4" />
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-xs font-medium text-[#5a392a]">날짜</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="saram-input w-full min-w-0 py-2.5 text-sm" />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[#5a392a]">방식</span>
            <select value={medium} onChange={(event) => setMedium(event.target.value as ContactMedium)} className="saram-input w-full min-w-0 py-2.5 text-sm">
              {mediumOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setMessage(null);
            if (isReviewing) setIsReviewing(false);
          }}
          maxLength={maxQuickTextLength + 1}
          placeholder={`오늘 ${person.name}님과 점심 먹음.\n다음 달 제주도 여행 간다고 함.\n요즘 골프 배우는 중.`}
          className="saram-input mt-3 min-h-32 resize-none text-[15px] leading-[1.65]"
        />
        <p className={`mt-1 text-right text-xs font-medium ${isTooLong ? "text-[#c95735]" : "text-[#8f7564]"}`}>{text.length.toLocaleString()} / {maxQuickTextLength.toLocaleString()}</p>

        {!isReviewing && (
          <FollowUpEditor
            enabled={followUpEnabled}
            text={followUpText}
            fallbackText={inferFollowUpText(trimmedText)}
            onEnabledChange={setFollowUpEnabled}
            onTextChange={setFollowUpText}
          />
        )}

        {message && (
          <p className={`mt-3 flex gap-2 rounded-2xl p-3 text-[13px] font-medium leading-[1.5] ${saved ? "bg-[#f3f6e8] text-[#5a6d35]" : "bg-[#fff1e8] text-[#c95735]"}`}>
            {!saved && <AlertCircle className="h-4 w-4 shrink-0" />}
            {message}
          </p>
        )}

        {isAnalyzing && (
          <div className="mt-3 rounded-[16px] border border-[#ead8c9] bg-[#fff6ee] p-4 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#d85b36]" />
            <p className="mt-2 text-sm font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">이야기 속 기억을 정리하고 있어요</p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2">
          <button onClick={analyze} disabled={!trimmedText || isAnalyzing || isTooLong} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-40">
            <Sparkles className="mr-1 inline h-4 w-4" /> AI로 정리하기
          </button>
          <button onClick={buildPlainRecord} disabled={!trimmedText || isAnalyzing || isTooLong} className="w-full rounded-full border border-[#ead8c9] bg-white py-3 text-sm font-medium text-[#5a392a] disabled:opacity-40">
            그대로 기록하기
          </button>
        </div>

        <p className="mt-3 flex gap-2 rounded-2xl bg-[#fff8ef] p-3 text-xs leading-relaxed text-[#7c6252]">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>AI로 정리한 내용도 저장 전에 직접 확인하고 고를 수 있어요.</span>
        </p>
      </div>

      {isReviewing && (
        <div className="space-y-4 rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
          <div>
            <h3 className="text-[16px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">정리된 내용을 확인해주세요</h3>
            <p className="mt-1 text-xs leading-[1.5] text-[#7c6252]">{formatDateKo(date)} · {medium}</p>
          </div>

          <label>
            <span className="mb-2 block text-sm font-semibold text-[#2f1b12]">오늘 이야기 요약</span>
            <textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="saram-input min-h-28 resize-none text-[15px] leading-[1.65]" />
          </label>

          <FollowUpEditor
            enabled={followUpEnabled}
            text={followUpText}
            fallbackText={inferFollowUpText(summary)}
            onEnabledChange={setFollowUpEnabled}
            onTextChange={setFollowUpText}
          />

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-[#ead8c9] bg-white/70 p-4">
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#2f1b12]">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(event) => setItems((current) => current.map((memory, memoryIndex) => memoryIndex === index ? { ...memory, selected: event.target.checked } : memory))}
                      className="h-5 w-5 accent-[#d85b36]"
                    />
                    {item.label}
                  </label>
                  <textarea
                    value={item.text}
                    onChange={(event) => setItems((current) => current.map((memory, memoryIndex) => memoryIndex === index ? { ...memory, text: event.target.value } : memory))}
                    className="saram-input min-h-20 resize-none text-[15px] leading-[1.65]"
                  />
                </article>
              ))}
            </div>
          )}

          <button onClick={saveReviewed} disabled={!summary.trim()} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-40">
            선택한 이야기 사람談에 담기
          </button>
        </div>
      )}
    </section>
  );
}

function FollowUpEditor({
  enabled,
  text,
  fallbackText,
  onEnabledChange,
  onTextChange
}: {
  enabled: boolean;
  text: string;
  fallbackText: string;
  onEnabledChange: (value: boolean) => void;
  onTextChange: (value: string) => void;
}) {
  return (
    <section className="mt-3 rounded-2xl border border-[#ead8c9] bg-white/70 p-3.5">
      <label className="flex items-center gap-2 text-sm font-semibold text-[#2f1b12]">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => {
            onEnabledChange(event.target.checked);
            if (event.target.checked && !text.trim()) onTextChange(fallbackText);
          }}
          className="h-5 w-5 accent-[#d85b36]"
        />
        다음에 챙기기
      </label>
      {enabled && (
        <input
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="예) 제주도 여행 잘 다녀왔는지"
          className="saram-input mt-3 py-3 text-sm"
        />
      )}
    </section>
  );
}
