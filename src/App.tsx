import React, { useState, useEffect } from "react";
import { Person, CustomGroup, CategoryType } from "./types";
import { initialPeople, initialGroups } from "./demoData";
import ReviewModal from "./components/ReviewModal";
import AudioAnalysisModal from "./components/AudioAnalysisModal";
import PersonFormModal from "./components/PersonFormModal";
import BackupRestore from "./components/BackupRestore";
import { 
  BookOpen, 
  Search, 
  Plus, 
  Mic, 
  FolderPlus, 
  Clock, 
  TrendingUp, 
  Heart, 
  Baby, 
  Sparkles, 
  Trash2, 
  Edit3, 
  UserPlus, 
  Calendar, 
  Briefcase, 
  Grid, 
  BookMarked,
  Filter,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getCategoryTabClass = (cat: string, isSelected: boolean) => {
  if (isSelected) {
    return "bg-[#ff6b6b] text-white border-none shadow-sm shadow-[#ff6b6b]/20";
  }
  switch (cat) {
    case "가족":
      return "bg-[#fdf2f2] border border-[#fecaca] text-[#ef4444] hover:bg-[#fde8e8]";
    case "친구":
      return "bg-[#eff6ff] border border-[#dbeafe] text-[#3b82f6] hover:bg-[#e0f2fe]";
    case "지인":
      return "bg-[#fff9f0] border border-[#ffedd5] text-[#ea580c] hover:bg-[#ffedd5]/55";
    case "회사-업무":
      return "bg-[#f0fdf4] border border-[#dcfce7] text-[#22c55e] hover:bg-[#dcfce7]";
    case "회사-동료":
      return "bg-[#fafaf9] border border-[#e7e5e4] text-[#78716c] hover:bg-[#f5f5f4]";
    case "외부 기타":
      return "bg-[#fdf4ff] border border-[#f3e8ff] text-[#9333ea] hover:bg-[#f3e8ff]";
    default:
      return "bg-white border border-[#ece5d8] text-[#4a433a] hover:bg-[#f3f0ea]";
  }
};

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

export default function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "전체">("전체");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  // Selected Person for the Detail pane (right side of notebook)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Mobile App Optimization State
  const [activeMobileTab, setActiveMobileTab] = useState<"list" | "detail">("list");

  // Modal active states
  const [reviewingPerson, setReviewingPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);

  // Group creation input
  const [newGroupInput, setNewGroupInput] = useState("");

  // Load from LocalStorage on mount
  useEffect(() => {
    const storedPeople = localStorage.getItem("yongjja_people");
    const storedGroups = localStorage.getItem("yongjja_groups");

    if (storedPeople) {
      try {
        const parsed = JSON.parse(storedPeople);
        setPeople(parsed);
        if (parsed.length > 0) {
          setSelectedPersonId(parsed[0].id);
        }
      } catch (e) {
        setPeople(initialPeople);
        setSelectedPersonId(initialPeople[0].id);
      }
    } else {
      // Load initial mock datasets for wonderful default experience
      setPeople(initialPeople);
      localStorage.setItem("yongjja_people", JSON.stringify(initialPeople));
      setSelectedPersonId(initialPeople[0].id);
    }

    if (storedGroups) {
      try {
        setCustomGroups(JSON.parse(storedGroups));
      } catch (e) {
        setCustomGroups(initialGroups);
      }
    } else {
      setCustomGroups(initialGroups);
      localStorage.setItem("yongjja_groups", JSON.stringify(initialGroups));
    }
  }, []);

  // Save to LocalStorage whenever state changes
  const savePeopleToLocalStorage = (updatedPeople: Person[]) => {
    setPeople(updatedPeople);
    localStorage.setItem("yongjja_people", JSON.stringify(updatedPeople));
  };

  const saveGroupsToLocalStorage = (updatedGroups: CustomGroup[]) => {
    setCustomGroups(updatedGroups);
    localStorage.setItem("yongjja_groups", JSON.stringify(updatedGroups));
  };

  // Pre-load original sample datasets if lists empty
  const handleLoadDemoData = () => {
    savePeopleToLocalStorage(initialPeople);
    saveGroupsToLocalStorage(initialGroups);
    setSelectedPersonId(initialPeople[0].id);
    setActiveMobileTab("list");
    alert("🎉 용쨔의 오리지널 데모 데이터를 안전하게 로드했습니다!");
  };

  // Add/Edit Person callback
  const handleSavePerson = (saved: Person) => {
    const exists = people.some(p => p.id === saved.id);
    let updated: Person[] = [];
    if (exists) {
      updated = people.map(p => p.id === saved.id ? saved : p);
    } else {
      updated = [saved, ...people];
    }
    savePeopleToLocalStorage(updated);
    setSelectedPersonId(saved.id);
    setActiveMobileTab("detail");
    setEditingPerson(null);
    setIsAddingPerson(false);
  };

  // Quick updating person (from AI proposals etc.)
  const handleUpdatePerson = (updated: Person) => {
    const updatedList = people.map(p => p.id === updated.id ? updated : p);
    savePeopleToLocalStorage(updatedList);
    setSelectedPersonId(updated.id);
    setActiveMobileTab("detail");
  };

  // Quick adding new person (from AI proposals)
  const handleAddPerson = (newPerson: Person) => {
    const updatedList = [newPerson, ...people];
    savePeopleToLocalStorage(updatedList);
    setSelectedPersonId(newPerson.id);
    setActiveMobileTab("detail");
  };

  // Delete person diary
  const handleDeletePerson = (id: string) => {
    const doubleCheck = window.confirm("📓 정말로 이 지인의 비밀노트 페이지를 영구 삭제하시겠습니까?");
    if (doubleCheck) {
      const filtered = people.filter(p => p.id !== id);
      savePeopleToLocalStorage(filtered);
      if (selectedPersonId === id) {
        setSelectedPersonId(filtered.length > 0 ? filtered[0].id : null);
      }
      setActiveMobileTab("list");
    }
  };

  // Add Custom group tag globally
  const handleAddGlobalGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupInput.trim();
    if (name && !customGroups.some(g => g.name === name)) {
      const newGroup: CustomGroup = {
        id: "g_" + Date.now(),
        name
      };
      const updated = [...customGroups, newGroup];
      saveGroupsToLocalStorage(updated);
      setNewGroupInput("");
    }
  };

  // Delete global group tag
  const handleDeleteGlobalGroup = (groupName: string) => {
    const updated = customGroups.filter(g => g.name !== groupName);
    saveGroupsToLocalStorage(updated);
    // Also remove from people who have this tag
    const updatedPeople = people.map(p => ({
      ...p,
      groups: p.groups.filter(g => g !== groupName)
    }));
    savePeopleToLocalStorage(updatedPeople);
    if (selectedGroupFilter === groupName) {
      setSelectedGroupFilter(null);
    }
  };

  // Backup handlers
  const handleImportBackup = (importedPeople: Person[], importedGroups: CustomGroup[]) => {
    savePeopleToLocalStorage(importedPeople);
    saveGroupsToLocalStorage(importedGroups);
    if (importedPeople.length > 0) {
      setSelectedPersonId(importedPeople[0].id);
    }
  };

  const handleClearAllData = () => {
    savePeopleToLocalStorage([]);
    saveGroupsToLocalStorage([]);
    setSelectedPersonId(null);
    alert("📓 모든 데이터가 삭제되고 초기화되었습니다.");
  };

  // Filtering logic
  const filteredPeople = people.filter(p => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const matchQuery = !query ? true : (
      p.name.toLowerCase().includes(query) ||
      p.company.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      p.memo.toLowerCase().includes(query) ||
      p.groups.some(g => g.toLowerCase().includes(query)) ||
      p.familyInfo?.spouseName?.toLowerCase().includes(query) ||
      p.familyInfo?.children.some(c => c.name.toLowerCase().includes(query) || c.memo.toLowerCase().includes(query))
    );

    // 2. Category selection
    const matchCategory = selectedCategory === "전체" ? true : p.category === selectedCategory;

    // 3. Custom Group Selection
    const matchGroup = !selectedGroupFilter ? true : p.groups.includes(selectedGroupFilter);

    return matchQuery && matchCategory && matchGroup;
  });

  const selectedPerson = people.find(p => p.id === selectedPersonId) || null;

  return (
    <div className="min-h-screen bg-[#fdfaf6] pt-4 pb-28 md:py-6 px-4 md:px-8 font-sans text-[#4a433a]">
      
      {/* Top Brand Banner - Highly optimized for Mobile & Android app style */}
      <header className="max-w-7xl mx-auto mb-4 md:mb-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-[#ece5d8] pb-4 md:pb-5">
        <div className="flex items-center gap-2.5 md:gap-3 w-full md:w-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#ff6b6b] text-white rounded-xl md:rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center text-xl md:text-2xl font-serif font-bold shrink-0">
            📓
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-2xl font-serif font-bold tracking-tight text-[#352f28] flex items-center gap-1.5 flex-wrap">
              용쨔의 비밀노트 
              <span className="text-[9px] md:text-[10px] font-sans font-bold bg-[#fdf2f2] text-[#ef4444] border border-[#fecaca] px-2.5 py-0.5 rounded-full">
                지인 관계 & 미팅 리마인드
              </span>
            </h1>
            <p className="text-[11px] md:text-xs text-[#a39788] mt-0.5 truncate">만나기 1분 전, 소중한 사람들의 자녀 정보와 최근 대화 리마인드</p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0">
          <button
            id="register-person-btn"
            onClick={() => {
              setEditingPerson(null);
              setIsAddingPerson(true);
            }}
            className="py-2 px-4 md:py-2.5 md:px-5 bg-[#352f28] hover:bg-black text-white font-bold rounded-full text-[11px] md:text-xs transition-all shadow-md shadow-[#352f28]/10 flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" /> 새 지인 등록하기
          </button>

          <button
            id="open-audio-analyzer-btn"
            onClick={() => setIsAnalyzingAudio(true)}
            className="py-2 px-4 md:py-2.5 md:px-5 bg-[#ff6b6b] hover:bg-[#e05a5a] text-white font-bold rounded-full text-[11px] md:text-xs transition-all shadow-md shadow-red-100 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Mic className="w-3.5 h-3.5" /> 음성 녹음 & AI 분석
          </button>

          {people.length === 0 && (
            <button
              id="load-demo-data-btn"
              onClick={handleLoadDemoData}
              className="py-2 px-4 md:py-2.5 md:px-5 bg-white border border-[#ece5d8] hover:bg-[#f3f0ea] text-[#4a433a] font-bold rounded-full text-[11px] md:text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5" /> 데모 데이터 로드
            </button>
          )}
        </div>
      </header>

      {/* Main Double Page Diary Layout */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Page (Grid List of People, Custom Group filters, Categories) - col-span-7 */}
        <div className={`lg:col-span-7 space-y-5 ${activeMobileTab === "list" ? "block" : "hidden lg:block"}`}>
          
          {/* Integrated Search Box */}
          <div className="bg-white border border-[#ece5d8] p-5 rounded-3xl shadow-sm space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#a39788]" />
              <input
                id="people-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="찾고 싶은 친구가 있나요? 이름, 소속, 취미, 자녀 이름 등으로 검색..."
                className="w-full text-xs bg-[#f3f0ea] border-none rounded-full pl-10 pr-4 py-2.5 text-[#4a433a] placeholder-[#a39788] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b] focus:bg-white transition-all"
              />
            </div>

            {/* Pastel Category Filter Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(["전체", "가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"] as const).map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    id={`filter-tab-${cat}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-1.5 px-4 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${getCategoryTabClass(cat, isSelected)}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Group Tags Filters Drawer */}
          <div className="bg-white border border-[#ece5d8] p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#a39788] uppercase tracking-wider flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-[#a39788]" />
                <span>커스텀 그룹 필터 (중/소분류)</span>
              </h3>
              {selectedGroupFilter && (
                <button
                  id="clear-group-filter-btn"
                  onClick={() => setSelectedGroupFilter(null)}
                  className="text-xs text-[#ff6b6b] hover:underline font-bold"
                >
                  필터 해제
                </button>
              )}
            </div>

            {/* Global Tag bubble triggers */}
            <div className="flex flex-wrap gap-1.5">
              {customGroups.map(g => {
                const isFiltered = selectedGroupFilter === g.name;
                return (
                  <div
                    key={g.id}
                    className="flex items-center"
                  >
                    <button
                      id={`group-filter-btn-${g.name}`}
                      onClick={() => setSelectedGroupFilter(isFiltered ? null : g.name)}
                      className={`py-1 px-3 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 ${
                        isFiltered
                          ? "bg-[#ff6b6b] text-white border-none shadow-sm shadow-[#ff6b6b]/20"
                          : "bg-[#f3f0ea] text-[#4a433a] border border-[#ece5d8] hover:bg-[#ece5d8]"
                      }`}
                    >
                      <span>#{g.name}</span>
                    </button>
                    <button
                      id={`delete-group-tag-btn-${g.name}`}
                      type="button"
                      onClick={() => handleDeleteGlobalGroup(g.name)}
                      className="p-1 hover:bg-[#fdf2f2] hover:text-[#ef4444] rounded-r text-[9px] -ml-1 border-y border-r border-[#ece5d8] hover:border-[#fecaca] text-[#a39788] transition-colors"
                      title="태그 삭제"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {/* Add Custom Tag Form Inline */}
              <form onSubmit={handleAddGlobalGroup} className="flex gap-1.5 items-center">
                <input
                  id="add-global-tag-input"
                  type="text"
                  value={newGroupInput}
                  onChange={(e) => setNewGroupInput(e.target.value)}
                  placeholder="새 태그 생성"
                  className="bg-[#f3f0ea] border-none rounded-lg px-2.5 py-1 text-[10px] text-[#4a433a] placeholder-[#a39788] focus:outline-none focus:ring-1 focus:ring-[#ff6b6b] w-20"
                />
                <button
                  id="submit-global-tag-btn"
                  type="submit"
                  className="py-1 px-2.5 bg-[#352f28] hover:bg-black text-white rounded-lg text-[10px] font-bold transition-colors"
                >
                  +
                </button>
              </form>
            </div>
          </div>

          {/* People Grid list container */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#a39788]">
                총 {filteredPeople.length}명의 소중한 인연들이 검색되었습니다.
              </p>
              {people.length > 0 && filteredPeople.length === 0 && (
                <button
                  id="reset-all-filters-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("전체");
                    setSelectedGroupFilter(null);
                  }}
                  className="text-xs text-[#ff6b6b] hover:underline font-bold"
                >
                  필터 전체 초기화
                </button>
              )}
            </div>

            {filteredPeople.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPeople.map(p => {
                  const isSelected = selectedPersonId === p.id;
                  return (
                    <div
                      key={p.id}
                      id={`person-card-${p.id}`}
                      onClick={() => {
                        setSelectedPersonId(p.id);
                        setActiveMobileTab("detail");
                      }}
                      className={`relative cursor-pointer p-5 rounded-3xl transition-all flex flex-col justify-between group ${
                        isSelected
                          ? "bg-[#fff9f0] border-2 border-[#ff6b6b] shadow-md shadow-[#ff6b6b]/5 scale-[1.01]"
                          : "bg-white border border-[#ece5d8] shadow-sm hover:border-[#ff6b6b]/40 hover:bg-[#fff9f0]/20"
                      }`}
                    >
                      {/* Person Row details */}
                      <div>
                        <div className="flex items-start gap-2.5">
                          <div className={`w-12 h-12 text-2xl rounded-2xl ${p.avatarBg} shadow-inner flex items-center justify-center shrink-0`}>
                            {p.avatarEmoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-serif font-bold text-[#352f28] text-base truncate leading-none">{p.name}</h3>
                              <span className={getRelationBadgeClass(p.category)}>
                                {p.category}
                              </span>
                            </div>
                            <p className="text-xs text-[#a39788] truncate mt-1 flex items-center gap-1 font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-[#a39788]" /> {p.company || "소속 없음"}
                            </p>
                          </div>
                        </div>

                        {/* Children indicators inside card */}
                        {p.familyInfo?.children && p.familyInfo.children.length > 0 && (
                          <div className="mt-2.5 p-2 bg-[#fdf2f2] rounded-xl border border-[#fecaca]/60 flex items-center gap-1.5 text-[10px] text-[#ef4444] font-semibold">
                            <Baby className="w-3.5 h-3.5 text-[#ff6b6b] shrink-0" />
                            <span className="truncate">
                              {p.familyInfo.children.map(c => `${c.name}(${c.ageOrBirth})`).join(", ")}
                            </span>
                          </div>
                        )}

                        {/* Group tags inside card */}
                        {p.groups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {p.groups.slice(0, 2).map(g => (
                              <span key={g} className="text-[10px] bg-[#f3f0ea] text-[#7c7267] px-2 py-0.5 rounded border border-[#ece5d8]/40 font-medium">
                                #{g}
                              </span>
                            ))}
                            {p.groups.length > 2 && (
                              <span className="text-[10px] text-[#a39788] px-1 mt-0.5 font-medium">+{p.groups.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Lower Interactions Panel */}
                      <div className="mt-4 pt-3.5 border-t border-dashed border-[#ece5d8] flex items-center justify-between">
                        <span className="text-[10px] text-[#a39788] flex items-center gap-1 font-mono font-medium">
                          <Clock className="w-3 h-3 text-[#a39788]" /> {p.lastContactDate} ({p.lastContactMedium})
                        </span>

                        {/* Fast action buttons inside grid */}
                        <div className="flex items-center gap-1">
                          <button
                            id={`quick-review-btn-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewingPerson(p);
                            }}
                            className="py-1.5 px-3 bg-[#ff6b6b] hover:bg-[#e05a5a] text-white font-bold rounded-xl text-[10px] flex items-center gap-1 shadow-sm shadow-[#ff6b6b]/20 active:scale-95 transition-all"
                            title="미팅 1분전 퀵 복습 모달 열기"
                          >
                            ⚡ 1분 복습
                          </button>
                          
                          <button
                            id={`quick-analyze-btn-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPersonId(p.id);
                              setIsAnalyzingAudio(true);
                            }}
                            className="p-1.5 hover:bg-[#fff9f0] text-[#ff6b6b] rounded-lg transition-colors"
                            title="이 인물에 대해 음성 녹음 또는 메모 분석하기"
                          >
                            <Mic className="w-3 h-3" />
                          </button>

                          <button
                            id={`edit-person-btn-${p.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPerson(p);
                            }}
                            className="p-1.5 hover:bg-[#f3f0ea] text-[#a39788] hover:text-[#352f28] rounded-lg transition-colors"
                            title="지인 정보 수정"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-[#ece5d8] rounded-3xl p-8 text-center shadow-sm space-y-4">
                <div className="text-4xl text-[#a39788]">📓</div>
                <div className="space-y-1">
                  <p className="font-serif font-bold text-[#352f28] text-base">등록된 지인이 없거나 필터 조건에 맞는 검색 결과가 없습니다.</p>
                  <p className="text-xs text-[#a39788]">새 지인을 추가하거나 상단의 [데모 데이터 로드] 버튼을 눌러보세요!</p>
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    id="no-data-register-btn"
                    onClick={() => {
                      setEditingPerson(null);
                      setIsAddingPerson(true);
                    }}
                    className="py-2.5 px-5 bg-[#ff6b6b] hover:bg-[#e05a5a] text-white font-bold rounded-full text-xs transition-colors"
                  >
                    직접 첫 지인 등록
                  </button>
                  <button
                    id="no-data-load-demo-btn"
                    onClick={handleLoadDemoData}
                    className="py-2.5 px-5 bg-[#352f28] hover:bg-black text-white font-bold rounded-full text-xs transition-colors"
                  >
                    데모 데이터 로딩
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Backup Restores Panel in the footer of left panel */}
          <BackupRestore
            people={people}
            customGroups={customGroups}
            onImport={handleImportBackup}
            onClearAll={handleClearAllData}
          />

        </div>

        {/* Right Page (Detailed Diary Sheet of selected Person) - col-span-5 */}
        <div className={`lg:col-span-5 ${activeMobileTab === "detail" ? "block" : "hidden lg:block"}`}>
          
          {selectedPerson ? (
            <div className="bg-white border border-[#ece5d8] rounded-[32px] shadow-sm overflow-hidden relative min-h-[500px] flex flex-col justify-between">
              
              {/* Binder rings overlay on left margin for realistic notebook binding effect on desktop */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-[#f3f0ea] via-[#FAF9F5] to-transparent hidden lg:block border-r border-[#ece5d8]/40 shrink-0" />
              
              {/* Paper Details Container */}
              <div className="p-6 lg:pl-10 lg:pr-8 space-y-6">
                
                {/* Mobile-only back button header */}
                <div className="lg:hidden flex items-center gap-2 pb-3 mb-3 border-b border-[#ece5d8] px-1">
                  <button
                    onClick={() => setActiveMobileTab("list")}
                    className="py-1.5 px-3 bg-[#f3f0ea] hover:bg-[#ece5d8] text-[#4a433a] rounded-full text-[11px] font-bold flex items-center gap-1 border border-[#ece5d8]/40 transition-all"
                  >
                    ← 목록으로 돌아가기
                  </button>
                  <span className="text-xs text-[#a39788] font-medium font-sans">비밀노트 페이지</span>
                </div>
                
                {/* Header profile row */}
                <div className="flex items-start justify-between pb-4 border-b border-[#ece5d8]">
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 text-4xl rounded-2xl ${selectedPerson.avatarBg} shadow-inner flex items-center justify-center shrink-0`}>
                      {selectedPerson.avatarEmoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-serif font-bold text-[#352f28] leading-none">
                          {selectedPerson.name}
                        </h2>
                        <span className={getRelationBadgeClass(selectedPerson.category)}>
                          {selectedPerson.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#a39788] mt-1.5 flex items-center gap-1 font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-[#a39788]" /> {selectedPerson.company || "소속/직장 없음"}
                      </p>
                      {selectedPerson.phone && (
                        <p className="text-xs text-[#a39788] flex items-center gap-1 mt-0.5 font-mono font-medium">
                          📞 {selectedPerson.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions for currently selected card */}
                  <div className="flex items-center gap-1">
                    <button
                      id="edit-selected-person-btn"
                      onClick={() => setEditingPerson(selectedPerson)}
                      className="p-2 hover:bg-[#f3f0ea] text-[#a39788] hover:text-[#352f28] rounded-xl transition-all"
                      title="지인 정보 수정"
                    >
                      ✏️
                    </button>
                    <button
                      id="delete-selected-person-btn"
                      onClick={() => handleDeletePerson(selectedPerson.id)}
                      className="p-2 hover:bg-[#fdf2f2] text-[#ef4444] rounded-xl transition-all"
                      title="이 페이지 영구 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {selectedPerson.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedPerson.groups.map(g => (
                      <span key={g} className="text-xs bg-[#f3f0ea] text-[#7c7267] px-2.5 py-0.5 rounded border border-[#ece5d8] font-medium">
                        #{g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Spouse & Kids detailed block with highlighting */}
                <div className="p-5 bg-[#fdf2f2] rounded-3xl border border-[#fecaca] space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#ef4444]">
                    <Heart className="w-4 h-4 text-[#ff6b6b] fill-[#ff6b6b]" />
                    <span>소중한 가족 관계 인물 ({selectedPerson.familyInfo?.spouseName ? "배우자 포함 " : ""}{selectedPerson.familyInfo?.children.length || 0}명)</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {selectedPerson.familyInfo?.spouseName && (
                      <div className="flex items-center gap-1.5 text-[#4a433a] bg-white/60 p-2.5 rounded-xl border border-[#fecaca]/20">
                        <span className="font-semibold text-[#7c7267]">배우자:</span>
                        <span className="font-bold text-[#352f28]">{selectedPerson.familyInfo.spouseName}님</span>
                      </div>
                    )}

                    {selectedPerson.familyInfo?.children && selectedPerson.familyInfo.children.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPerson.familyInfo.children.map((child, idx) => (
                          <div key={idx} className="bg-white/90 p-3 rounded-2xl border border-[#fecaca]/30 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between text-[#352f28] font-bold text-xs">
                              <span className="flex items-center gap-1">
                                <Baby className="w-3.5 h-3.5 text-[#ff6b6b]" />
                                {child.name}
                              </span>
                              <span className="text-[10px] text-[#7c7267] bg-[#f3f0ea] px-1.5 py-0.5 rounded font-medium border border-[#ece5d8]/30">
                                {child.ageOrBirth}
                              </span>
                            </div>
                            {child.memo && (
                              <p className="text-[11px] text-[#7c7267] bg-[#fff9f0]/40 p-2 rounded-lg italic border border-[#ffedd5]/30 mt-1">
                                "{child.memo}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#a39788] text-center py-2 bg-white/40 rounded-xl">자녀 정보가 등록되지 않았습니다.</p>
                    )}
                  </div>
                </div>

                {/* Beautiful Lined Paper for Special Notes/Hobbies (Aesthetic masterclass) */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-[#a39788] uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff6b6b]" />
                    <span>세심한 취향 및 식성 메모</span>
                  </h4>
                  <div className="bg-[#fff9f0] border border-[#ece5d8] rounded-3xl p-5 shadow-inner relative overflow-hidden">
                    {/* Pink vertical margin line on the left side of the paper */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#fecaca]/50" />
                    <div className="paper-lines font-hand text-xl text-[#4a433a] pl-6 outline-none whitespace-pre-wrap leading-7 min-h-[120px]">
                      {selectedPerson.memo || "특이사항 및 메모가 기록되지 않았습니다.\n우측의 음성 녹음 분석을 실행하거나 직접 수정하여 기록해 두세요."}
                    </div>
                  </div>
                </div>

                {/* Timeline Conversations History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#a39788] uppercase tracking-wide flex items-center justify-between">
                    <span>💬 대화 기록 및 AI 요약 히스토리</span>
                    <button
                      id="selected-person-quick-record-btn"
                      onClick={() => setIsAnalyzingAudio(true)}
                      className="text-xs text-[#ff6b6b] hover:underline font-bold"
                    >
                      + 새 기록 추가
                    </button>
                  </h4>

                  {selectedPerson.history && selectedPerson.history.length > 0 ? (
                    <div className="space-y-3 border-l-2 border-dashed border-[#ece5d8] pl-4 ml-2">
                      {selectedPerson.history.map(hist => (
                        <div key={hist.id} className="relative space-y-1">
                          {/* Circle on timeline */}
                          <div className="absolute -left-[23px] top-1.5 w-2.5 h-2.5 bg-[#ff6b6b] rounded-full ring-4 ring-white" />
                          
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-[#a39788] flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#a39788]" /> {hist.date}
                            </span>
                            <span className="bg-[#f3f0ea] text-[#7c7267] font-bold px-2 py-0.5 rounded text-[10px]">
                              {hist.medium}
                            </span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-[#ece5d8] space-y-2 text-xs shadow-sm">
                            <p className="font-bold text-[#352f28] flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#a39788]" />
                              대화 요약 3줄
                            </p>
                            <div className="text-xs text-[#4a433a] font-sans leading-relaxed whitespace-pre-line pl-2 border-l-2 border-[#ff6b6b]/40">
                              {hist.summary}
                            </div>
                            {hist.rawTranscript && (
                              <details className="mt-1">
                                <summary className="text-[10px] text-[#a39788] hover:text-[#ff6b6b] cursor-pointer outline-none font-medium">
                                  원본 음성 대본 보기
                                </summary>
                                <p className="text-[11px] text-[#7c7267] bg-[#f3f0ea] p-2.5 rounded-xl border border-[#ece5d8] mt-1.5 whitespace-pre-wrap leading-relaxed">
                                  "{hist.rawTranscript}"
                                </p>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-white rounded-3xl text-center border border-[#ece5d8] space-y-1">
                      <p className="text-xs text-[#a39788] font-bold">최근 대화 히스토리가 없습니다.</p>
                      <p className="text-[10px] text-[#a39788] mt-0.5 leading-relaxed">상단 [음성 녹음 & AI 분석] 버튼으로 대화를 들려주면 자동으로 채워집니다!</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Quick Review Trigger */}
              <div className="p-5 bg-[#f3f0ea] border-t border-[#ece5d8] flex items-center justify-between rounded-b-[32px]">
                <p className="text-xs text-[#a39788] font-medium">지인과 만나기 1분 전이신가요?</p>
                <button
                  id="selected-person-review-btn"
                  onClick={() => setReviewingPerson(selectedPerson)}
                  className="py-2.5 px-5 bg-[#352f28] hover:bg-black text-white font-bold rounded-2xl text-xs shadow-md shadow-[#352f28]/10 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  ⚡ 미팅 전 1분 Quick 복습 시작
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-[#ece5d8] rounded-[32px] p-12 text-center shadow-sm text-[#a39788] min-h-[400px] flex flex-col items-center justify-center space-y-4">
              <div className="text-5xl text-[#ff6b6b]">👤</div>
              <p className="text-sm font-serif font-bold text-[#352f28]">지인을 선택하면 상세 비밀 다이어리가 열립니다.</p>
              <p className="text-xs text-[#a39788] leading-relaxed">좌측 지인 목록에서 카드를 누르거나 새 지인을 등록해 보세요.</p>
              <button
                onClick={() => setActiveMobileTab("list")}
                className="lg:hidden mt-2 py-2 px-4 bg-[#f3f0ea] hover:bg-[#ece5d8] text-[#4a433a] font-bold rounded-xl text-xs border border-[#ece5d8]"
              >
                지인 목록 보기
              </button>
            </div>
          )}

        </div>

      </main>

      {/* Bottom Nav Bar for Mobile Only - Styled like native Android material bars */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#ece5d8] py-2 px-4 pb-safe flex justify-around items-center shadow-lg">
        <button
          onClick={() => setActiveMobileTab("list")}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeMobileTab === "list"
              ? "text-[#ff6b6b] font-bold"
              : "text-[#a39788]"
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px]">지인 목록</span>
        </button>

        {/* Floating Recording FAB */}
        <button
          onClick={() => setIsAnalyzingAudio(true)}
          className="w-12 h-12 -mt-6 bg-[#ff6b6b] hover:bg-[#e05a5a] text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-transform active:scale-95"
          title="음성 녹음 & AI 분석 열기"
        >
          <Mic className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            if (selectedPerson) {
              setActiveMobileTab("detail");
            } else {
              alert("상세 비밀 다이어리를 보려면 먼저 지인을 선택해 주세요!");
            }
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            !selectedPerson ? "opacity-40 cursor-not-allowed" : ""
          } ${
            activeMobileTab === "detail"
              ? "text-[#ff6b6b] font-bold"
              : "text-[#a39788]"
          }`}
        >
          <BookMarked className="w-5 h-5" />
          <span className="text-[10px]">비밀노트</span>
        </button>
      </div>

      {/* MODALS RENDERING */}
      <AnimatePresence>
        {/* 1. Review Modal */}
        {reviewingPerson && (
          <ReviewModal
            person={reviewingPerson}
            onClose={() => setReviewingPerson(null)}
          />
        )}

        {/* 2. Audio Analyzer Modal */}
        {isAnalyzingAudio && (
          <AudioAnalysisModal
            people={people}
            selectedPersonId={selectedPersonId || undefined}
            onClose={() => setIsAnalyzingAudio(false)}
            onUpdatePerson={handleUpdatePerson}
            onAddPerson={handleAddPerson}
          />
        )}

        {/* 3. Person Editor / Creator Modal */}
        {(isAddingPerson || editingPerson) && (
          <PersonFormModal
            person={editingPerson}
            customGroups={customGroups}
            onClose={() => {
              setEditingPerson(null);
              setIsAddingPerson(false);
            }}
            onSave={handleSavePerson}
          />
        )}
      </AnimatePresence>

      {/* Credit Footer */}
      <footer className="text-center py-12 text-[10px] text-[#a39788] font-mono tracking-wider">
        © 2026 YONG-JJA'S SECRET NOTE • DESIGNED FOR DEAREST CONNECTIONS
      </footer>

    </div>
  );
}
