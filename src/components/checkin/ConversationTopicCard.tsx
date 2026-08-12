import { ChevronRight } from "lucide-react";

export interface ConversationTopic {
  id: string;
  icon: string;
  title: string;
  description: string;
  suggestion: string;
  source: string;
}

interface Props {
  topic: ConversationTopic;
  onSelect: (topic: ConversationTopic) => void;
}

export default function ConversationTopicCard({ topic, onSelect }: Props) {
  return (
    <button onClick={() => onSelect(topic)} className="w-full rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 text-left shadow-soft">
      <div className="flex gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f8e8dc] text-2xl">{topic.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-[#2f1b12]">{topic.title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-[#3f2a20]">{topic.description}</span>
          <span className="mt-2 block font-bold leading-relaxed text-[#a24c31]">{topic.suggestion}</span>
        </span>
        <ChevronRight className="mt-4 h-5 w-5 shrink-0 text-[#8d5b45]" />
      </div>
      <p className="mt-3 rounded-xl bg-[#fff6ee] px-3 py-2 text-xs text-[#8f7564]">기록 근거 {topic.source}</p>
    </button>
  );
}
