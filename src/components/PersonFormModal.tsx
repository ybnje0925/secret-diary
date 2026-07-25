import React, { useState, useEffect } from "react";
import { Person, CategoryType, ChildInfo, CustomGroup } from "../types";
import { X, Plus, Trash2, Heart, Baby, Sparkles, Smile, Phone, Briefcase, Bookmark } from "lucide-react";
import { motion } from "motion/react";

interface PersonFormModalProps {
  person?: Person | null; // If null, we are in CREATE mode
  customGroups: CustomGroup[];
  onClose: () => void;
  onSave: (savedPerson: Person) => void;
}

const CATEGORIES: CategoryType[] = ["가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"];

const EMOJIS = ["👤", "🎾", "🎨", "👔", "🌸", "☕", "🍷", "💻", "👶", "🐱", "🐶", "✈️", "🎵", "📚", "🍳", "🚗"];

const BG_COLORS = [
  { class: "bg-emerald-100 text-emerald-800", label: "Mint" },
  { class: "bg-orange-100 text-orange-800", label: "Orange" },
  { class: "bg-blue-100 text-blue-800", label: "Sky Blue" },
  { class: "bg-pink-100 text-pink-800", label: "Pink" },
  { class: "bg-purple-100 text-purple-800", label: "Lavender" },
  { class: "bg-amber-100 text-amber-800", label: "Peach" },
  { class: "bg-rose-100 text-rose-800", label: "Rose" },
];

export default function PersonFormModal({
  person,
  customGroups,
  onClose,
  onSave
}: PersonFormModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState<CategoryType>("지인");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState("");
  
  // Spouse & Children
  const [spouseName, setSpouseName] = useState("");
  const [children, setChildren] = useState<ChildInfo[]>([]);

  // Memo & Aesthetic Customize
  const [memo, setMemo] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");
  const [avatarBg, setAvatarBg] = useState("bg-emerald-100 text-emerald-800");

  useEffect(() => {
    if (person) {
      setName(person.name);
      setPhone(person.phone || "");
      setCompany(person.company || "");
      setCategory(person.category);
      setSelectedGroups(person.groups || []);
      setSpouseName(person.familyInfo?.spouseName || "");
      setChildren(person.familyInfo?.children || []);
      setMemo(person.memo || "");
      setAvatarEmoji(person.avatarEmoji || "👤");
      setAvatarBg(person.avatarBg || "bg-emerald-100 text-emerald-800");
    } else {
      // Default creation setups
      setName("");
      setPhone("");
      setCompany("");
      setCategory("지인");
      setSelectedGroups([]);
      setSpouseName("");
      setChildren([]);
      setMemo("");
      setAvatarEmoji("👤");
      setAvatarBg("bg-emerald-100 text-emerald-800");
    }
  }, [person]);

  // Handle adding child info row
  const handleAddChildRow = () => {
    setChildren([...children, { name: "", ageOrBirth: "", memo: "" }]);
  };

  // Handle updating child info properties
  const handleChildChange = (index: number, field: keyof ChildInfo, value: string) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  // Handle removing child row
  const handleRemoveChildRow = (index: number) => {
    const updated = children.filter((_, idx) => idx !== index);
    setChildren(updated);
  };

  // Handle group toggling
  const handleToggleGroup = (groupName: string) => {
    if (selectedGroups.includes(groupName)) {
      setSelectedGroups(selectedGroups.filter(g => g !== groupName));
    } else {
      setSelectedGroups([...selectedGroups, groupName]);
    }
  };

  // Create new local custom tag inside form
  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newGroupInput.trim();
    if (tag && !selectedGroups.includes(tag)) {
      setSelectedGroups([...selectedGroups, tag]);
      setNewGroupInput("");
    }
  };

  // Handle form save action
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedPerson: Person = {
      id: person ? person.id : "p_" + Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      company: company.trim(),
      category: category,
      groups: selectedGroups,
      familyInfo: {
        spouseName: spouseName.trim() || undefined,
        children: children.filter(c => c.name.trim() !== "") // filter out completely empty child templates
      },
      memo: memo.trim(),
      avatarEmoji: avatarEmoji,
      avatarBg: avatarBg,
      lastContactDate: person ? person.lastContactDate : new Date().toISOString().split("T")[0],
      lastContactMedium: person ? person.lastContactMedium : "통화",
      history: person ? person.history : []
    };

    onSave(savedPerson);
  };

  return (
    <div id="person-form-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#352f28]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden font-sans max-h-[90vh] flex flex-col border border-[#ece5d8]"
      >
        {/* Top Accent Line */}
        <div className="h-2.5 bg-gradient-to-r from-[#ff6b6b] to-[#ff9f43] shrink-0"></div>

        {/* Header */}
        <div className="pt-6 px-6 sm:px-8 pb-4 border-b border-[#ece5d8] flex items-center justify-between shrink-0">
          <h2 className="text-xl font-serif font-bold text-[#352f28]">
            {person ? "📓 지인의 비밀 페이지 수정" : "🆕 새 지인의 비밀 다이어리 생성"}
          </h2>
          <button
            id="close-person-form-modal-btn"
            onClick={onClose}
            className="text-[#a39788] hover:text-[#ff6b6b] transition-colors p-1.5 hover:bg-[#f3f0ea] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-xs text-[#4a433a]">
          
          {/* Section 1: Avatar Customizer */}
          <div className="bg-[#fff9f0] border border-[#ece5d8] p-5 rounded-3xl shadow-sm space-y-3">
            <label className="block text-[11px] font-bold text-[#7c7267] uppercase tracking-wider">
              🎨 아바타 일러스트 & 색상 조율
            </label>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 text-3xl rounded-2xl ${avatarBg} shadow-sm flex items-center justify-center border border-[#ece5d8]/40`}>
                {avatarEmoji}
              </div>
              <div className="flex-1 space-y-2">
                {/* Emojis selection list */}
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto p-1.5 bg-white border border-[#ece5d8] rounded-xl shadow-inner">
                  {EMOJIS.map(emo => (
                    <button
                      key={emo}
                      type="button"
                      id={`emoji-btn-${emo}`}
                      onClick={() => setAvatarEmoji(emo)}
                      className={`text-lg p-0.5 rounded hover:scale-110 transition-transform ${avatarEmoji === emo ? "bg-[#fff9f0] ring-1 ring-[#ff6b6b]" : ""}`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>

                {/* Colors selection list */}
                <div className="flex flex-wrap gap-1.5 bg-white border border-[#ece5d8] p-1.5 rounded-xl shadow-inner">
                  {BG_COLORS.map(col => (
                    <button
                      key={col.class}
                      type="button"
                      id={`color-btn-${col.label}`}
                      onClick={() => setAvatarBg(col.class)}
                      className={`w-5 h-5 rounded-full ${col.class} border border-[#ece5d8]/20 hover:scale-110 transition-transform flex items-center justify-center`}
                    >
                      {avatarBg === col.class && <div className="w-1.5 h-1.5 bg-current rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Name, Phone, Company */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5">이름 *</label>
              <div className="relative">
                <Smile className="absolute left-3 top-3 w-4 h-4 text-[#a39788]" />
                <input
                  id="person-name-form-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full text-xs bg-white border border-[#ece5d8] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 font-medium text-[#352f28] shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-[#a39788]" />
                <input
                  id="person-phone-form-input"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full text-xs bg-white border border-[#ece5d8] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 text-[#352f28] shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5">소속 / 직장명</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 w-4 h-4 text-[#a39788]" />
                <input
                  id="person-company-form-input"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="한국회사 구매부"
                  className="w-full text-xs bg-white border border-[#ece5d8] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 text-[#352f28] shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Categories selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-[#7c7267]">🏷️ 관계 카테고리 (단일 선택, 파스텔톤 컬러)</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map(cat => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    id={`category-btn-${cat}`}
                    onClick={() => setCategory(cat)}
                    className={`py-2.5 px-1 text-center text-xs font-bold rounded-xl border transition-all ${
                      isSelected
                        ? "bg-[#ff6b6b] text-white border-[#ff6b6b] scale-[1.03] shadow-md shadow-[#ff6b6b]/10"
                        : "bg-white border-[#ece5d8] hover:bg-[#f3f0ea] text-[#4a433a]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Custom Groups tag toggles */}
          <div className="bg-[#fff9f0] border border-[#ece5d8] p-5 rounded-3xl shadow-sm space-y-4">
            <label className="block text-[11px] font-bold text-[#7c7267]">🏷️ 커스텀 그룹 / 중소분류 태그 (자유 복수 지정)</label>
            
            {/* Display list of active toggles */}
            <div className="flex flex-wrap gap-2">
              {customGroups.map(g => {
                const hasTag = selectedGroups.includes(g.name);
                return (
                  <button
                    key={g.id}
                    type="button"
                    id={`toggle-group-btn-${g.name}`}
                    onClick={() => handleToggleGroup(g.name)}
                    className={`py-1.5 px-3.5 text-xs font-bold rounded-full border transition-all ${
                      hasTag
                        ? "bg-[#352f28] text-white border-[#352f28]"
                        : "bg-white text-[#4a433a] border-[#ece5d8] hover:bg-[#f3f0ea]"
                    }`}
                  >
                    {hasTag ? "✓ " : ""}#{g.name}
                  </button>
                );
              })}
            </div>

            {/* Field to insert custom tag */}
            <div className="flex gap-2">
              <input
                id="new-group-tag-input"
                type="text"
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                placeholder="새로운 그룹 이름 (예: 독서동호회, 대학동창)"
                className="flex-1 text-xs bg-white border border-[#ece5d8] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 font-medium shadow-sm text-[#352f28]"
              />
              <button
                type="button"
                id="add-new-group-tag-btn"
                onClick={handleAddNewTag}
                className="py-2.5 px-5 bg-[#352f28] hover:bg-black text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                추가
              </button>
            </div>
          </div>

          {/* Section 5: Spouse & Children (Detailed lists) */}
          <div className="bg-[#fff9f0] border border-[#ece5d8] p-5 rounded-3xl space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#ef4444] border-b border-[#fecaca]/50 pb-2">
              <Heart className="w-4 h-4 text-[#ff6b6b] fill-[#ff6b6b]/20" />
              <span>소중한 가족 정보 기록</span>
            </div>

            {/* Spouse */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5">배우자 성함</label>
                <input
                  id="spouse-name-form-input"
                  type="text"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                  placeholder="이지현"
                  className="w-full text-xs bg-white border border-[#ece5d8] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 font-medium text-[#352f28] shadow-sm"
                />
              </div>
            </div>

            {/* Children lists */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#352f28] flex items-center gap-1">
                  <Baby className="w-4 h-4 text-[#ff9f43]" /> 자녀 목록 ({children.length}명)
                </span>
                <button
                  id="add-child-row-btn"
                  type="button"
                  onClick={handleAddChildRow}
                  className="py-1 px-3 bg-[#fdf2f2] hover:bg-[#fde8e8] text-[#ff6b6b] font-bold rounded-full text-[11px] flex items-center gap-1 border border-[#fecaca]"
                >
                  <Plus className="w-3 h-3" /> 자녀 추가
                </button>
              </div>

              {children.map((child, idx) => (
                <div key={idx} className="bg-white border border-[#ece5d8] rounded-2xl p-4 shadow-sm space-y-3 relative">
                  <button
                    type="button"
                    id={`remove-child-btn-${idx}`}
                    onClick={() => handleRemoveChildRow(idx)}
                    className="absolute top-3 right-3 p-1.5 hover:bg-[#fdf2f2] text-[#ff6b6b] rounded-full transition-colors border border-transparent hover:border-[#fecaca]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[#a39788] mb-1">자녀 이름 *</label>
                      <input
                        type="text"
                        required
                        value={child.name}
                        onChange={(e) => handleChildChange(idx, "name", e.target.value)}
                        placeholder="이민우"
                        className="w-full text-xs bg-white border border-[#ece5d8] rounded-lg px-2.5 py-1.5 focus:outline-none text-[#352f28] font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#a39788] mb-1">나이 / 생년월일 / 학년</label>
                      <input
                        type="text"
                        value={child.ageOrBirth}
                        onChange={(e) => handleChildChange(idx, "ageOrBirth", e.target.value)}
                        placeholder="7살 / 초교 1학년"
                        className="w-full text-xs bg-white border border-[#ece5d8] rounded-lg px-2.5 py-1.5 focus:outline-none text-[#352f28] font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#a39788] mb-1">자녀 메모 (학교, 학원, 특징 등)</label>
                    <input
                      type="text"
                      value={child.memo}
                      onChange={(e) => handleChildChange(idx, "memo", e.target.value)}
                      placeholder="피아노 학원 다님, 딸기를 아주 무척 좋아함"
                      className="w-full text-xs bg-white border border-[#ece5d8] rounded-lg px-2.5 py-1.5 focus:outline-none text-[#352f28] font-medium"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Memo (Hobby, food preferences) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-[#7c7267] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#ff9f43]" /> 특이사항, 취미, 음식 취향 등 자유 기록 메모
            </label>
            <textarea
              id="person-memo-form-textarea"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="취미는 테니스와 드립 커피. 우유 알레르기가 있으니 대면 식사 시 유의할 것. 식사는 주로 삼겹살을 선호하고 단 음식을 피함."
              className="w-full h-24 text-xs bg-white border border-[#ece5d8] rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/20 resize-none font-sans text-[#352f28] shadow-sm"
            />
          </div>

          {/* Footer Save & Discard Buttons */}
          <div className="pt-4 border-t border-[#ece5d8] flex justify-end gap-3 shrink-0">
            <button
              type="button"
              id="cancel-person-form-btn"
              onClick={onClose}
              className="py-2.5 px-5 bg-[#f3f0ea] hover:bg-[#ece5d8] text-[#4a433a] font-bold rounded-xl text-xs transition-colors border border-[#ece5d8]/40"
            >
              취소하기
            </button>
            <button
              type="submit"
              id="submit-person-form-btn"
              className="py-2.5 px-6 bg-[#ff6b6b] hover:bg-[#e05a5a] text-white font-bold rounded-xl text-xs shadow-md shadow-[#ff6b6b]/10 transition-colors hover:scale-[1.01]"
            >
              {person ? "다이어리 변경 저장" : "다이어리에 새 지인 추가"}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
