import { AlertCircle, ArrowLeft, Bell, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Avatar from "../components/common/Avatar";
import ConversationStarter, { StarterSet } from "../components/checkin/ConversationStarter";
import ConversationTopicCard, { ConversationTopic } from "../components/checkin/ConversationTopicCard";
import { InteractionHistory, Person } from "../types";
import { daysSince, formatDateKo, getRecentMemory, getRelationLine, normalizeMemoryText } from "../utils/saramdam";

interface Props {
  people: Person[];
  initialPersonId?: string | null;
  onContactComplete: (personId: string, history: InteractionHistory) => void;
}

type Step = "main" | "picker" | "topics" | "starter";

const sensitivePattern = /수술|질병|아프|통증|병원|퇴사|이직|갈등|사망|장례|금전|빚|걱정|힘들|스트레스|가족 일/;

export default function CheckInView({ people, initialPersonId, onContactComplete }: Props) {
  const [step, setStep] = useState<Step>(initialPersonId ? "topics" : "main");
  const [selectedId, setSelectedId] = useState<string | null>(initialPersonId || null);
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const [topics, setTopics] = useState<ConversationTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [starters, setStarters] = useState<StarterSet | null>(null);
  const [isLoadingStarters, setIsLoadingStarters] = useState(false);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const recommended = useMemo(() => sortCheckInPeople(people), [people]);
  const selected = people.find((person) => person.id === selectedId) || null;
  const searchedPeople = people.filter((person) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [person.name, person.category, person.company, ...person.groups].join(" ").toLowerCase().includes(query);
  });

  useEffect(() => {
    if (initialPersonId) {
      setSelectedId(initialPersonId);
      setStep("topics");
    }
  }, [initialPersonId]);

  useEffect(() => {
    if (step === "topics" && selected) {
      loadTopics(selected);
    }
  }, [step, selectedId]);

  useEffect(() => {
    if (step === "starter" && selected && selectedTopic) {
      loadStarters(selected, selectedTopic, "casual");
    }
  }, [step, selectedTopic?.id]);

  const choosePerson = (personId: string) => {
    setSelectedId(personId);
    setSelectedTopic(null);
    setStep("topics");
  };

  const loadTopics = async (person: Person) => {
    setIsLoadingTopics(true);
    setTopicError(null);
    try {
      const response = await fetch("/api/check-in-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: buildPersonPayload(person) })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "안부 주제를 불러오지 못했어요.");
      const aiTopics = normalizeTopics(data.data?.topics || [], person);
      setTopics(aiTopics.length ? aiTopics : makeLocalTopics(person));
    } catch (error: any) {
      setTopicError(error.message || "이야기를 불러오는 데 잠시 문제가 생겼어요.");
      setTopics(makeLocalTopics(person));
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const loadStarters = async (person: Person, topic: ConversationTopic, tone: "casual" | "polite" | "short") => {
    setIsLoadingStarters(true);
    setStarterError(null);
    try {
      const response = await fetch("/api/check-in-starters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: buildPersonPayload(person), topic, tone })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "문구를 불러오지 못했어요.");
      setStarters(normalizeStarters(data.data, person, topic, tone));
    } catch (error: any) {
      setStarterError(error.message || "문구를 불러오는 데 잠시 문제가 생겼어요.");
      setStarters(makeLocalStarters(person, topic, tone));
    } finally {
      setIsLoadingStarters(false);
    }
  };

  if (!people.length) {
    return <p className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-6 text-center text-[#7c6252]">안부를 전할 사람이 아직 없어요.</p>;
  }

  if (step === "picker") {
    return (
      <div className="space-y-5">
        <button onClick={() => setStep("main")} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
        <section>
          <h1 className="text-3xl font-black text-[#2f1b12]">누구에게 안부를 전할까요?</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#7c6252]">연락 주기와 상관없이 원하는 사람을 선택할 수 있어요.</p>
        </section>
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8f7564]" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="이름, 관계, 그룹 검색" className="h-13 w-full rounded-2xl border border-[#ead8c9] bg-[#fffaf3] pl-12 pr-4 text-[15px] text-[#2f1b12] outline-none focus:border-[#d85b36]" />
        </label>
        <div className="space-y-3">
          {searchedPeople.map((person) => (
            <div key={person.id}>
              <PersonSelectCard person={person} onSelect={choosePerson} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "topics" && selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setStep("main")} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
        <section>
          <p className="text-sm font-extrabold text-[#d85b36]">{selected.name}에게</p>
          <h1 className="mt-1 text-3xl font-black text-[#2f1b12]">무슨 이야기를 해볼까요?</h1>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#7c6252]">함께 나눴던 이야기에서{"\n"}자연스럽게 꺼낼 만한 주제를 찾아봤어요.</p>
        </section>
        {isLoadingTopics && <LoadingCard text={`${selected.name}와 나눴던 이야기를 살펴보고 있어요 🌿`} />}
        {topicError && <ErrorCard message="이야기를 불러오는 데 잠시 문제가 생겼어요." onRetry={() => loadTopics(selected)} />}
        {!isLoadingTopics && topics.length === 0 && (
          <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-6 text-center shadow-soft">
            <Sparkles className="mx-auto h-8 w-8 text-[#d85b36]" />
            <h2 className="mt-3 font-black text-[#2f1b12]">아직 추천할 만한 이야기가 많지 않아요.</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#7c6252]">최근에 있었던 이야기를 조금 더 담아보세요.</p>
          </section>
        )}
        <div className="space-y-3">
          {topics.map((topic) => (
            <div key={topic.id}>
              <ConversationTopicCard topic={topic} onSelect={(nextTopic) => { setSelectedTopic(nextTopic); setStep("starter"); }} />
            </div>
          ))}
        </div>
        <ManualTopics person={selected} onSelect={(topic) => { setSelectedTopic(topic); setStep("starter"); }} />
        <PrivacyNotice />
      </div>
    );
  }

  if (step === "starter" && selected && selectedTopic) {
    return (
      <ConversationStarter
        person={selected}
        topic={selectedTopic}
        starters={starters}
        isLoading={isLoadingStarters}
        error={starterError}
        onBack={() => setStep("topics")}
        onRegenerate={(tone) => loadStarters(selected, selectedTopic, tone)}
        onContactComplete={(history) => {
          onContactComplete(selected.id, history);
          setStep("main");
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#2f1b12]">안부를 전해볼까요?</h1>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#7c6252]">가끔은 작은 안부 하나가{"\n"}오래된 관계를 다시 이어주기도 해요.</p>
        </div>
        <button className="relative rounded-full p-2 text-[#2f1b12]"><Bell className="h-6 w-6" /><span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#d85b36]" /></button>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-black text-[#2f1b12]">오늘 안부를 전해볼 사람</h2>
        <div className="space-y-3">
          {recommended.slice(0, 5).map((person) => (
            <div key={person.id}>
              <RecommendedPersonCard person={person} onSelect={choosePerson} />
            </div>
          ))}
        </div>
      </section>

      <button onClick={() => setStep("picker")} className="w-full rounded-full border border-[#ead8c9] bg-white py-4 font-extrabold text-[#5a392a] shadow-soft">
        다른 사람에게 안부 전하기
      </button>
      <PrivacyNotice />
    </div>
  );
}

function RecommendedPersonCard({ person, onSelect }: { person: Person; onSelect: (personId: string) => void }) {
  return (
    <article className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
      <div className="flex gap-4">
        <Avatar person={person} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black text-[#2f1b12]">{person.name}</h3>
          <p className="mt-1 text-sm font-medium text-[#5e473a]">{getRelationLine(person)}</p>
          <p className="mt-2 text-sm font-extrabold text-[#c95735]">마지막 연락 {daysSince(person.lastContactDate)}일 전</p>
        </div>
      </div>
      <blockquote className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm leading-relaxed text-[#5a392a]">“{getRecentMemory(person).split("\n")[0]}”</blockquote>
      <button onClick={() => onSelect(person.id)} className="mt-4 w-full rounded-full bg-[#d85b36] py-3 text-sm font-extrabold text-white">이야기로 안부 시작하기</button>
    </article>
  );
}

function PersonSelectCard({ person, onSelect }: { person: Person; onSelect: (personId: string) => void }) {
  return (
    <button onClick={() => onSelect(person.id)} className="flex w-full items-center gap-3 rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 text-left shadow-soft">
      <Avatar person={person} size="sm" />
      <span className="min-w-0 flex-1">
        <b className="block text-[#2f1b12]">{person.name}</b>
        <small className="block text-[#7c6252]">{getRelationLine(person)}</small>
      </span>
      <span className="text-xs font-bold text-[#c95735]">{daysSince(person.lastContactDate)}일 전</span>
    </button>
  );
}

function ManualTopics({ person, onSelect }: { person: Person; onSelect: (topic: ConversationTopic) => void }) {
  const options = [
    { id: "manual-hobby", icon: "🌿", topic: "취미 이야기", source: "취향 정보에서", reason: person.preferences.hobbies || "취미나 관심사를 가볍게 물어볼 수 있어요.", suggestedQuestion: "요즘도 관심 있는 일을 즐기고 있는지 물어보세요." },
    { id: "manual-family", icon: "👨‍👩‍👧", topic: "가족 이야기", source: "가족 정보에서", reason: person.familyInfo.children[0]?.memo || person.familyInfo.spouseName || "가족 안부를 부담 없이 물어볼 수 있어요.", suggestedQuestion: "가족들은 잘 지내는지 가볍게 물어보세요." },
    { id: "manual-work", icon: "💼", topic: "요즘 일상", source: "프로필 정보에서", reason: person.company || person.preferences.notes || "요즘 어떻게 지내는지 물어볼 수 있어요.", suggestedQuestion: "요즘은 어떻게 지내는지 자연스럽게 물어보세요." }
  ];

  return (
    <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
      <h2 className="font-black text-[#2f1b12]">다른 이야기로 시작하기</h2>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {options.map((option) => (
          <button key={option.id} onClick={() => onSelect({ ...option, sensitivity: detectSensitivity(option.reason), label: undefined } as ConversationTopic)} className="rounded-xl bg-white px-3 py-2 text-left text-sm font-bold text-[#5a392a]">
            {option.icon} {option.topic}
          </button>
        ))}
      </div>
    </section>
  );
}

function LoadingCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[#ead8c9] bg-[#fff6ee] p-5 text-center">
      <Sparkles className="mx-auto h-8 w-8 animate-pulse text-[#d85b36]" />
      <p className="mt-3 font-black text-[#2f1b12]">{text}</p>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#ead8c9] bg-[#fff1e8] p-4">
      <p className="flex gap-2 font-bold text-[#c95735]"><AlertCircle className="h-5 w-5 shrink-0" />{message}</p>
      <button onClick={onRetry} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#c95735]">다시 시도</button>
    </div>
  );
}

function PrivacyNotice() {
  return <p className="rounded-2xl bg-[#fff1df] p-3 text-xs leading-relaxed text-[#7c6252]">안부 추천을 위해 선택한 사람의 일부 기록이 AI 분석에 사용됩니다.</p>;
}

function sortCheckInPeople(people: Person[]) {
  return [...people].sort((a, b) => {
    const aOverdue = daysSince(a.lastContactDate) - (a.remindIntervalDays || 60);
    const bOverdue = daysSince(b.lastContactDate) - (b.remindIntervalDays || 60);
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;
    if (b.history.length !== a.history.length) return b.history.length - a.history.length;
    return daysSince(b.lastContactDate) - daysSince(a.lastContactDate);
  });
}

function buildPersonPayload(person: Person) {
  return {
    id: person.id,
    name: person.name,
    category: person.category,
    groups: person.groups,
    company: person.company,
    lastContactDate: person.lastContactDate,
    lastContactMedium: person.lastContactMedium,
    familyInfo: person.familyInfo,
    preferences: person.preferences,
    eventsHistory: person.eventsHistory.slice(0, 5),
    history: person.history.slice(0, 6)
  };
}

function normalizeTopics(rawTopics: any[], person: Person): ConversationTopic[] {
  const localFacts = buildFactSet(person);
  return rawTopics
    .filter((topic) => topic?.topic && topic?.reason && topic?.source && topic?.suggestedQuestion)
    .map((topic, index) => ({
      id: String(topic.id || `ai-${index}`),
      icon: String(topic.icon || pickIcon(String(topic.topic))),
      topic: String(topic.topic),
      reason: String(topic.reason),
      source: String(topic.source),
      sensitivity: topic.sensitivity === "sensitive" ? "sensitive" : detectSensitivity(`${topic.topic} ${topic.reason}`),
      suggestedQuestion: String(topic.suggestedQuestion)
    }))
    .filter((topic) => isGroundedTopic(topic, localFacts))
    .slice(0, 4);
}

function makeLocalTopics(person: Person): ConversationTopic[] {
  const topics: ConversationTopic[] = [];
  const recent = person.history.slice(0, 4);

  recent.forEach((history, index) => {
    const text = history.summary.split("\n")[0] || history.summary;
    if (!text.trim()) return;
    const sensitive = detectSensitivity(text);
    topics.push({
      id: `history-${index}`,
      icon: pickIcon(text),
      topic: sensitive === "sensitive" ? "지난번 이야기" : makeTopicTitle(text),
      reason: sensitive === "sensitive" ? "지난번 조금 조심스럽게 꺼내면 좋을 이야기를 나눴어요." : text,
      source: `${formatDateKo(history.date)} · ${history.medium}`,
      sensitivity: sensitive,
      suggestedQuestion: sensitive === "sensitive" ? "요즘은 조금 괜찮아졌는지 부담스럽지 않게 물어보는 건 어떨까요?" : "그때 이야기했던 일은 요즘 어떤지 자연스럽게 물어보세요."
    });
  });

  person.familyInfo.children.forEach((child, index) => {
    if (!child.memo) return;
    topics.push({
      id: `family-${index}`,
      icon: "👧",
      topic: `${child.name} 이야기`,
      reason: `${child.name}에 대해 기록해둔 이야기가 있어요: ${child.memo}`,
      source: "가족 정보에서",
      sensitivity: detectSensitivity(child.memo),
      suggestedQuestion: detectSensitivity(child.memo) === "sensitive" ? "가족들은 요즘 잘 지내는지 조심스럽게 물어보세요." : `${child.name}는 요즘 어떻게 지내는지 물어보세요.`
    });
  });

  if (person.preferences.hobbies) {
    topics.push({
      id: "hobby",
      icon: pickIcon(person.preferences.hobbies),
      topic: makeTopicTitle(person.preferences.hobbies),
      reason: `${person.name}님은 ${person.preferences.hobbies}에 관심이 있어요.`,
      source: "취향 정보에서",
      sensitivity: "normal",
      suggestedQuestion: "요즘도 즐기고 있는지 자연스럽게 물어보세요."
    });
  }

  if (person.preferences.food) {
    topics.push({
      id: "food",
      icon: "☕",
      topic: "좋아하는 것 이야기",
      reason: `${person.preferences.food}라고 기록되어 있어요.`,
      source: "취향 정보에서",
      sensitivity: "normal",
      suggestedQuestion: "최근에도 좋아하는 맛집이나 메뉴가 있는지 물어보세요."
    });
  }

  return dedupeTopics(topics).slice(0, 4);
}

function normalizeStarters(raw: any, person: Person, topic: ConversationTopic, tone: "casual" | "polite" | "short"): StarterSet {
  return {
    natural: String(raw?.natural || makeLocalStarters(person, topic, tone).natural),
    friendly: String(raw?.friendly || makeLocalStarters(person, topic, tone).friendly),
    polite: String(raw?.polite || makeLocalStarters(person, topic, tone).polite)
  };
}

function makeLocalStarters(person: Person, topic: ConversationTopic, tone: "casual" | "polite" | "short"): StarterSet {
  const base = topic.sensitivity === "sensitive"
    ? "지난번에 이야기했던 게 생각나서 연락했어. 요즘은 조금 괜찮아?"
    : `지난번에 ${topic.topic} 얘기했던 게 생각났어. 요즘은 어때?`;
  const polite = topic.sensitivity === "sensitive"
    ? "오랜만이에요. 지난번에 이야기하셨던 일이 문득 생각났어요. 요즘은 조금 괜찮으신가요?"
    : `오랜만이에요. 지난번에 ${topic.topic} 이야기가 생각났어요. 요즘은 어떠세요?`;

  if (tone === "short") {
    return {
      natural: `오랜만이야! ${topic.topic} 생각나서 연락했어. 잘 지내?`,
      friendly: `${person.name}아 잘 지내? 문득 생각나서 연락했어.`,
      polite: `오랜만이에요. 잘 지내고 계신가요?`
    };
  }

  if (tone === "polite" || person.category.includes("회사")) {
    return {
      natural: polite,
      friendly: `오랜만이에요 ${person.name}님. ${topic.topic} 이야기가 생각났는데, 요즘은 어떻게 지내세요?`,
      polite
    };
  }

  return {
    natural: `오랜만이야! 잘 지내지? ${base}`,
    friendly: `${person.name}아 갑자기 네 생각나서 ㅋㅋ ${base}`,
    polite
  };
}

function detectSensitivity(text: string): "normal" | "sensitive" {
  return sensitivePattern.test(text) ? "sensitive" : "normal";
}

function pickIcon(text: string) {
  if (/커피|카페|핸드드립/.test(text)) return "☕";
  if (/테니스|운동|축구|골프/.test(text)) return "🎾";
  if (/가족|딸|아들|아내|남편|아이/.test(text)) return "👧";
  if (/회사|업무|직장|이직/.test(text)) return "💼";
  if (/아프|건강|수술|병원|걱정/.test(text)) return "❤️";
  return "🌿";
}

function makeTopicTitle(text: string) {
  if (/커피|카페|핸드드립/.test(text)) return "요즘도 커피 즐겨요?";
  if (/테니스|운동/.test(text)) return "운동 이야기는 어때요?";
  if (/회사|업무|직장/.test(text)) return "요즘 일은 어때요?";
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
}

function buildFactSet(person: Person) {
  return [
    person.name,
    person.category,
    person.company,
    ...person.groups,
    person.preferences.food,
    person.preferences.hobbies,
    person.preferences.notes,
    person.familyInfo.spouseName || "",
    ...person.familyInfo.children.flatMap((child) => [child.name, child.ageOrBirth, child.memo]),
    ...person.history.map((history) => history.summary),
    ...person.eventsHistory.flatMap((event) => [event.type, event.amountOrGift, event.note])
  ].filter(Boolean).map((fact) => normalizeMemoryText(String(fact)));
}

function isGroundedTopic(topic: ConversationTopic, facts: string[]) {
  const combined = normalizeMemoryText(`${topic.topic} ${topic.reason} ${topic.source}`);
  if (!combined) return false;
  return facts.some((fact) => fact.length >= 2 && (combined.includes(fact.slice(0, Math.min(fact.length, 12))) || fact.includes(combined.slice(0, Math.min(combined.length, 12)))));
}

function dedupeTopics(topics: ConversationTopic[]) {
  const seen = new Set<string>();
  return topics.filter((topic) => {
    const key = normalizeMemoryText(`${topic.topic}:${topic.reason}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
