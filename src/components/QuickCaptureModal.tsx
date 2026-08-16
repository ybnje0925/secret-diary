import React, { useState, useRef, useEffect } from "react";
import { Person, ChildInfo } from "../types";
import { X, Mic, Square, Sparkles, Check, Loader2, AlertCircle, MessageSquare, CheckCircle2, PenLine } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuickCaptureModalProps {
  people: Person[];
  selectedPersonId?: string;
  onClose: () => void;
  onUpdatePerson: (updatedPerson: Person) => void;
  onAddPerson: (newPerson: Person) => void;
}

// Web Speech API isn't in the standard TS lib yet — Chrome/Android Chrome
// expose it as a vendor-prefixed constructor on window.
function getSpeechRecognitionCtor(): any {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function QuickCaptureModal({
  people,
  selectedPersonId,
  onClose,
  onUpdatePerson,
  onAddPerson
}: QuickCaptureModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "summarize">("voice");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [targetName, setTargetName] = useState("");

  // Voice memo tab
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [memoSaved, setMemoSaved] = useState(false);
  const recognitionRef = useRef<any>(null);

  // AI summarize tab
  const [scriptText, setScriptText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<any | null>(null);
  const [applied, setApplied] = useState(false);

  const speechSupported = !!getSpeechRecognitionCtor();

  useEffect(() => {
    if (selectedPersonId) {
      const p = people.find(x => x.id === selectedPersonId) || null;
      setSelectedPerson(p);
      if (p) setTargetName(p.name);
    } else if (people.length > 0) {
      setSelectedPerson(people[0]);
      setTargetName(people[0].name);
    }
  }, [selectedPersonId, people]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError("이 브라우저는 음성 인식을 지원하지 않습니다. 안드로이드 Chrome을 사용해 주세요.");
      return;
    }
    setVoiceError(null);
    setMemoSaved(false);
    setTranscript("");

    const recognition = new Ctor();
    recognition.lang = "ko-KR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event: any) => {
      setVoiceError(
        event.error === "not-allowed"
          ? "마이크 권한이 필요합니다. 브라우저 설정을 확인해 주세요."
          : "음성 인식 중 오류가 발생했습니다. 다시 시도해 주세요."
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleSaveVoiceMemo = () => {
    if (!selectedPerson || !transcript.trim()) return;
    const stamp = new Date().toISOString().split("T")[0];
    const updatedNotes = selectedPerson.preferences.notes
      ? `${selectedPerson.preferences.notes}\n[${stamp}] ${transcript.trim()}`
      : `[${stamp}] ${transcript.trim()}`;

    onUpdatePerson({
      ...selectedPerson,
      preferences: { ...selectedPerson.preferences, notes: updatedNotes }
    });
    setMemoSaved(true);
    setTimeout(() => onClose(), 1200);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiProposal(null);
    setApplied(false);

    try {
      const response = await fetch("/api/summarize-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPersonName: selectedPerson ? selectedPerson.name : targetName,
          scriptText
        })
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const rawText = await response.text();
        console.error("Non-JSON response from /api/summarize-text:", response.status, rawText.slice(0, 300));
        throw new Error(
          response.status === 413
            ? "입력한 텍스트가 너무 깁니다. 조금 줄여서 다시 시도해 주세요."
            : "서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요."
        );
      }

      let data: any;
      try {
        data = JSON.parse(await response.text());
      } catch {
        throw new Error("AI 서버 응답 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.");
      }
      if (!response.ok || !data.success) {
        throw new Error(data.error || "AI 연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.");
      }

      setAiProposal(data.data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "대화 텍스트 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyProposal = () => {
    if (!aiProposal) return;

    const personName = aiProposal.detectedPersonName || targetName || "새 친구";
    let targetPerson = selectedPerson;
    if (!targetPerson) {
      targetPerson = people.find(p => p.name.trim() === personName.trim()) || null;
    }

    const newHistoryItem = {
      id: "h_" + Date.now(),
      date: aiProposal.lastContactDate || new Date().toISOString().split("T")[0],
      medium: aiProposal.lastContactMedium || "통화",
      summary: aiProposal.summary || "대화 분석 요약",
      rawTranscript: scriptText || ""
    };

    if (targetPerson) {
      const updatedChildren: ChildInfo[] = [...targetPerson.familyInfo.children];
      if (Array.isArray(aiProposal.newFamilyDetails)) {
        aiProposal.newFamilyDetails.forEach((newChild: any) => {
          const exists = updatedChildren.some(c => c.name.trim() === newChild.name.trim());
          if (!exists && newChild.name) {
            updatedChildren.push({ name: newChild.name, ageOrBirth: newChild.ageOrBirth || "", memo: newChild.memo || "" });
          }
        });
      }

      let updatedNotes = targetPerson.preferences.notes;
      if (Array.isArray(aiProposal.newMemoInsights) && aiProposal.newMemoInsights.length > 0) {
        const insightsStr = aiProposal.newMemoInsights.map((insight: string) => `• ${insight}`).join("\n");
        updatedNotes = updatedNotes ? `${updatedNotes}\n\n[AI 추가 메모]:\n${insightsStr}` : `[AI 추가 메모]:\n${insightsStr}`;
      }

      onUpdatePerson({
        ...targetPerson,
        lastContactDate: newHistoryItem.date,
        lastContactMedium: newHistoryItem.medium as any,
        familyInfo: { ...targetPerson.familyInfo, children: updatedChildren },
        preferences: { ...targetPerson.preferences, notes: updatedNotes },
        history: [newHistoryItem, ...targetPerson.history]
      });
    } else {
      const childrenList: ChildInfo[] = [];
      if (Array.isArray(aiProposal.newFamilyDetails)) {
        aiProposal.newFamilyDetails.forEach((newChild: any) => {
          if (newChild.name) {
            childrenList.push({ name: newChild.name, ageOrBirth: newChild.ageOrBirth || "", memo: newChild.memo || "" });
          }
        });
      }
      const notesText = Array.isArray(aiProposal.newMemoInsights) ? aiProposal.newMemoInsights.join("\n") : "";

      onAddPerson({
        id: "p_" + Date.now(),
        name: personName,
        phone: "",
        company: "",
        category: "지인",
        groups: [],
        familyInfo: { children: childrenList },
        preferences: { food: "", hobbies: "", notes: notesText },
        eventsHistory: [],
        avatarEmoji: "👤",
        avatarBg: "bg-slate-100 text-slate-800",
        lastContactDate: newHistoryItem.date,
        lastContactMedium: newHistoryItem.medium as any,
        history: [newHistoryItem]
      });
    }

    setApplied(true);
    setTimeout(() => onClose(), 1200);
  };

  const personPicker = (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">대상 인물</label>
      <select
        value={selectedPerson ? selectedPerson.id : ""}
        onChange={(e) => {
          const id = e.target.value;
          if (id === "new") {
            setSelectedPerson(null);
            setTargetName("");
          } else {
            const p = people.find(x => x.id === id) || null;
            setSelectedPerson(p);
            if (p) setTargetName(p.name);
          }
        }}
        className="w-full text-[15px] bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 font-medium text-slate-700"
      >
        {people.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
        ))}
        <option value="new">🆕 새 인물로 등록</option>
      </select>
    </div>
  );

  return (
    <div id="quick-capture-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden font-sans max-h-[90vh] flex flex-col border border-slate-200"
      >
        <div className="pt-5 px-6 pb-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold text-slate-900">빠른 기록</h2>
          <button
            id="close-quick-capture-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 hover:bg-slate-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-3 flex gap-2 shrink-0">
          <button
            id="tab-voice-btn"
            onClick={() => setActiveTab("voice")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "voice" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> 3초 음성 메모
          </button>
          <button
            id="tab-summarize-btn"
            onClick={() => setActiveTab("summarize")}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "summarize" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> 대화 붙여넣고 요약
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "voice" && (
            <div className="space-y-4">
              {personPicker}

              {!speechSupported && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  이 브라우저는 음성 인식을 지원하지 않습니다. 안드로이드 Chrome에서 사용해 주세요.
                </p>
              )}

              <div className="border border-slate-200 bg-slate-50 rounded-xl p-5 flex flex-col items-center justify-center space-y-3 min-h-[120px]">
                {isListening ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                    <span className="text-xs font-medium text-rose-600">듣고 있어요...</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">버튼을 누르고 한 줄만 말해보세요</p>
                )}

                {!isListening ? (
                  <button
                    id="start-voice-memo-btn"
                    type="button"
                    disabled={!speechSupported}
                    onClick={startListening}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-black disabled:opacity-30 text-white text-xs font-medium rounded-full transition-all flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" /> 녹음 시작
                  </button>
                ) : (
                  <button
                    id="stop-voice-memo-btn"
                    type="button"
                    onClick={stopListening}
                    className="py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-full transition-all flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" /> 중지
                  </button>
                )}
              </div>

              {transcript && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500 flex items-center gap-1">
                    <PenLine className="w-3.5 h-3.5" /> 인식된 텍스트 (수정 가능)
                  </label>
                  <textarea
                    id="voice-transcript-textarea"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="w-full h-20 text-[15px] bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-600/20 resize-none text-slate-700"
                  />
                  <button
                    id="save-voice-memo-btn"
                    type="button"
                    onClick={handleSaveVoiceMemo}
                    disabled={!selectedPerson || memoSaved}
                    className="w-full py-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {memoSaved ? (<><CheckCircle2 className="w-4 h-4" /> 메모에 추가됨</>) : (<><Check className="w-4 h-4" /> 이 인물의 메모에 추가</>)}
                  </button>
                </div>
              )}

              {voiceError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {voiceError}
                </p>
              )}
            </div>
          )}

          {activeTab === "summarize" && (
            <div className="space-y-4">
              {personPicker}

              {!selectedPerson && (
                <input
                  type="text"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="새 지인 이름"
                  className="w-full text-[15px] bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700"
                />
              )}

              <textarea
                id="summarize-script-textarea"
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="카톡 대화나 통화 후 메모를 붙여넣어 주세요. 예) 오늘 철수랑 통화했는데 첫째가 초등학교 입학했다고..."
                className="w-full h-32 text-[15px] bg-white border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-600/20 resize-none text-slate-700"
              />

              <button
                id="analyze-text-btn"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !scriptText.trim()}
                className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-30 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                {isAnalyzing ? (<><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>) : (<><Sparkles className="w-4 h-4" /> AI 요약 시작</>)}
              </button>

              {analysisError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {analysisError}
                </p>
              )}

              <AnimatePresence>
                {aiProposal && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-1.5 text-slate-900 font-medium text-xs">
                      <MessageSquare className="w-4 h-4 text-teal-700" /> AI 분석 결과
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p><span className="text-slate-400">대상:</span> <span className="font-medium text-slate-900">{aiProposal.detectedPersonName}</span></p>
                      <p><span className="text-slate-400">날짜:</span> {aiProposal.lastContactDate} ({aiProposal.lastContactMedium})</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-line">
                      {aiProposal.summary}
                    </div>
                    <button
                      id="apply-quick-capture-proposal-btn"
                      onClick={handleApplyProposal}
                      disabled={applied}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      {applied ? (<><CheckCircle2 className="w-4 h-4" /> 반영 완료</>) : (<><Check className="w-4 h-4" /> 이 내용 반영하기</>)}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
