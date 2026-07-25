import React, { useState, useRef, useEffect } from "react";
import { Person, ChildInfo, CategoryType } from "../types";
import { X, Mic, Upload, Sparkles, Check, Play, Square, Loader2, AlertCircle, MessageSquare, Plus, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AudioAnalysisModalProps {
  people: Person[];
  selectedPersonId?: string;
  onClose: () => void;
  onUpdatePerson: (updatedPerson: Person) => void;
  onAddPerson: (newPerson: Person) => void;
}

interface SimulatedScript {
  title: string;
  emoji: string;
  text: string;
  speaker: string;
}

const PRESET_SCRIPTS: SimulatedScript[] = [
  {
    title: "김용우 대표와 테니스 뒷풀이 수다",
    emoji: "🎾",
    speaker: "김용우",
    text: "오늘 용우형이랑 테니스 치고 삼겹살 먹으면서 얘기했다. 형이 다음 달 테니스 동호회 월례 대회 복식 파트너로 같이 나가자더라. 첫째 하진이가 초등학교 입학했는데 최근 어린이 테니스 교실을 시작해서 라켓에 흥미가 엄청 높대. 아내 지아 누나는 요즘 향이 좋은 아로마 테라피에 빠졌다고 선물용으로 딱이라고 귀띔해 줬다. 용우형은 역시 숯불구이에 차가운 사이다 마실 때가 제일 행복하다네."
  },
  {
    title: "이지연 디자이너 자녀 육아 통화",
    emoji: "🍼",
    speaker: "이지연",
    text: "지연이랑 통화함. 아들 우진이가 벌써 6살인데 영어 유치원 블루반에 들어간 이후로 아주 신나게 적응 중이래. 요즘 맨날 자동차 장난감만 조립하고 논다고 자랑하더라. 우진이가 우유 알레르기가 심한데, 이번 유치원 급식에서 락토프리 음료 조절을 신경 써줘서 다행이래. 성수에 유명한 비건 에스프레소 바 오픈했던데 조만간 주말에 꼭 같이 가기로 약속함."
  },
  {
    title: "박철진 부장님 골프 & 맛집 대면",
    emoji: "⛳",
    speaker: "박철진 부장",
    text: "오늘 한국테크솔루션 박철진 부장님하고 중구 노포에서 식사 자리가 있었음. 부장님이 주말에 아내 수경님이랑 강원도 골프 라운딩을 다녀왔는데 아주 즐거우셨던 눈치임. 하반기 부품 구매 조달 계획 조율도 아주 부드럽게 완료. 조만간 날씨 추워지기 전에 두 내외 분 드시라고 명절 한과 세트를 미리 발송하면 엄청 감동받으실 듯."
  }
];

export default function AudioAnalysisModal({
  people,
  selectedPersonId,
  onClose,
  onUpdatePerson,
  onAddPerson
}: AudioAnalysisModalProps) {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [targetName, setTargetName] = useState("");
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [scriptText, setScriptText] = useState("");
  
  // Processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Proposal state
  const [aiProposal, setAiProposal] = useState<any | null>(null);
  const [applied, setApplied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Sync selected person based on props or dropdown
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

  // Handle timer for microphone recording
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start live audio recording
  const startRecording = async () => {
    try {
      setAnalysisError(null);
      setAudioBlob(null);
      setAudioBase64(null);
      setUploadedFileName("");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        
        // Convert blob to base64 for submission
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Extract base64 part only
          const rawBase64 = base64data.split(",")[1];
          setAudioBase64(rawBase64);
        };

        // Stop all track streams
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setAnalysisError("마이크 제어 권한을 획득하지 못했습니다. 브라우저 설정을 확인해 주세요.");
    }
  };

  // Stop live audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle custom audio file upload selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError(null);
    setUploadedFileName(file.name);
    setAudioBlob(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const rawBase64 = base64data.split(",")[1];
      setAudioBase64(rawBase64);
      
      // Auto fill a mock script hint if it's a test file or preset name matches
      if (!scriptText) {
        setScriptText(`[${file.name} 분석 대기 중]`);
      }
    };
  };

  // Apply simulated script
  const applyPresetScript = (script: SimulatedScript) => {
    setScriptText(script.text);
    // Auto sync person in dropdown if possible
    const matched = people.find(p => p.name.includes(script.speaker) || script.speaker.includes(p.name));
    if (matched) {
      setSelectedPerson(matched);
      setTargetName(matched.name);
    } else {
      setTargetName(script.speaker);
    }
  };

  // Trigger Gemini API via backend Express
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiProposal(null);
    setApplied(false);

    try {
      const payload: any = {
        selectedPersonName: selectedPerson ? selectedPerson.name : targetName,
        scriptText: scriptText,
      };

      if (audioBase64) {
        payload.base64Data = audioBase64;
        payload.mimeType = "audio/wav";
      }

      const response = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "분석 요청 중 오류가 발생했습니다.");
      }

      setAiProposal(data.data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || "오디오 또는 텍스트 대화 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Apply proposal back to the local database
  const handleApplyProposal = () => {
    if (!aiProposal) return;

    const personName = aiProposal.detectedPersonName || targetName || "새 친구";
    let targetPerson = selectedPerson;

    // If no existing person, let's create a new person!
    if (!targetPerson) {
      targetPerson = people.find(p => p.name.trim() === personName.trim()) || null;
    }

    const newHistoryItem = {
      id: "h_" + Date.now(),
      date: aiProposal.lastContactDate || new Date().toISOString().split("T")[0],
      medium: aiProposal.lastContactMedium || "통화",
      summary: aiProposal.summary || "대화 분석 요약",
      rawTranscript: scriptText || "음성 녹음 대화"
    };

    if (targetPerson) {
      // 1. Update Existing Person
      const updatedChildren = [...targetPerson.familyInfo.children];
      
      // Merge newly proposed child info
      if (aiProposal.newFamilyDetails && Array.isArray(aiProposal.newFamilyDetails)) {
        aiProposal.newFamilyDetails.forEach((newChild: any) => {
          const exists = updatedChildren.some(c => c.name.trim() === newChild.name.trim());
          if (!exists && newChild.name) {
            updatedChildren.push({
              name: newChild.name,
              ageOrBirth: newChild.ageOrBirth || "",
              memo: newChild.memo || ""
            });
          }
        });
      }

      // Merge new memo insights to the memo text
      let updatedMemo = targetPerson.memo;
      if (aiProposal.newMemoInsights && Array.isArray(aiProposal.newMemoInsights) && aiProposal.newMemoInsights.length > 0) {
        const insightsStr = aiProposal.newMemoInsights.map((insight: string) => `• ${insight}`).join("\n");
        updatedMemo = updatedMemo 
          ? `${updatedMemo}\n\n[AI 추가 메모]:\n${insightsStr}`
          : `[AI 추가 메모]:\n${insightsStr}`;
      }

      const updated: Person = {
        ...targetPerson,
        lastContactDate: newHistoryItem.date,
        lastContactMedium: newHistoryItem.medium as any,
        familyInfo: {
          ...targetPerson.familyInfo,
          children: updatedChildren
        },
        memo: updatedMemo,
        history: [newHistoryItem, ...targetPerson.history]
      };

      onUpdatePerson(updated);
    } else {
      // 2. Create New Person
      const childrenList: ChildInfo[] = [];
      if (aiProposal.newFamilyDetails && Array.isArray(aiProposal.newFamilyDetails)) {
        aiProposal.newFamilyDetails.forEach((newChild: any) => {
          if (newChild.name) {
            childrenList.push({
              name: newChild.name,
              ageOrBirth: newChild.ageOrBirth || "",
              memo: newChild.memo || ""
            });
          }
        });
      }

      const memoText = aiProposal.newMemoInsights && Array.isArray(aiProposal.newMemoInsights)
        ? aiProposal.newMemoInsights.join("\n")
        : "";

      const created: Person = {
        id: "p_" + Date.now(),
        name: personName,
        phone: "",
        company: "",
        category: "지인",
        groups: [],
        familyInfo: {
          children: childrenList
        },
        memo: memoText,
        avatarEmoji: "👤",
        avatarBg: "bg-[#fff9f0] text-[#352f28]",
        lastContactDate: newHistoryItem.date,
        lastContactMedium: newHistoryItem.medium as any,
        history: [newHistoryItem]
      };

      onAddPerson(created);
    }

    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const formattedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div id="audio-analysis-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#352f28]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden font-sans max-h-[90vh] flex flex-col border border-[#ece5d8]"
      >
        {/* Top Accent line */}
        <div className="h-2.5 bg-gradient-to-r from-[#ff6b6b] to-[#ff9f43] shrink-0"></div>

        {/* Modal Header */}
        <div className="pt-6 px-6 sm:px-8 pb-4 border-b border-[#ece5d8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#fdf2f2] text-[#ff6b6b] rounded-2xl border border-[#fecaca]">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-[#352f28]">용쨔의 녹음기 & AI 스마트 분석</h2>
              <p className="text-xs text-[#a39788] mt-0.5">통화 녹음, 대면 녹취 또는 대화 메모를 통해 인물 프로필을 자동 업데이트합니다.</p>
            </div>
          </div>
          <button
            id="close-analysis-modal-btn"
            onClick={onClose}
            className="text-[#a39788] hover:text-[#ff6b6b] transition-colors p-1.5 hover:bg-[#f3f0ea] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Choose Target Person */}
          <div className="bg-[#fff9f0] border border-[#ece5d8] p-5 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#352f28] flex items-center gap-1.5">
              <span>👤 1단계. 업데이트할 대상 선택</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5">인물 다이어리에서 찾기</label>
                <select
                  id="target-person-select"
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
                  className="w-full text-xs bg-white border border-[#ece5d8] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 font-medium text-[#4a433a] shadow-sm"
                >
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.category} • {p.company || "소속없음"})</option>
                  ))}
                  <option value="new">🆕 대화 분석을 통해 새 인물 등록하기</option>
                </select>
              </div>

              {!selectedPerson && (
                <div>
                  <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5">새 지인 이름 입력</label>
                  <input
                     id="new-person-name-input"
                     type="text"
                     value={targetName}
                     onChange={(e) => setTargetName(e.target.value)}
                     placeholder="이름 (예: 홍길동)"
                     className="w-full text-xs bg-white border border-[#ece5d8] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 text-[#4a433a] shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Input Methods (Direct Record / Upload File / Simulation Scripts) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Live Recording and Upload Panel */}
            <div className="bg-white border border-[#ece5d8] p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#352f28] mb-2 flex items-center gap-1.5">
                  <span>🎙️ 2단계. 녹음 및 파일 첨부</span>
                </h3>
                <p className="text-xs text-[#a39788] leading-relaxed">
                  스마트폰에서 전달받은 대화 녹음 파일을 업로드하거나, 마이크로 직접 소감을 녹음해 보세요.
                </p>
              </div>

              {/* Recording State Controls */}
              <div className="border border-[#ece5d8] bg-[#FAF9F5] rounded-2xl p-4 flex flex-col items-center justify-center space-y-3">
                {isRecording ? (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping" />
                    <span className="text-xs font-bold text-red-600 mt-1">대화 녹음 중...</span>
                    <span className="text-xl font-mono font-bold text-[#352f28]">{formattedTime(recordingSeconds)}</span>
                  </div>
                ) : audioBlob ? (
                  <div className="flex items-center gap-2 bg-[#f0fdf4] text-emerald-800 text-xs px-3 py-1.5 rounded-lg border border-emerald-100 font-bold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>목소리 녹음 완료 ({formattedTime(recordingSeconds || 12)})</span>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex items-center gap-2 bg-indigo-50 text-indigo-800 text-xs px-3 py-1.5 rounded-lg border border-indigo-100 max-w-full font-bold">
                    <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate">{uploadedFileName}</span>
                  </div>
                ) : (
                  <p className="text-xs text-[#a39788] font-medium">마이크나 파일 업로드 준비 완료</p>
                )}

                <div className="flex gap-2">
                  {!isRecording ? (
                    <button
                      id="start-voice-record-btn"
                      onClick={startRecording}
                      className="py-2 px-4 bg-[#fdf2f2] hover:bg-[#fde8e8] text-[#ef4444] text-xs font-bold rounded-full transition-all flex items-center gap-1.5 border border-[#fecaca]"
                    >
                      <Mic className="w-3.5 h-3.5" /> 녹음 시작
                    </button>
                  ) : (
                    <button
                      id="stop-voice-record-btn"
                      onClick={stopRecording}
                      className="py-2 px-4 bg-[#352f28] hover:bg-black text-white text-xs font-bold rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Square className="w-3.5 h-3.5 fill-white" /> 녹음 중지
                    </button>
                  )}

                  <label className="py-2 px-4 bg-[#f3f0ea] hover:bg-[#ece5d8] text-[#352f28] text-xs font-bold rounded-full cursor-pointer transition-all flex items-center gap-1.5 border border-[#ece5d8]/40">
                    <Upload className="w-3.5 h-3.5" /> 파일 선택
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Simulated Playground Presets */}
            <div className="bg-[#fff9f0] border border-[#ece5d8] p-5 rounded-3xl flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#352f28] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff6b6b]" />
                  간편 AI 요약 체험 (시뮬레이터)
                </h4>
                <p className="text-[11px] text-[#7c7267] mb-3 leading-relaxed">
                  아래의 사전 제작된 가상 대화 예시들을 클릭하면 즉시 음성 대본 대용으로 입력되어 간편하게 AI 리포팅 성능을 확인하실 수 있습니다!
                </p>
                
                <div className="space-y-1.5">
                  {PRESET_SCRIPTS.map((script, idx) => (
                    <button
                      key={idx}
                      id={`preset-script-btn-${idx}`}
                      onClick={() => applyPresetScript(script)}
                      className="w-full text-left bg-white border border-[#ece5d8] hover:border-[#ff6b6b] hover:bg-[#fff9f0]/40 p-3 rounded-2xl transition-all text-xs flex items-center gap-2.5 shadow-sm"
                    >
                      <span className="text-base shrink-0">{script.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#352f28] truncate">{script.title}</p>
                        <p className="text-[10px] text-[#a39788] truncate italic">"{script.text}"</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Transcript / Dialog Script Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#352f28]">✍️ 대화 스크립트 본문 (필요 시 직접 작성/수정 가능)</label>
              <button
                id="clear-script-btn"
                onClick={() => setScriptText("")}
                className="text-[11px] text-[#ff6b6b] hover:underline font-bold"
              >
                지우기
              </button>
            </div>
            <textarea
              id="script-content-textarea"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="음성에서 인식된 대본이 여기에 채워지거나, 직접 입력할 수 있습니다. (예: '철수 부장님과 만나 장어덮밥을 먹으며 자녀 예린이의 초등학교 입학 이야기를 나눔...')"
              className="w-full h-24 text-xs bg-white border border-[#ece5d8] rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 resize-none font-sans text-[#4a433a] shadow-sm"
            />
          </div>

          {/* Action Trigger Button */}
          <div className="flex justify-center pt-2">
            <button
              id="analyze-speech-ai-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!audioBase64 && !scriptText.trim())}
              className={`py-3.5 px-8 text-xs font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-all ${
                isAnalyzing || (!audioBase64 && !scriptText.trim())
                  ? "bg-[#f3f0ea] text-[#a39788] cursor-not-allowed border border-[#ece5d8]"
                  : "bg-[#ff6b6b] hover:bg-[#e05a5a] text-white shadow-[#ff6b6b]/10 hover:scale-[1.02]"
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> 용쨔가 대화 분석하는 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> AI 스마트 대화 분석 시작하기
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {analysisError && (
            <div className="p-4 bg-[#fdf2f2] border border-[#fecaca] rounded-2xl text-xs text-[#ef4444] flex items-start gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-[#ff6b6b] shrink-0 mt-0.5" />
              <p>{analysisError}</p>
            </div>
          )}

          {/* Section 3: AI Proposals output (Conditional) */}
          <AnimatePresence>
            {aiProposal && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white border border-[#ece5d8] rounded-3xl p-6 shadow-md space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#ece5d8]">
                  <div className="flex items-center gap-1.5 text-[#352f28] font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-[#ff6b6b]" />
                    <span>용쨔의 AI 자동화 정보 제안</span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-100">
                    추출 성공
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#4a433a]">
                  <div className="space-y-2 bg-[#fff9f0] p-4 rounded-2xl border border-[#ece5d8]/60">
                    <p className="font-bold text-[#352f28]">📌 기본 정보 제안</p>
                    <p>
                      <span className="text-[#7c7267] font-medium">매칭 지인명:</span>{" "}
                      <span className="font-bold text-[#352f28]">{aiProposal.detectedPersonName}</span>{" "}
                      {selectedPerson ? (
                        <span className="text-[10px] bg-[#f3f0ea] text-[#7c7267] px-1.5 py-0.5 rounded ml-1 font-bold">기존 매칭됨</span>
                      ) : (
                        <span className="text-[10px] bg-[#fff9f0] text-[#ea580c] px-1.5 py-0.5 rounded ml-1 font-bold border border-[#ffedd5]">신규 지인 등록 예정</span>
                      )}
                    </p>
                    <p>
                      <span className="text-[#7c7267] font-medium">연락 날짜:</span>{" "}
                      <span className="font-mono text-[#352f28] font-bold">{aiProposal.lastContactDate}</span>
                    </p>
                    <p>
                      <span className="text-[#7c7267] font-medium">연락 수단:</span>{" "}
                      <span className="bg-[#fff9f0] text-[#ea580c] px-2 py-0.5 rounded font-bold border border-[#ffedd5] ml-1">{aiProposal.lastContactMedium}</span>
                    </p>
                  </div>

                  <div className="space-y-2 bg-[#fff9f0] p-4 rounded-2xl border border-[#ece5d8]/60">
                    <p className="font-bold text-[#352f28]">💬 핵심 3줄 다이어리 요약</p>
                    <div className="bg-white p-3 rounded-xl border border-[#ece5d8] leading-relaxed font-sans whitespace-pre-line text-xs text-[#4a433a] shadow-sm">
                      {aiProposal.summary}
                    </div>
                  </div>
                </div>

                {/* Proposed Family Updates */}
                {aiProposal.newFamilyDetails && aiProposal.newFamilyDetails.length > 0 && (
                  <div className="space-y-2 bg-[#fdf2f2] p-4 rounded-2xl border border-[#fecaca]">
                    <p className="text-xs font-bold text-[#ef4444] flex items-center gap-1">
                      <span>👶 새로 감지된 자녀 및 배우자 정보</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiProposal.newFamilyDetails.map((family: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-[#fecaca]/30 text-xs shadow-sm">
                          <p className="font-bold text-[#352f28]">{family.name} <span className="font-medium text-[#7c7267] text-[10px] bg-[#f3f0ea] px-1.5 py-0.5 rounded ml-1">({family.ageOrBirth || "나이 미상"})</span></p>
                          {family.memo && <p className="text-[#7c7267] mt-1 text-[11px] bg-[#fff9f0]/50 p-1.5 rounded italic">" {family.memo} "</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposed Memo Updates */}
                {aiProposal.newMemoInsights && aiProposal.newMemoInsights.length > 0 && (
                  <div className="space-y-2 bg-[#fff9f0]/50 p-4 rounded-2xl border border-[#ece5d8]">
                    <p className="text-xs font-bold text-[#352f28]">✨ 새로 제안된 관심사 & 취향 키워드</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiProposal.newMemoInsights.map((memo: string, i: number) => (
                        <span key={i} className="bg-white text-xs text-[#4a433a] px-3 py-1 rounded-full border border-[#ece5d8] font-medium shadow-sm">
                          {memo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="flex justify-end pt-2">
                  <button
                    id="apply-ai-proposal-btn"
                    onClick={handleApplyProposal}
                    disabled={applied}
                    className={`py-2.5 px-6 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
                      applied
                        ? "bg-emerald-600 text-white cursor-default"
                        : "bg-[#352f28] hover:bg-black text-white shadow-md shadow-gray-200 hover:scale-[1.01]"
                    }`}
                  >
                    {applied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 animate-bounce" /> 지인 노트 반영 완료!
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> 제안 사항을 비밀노트에 즉시 기록하기
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}
