import React, { useState, useEffect } from "react";
import { Person } from "../types";
import { calculateAge } from "../utils/age";
import { X, Clock, Sparkles, Smile, MessageSquare, Briefcase, Heart, Baby, UtensilsCrossed, Dumbbell } from "lucide-react";
import { motion } from "motion/react";

interface ReviewModalProps {
  person: Person;
  onClose: () => void;
}

const getRelationBadgeClass = (category: string) => {
  switch (category) {
    case "가족":
      return "text-[10px] bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full font-bold border border-rose-200";
    case "친구":
      return "text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-bold border border-blue-200";
    case "지인":
      return "text-[10px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-bold border border-amber-200";
    case "회사-업무":
      return "text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200";
    case "회사-동료":
      return "text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold border border-slate-200";
    default:
      return "text-[10px] bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-full font-bold border border-purple-200";
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
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const getQuickTips = (p: Person) => {
    const tips: string[] = [];

    if (p.category === "회사-업무" || p.category === "회사-동료") {
      tips.push("최근 회사 업무 상태 및 프로젝트 소식을 먼저 질문해 보세요.");
    }
    if (p.familyInfo.children.length > 0) {
      const childNames = p.familyInfo.children.map(c => c.name).join(", ");
      tips.push(`자녀들(${childNames})의 안부와 성장 근황을 질문하면 대화가 수월해집니다.`);
    }
    if (p.preferences.food) {
      tips.push(`음식 취향을 참고해 미리 메뉴를 준비해 보는 건 어떨까요?`);
    }
    if (p.preferences.hobbies) {
      tips.push(`관심 있는 취미(${p.preferences.hobbies})에 공감해 주세요.`);
    }
    if (tips.length === 0) {
      tips.push("오랜만에 만난 반가움을 담아 눈을 맞추며 가볍게 인사해 보세요.");
      tips.push("상대방의 최근 일상 소식을 주의 깊게 경청하고 리액션해 보세요.");
    }

    return tips;
  };

  const tips = getQuickTips(person);

  return (
    <div id="review-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden font-sans flex flex-col border border-slate-200"
      >
        <div className="p-7 sm:p-8 flex flex-col space-y-5">

          <div className="flex items-start justify-between pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full uppercase tracking-wider">1-Min Quick Review</span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">{person.name}님과의 미팅 1분 전</h2>
            </div>
            <button id="close-review-modal-btn" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`p-4 rounded-xl flex items-center justify-between transition-all duration-500 border ${isCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-teal-50 border-teal-200 text-teal-700"}`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${isCompleted ? "text-emerald-600" : "text-teal-600 animate-pulse"}`} />
              <div>
                <p className="text-[11px] text-slate-500 font-medium">권장 복습 시간</p>
                <p className="text-xs font-bold leading-tight">{isCompleted ? "복습 완료! 이제 들어가셔도 좋습니다" : `핵심 리마인드 (${timeLeft}초 남음)`}</p>
              </div>
            </div>
            <div className="text-xl font-mono font-bold text-slate-900 px-3.5 py-1 bg-white rounded-lg border border-slate-200">
              {timeLeft > 0 ? `00:${timeLeft.toString().padStart(2, "0")}` : "00:00"}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-h-[40vh] overflow-y-auto">

            <div className="flex items-start gap-3">
              <div className={`w-14 h-14 text-3xl rounded-xl ${person.avatarBg} flex items-center justify-center shrink-0`}>{person.avatarEmoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900 leading-none">{person.name}</h3>
                  <span className={getRelationBadgeClass(person.category)}>{person.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 font-medium"><Briefcase className="w-3.5 h-3.5" /> {person.company || "소속 없음"}</p>
                {person.phone && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono font-medium">📞 {person.phone}</p>}
              </div>
            </div>

            {(person.preferences.food || person.preferences.hobbies) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {person.preferences.food && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1"><UtensilsCrossed className="w-3.5 h-3.5" /> 음식</div>
                    <p className="text-slate-700">{person.preferences.food}</p>
                  </div>
                )}
                {person.preferences.hobbies && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-teal-800 mb-1"><Dumbbell className="w-3.5 h-3.5" /> 취미</div>
                    <p className="text-slate-700">{person.preferences.hobbies}</p>
                  </div>
                )}
              </div>
            )}

            {person.groups.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {person.groups.map(g => <span key={g} className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded font-medium">#{g}</span>)}
              </div>
            )}

            {(person.familyInfo?.spouseName || person.familyInfo?.children.length > 0) && (
              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700"><Heart className="w-4 h-4" /> <span>가족 정보</span></div>
                <div className="space-y-2 text-xs">
                  {person.familyInfo?.spouseName && (
                    <p className="flex items-center gap-1.5 bg-white p-2 rounded-lg text-slate-700"><span className="text-slate-400 font-medium">배우자:</span><span className="font-bold text-slate-900">{person.familyInfo.spouseName}님</span></p>
                  )}
                  {person.familyInfo.children.map((child, idx) => {
                    const age = child.birthDate ? calculateAge(child.birthDate) : null;
                    return (
                      <div key={idx} className="flex items-start gap-1.5 bg-white p-2.5 rounded-lg text-slate-700">
                        <Baby className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900">{child.name}</span>
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium ml-1.5">{age || child.ageOrBirth}</span>
                          {child.memo && <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md italic mt-1">{child.memo}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {person.preferences.notes && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Sparkles className="w-4 h-4 text-teal-600" /> <span>특이사항</span></div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{person.preferences.notes}</p>
              </div>
            )}

            {person.history && person.history.length > 0 ? (
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                  <div className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /><span>최근 대화 요약</span></div>
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{person.history[0].date} ({person.history[0].medium})</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1 whitespace-pre-line pl-2 border-l-2 border-blue-300">{person.history[0].summary}</div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-200"><p className="text-xs text-slate-400 font-medium">최근 대화 기록이 아직 없습니다.</p></div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Smile className="w-4 h-4 text-teal-600" /> 대화 시작 팁</h4>
            <ul className="space-y-1.5">
              {tips.map((tip, idx) => <li key={idx} className="text-xs text-slate-600 leading-relaxed pl-1">• {tip}</li>)}
            </ul>
          </div>

          <button id="confirm-review-finished-btn" onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all text-sm flex items-center justify-center gap-2 mt-2">
            <Smile className="w-4.5 h-4.5" /> 복습 완료! 미팅 시작하기
          </button>

        </div>
      </motion.div>
    </div>
  );
}
