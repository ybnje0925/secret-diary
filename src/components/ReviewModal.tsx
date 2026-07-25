import React, { useState, useEffect } from "react";
import { Person } from "../types";
import { X, Clock, HelpCircle, Star, Sparkles, Smile, MessageSquare, Briefcase, Heart, Baby, Gift, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReviewModalProps {
  person: Person;
  onClose: () => void;
}

const getRelationBadgeClass = (category: string) => {
  switch (category) {
    case "가족":
      return "text-[10px] bg-[#fdf2f2] text-[#ef4444] px-2.5 py-0.5 rounded-full font-bold border border-[#fecaca]";
    case "친구":
      return "text-[10px] bg-[#eff6ff] text-[#3b82f6] px-2.5 py-0.5 rounded-full font-bold border border-[#dbeafe]";
    case "지인":
      return "text-[10px] bg-[#fff9f0] text-[#ea580c] px-2.5 py-0.5 rounded-full font-bold border border-[#ffedd5]";
    case "회사-업무":
      return "text-[10px] bg-[#f0fdf4] text-[#22c55e] px-2.5 py-0.5 rounded-full font-bold border border-[#dcfce7]";
    case "회사-동료":
      return "text-[10px] bg-[#fafaf9] text-[#78716c] px-2.5 py-0.5 rounded-full font-bold border border-[#e7e5e4]";
    default:
      return "text-[10px] bg-stone-50 text-stone-600 px-2.5 py-0.5 rounded-full font-bold border border-stone-200";
  }
};

export default function ReviewModal({ person, onClose }: ReviewModalProps) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsCompleted(true);
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Generate a customized quick-tip based on the person's records
  const getQuickTips = (p: Person) => {
    const tips: string[] = [];
    
    if (p.category === "회사-업무" || p.category === "회사-동료") {
      tips.push("💼 최근 회사 업무 상태 및 프로젝트 소식을 먼저 질문해 보세요.");
    }
    if (p.familyInfo.children.length > 0) {
      const childNames = p.familyInfo.children.map(c => c.name).join(", ");
      tips.push("👶 자녀들(" + childNames + ")의 안부와 성장 근황을 질문하면 대화가 수월해집니다.");
    }
    if (p.memo.includes("커피") || p.memo.includes("라떼") || p.memo.includes("에이드") || p.memo.includes("차")) {
      tips.push("☕ 좋아하는 음료 취향을 사전에 파악하여 미리 주문해 보는 건 어떨까요?");
    }
    if (p.memo.includes("골프") || p.memo.includes("테니스") || p.memo.includes("캠핑") || p.memo.includes("여행")) {
      tips.push("🏃 상대방이 몰입하고 있는 취미(골프/테니스/운동 등) 활동에 공감해 주세요.");
    }
    
    // Fallback default tips
    if (tips.length === 0) {
      tips.push("✨ 오랜만에 만난 반가움을 담아 눈을 맞추며 가볍게 인사해 보세요.");
      tips.push("💬 상대방의 최근 일상 소식을 주의 깊게 경청하고 리액션해 보세요.");
    }
    
    return tips;
  };

  const tips = getQuickTips(person);

  return (
    <div id="review-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#352f28]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden font-sans flex flex-col border border-[#ece5d8]"
      >
        {/* Top Gradient bar */}
        <div className="h-2.5 bg-gradient-to-r from-[#ff6b6b] to-[#ff9f43] shrink-0"></div>

        {/* Main Content Area (Spacious Diary Pad style) */}
        <div className="p-8 sm:p-10 flex flex-col space-y-5">
          
          {/* Header & Countdown Timer */}
          <div className="flex items-start justify-between pb-4 border-b border-[#ece5d8]">
            <div>
              <span className="text-[10px] font-bold bg-[#fdf2f2] text-[#ef4444] px-2.5 py-1 rounded-full uppercase tracking-wider border border-[#fecaca]">
                Meeting 1-Min Quick Review
              </span>
              <h2 className="text-2xl font-serif font-bold text-[#352f28] mt-2">
                {person.name}님과의 미팅 1분 전!
              </h2>
            </div>
            <button
              id="close-review-modal-btn"
              onClick={onClose}
              className="text-[#a39788] hover:text-[#ff6b6b] transition-colors p-1.5 hover:bg-[#f3f0ea] rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timer Card */}
          <div className={`p-4 rounded-2xl flex items-center justify-between transition-all duration-500 border ${isCompleted ? 'bg-[#f0fdf4] border-[#dcfce7] text-[#22c55e]' : 'bg-[#fff9f0] border-[#ffedd5] text-[#ea580c]'}`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${isCompleted ? 'text-[#22c55e] animate-bounce' : 'text-[#ea580c] animate-pulse'}`} />
              <div>
                <p className="text-[11px] text-[#7c7267] font-medium">권장 복습 시간</p>
                <p className={`text-xs font-bold leading-tight ${isCompleted ? 'text-emerald-800' : 'text-[#ea580c]'}`}>
                  {isCompleted ? "복습 완료! 이제 들어가셔도 좋습니다 👍" : `미팅 전 핵심 리마인드 페이스 (${timeLeft}초 남음)`}
                </p>
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-[#352f28] px-3.5 py-1 bg-white rounded-xl border border-[#ece5d8] shadow-sm">
              {timeLeft > 0 ? `00:${timeLeft.toString().padStart(2, '0')}` : "00:00"}
            </div>
          </div>

          {/* Core Profile Sheet */}
          <div className="bg-white border border-[#ece5d8] rounded-3xl p-6 shadow-sm space-y-4 max-h-[40vh] overflow-y-auto">
            
            {/* Top row with category & company */}
            <div className="flex items-start gap-3">
              <div className={`w-14 h-14 text-3xl rounded-2xl ${person.avatarBg} shadow-inner flex items-center justify-center shrink-0`}>
                {person.avatarEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-serif font-bold text-[#352f28] leading-none">{person.name}</h3>
                  <span className={getRelationBadgeClass(person.category)}>
                    {person.category}
                  </span>
                </div>
                <p className="text-xs text-[#a39788] mt-1.5 flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5" /> {person.company || "소속 없음"}
                </p>
                {person.phone && (
                  <p className="text-xs text-[#a39788] flex items-center gap-1 mt-0.5 font-mono font-medium">
                    📞 {person.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Custom Groups */}
            {person.groups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {person.groups.map(g => (
                  <span key={g} className="text-[10px] bg-[#f3f0ea] text-[#7c7267] px-2.5 py-0.5 rounded border border-[#ece5d8]/40 font-medium">
                    #{g}
                  </span>
                ))}
              </div>
            )}

            {/* Highlighted Child & Spouse Info (★Cuteness Overload) */}
            {person.familyInfo && (person.familyInfo.spouseName || person.familyInfo.children.length > 0) && (
              <div className="p-4 bg-[#fdf2f2] rounded-3xl border border-[#fecaca] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#ef4444]">
                  <Heart className="w-4 h-4 text-[#ff6b6b] fill-[#ff6b6b]" />
                  <span>소중한 가족 정보 (자녀/배우자)</span>
                </div>
                <div className="space-y-2 text-xs">
                  {person.familyInfo.spouseName && (
                    <p className="flex items-center gap-1.5 bg-white/60 p-2 rounded-xl border border-[#fecaca]/10 text-[#4a433a]">
                      <span className="text-[#7c7267] font-medium">배우자:</span>
                      <span className="font-bold text-[#352f28]">{person.familyInfo.spouseName}님</span>
                    </p>
                  )}
                  {person.familyInfo.children.map((child, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 bg-white/90 p-2.5 rounded-xl border border-[#fecaca]/30 shadow-sm text-[#4a433a]">
                      <Baby className="w-3.5 h-3.5 text-[#ff6b6b] mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-[#352f28]">{child.name}</span>
                        <span className="text-[10px] text-[#7c7267] bg-[#f3f0ea] px-1.5 py-0.5 rounded font-medium border border-[#ece5d8]/30 ml-1.5">
                          {child.ageOrBirth}
                        </span>
                        {child.memo && (
                          <p className="text-[11px] text-[#7c7267] bg-[#fff9f0]/40 p-2 rounded-lg italic border border-[#ffedd5]/30 mt-1">
                            💡 {child.memo}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Notes / Hobbies */}
            {person.memo && (
              <div className="p-4 bg-[#fff9f0] rounded-2xl border border-[#ffedd5]/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#352f28]">
                  <Sparkles className="w-4 h-4 text-[#ff6b6b]" />
                  <span>특이사항 및 음식 취향</span>
                </div>
                <p className="text-xs text-[#4a433a] leading-relaxed italic whitespace-pre-wrap">
                  "{person.memo}"
                </p>
              </div>
            )}

            {/* Last Talk Key History Highlights */}
            {person.history && person.history.length > 0 ? (
              <div className="p-4 bg-[#eff6ff]/70 rounded-2xl border border-[#dbeafe] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#3b82f6]">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#3b82f6]" />
                    <span>최근 대화 3줄 핵심 요약</span>
                  </div>
                  <span className="text-[9px] bg-[#dbeafe] text-[#1e40af] px-1.5 py-0.5 rounded font-mono">
                    {person.history[0].date} ({person.history[0].medium})
                  </span>
                </div>
                <div className="text-xs text-[#4a433a] space-y-1 whitespace-pre-line pl-2 border-l-2 border-[#3b82f6]/40">
                  {person.history[0].summary}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#f3f0ea]/50 rounded-2xl text-center border border-[#ece5d8]">
                <p className="text-xs text-[#a39788] font-medium">최근 대화 히스토리가 아직 없습니다.</p>
              </div>
            )}
          </div>

          {/* Quick Conversation Tip List */}
          <div className="bg-[#fff9f0] border border-[#ff6b6b]/20 rounded-3xl p-5">
            <h4 className="text-xs font-bold text-[#352f28] uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-[#ff6b6b]" />
              Yong-jja's Conversation Opening Tips 💡
            </h4>
            <ul className="space-y-1.5">
              {tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-[#4a433a] leading-relaxed pl-1">
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Complete Checklist button */}
          <button
            id="confirm-review-finished-btn"
            onClick={onClose}
            className="w-full bg-[#352f28] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200 text-sm flex items-center justify-center gap-2 mt-2"
          >
            <Smile className="w-4.5 h-4.5" /> 복습 완료! 미팅 시작하기
          </button>

        </div>
      </motion.div>
    </div>
  );
}
