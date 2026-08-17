import { AlertCircle, CheckCircle2, Edit3, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FollowUpItem, Person, PersonAiBriefing } from "../../types";
import { getPendingFollowUps } from "../../utils/followUps";
import { makeMemoryBullets } from "../../utils/saramdam";

interface Props {
  person: Person;
  aiEnabled?: boolean;
  onCompleteFollowUp: (followUpId: string) => void;
  onDeleteFollowUp: (followUpId: string) => void;
  onSaveFollowUp: (sourceRecordId: string, text: string) => void;
  onSaveBriefing: (briefing: PersonAiBriefing) => void;
}

function getMemoryIcon(text: string) {
  return /가족|배우자|아내|남편|딸|아들|자녀|아이/.test(text) ? "👨‍👩‍👧" : "🤚";
}

export default function MemorySummaryCard({
  person,
  aiEnabled = true,
  onCompleteFollowUp,
  onDeleteFollowUp,
  onSaveFollowUp,
  onSaveBriefing
}: Props) {
  const pendingFollowUps = getPendingFollowUps(person);
  const memoryBullets = makeMemoryBullets(person);
  const bullets = [
    ...pendingFollowUps.map((item) => item.text),
    ...memoryBullets
  ].filter(Boolean);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingCare, setEditingCare] = useState(false);
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
        <h2 className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">✨ 챙길 이야기</h2>
        <button onClick={() => setEditingCare((value) => !value)} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-medium text-[#5a392a]">
          <Edit3 className="mr-1 inline h-3 w-3" /> 편집
        </button>
      </div>
      <div className="space-y-2">
        {bullets.length > 0 ? Array.from(new Set(bullets)).slice(0, 6).map((bullet, index) => (
          <p key={`${bullet}-${index}`} className="flex gap-2 text-[14px] leading-[1.65] text-[#2f1b12]">
            <span className="shrink-0">{getMemoryIcon(bullet)}</span>
            <span>{bullet}</span>
          </p>
        )) : (
          <p className="text-sm text-[#7c6252]">다음에 챙길 이야기가 아직 없어요.</p>
        )}
      </div>
      {pendingFollowUps.length > 0 && (
        <div className="mt-3 space-y-2">
          {pendingFollowUps.map((item) => (
            <div key={item.id} className="grid grid-cols-2 gap-2">
              <button onClick={() => onCompleteFollowUp(item.id)} className="rounded-full bg-[#d85b36] py-2 text-xs font-semibold text-white">
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> 물어봤어요
              </button>
              <button onClick={() => onDeleteFollowUp(item.id)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#c95735]">
                삭제
              </button>
            </div>
          ))}
        </div>
      )}
      {editingCare && (
        <FollowUpEditor
          items={pendingFollowUps}
          onAdd={(text) => onSaveFollowUp(`manual_${Date.now()}`, text)}
          onSave={(item, text) => onSaveFollowUp(item.sourceRecordId || item.id, text)}
          onDelete={onDeleteFollowUp}
        />
      )}
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

function FollowUpEditor({
  items,
  onAdd,
  onSave,
  onDelete
}: {
  items: FollowUpItem[];
  onAdd: (text: string) => void;
  onSave: (item: FollowUpItem, text: string) => void;
  onDelete: (followUpId: string) => void;
}) {
  const [newText, setNewText] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(items.map((item) => [item.id, item.text])));

  return (
    <section className="mt-3 rounded-2xl border border-[#ead8c9] bg-white/70 p-3">
      <div className="space-y-2.5">
        {items.map((item) => {
          const value = drafts[item.id] ?? item.text;
          return (
            <div key={item.id} className="space-y-2 rounded-xl bg-[#fffaf3] p-2.5">
              <input
                value={value}
                onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                className="saram-input py-3 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => value.trim() && onSave(item, value.trim())} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#5a392a]">수정</button>
                <button type="button" onClick={() => onDelete(item.id)} className="rounded-full border border-[#ead8c9] bg-white py-2 text-xs font-medium text-[#c95735]">
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" /> 삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={newText}
          onChange={(event) => setNewText(event.target.value)}
          placeholder="새 챙길 이야기"
          className="saram-input py-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            const text = newText.trim();
            if (!text) return;
            onAdd(text);
            setNewText("");
          }}
          className="shrink-0 rounded-full bg-[#d85b36] px-4 text-xs font-semibold text-white"
        >
          <Plus className="mr-1 inline h-3.5 w-3.5" /> 추가
        </button>
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
