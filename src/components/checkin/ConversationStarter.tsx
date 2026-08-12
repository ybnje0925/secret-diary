import { Copy } from "lucide-react";
import { ConversationTopic } from "./ConversationTopicCard";
import { Person } from "../../types";

interface Props {
  person: Person;
  topic: ConversationTopic;
  onBack: () => void;
}

export default function ConversationStarter({ person, topic, onBack }: Props) {
  const starters = [
    `오랜만이야! 잘 지내지? ${topic.title.replace(" 이야기", "")} 생각이 나서 연락했어. 요즘은 어때?`,
    `${person.name}아 갑자기 네 생각나서 연락했어. 지난번에 말했던 ${topic.title.replace(" 이야기", "")}는 요즘도 잘 이어가고 있어?`,
    `오랜만이야. 지난번에 이야기했던 게 생각났어. 부담 없이 근황 한번 들려줘.`
  ];

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm font-bold text-[#8d5b45]">← 주제 다시 선택</button>
      <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8e8dc] text-2xl">{topic.icon}</span>
          <div>
            <p className="text-sm text-[#7c6252]">선택한 주제</p>
            <h2 className="text-xl font-extrabold text-[#2f1b12]">{topic.title}</h2>
            <p className="text-sm text-[#5e473a]">{topic.description}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-[#2f1b12]">어떻게 말을 꺼내볼까요?</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#7c6252]">마음에 드는 문구를 복사해서 직접 보내세요.</p>
      </section>

      <div className="space-y-3">
        {starters.map((starter, index) => (
          <article key={starter} className={`rounded-2xl border bg-[#fffaf3] p-4 shadow-soft ${index === 0 ? "border-[#eead92]" : "border-[#ead8c9]"}`}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-extrabold text-[#a24c31]">{index === 0 ? "추천 문구" : index === 1 ? "조금 더 친근하게" : "담백하게"}</p>
              <button onClick={() => copyText(starter)} className="rounded-full border border-[#ead8c9] bg-white px-3 py-1 text-xs font-bold text-[#5a392a]">
                <Copy className="mr-1 inline h-3.5 w-3.5" /> 복사
              </button>
            </div>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#2f1b12]">“{starter}”</p>
          </article>
        ))}
      </div>
    </div>
  );
}
