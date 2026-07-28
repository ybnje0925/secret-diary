import React, { useState, useEffect } from "react";
import { Person, CategoryType, ChildInfo, CustomGroup, EventHistoryItem, EventType } from "../types";
import { calculateAge } from "../utils/age";
import { X, Plus, Trash2, Heart, Baby, Sparkles, Smile, Phone, Briefcase, Gift, Bell } from "lucide-react";
import { motion } from "motion/react";

interface PersonFormModalProps {
  person?: Person | null; // If null, we are in CREATE mode
  customGroups: CustomGroup[];
  onClose: () => void;
  onSave: (savedPerson: Person) => void;
}

const CATEGORIES: CategoryType[] = ["가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"];
const EVENT_TYPES: EventType[] = ["축의금", "조의금", "선물", "기타"];
const REMIND_OPTIONS = [
  { label: "사용 안 함", value: undefined },
  { label: "30일", value: 30 },
  { label: "60일", value: 60 },
  { label: "90일", value: 90 }
];

const EMOJIS = ["👤", "🎾", "🎨", "👔", "🌸", "☕", "🍷", "💻", "👶", "🐱", "🐶", "✈️", "🎵", "📚", "🍳", "🚗"];

const BG_COLORS = [
  { class: "bg-slate-100 text-slate-700", label: "Slate" },
  { class: "bg-teal-100 text-teal-800", label: "Teal" },
  { class: "bg-blue-100 text-blue-800", label: "Blue" },
  { class: "bg-rose-100 text-rose-800", label: "Rose" },
  { class: "bg-purple-100 text-purple-800", label: "Purple" },
  { class: "bg-amber-100 text-amber-800", label: "Amber" },
];

export default function PersonFormModal({ person, customGroups, onClose, onSave }: PersonFormModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState<CategoryType>("지인");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState("");

  const [spouseName, setSpouseName] = useState("");
  const [children, setChildren] = useState<ChildInfo[]>([]);

  const [food, setFood] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [notes, setNotes] = useState("");

  const [eventsHistory, setEventsHistory] = useState<EventHistoryItem[]>([]);
  const [remindIntervalDays, setRemindIntervalDays] = useState<number | undefined>(undefined);

  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [avatarBg, setAvatarBg] = useState("bg-slate-100 text-slate-700");

  useEffect(() => {
    if (person) {
      setName(person.name);
      setPhone(person.phone || "");
      setCompany(person.company || "");
      setCategory(person.category);
      setSelectedGroups(person.groups || []);
      setSpouseName(person.familyInfo?.spouseName || "");
      setChildren(person.familyInfo?.children || []);
      setFood(person.preferences?.food || "");
      setHobbies(person.preferences?.hobbies || "");
      setNotes(person.preferences?.notes || "");
      setEventsHistory(person.eventsHistory || []);
      setRemindIntervalDays(person.remindIntervalDays);
      setAvatarEmoji(person.avatarEmoji || "👤");
      setAvatarBg(person.avatarBg || "bg-slate-100 text-slate-700");
    } else {
      setName("");
      setPhone("");
      setCompany("");
      setCategory("지인");
      setSelectedGroups([]);
      setSpouseName("");
      setChildren([]);
      setFood("");
      setHobbies("");
      setNotes("");
      setEventsHistory([]);
      setRemindIntervalDays(undefined);
      setAvatarEmoji("👤");
      setAvatarBg("bg-slate-100 text-slate-700");
    }
  }, [person]);

  const handleAddChildRow = () => {
    setChildren([...children, { name: "", birthDate: "", ageOrBirth: "", memo: "" }]);
  };

  const handleChildChange = (index: number, field: keyof ChildInfo, value: string) => {
    const updated = [...children];
    (updated[index] as any)[field] = value;
    setChildren(updated);
  };

  const handleRemoveChildRow = (index: number) => {
    setChildren(children.filter((_, idx) => idx !== index));
  };

  const handleAddEventRow = () => {
    setEventsHistory([...eventsHistory, { id: "e_" + Date.now(), date: new Date().toISOString().split("T")[0], type: "축의금", amountOrGift: "", note: "" }]);
  };

  const handleEventChange = (index: number, field: keyof EventHistoryItem, value: string) => {
    const updated = [...eventsHistory];
    (updated[index] as any)[field] = value;
    setEventsHistory(updated);
  };

  const handleRemoveEventRow = (index: number) => {
    setEventsHistory(eventsHistory.filter((_, idx) => idx !== index));
  };

  const handleToggleGroup = (groupName: string) => {
    setSelectedGroups(selectedGroups.includes(groupName) ? selectedGroups.filter(g => g !== groupName) : [...selectedGroups, groupName]);
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newGroupInput.trim();
    if (tag && !selectedGroups.includes(tag)) {
      setSelectedGroups([...selectedGroups, tag]);
      setNewGroupInput("");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedPerson: Person = {
      id: person ? person.id : "p_" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      company: company.trim(),
      category,
      groups: selectedGroups,
      familyInfo: {
        spouseName: spouseName.trim() || undefined,
        children: children.filter(c => c.name.trim() !== "")
      },
      preferences: { food: food.trim(), hobbies: hobbies.trim(), notes: notes.trim() },
      eventsHistory: eventsHistory.filter(ev => ev.amountOrGift.trim() !== "" || ev.note.trim() !== ""),
      avatarEmoji,
      avatarBg,
      lastContactDate: person ? person.lastContactDate : new Date().toISOString().split("T")[0],
      lastContactMedium: person ? person.lastContactMedium : "통화",
      remindIntervalDays,
      history: person ? person.history : []
    };

    onSave(savedPerson);
  };

  return (
    <div id="person-form-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden font-sans max-h-[90vh] flex flex-col border border-slate-200"
      >
        <div className="pt-5 px-6 pb-3 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-slate-900">{person ? "지인 정보 수정" : "새 지인 등록"}</h2>
          <button id="close-person-form-modal-btn" onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">

          {/* Avatar */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">아바타</label>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 text-2xl rounded-lg ${avatarBg} flex items-center justify-center border border-slate-200`}>{avatarEmoji}</div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-1.5 max-h-14 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-lg">
                  {EMOJIS.map(emo => (
                    <button key={emo} type="button" id={`emoji-btn-${emo}`} onClick={() => setAvatarEmoji(emo)}
                      className={`text-base p-0.5 rounded hover:scale-110 transition-transform ${avatarEmoji === emo ? "bg-teal-50 ring-1 ring-teal-600" : ""}`}>
                      {emo}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 bg-white border border-slate-200 p-1.5 rounded-lg">
                  {BG_COLORS.map(col => (
                    <button key={col.class} type="button" id={`color-btn-${col.label}`} onClick={() => setAvatarBg(col.class)}
                      className={`w-5 h-5 rounded-full ${col.class} border border-slate-200 hover:scale-110 transition-transform flex items-center justify-center`}>
                      {avatarBg === col.class && <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">이름 *</label>
              <div className="relative">
                <Smile className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input id="person-name-form-input" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 font-medium text-slate-900" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input id="person-phone-form-input" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 text-slate-900" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">소속 / 직장명</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input id="person-company-form-input" type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="한국회사 구매부"
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 text-slate-900" />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500">관계 카테고리</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" id={`category-btn-${cat}`} onClick={() => setCategory(cat)}
                  className={`py-2.5 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                    category === cat ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Custom groups */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <label className="block text-[11px] font-bold text-slate-500">커스텀 그룹 태그</label>
            <div className="flex flex-wrap gap-2">
              {customGroups.map(g => {
                const hasTag = selectedGroups.includes(g.name);
                return (
                  <button key={g.id} type="button" id={`toggle-group-btn-${g.name}`} onClick={() => handleToggleGroup(g.name)}
                    className={`py-1.5 px-3.5 text-xs font-bold rounded-full border transition-all ${
                      hasTag ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}>
                    {hasTag ? "✓ " : ""}#{g.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input id="new-group-tag-input" type="text" value={newGroupInput} onChange={(e) => setNewGroupInput(e.target.value)} placeholder="새로운 그룹 이름"
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 font-medium text-slate-900" />
              <button type="button" id="add-new-group-tag-btn" onClick={handleAddNewTag} className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-all">추가</button>
            </div>
          </div>

          {/* Family */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-200 pb-2">
              <Heart className="w-4 h-4 text-rose-500" /> <span>가족 정보</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">배우자 성함</label>
              <input id="spouse-name-form-input" type="text" value={spouseName} onChange={(e) => setSpouseName(e.target.value)} placeholder="이지현"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 font-medium text-slate-900" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1"><Baby className="w-4 h-4 text-slate-400" /> 자녀 목록 ({children.length}명)</span>
                <button id="add-child-row-btn" type="button" onClick={handleAddChildRow} className="py-1 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-full text-[11px] flex items-center gap-1">
                  <Plus className="w-3 h-3" /> 자녀 추가
                </button>
              </div>

              {children.map((child, idx) => {
                const previewAge = child.birthDate ? calculateAge(child.birthDate) : null;
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 relative">
                    <button type="button" id={`remove-child-btn-${idx}`} onClick={() => handleRemoveChildRow(idx)}
                      className="absolute top-3 right-3 p-1.5 hover:bg-rose-50 text-rose-500 rounded-full transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">자녀 이름 *</label>
                        <input type="text" required value={child.name} onChange={(e) => handleChildChange(idx, "name", e.target.value)} placeholder="이민우"
                          className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none text-slate-900 font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">생년월일 {previewAge && <span className="text-teal-700 font-bold">({previewAge})</span>}</label>
                        <input type="date" value={child.birthDate || ""} onChange={(e) => handleChildChange(idx, "birthDate", e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none text-slate-900 font-medium" />
                      </div>
                    </div>
                    {!child.birthDate && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">나이 / 학년 (생년월일 모를 때)</label>
                        <input type="text" value={child.ageOrBirth} onChange={(e) => handleChildChange(idx, "ageOrBirth", e.target.value)} placeholder="7살 / 초교 1학년"
                          className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none text-slate-900 font-medium" />
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1">자녀 메모</label>
                      <input type="text" value={child.memo} onChange={(e) => handleChildChange(idx, "memo", e.target.value)} placeholder="피아노 학원 다님, 딸기를 아주 좋아함"
                        className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none text-slate-900 font-medium" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Events history */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1"><Gift className="w-4 h-4 text-slate-400" /> 경조사 & 선물 히스토리</span>
              <button id="add-event-row-btn" type="button" onClick={handleAddEventRow} className="py-1 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-full text-[11px] flex items-center gap-1">
                <Plus className="w-3 h-3" /> 기록 추가
              </button>
            </div>

            {eventsHistory.map((ev, idx) => (
              <div key={ev.id} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 relative">
                <button type="button" id={`remove-event-btn-${idx}`} onClick={() => handleRemoveEventRow(idx)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-rose-50 text-rose-500 rounded-full transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="grid grid-cols-2 gap-2 pr-6">
                  <select value={ev.type} onChange={(e) => handleEventChange(idx, "type", e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-medium">
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="date" value={ev.date} onChange={(e) => handleEventChange(idx, "date", e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-medium" />
                </div>
                <input type="text" value={ev.amountOrGift} onChange={(e) => handleEventChange(idx, "amountOrGift", e.target.value)} placeholder="10만원 / 화환 등"
                  className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-medium" />
                <input type="text" value={ev.note} onChange={(e) => handleEventChange(idx, "note", e.target.value)} placeholder="메모 (결혼식, 돌잔치 등)"
                  className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-900 font-medium" />
              </div>
            ))}
          </div>

          {/* Preferences */}
          <div className="space-y-3">
            <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> 미팅 전 체크리스트</label>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">좋아하는/못 먹는 음식</label>
              <input type="text" value={food} onChange={(e) => setFood(e.target.value)} placeholder="우유 알레르기, 삼겹살 좋아함"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 text-slate-900" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">취미</label>
              <input type="text" value={hobbies} onChange={(e) => setHobbies(e.target.value)} placeholder="테니스, 캠핑"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-600/20 text-slate-900" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">그 외 특이사항</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="정장 사이즈, 건강 상태 등 자유 기록"
                className="w-full h-20 text-xs bg-white border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-600/20 resize-none text-slate-900" />
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> 장기 미연락 리마인드</label>
            <div className="flex gap-2">
              {REMIND_OPTIONS.map(opt => (
                <button key={opt.label} type="button" onClick={() => setRemindIntervalDays(opt.value)}
                  className={`py-2 px-3.5 text-xs font-bold rounded-lg border transition-all ${
                    remindIntervalDays === opt.value ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button type="button" id="cancel-person-form-btn" onClick={onClose} className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors">취소</button>
            <button type="submit" id="submit-person-form-btn" className="py-2.5 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-xs transition-colors">
              {person ? "변경 저장" : "지인 추가"}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
