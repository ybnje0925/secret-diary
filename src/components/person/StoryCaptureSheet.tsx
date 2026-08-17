import { AlertCircle, Check, ChevronRight, Loader2, MessageCircle, Mic, PenLine, Search, ShieldCheck, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import Avatar from "../common/Avatar";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { AiMemoryTag, ChildInfo, ContactMedium, InteractionHistory, Person, RecordAiAnalysis } from "../../types";
import { getRelationLine } from "../../utils/saramdam";
import { FollowUpDraft, inferFollowUpText } from "../../utils/followUps";

export interface ApprovedMemoryItem {
  id: string;
  category: "recent" | "family" | "promise" | "preference";
  label: string;
  text: string;
  selected: boolean;
  child?: ChildInfo;
}

export interface StorySavePayload {
  history: InteractionHistory;
  approvedItems: ApprovedMemoryItem[];
  followUp?: FollowUpDraft;
  sourceFollowUpId?: string;
}

interface Props {
  people: Person[];
  aiEnabled?: boolean;
  initialPersonId?: string | null;
  sourceFollowUpId?: string;
  referenceText?: string;
  onClose: () => void;
  onSave: (personId: string, payload: StorySavePayload) => void;
}

const mediumOptions: ContactMedium[] = ["통화", "카톡", "식사", "대면", "메시지", "기타"];
const maxTextLength = 12000;
const analysisCache = new Map<string, StoryAnalysisResult>();

type StoryAnalysisResult = {
  date: string;
  medium: ContactMedium;
  summary: string;
  items: ApprovedMemoryItem[];
  aiAnalysis: RecordAiAnalysis;
};

export async function analyzeStoryTextForReview({
  person,
  text,
  date,
  medium
}: {
  person: Person;
  text: string;
  date: string;
  medium: ContactMedium;
}) {
  const aiText = redactDirectIdentifiers(text);
  const inputHash = makeAnalysisHash(person.id, aiText);
  const cached = analysisCache.get(inputHash);
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 18000);

  let response: Response;
  try {
    response = await fetch("/api/summarize-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedPersonId: person.id, scriptText: aiText }),
      signal: controller.signal
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("AI 정리가 오래 걸리고 있어요. 작성한 내용은 그대로 남아 있어요.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const data = await readAiJson(response, "AI 서버 응답 형식이 올바르지 않아요. 그대로 기록하기는 계속 사용할 수 있어요.");

  if (!response.ok || !data.success) {
    throw new Error(data?.error || "AI 연결이 잠시 불안정해요. 그대로 기록하기는 계속 사용할 수 있어요.");
  }

  const result = data.data || {};
  const analysis: StoryAnalysisResult = {
    date: result.lastContactDate || date,
    medium: normalizeMedium(result.lastContactMedium) || medium,
    summary: result.summary || text,
    items: makeReviewItems(result, person),
    aiAnalysis: {
      inputHash: result.analysisHash || inputHash,
      summary: result.summary || text,
      briefing: result.briefing || result.summary || text,
      tags: normalizeAiTags(result.tags),
      analyzedAt: result.analyzedAt || new Date().toISOString(),
      provider: result.provider === "gemini" ? "gemini" : "local",
      model: result.model || undefined,
      fallback: Boolean(result.fallback || data.fallback || data.simulated)
    }
  };
  analysisCache.set(inputHash, analysis);
  return analysis;
}

function getSpeechRecognitionCtor(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function StoryCaptureSheet({ people, aiEnabled = true, initialPersonId, sourceFollowUpId, referenceText, onClose, onSave }: Props) {
  useBodyScrollLock();
  const [selectedPersonId, setSelectedPersonId] = useState(initialPersonId || "");
  const [step, setStep] = useState<"person" | "method" | "input" | "review" | "done">(sourceFollowUpId && initialPersonId ? "input" : initialPersonId ? "method" : "person");
  const [method, setMethod] = useState<"voice" | "paste" | "direct" | null>(sourceFollowUpId ? "direct" : null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [medium, setMedium] = useState<ContactMedium>("식사");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [items, setItems] = useState<ApprovedMemoryItem[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<RecordAiAnalysis | undefined>(undefined);
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const person = useMemo(() => people.find((item) => item.id === selectedPersonId) || null, [people, selectedPersonId]);
  const filteredPeople = useMemo(() => {
    const query = personQuery.trim().toLowerCase();
    if (!query) return people;
    return people.filter((item) => [
      item.name,
      item.category,
      item.company,
      ...item.groups,
      item.preferences.hobbies,
      item.preferences.food,
      item.preferences.notes
    ].join(" ").toLowerCase().includes(query));
  }, [people, personQuery]);

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const startListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("이 브라우저에서는 음성 인식을 사용할 수 없어요. 직접 기록하기를 이용해주세요.");
      return;
    }
    setError(null);
    setText("");
    const recognition = new Ctor();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      let nextText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        nextText += event.results[i][0].transcript;
      }
      setText(nextText);
    };
    recognition.onerror = () => {
      setError("음성 인식 중 오류가 발생했어요. 다시 시도해주세요.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const buildReviewFromPlainText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSummary(trimmed);
    setItems([]);
    setAiAnalysis(undefined);
    if (!followUpText.trim()) setFollowUpText(inferFollowUpText(trimmed));
    setStep("review");
  };

  const analyzeText = async () => {
    if (!person || !text.trim() || isAnalyzing) return;
    if (!aiEnabled) {
      setError("지금은 AI 기능을 사용하지 않아요. 그대로 기록하기는 계속 사용할 수 있어요.");
      return;
    }
    if (text.length > maxTextLength) {
      setError("입력한 내용이 너무 길어요. 현재는 12,000자 이하로 나누어 정리해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeStoryTextForReview({ person, text, date, medium });
      setDate(result.date);
      setMedium(result.medium);
      setSummary(result.summary);
      setItems(result.items);
      setAiAnalysis(result.aiAnalysis);
      if (!followUpText.trim()) setFollowUpText(inferFollowUpText(result.summary || text));
      setStep("review");
    } catch (err: any) {
      setError(err.message || "AI 정리에 실패했어요. 잠시 뒤 다시 시도하거나 그대로 기록해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveApproved = () => {
    if (!person || !summary.trim()) return;
    onSave(person.id, {
      history: {
        id: `h_${Date.now()}`,
        date,
        medium,
        summary: summary.trim(),
        rawTranscript: text.trim() || undefined,
        aiAnalysis
      },
      approvedItems: items.filter((item) => item.selected && item.text.trim()).map((item) => ({ ...item, text: item.text.trim() })),
      followUp: {
        enabled: followUpEnabled,
        text: followUpText.trim() || inferFollowUpText(summary)
      },
      sourceFollowUpId
    });
    setStep("done");
    window.setTimeout(onClose, 900);
  };

  return (
    <div className="saram-sheet-overlay" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()} className="saram-sheet p-4 pb-6">
        <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-[#cdb7a7]" />
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">오늘 어떤 이야기를<br />담아볼까요?</h2>
            {person && <p className="mt-2 text-sm font-semibold text-[#d85b36]">{person.name} <span className="font-medium text-[#8d5b45]">{getRelationLine(person)}</span></p>}
          </div>
          <button onClick={onClose} className="rounded-full bg-[#f6eadf] p-2 text-[#2f1b12]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "person" && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-[#7c6252]">먼저 누구의 이야기인지 선택해주세요.</p>
            <label className="relative block">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8f7564]" />
              <input value={personQuery} onChange={(event) => setPersonQuery(event.target.value)} placeholder="이름, 관계, 그룹, 관심사 검색" className="saram-input saram-search-input h-11 text-sm" />
            </label>
            <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
              {filteredPeople.map((item) => (
                <button key={item.id} onClick={() => { setSelectedPersonId(item.id); setStep("method"); }} className="flex w-full items-center gap-3 rounded-2xl border border-[#ead8c9] bg-white/70 p-3 text-left">
                  <Avatar person={item} size="sm" />
                  <span className="min-w-0 flex-1">
                    <b className="block font-semibold text-[#2f1b12]">{item.name}</b>
                    <small className="block text-[#7c6252]">{getRelationLine(item)}</small>
                  </span>
                  <ChevronRight className="h-5 w-5 text-[#8d5b45]" />
                </button>
              ))}
              {filteredPeople.length === 0 && <p className="rounded-[16px] bg-white/70 p-4 text-center text-xs text-[#7c6252]">찾는 사람이 없어요.</p>}
            </div>
          </div>
        )}

        {step === "method" && (
          <div className="space-y-3">
            <MethodButton icon={<Mic />} title="말로 남기기" desc="친구를 만나고 돌아오는 길에 있었던 일을 편하게 말해요." onClick={() => { setMethod("voice"); setStep("input"); }} />
            <MethodButton icon={<MessageCircle />} title="대화 붙여넣기" desc="카카오톡, 문자, 메신저 대화를 붙여넣어요." onClick={() => { setMethod("paste"); setStep("input"); }} />
            <MethodButton icon={<PenLine />} title="직접 기록하기" desc="기억하고 싶은 내용을 직접 적어요." onClick={() => { setMethod("direct"); setStep("input"); }} />
          </div>
        )}

        {step === "input" && person && (
          <div className="space-y-4">
            {referenceText && (
              <section className="rounded-2xl border border-[#ead8c9] bg-[#fff8ef] p-3">
                <p className="text-xs font-semibold text-[#8d5b45]">이어지는 챙길 이야기</p>
                <p className="mt-1 text-sm font-medium leading-[1.6] text-[#2f1b12]">{referenceText}</p>
              </section>
            )}
            <RecordBasics date={date} medium={medium} onDateChange={setDate} onMediumChange={setMedium} />
            {method === "voice" && (
              <div className="rounded-[16px] border border-[#ead8c9] bg-[#fff6ee] p-4 text-center">
                <p className="font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{isListening ? `${person.name}와 있었던 이야기를 듣고 있어요.` : "말로 남긴 내용은 텍스트만 사용해요."}</p>
                <div className={`mx-auto my-5 flex h-24 w-24 items-center justify-center rounded-full ${isListening ? "animate-pulse bg-[#d85b36] text-white" : "bg-[#f7d8c7] text-[#d85b36]"}`}>
                  <Mic className="h-10 w-10" />
                </div>
                <button onClick={isListening ? () => recognitionRef.current?.stop() : startListening} className="rounded-full bg-[#d85b36] px-5 py-3 font-semibold text-white">
                  {isListening ? <><Square className="mr-2 inline h-4 w-4" />멈추기</> : "음성 시작"}
                </button>
              </div>
            )}
            {method === "paste" && (
              <p className="rounded-2xl bg-[#fff1df] p-4 text-sm leading-relaxed text-[#5e473a]">
                카톡이나 메시지 내용을 그대로 붙여넣어도 괜찮아요. 사람談이 기억할 만한 이야기만 정리해드립니다.
              </p>
            )}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={maxTextLength + 1}
              placeholder={method === "paste" ? "대화 내용을 붙여넣어 주세요." : "기억하고 싶은 이야기나 요약을 적어주세요."}
              className="saram-input min-h-40 resize-none text-[15px] leading-[1.65]"
            />
            <p className={`text-right text-xs font-medium ${text.length > maxTextLength ? "text-[#c95735]" : "text-[#8f7564]"}`}>{text.length.toLocaleString()} / {maxTextLength.toLocaleString()}</p>
            {error && <p className="flex gap-2 rounded-2xl bg-[#fff1e8] p-3 text-sm font-medium text-[#c95735]"><AlertCircle className="h-5 w-5 shrink-0" />{error}</p>}
            {isAnalyzing && <AnalyzingState />}
            <div className="space-y-2">
              {method !== "direct" && (
                <button onClick={analyzeText} disabled={isAnalyzing || !text.trim() || text.length > maxTextLength} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-40">
                  {method === "voice" ? "AI로 정리하기" : "이야기 정리하기"}
                </button>
              )}
              {method === "direct" && (
                <button onClick={analyzeText} disabled={isAnalyzing || !text.trim() || text.length > maxTextLength} className="w-full rounded-full border border-[#dfa98f] bg-white py-3 font-medium text-[#c95735] disabled:opacity-40">
                  이 내용을 AI로 정리하기
                </button>
              )}
              <button onClick={buildReviewFromPlainText} disabled={!text.trim()} className="w-full rounded-full border border-[#ead8c9] bg-white py-3 font-medium text-[#5a392a] disabled:opacity-40">
                그대로 기록하기
              </button>
            </div>
            <PrivacyNotice />
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5">
            <h3 className="text-[20px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">이런 이야기를 발견했어요</h3>
            <RecordBasics date={date} medium={medium} onDateChange={setDate} onMediumChange={setMedium} />
            <label>
              <span className="mb-2 block text-sm font-semibold text-[#2f1b12]">오늘 이야기 요약</span>
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} className="saram-input min-h-32 resize-none text-[15px] leading-[1.65]" />
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
                    <label className="mb-3 flex items-center gap-2 font-semibold text-[#2f1b12]">
                      <input type="checkbox" checked={item.selected} onChange={(event) => updateItem(index, { selected: event.target.checked }, setItems)} className="h-5 w-5 accent-[#d85b36]" />
                      {item.label}
                    </label>
                    <textarea value={item.text} onChange={(event) => updateItem(index, { text: event.target.value }, setItems)} className="saram-input min-h-20 resize-none text-[15px] leading-[1.65]" />
                  </article>
                ))}
              </div>
            )}
            <PrivacyNotice />
            <button onClick={saveApproved} disabled={!summary.trim()} className="w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white disabled:opacity-40">
              선택한 이야기 사람談에 담기
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="py-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#eaf0dc] text-4xl">🌿</div>
            <h3 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">이야기를 잘 담아두었어요</h3>
            <p className="mt-2 text-sm text-[#7c6252]">그 사람 상세화면으로 돌아갑니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function MethodButton({ icon, title, desc, onClick }: { icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="story-action">
      {icon}
      <span><b>{title}</b><small>{desc}</small></span>
    </button>
  );
}

function RecordBasics({ date, medium, onDateChange, onMediumChange }: { date: string; medium: ContactMedium; onDateChange: (value: string) => void; onMediumChange: (value: ContactMedium) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <label className="min-w-0">
        <span className="mb-1 block text-xs font-medium text-[#5a392a]">날짜</span>
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className="saram-input w-full min-w-0 py-3 text-sm" />
      </label>
      <label className="min-w-0">
        <span className="mb-1 block text-xs font-medium text-[#5a392a]">연락 방식</span>
        <select value={medium} onChange={(event) => onMediumChange(event.target.value as ContactMedium)} className="saram-input w-full min-w-0 py-3 text-sm">
          {mediumOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
  );
}

function AnalyzingState() {
  return (
    <div className="rounded-[16px] border border-[#ead8c9] bg-[#fff6ee] p-4 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#d85b36]" />
      <h3 className="mt-3 font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">사람談이 이야기 속 기억을 정리하고 있어요 🌿</h3>
      <p className="mt-1 text-sm text-[#7c6252]">가족 이야기, 관심사, 약속, 최근 근황을 살펴보고 있어요.</p>
    </div>
  );
}

function PrivacyNotice() {
  return (
    <p className="flex gap-2 rounded-2xl bg-[#fff8ef] p-3 text-xs leading-relaxed text-[#7c6252]">
      <ShieldCheck className="h-4 w-4 shrink-0" />
      <span>AI로 정리하기를 사용하면 입력한 대화 텍스트가 분석을 위해 AI 서비스로 전송됩니다. 저장 여부는 사용자가 직접 결정합니다.</span>
    </p>
  );
}

function updateItem(index: number, patch: Partial<ApprovedMemoryItem>, setItems: Dispatch<SetStateAction<ApprovedMemoryItem[]>>) {
  setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
}

function normalizeMedium(value: unknown): ContactMedium | null {
  if (value === "통화" || value === "카톡" || value === "식사" || value === "대면" || value === "메시지" || value === "기타") return value;
  return null;
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
    <section className="rounded-2xl border border-[#ead8c9] bg-white/70 p-4">
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
          placeholder="예) 승진 심사 결과"
          className="saram-input mt-3 py-3 text-sm"
        />
      )}
    </section>
  );
}

async function readAiJson(response: Response, parseErrorMessage: string): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(parseErrorMessage);
  }
}

function makeReviewItems(result: any, person: Person): ApprovedMemoryItem[] {
  const items: ApprovedMemoryItem[] = [];
  const summaryLines = String(result.summary || "")
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  summaryLines.forEach((line, index) => {
    if (isWorthAdding(line, person.preferences.notes)) {
      items.push({ id: `recent_${index}`, category: "recent", label: "최근 이야기", text: line, selected: true });
    }
  });

  if (Array.isArray(result.newFamilyDetails)) {
    result.newFamilyDetails.forEach((child: any, index: number) => {
      if (!child?.name) return;
      const existing = person.familyInfo.children.find((item) => item.name.trim() === String(child.name).trim());
      const text = existing
        ? `${existing.name}: ${child.memo || child.ageOrBirth || "새 가족 이야기를 업데이트"}`
        : `${child.name}${child.ageOrBirth ? ` · ${child.ageOrBirth}` : ""}${child.memo ? ` · ${child.memo}` : ""}`;
      items.push({
        id: `family_${index}`,
        category: "family",
        label: "가족",
        text,
        selected: isWorthAdding(text, existing?.memo || ""),
        child: { name: String(child.name), ageOrBirth: child.ageOrBirth || "", memo: child.memo || "" }
      });
    });
  }

  if (Array.isArray(result.newMemoInsights)) {
    result.newMemoInsights.forEach((memo: string, index: number) => {
      if (!memo) return;
      const category = /약속|하기로|다음|만나/.test(memo) ? "promise" : "preference";
      items.push({
        id: `memo_${index}`,
        category,
        label: category === "promise" ? "약속" : "관심사 / 취향",
        text: memo,
        selected: isWorthAdding(memo, person.preferences.notes)
      });
    });
  }

  normalizeAiTags(result.tags).forEach((tag, index) => {
    const category = tag.category === "family" ? "family" : tag.category === "promise" || tag.category === "schedule" ? "promise" : "preference";
    items.push({
      id: `tag_${index}`,
      category,
      label: tagLabel(tag.category),
      text: tag.text,
      selected: category !== "family" && isWorthAdding(tag.text, person.preferences.notes)
    });
  });

  return dedupeItems(items).slice(0, 8);
}

function normalizeAiTags(raw: any): AiMemoryTag[] {
  const allowed = new Set(["work", "family", "interest", "health", "hobby", "schedule", "recent", "preference", "promise"]);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tag: any) => ({
      category: allowed.has(String(tag?.category)) ? tag.category : "recent",
      text: String(tag?.text || "").trim()
    }))
    .filter((tag) => tag.text)
    .slice(0, 8);
}

function tagLabel(category: AiMemoryTag["category"]) {
  const labels: Record<AiMemoryTag["category"], string> = {
    work: "직장",
    family: "가족",
    interest: "관심사",
    health: "건강",
    hobby: "취미",
    schedule: "일정",
    recent: "근황",
    preference: "취향",
    promise: "약속"
  };
  return labels[category];
}

function isWorthAdding(nextText: string, existingText: string) {
  const normalizedNext = normalizeText(nextText);
  const normalizedExisting = normalizeText(existingText);
  return normalizedNext.length > 0 && !normalizedExisting.includes(normalizedNext);
}

function dedupeItems(items: ApprovedMemoryItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.category}:${normalizeText(item.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").replace(/[.,!?'"“”]/g, "").toLowerCase();
}

function makeAnalysisHash(personId: string, text: string) {
  let hash = 5381;
  const value = `${personId}:${text.trim()}`;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `ai_${(hash >>> 0).toString(36)}`;
}

function redactDirectIdentifiers(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?82[-.\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, "[phone]")
    .replace(/\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/g, "[phone]");
}
