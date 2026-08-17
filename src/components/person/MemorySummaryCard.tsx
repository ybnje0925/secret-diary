import { AlertCircle, Edit3, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Person, PersonAiBriefing } from "../../types";
import { makeMemoryBullets } from "../../utils/saramdam";

interface Props {
  person: Person;
  aiEnabled?: boolean;
  onEdit: () => void;
  onSaveBriefing: (briefing: PersonAiBriefing) => void;
}

function getMemoryIcon(text: string) {
  return /가족|배우자|아내|남편|딸|아들|자녀|아이/.test(text) ? "👨‍👩‍👧" : "🤚";
}

export default function MemorySummaryCard({ person, aiEnabled = true, onEdit, onSaveBriefing }: Props) {
  const bullets = makeMemoryBullets(person);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const sourceHash = useMemo(() => makeBriefingHash(person), [person]);
  const cachedBriefing = person.aiBriefing?.sourceHash === sourceHash ? person.aiBriefing : null;

  const createBriefing = async () => {
    if (!aiEnabled) {
      setError("지금은 AI 기능을 사용하지 않아요.");
      return;
    }
    if (!person.history.length) {
      setError("브리핑할 최근 기록이 아직 없어요.");
      return;
    }
    if (cachedBriefing) return;

    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/person-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: person.id,
          records: person.history.slice(0, 5).map((record) => ({
            id: record.id,
            date: record.date,
            medium: record.medium,
            summary: record.summary
          }))
        })
      });
      const data = await readJson(response);
      if (!response.ok || !data.success) throw new Error(data.error || "브리핑을 만들지 못했어요.");
      const result = data.data || {};
      const briefing: PersonAiBriefing = {
        sourceHash: result.sourceHash || sourceHash,
        text: result.briefing || "최근 기록을 정리했습니다.",
        tags: Array.isArray(result.tags) ? result.tags : [],
        updatedAt: result.updatedAt || new Date().toISOString(),
        provider: result.provider === "gemini" ? "gemini" : "local",
        model: result.model || undefined,
        fallback: Boolean(result.fallback || data.fallback || data.simulated)
      };
      onSaveBriefing(briefing);
    } catch (err: any) {
      setError(err?.message || "브리핑을 만들지 못했어요. 기존 기록은 그대로 사용할 수 있어요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 shadow-soft">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">✨ 다음 만남 전에 기억할 것</h2>
        <button onClick={onEdit} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-medium text-[#5a392a]">
          <Edit3 className="mr-1 inline h-3 w-3" /> 편집
        </button>
      </div>
      <div className="space-y-2">
        {bullets.length > 0 ? bullets.map((bullet, index) => (
          <p key={`${bullet}-${index}`} className="flex gap-2 text-[14px] leading-[1.65] text-[#2f1b12]">
            <span className="shrink-0">{getMemoryIcon(bullet)}</span>
            <span>{bullet}</span>
          </p>
        )) : (
          <p className="text-sm text-[#7c6252]">아직 기억 카드에 담긴 이야기가 없어요.</p>
        )}
      </div>
      <div className="mt-3 rounded-2xl bg-white/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[#2f1b12]">최근 기록 브리핑</h3>
          <button onClick={createBriefing} disabled={isLoading || Boolean(cachedBriefing) || !person.history.length} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-medium text-[#5a392a] disabled:opacity-45">
            {isLoading ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 inline h-3 w-3" />}
            {cachedBriefing ? "저장됨" : "AI 브리핑"}
          </button>
        </div>
        {cachedBriefing ? (
          <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.6] text-[#5a392a]">{cachedBriefing.text}</p>
        ) : (
          <p className="mt-2 text-[13px] leading-[1.6] text-[#7c6252]">최근 기록을 바탕으로 변화와 핵심 정보를 2~4줄로 정리해둘 수 있어요.</p>
        )}
        {error && <p className="mt-2 flex gap-1.5 text-xs font-medium text-[#c95735]"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}</p>}
      </div>
    </section>
  );
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("AI 서버 응답 형식이 올바르지 않아요.");
  }
}

function makeBriefingHash(person: Person) {
  const value = JSON.stringify({
    personId: person.id,
    records: person.history.slice(0, 5).map((record) => ({
      date: record.date,
      medium: record.medium,
      summary: record.summary
    }))
  });
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `ai_${(hash >>> 0).toString(36)}`;
}
