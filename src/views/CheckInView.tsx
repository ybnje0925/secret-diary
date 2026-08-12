import { Bell } from "lucide-react";
import { useMemo, useState } from "react";
import Avatar from "../components/common/Avatar";
import CheckInPersonCard from "../components/checkin/CheckInPersonCard";
import ConversationStarter from "../components/checkin/ConversationStarter";
import ConversationTopicCard, { ConversationTopic } from "../components/checkin/ConversationTopicCard";
import { Person } from "../types";
import { daysSince, formatDateKo, getRelationLine } from "../utils/saramdam";

interface Props {
  people: Person[];
  initialPersonId?: string | null;
}

function makeTopics(person: Person): ConversationTopic[] {
  const firstHistory = person.history[0];
  const topics: ConversationTopic[] = [];
  if (person.preferences.hobbies) {
    topics.push({
      id: "hobby",
      icon: person.preferences.hobbies.includes("커피") ? "☕" : "🌿",
      title: person.preferences.hobbies.includes("커피") ? "커피 이야기" : "취미 이야기",
      description: `${person.name}님은 ${person.preferences.hobbies}를 좋아해요.`,
      suggestion: "최근에도 즐기고 있는지 자연스럽게 물어보는 건 어때요?",
      source: firstHistory ? `${formatDateKo(firstHistory.date)} — ${firstHistory.summary.split(".")[0]}` : "프로필 취향 기록"
    });
  }
  const child = person.familyInfo.children[0];
  if (child) {
    topics.push({
      id: "family",
      icon: "👧",
      title: `${child.name}의 학교생활`,
      description: `지난번에 ${child.name} 이야기를 남겼어요.`,
      suggestion: `${child.name}는 요즘 어떻게 지내는지 물어보세요.`,
      source: child.memo || "가족 기록"
    });
  }
  if (person.preferences.notes) {
    topics.push({
      id: "note",
      icon: "❤️",
      title: "지난번 걱정했던 일",
      description: "지난번 이야기 중 다시 살펴볼 만한 내용이 있어요.",
      suggestion: "요즘은 조금 괜찮아졌는지 부담스럽지 않게 물어보는 건 어떨까요?",
      source: person.preferences.notes.split("\n")[0]
    });
  }
  if (firstHistory) {
    topics.push({
      id: "recent",
      icon: "💼",
      title: "최근 이야기",
      description: firstHistory.summary.split(".")[0],
      suggestion: "그때 이야기했던 일이 어떻게 되었는지 물어볼 수 있어요.",
      source: `${formatDateKo(firstHistory.date)} — ${firstHistory.summary.split(".")[0]}`
    });
  }
  return topics.slice(0, 4);
}

export default function CheckInView({ people, initialPersonId }: Props) {
  const sorted = useMemo(() => [...people].sort((a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate)), [people]);
  const [selectedId, setSelectedId] = useState<string | null>(initialPersonId || sorted[0]?.id || null);
  const [selectedTopic, setSelectedTopic] = useState<ConversationTopic | null>(null);
  const selected = sorted.find((person) => person.id === selectedId) || sorted[0];
  const topics = selected ? makeTopics(selected) : [];

  if (!selected) {
    return <p className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-6 text-center text-[#7c6252]">안부를 전할 사람이 아직 없어요.</p>;
  }

  if (selectedTopic) {
    return <ConversationStarter person={selected} topic={selectedTopic} onBack={() => setSelectedTopic(null)} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-[#2f1b12]">안부</h1>
        <button className="relative rounded-full p-2 text-[#2f1b12]"><Bell className="h-6 w-6" /><span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#d85b36]" /></button>
      </header>

      <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold text-[#2f1b12]">🧡 이번 주 안부가 필요한 사람</h2>
          <button className="text-sm font-semibold text-[#8d5b45]">더보기</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {sorted.slice(0, 6).map((person) => (
            <div key={person.id}>
              <CheckInPersonCard person={person} onSelect={(id) => { setSelectedId(id); setSelectedTopic(null); }} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[26px] bg-[#fff8ef] pt-2">
        <div className="flex gap-4">
          <Avatar person={selected} size="md" />
          <div>
            <h2 className="text-2xl font-black text-[#2f1b12]">{selected.name}</h2>
            <p className="text-sm font-medium text-[#5e473a]">{getRelationLine(selected)}</p>
            <p className="mt-1 text-sm text-[#7c6252]">마지막 연락 {daysSince(selected.lastContactDate)}일 전</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black text-[#2f1b12]">{selected.name}에게 오랜만에 안부를 전해볼까요?</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#7c6252]">사람담이 기억한 내용을 바탕으로 대화를 시작하기 좋은 주제를 추천해드려요.</p>
      </section>

      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id}>
            <ConversationTopicCard topic={topic} onSelect={setSelectedTopic} />
          </div>
        ))}
      </div>
    </div>
  );
}
