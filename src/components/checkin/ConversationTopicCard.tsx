import { AlertTriangle, ChevronRight } from "lucide-react";

export interface ConversationTopic {
  id: string;
  icon: string;
  topic: string;
  reason: string;
  source: string;
  sensitivity: "normal" | "sensitive";
  suggestedQuestion: string;
}

interface Props {
  topic: ConversationTopic;
  onSelect: (topic: ConversationTopic) => void;
}

export default function ConversationTopicCard({ topic, onSelect }: Props) {
  return (
    <button onClick={() => onSelect(topic)} className="w-full rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] p-3.5 text-left shadow-soft">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f8e8dc] text-xl">{topic.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-extrabold text-[#2f1b12]">
            {topic.topic}
            {topic.sensitivity === "sensitive" && <AlertTriangle className="h-4 w-4 text-[#c95735]" />}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-[#3f2a20]">{topic.reason}</span>
          <span className="mt-3 block text-xs font-extrabold text-[#8d5b45]">이렇게 물어보는 건 어때요?</span>
          <span className="mt-1 block text-sm font-bold leading-relaxed text-[#a24c31]">{topic.suggestedQuestion}</span>
        </span>
        <ChevronRight className="mt-4 h-5 w-5 shrink-0 text-[#8d5b45]" />
      </div>
      <p className="mt-3 rounded-xl bg-[#fff6ee] px-3 py-2 text-xs text-[#8f7564]">근거: {topic.source}</p>
    </button>
  );
}
