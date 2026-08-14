import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { BrandTitle } from "../components/LockScreen";

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

const pages = [
  {
    icon: "👥",
    title: "사람을 담아요",
    body: "가족, 친구, 동료처럼\n기억하고 싶은 사람부터 담아보세요."
  },
  {
    icon: "🌿",
    title: "이야기를 담아요",
    body: "함께 나눈 작은 이야기를 기록하면\n사람談이 기억할 내용을 정리해드려요."
  },
  {
    icon: "💬",
    title: "다시 이어가요",
    body: "오랜만에 연락하고 싶을 때\n무슨 이야기를 꺼낼지 알려드려요."
  }
];

export default function OnboardingView({ onComplete, onSkip }: Props) {
  const [index, setIndex] = useState(0);
  const page = pages[index];
  const isLast = index === pages.length - 1;

  return (
    <div className="flex min-h-[calc(100svh-7rem)] flex-col justify-between py-4 text-center">
      <header className="space-y-2">
        <BrandTitle />
        <p className="text-sm leading-relaxed text-[#7c6252]">소중한 사람들의 이야기를 담아두세요.</p>
        <p className="mx-auto max-w-xs whitespace-pre-line text-[15px] font-extrabold leading-relaxed text-[#2f1b12]">
          만나고 나서는 기록하고,{"\n"}다시 만나기 전에는 기억하세요.
        </p>
      </header>

      <section className="mx-auto w-full max-w-sm rounded-[22px] border border-[#ead8c9] bg-[#fffaf3] p-5 shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#fff0e3] text-3xl">{page.icon}</div>
        <p className="mt-5 text-xs font-black text-[#d85b36]">0{index + 1}</p>
        <h1 className="mt-1 text-[22px] font-black text-[#2f1b12]">{page.title}</h1>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#5e473a]">{page.body}</p>
      </section>

      <footer className="space-y-4">
        <div className="flex justify-center gap-1.5">
          {pages.map((item, dotIndex) => (
            <button
              key={item.title}
              onClick={() => setIndex(dotIndex)}
              aria-label={`${dotIndex + 1}번째 안내 보기`}
              className={`h-2 rounded-full transition-all ${dotIndex === index ? "w-5 bg-[#d85b36]" : "w-2 bg-[#ead8c9]"}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8c9] bg-white text-[#5a392a] disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => isLast ? onComplete() : setIndex((value) => value + 1)}
            className="h-11 rounded-full bg-[#d85b36] text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(216,91,54,0.18)]"
          >
            {isLast ? "사람談 시작하기" : "다음"}
          </button>
          <button
            type="button"
            onClick={() => isLast ? onComplete() : setIndex((value) => value + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ead8c9] bg-white text-[#5a392a]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <button type="button" onClick={onSkip} className="text-xs font-extrabold text-[#8d5b45]">건너뛰기</button>
      </footer>
    </div>
  );
}
