import { Mic, MessageCircle, PenLine, UserPlus, X } from "lucide-react";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onQuickCapture: () => void;
  onAddPerson: () => void;
}

export default function QuickRecordSheet({ isOpen, onClose, onQuickCapture, onAddPerson }: Props) {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const actions = [
    { icon: Mic, title: "말로 기록하기", desc: "친구를 만나고 돌아오는 길에 간단히 말해보세요." },
    { icon: MessageCircle, title: "대화 붙여넣기", desc: "카카오톡이나 메신저 대화를 붙여넣으면 AI가 정리합니다." },
    { icon: PenLine, title: "직접 기록하기", desc: "기억하고 싶은 내용을 직접 작성합니다." }
  ];

  return (
    <div className="saram-sheet-overlay" onClick={onClose}>
      <section onClick={(event) => event.stopPropagation()} className="saram-sheet p-4">
        <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-[#cdb7a7]" />
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">오늘 누구의 이야기를<br />담을까요? 🧡</h2>
          <button onClick={onClose} className="rounded-full bg-[#f6eadf] p-2 text-[#2f1b12]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.title} onClick={onQuickCapture} className="flex w-full items-center gap-4 rounded-2xl border border-[#ead8c9] bg-white/70 p-4 text-left">
                <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#f7d8c7] text-[#d85b36]">
                  <Icon className="h-7 w-7" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{action.title}</span>
                  <span className="mt-1 block text-sm leading-[1.6] text-[#7c6252]">{action.desc}</span>
                </span>
              </button>
            );
          })}
          <button onClick={onAddPerson} className="mt-5 flex w-full items-center gap-4 rounded-2xl border border-[#ead8c9] bg-white/70 p-4 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f6eadf] text-[#2f1b12]">
              <UserPlus className="h-6 w-6" />
            </span>
            <span className="text-[15px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">새로운 사람 추가하기</span>
          </button>
        </div>
      </section>
    </div>
  );
}
