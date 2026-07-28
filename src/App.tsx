import React, { useState, useEffect, useRef } from "react";
import { Person, CustomGroup, CategoryType } from "./types";
import { initialPeople, initialGroups } from "./demoData";
import { calculateAge } from "./utils/age";
import { getOverdueContacts } from "./utils/reminders";
import ReviewModal from "./components/ReviewModal";
import QuickCaptureModal from "./components/QuickCaptureModal";
import PersonFormModal from "./components/PersonFormModal";
import BackupRestore from "./components/BackupRestore";
import LockScreen from "./components/LockScreen";
import { saveVault, VaultData } from "./vault";
import {
  Search,
  Mic,
  FolderPlus,
  Clock,
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
  Lock,
  Bell,
  Gift,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getCategoryTabClass = (cat: string, isSelected: boolean) => {
  if (isSelected) {
    return "bg-slate-900 text-white border-slate-900";
  }
  switch (cat) {
    case "가족":
      return "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100";
    case "친구":
      return "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100";
    case "지인":
      return "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100";
    case "회사-업무":
      return "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100";
    case "회사-동료":
      return "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200";
    case "외부 기타":
      return "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100";
    default:
      return "bg-white border-slate-200 text-slate-600 hover:bg-slate-50";
  }
};

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

type Layer = "root" | "detail" | "modal";

export default function App() {
  // Encryption vault key lives in memory only for this tab's session — it is
  // never persisted, so the app re-locks on every fresh load/reload.
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  const [people, setPeople] = useState<Person[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);

  // React state updates are async/batched, so two saves fired back-to-back
  // (e.g. clearing people then groups) can't safely read each other's latest
  // value off state. Refs mirror the latest values synchronously instead.
  const peopleRef = useRef<Person[]>([]);
  const groupsRef = useRef<CustomGroup[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "전체">("전체");
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null);

  // Selected Person for the Detail pane
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Mobile App Optimization State
  const [activeMobileTab, setActiveMobileTab] = useState<"list" | "detail">("list");

  // Modal active states
  const [reviewingPerson, setReviewingPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Group creation input
  const [newGroupInput, setNewGroupInput] = useState("");

  // --- Back-button / History management ---------------------------------
  // A single source of truth for "what layer is currently on top of the
  // native history stack". Every open action pushes a layer; every close
  // action (X buttons, cancel, save, hardware/gesture back) goes through
  // closeLayer() so the two can never drift out of sync.
  const currentLayerRef = useRef<Layer>("root");

  const pushLayer = (layer: Exclude<Layer, "root">) => {
    if (currentLayerRef.current === layer) return;
    window.history.pushState({ layer }, "");
    currentLayerRef.current = layer;
  };

  const closeLayer = () => {
    if (currentLayerRef.current !== "root") {
      window.history.back();
    }
  };

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const leaving = currentLayerRef.current;
      if (leaving === "modal") {
        setReviewingPerson(null);
        setEditingPerson(null);
        setIsAddingPerson(false);
        setIsQuickCaptureOpen(false);
      } else if (leaving === "detail") {
        setActiveMobileTab("list");
      }
      currentLayerRef.current = (e.state && e.state.layer) || "root";
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openDetail = (personId: string) => {
    setSelectedPersonId(personId);
    setActiveMobileTab("detail");
    pushLayer("detail");
  };

  // Called by LockScreen once the vault is unlocked (or freshly created).
  // Real data only — no demo/dummy data is ever auto-seeded here. First-time
  // users see a genuine empty state and can opt into sample data via the
  // "데모 데이터 로드" button if they want it.
  const handleUnlocked = (key: CryptoKey, data: VaultData) => {
    setVaultKey(key);
    setPeople(data.people);
    setCustomGroups(data.customGroups);
    peopleRef.current = data.people;
    groupsRef.current = data.customGroups;
    if (data.people.length > 0) {
      setSelectedPersonId(data.people[0].id);
    }
  };

  // Re-lock the app: forget the in-memory key so the vault must be unlocked
  // again with the PIN. The encrypted data on disk is untouched.
  const handleLock = () => {
    setVaultKey(null);
    setPeople([]);
    setCustomGroups([]);
    peopleRef.current = [];
    groupsRef.current = [];
    setSelectedPersonId(null);
    setActiveMobileTab("list");
  };

  const persistVault = (nextPeople: Person[], nextGroups: CustomGroup[]) => {
    peopleRef.current = nextPeople;
    groupsRef.current = nextGroups;
    if (!vaultKey) return;
    saveVault(vaultKey, { people: nextPeople, customGroups: nextGroups }).catch((err) => {
      console.error("Failed to persist encrypted vault:", err);
    });
  };

  // Save to the encrypted local vault whenever state changes
  const savePeopleToLocalStorage = (updatedPeople: Person[]) => {
    setPeople(updatedPeople);
    persistVault(updatedPeople, groupsRef.current);
  };

  const saveGroupsToLocalStorage = (updatedGroups: CustomGroup[]) => {
    setCustomGroups(updatedGroups);
    persistVault(peopleRef.current, updatedGroups);
  };

  // Pre-load original sample datasets if lists empty
  const handleLoadDemoData = () => {
    savePeopleToLocalStorage(initialPeople);
    saveGroupsToLocalStorage(initialGroups);
    setSelectedPersonId(initialPeople[0].id);
    setActiveMobileTab("list");
    alert("🎉 용쨔의 오리지널 데모 데이터를 안전하게 로드했습니다!");
  };

  // Add/Edit Person callback — data only. The form modal is dismissed by the
  // caller (its onClose is wired to closeLayer), so this never touches
  // navigation state, which keeps the back-button bookkeeping simple.
  const handleSavePerson = (saved: Person) => {
    const exists = people.some(p => p.id === saved.id);
    const updated = exists ? people.map(p => (p.id === saved.id ? saved : p)) : [saved, ...people];
    savePeopleToLocalStorage(updated);
    setSelectedPersonId(saved.id);
    setEditingPerson(null);
    setIsAddingPerson(false);
    closeLayer();
  };

  // Quick updating person (from AI proposals / voice memo etc.)
  const handleUpdatePerson = (updated: Person) => {
    const updatedList = people.map(p => (p.id === updated.id ? updated : p));
    savePeopleToLocalStorage(updatedList);
    setSelectedPersonId(updated.id);
  };

  // Quick adding new person (from AI proposals)
  const handleAddPerson = (newPerson: Person) => {
    const updatedList = [newPerson, ...people];
    savePeopleToLocalStorage(updatedList);
    setSelectedPersonId(newPerson.id);
  };

  // Delete person diary
  const handleDeletePerson = (id: string) => {
    const doubleCheck = window.confirm("정말로 이 지인의 정보를 영구 삭제하시겠습니까?");
    if (doubleCheck) {
      const filtered = people.filter(p => p.id !== id);
      savePeopleToLocalStorage(filtered);
      if (selectedPersonId === id) {
        setSelectedPersonId(filtered.length > 0 ? filtered[0].id : null);
      }
      closeLayer();
    }
  };

  // Add Custom group tag globally
  const handleAddGlobalGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupInput.trim();
    if (name && !customGroups.some(g => g.name === name)) {
      const newGroup: CustomGroup = { id: "g_" + Date.now(), name };
      saveGroupsToLocalStorage([...customGroups, newGroup]);
      setNewGroupInput("");
    }
  };

  // Delete global group tag
  const handleDeleteGlobalGroup = (groupName: string) => {
    saveGroupsToLocalStorage(customGroups.filter(g => g.name !== groupName));
    const updatedPeople = people.map(p => ({ ...p, groups: p.groups.filter(g => g !== groupName) }));
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
    alert("모든 데이터가 삭제되고 초기화되었습니다.");
  };

  // Filtering logic
  const filteredPeople = people.filter(p => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery = !query ? true : (
      p.name.toLowerCase().includes(query) ||
      p.company.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      p.preferences.food.toLowerCase().includes(query) ||
      p.preferences.hobbies.toLowerCase().includes(query) ||
      p.preferences.notes.toLowerCase().includes(query) ||
      p.groups.some(g => g.toLowerCase().includes(query)) ||
      p.familyInfo?.spouseName?.toLowerCase().includes(query) ||
      p.familyInfo?.children.some(c => c.name.toLowerCase().includes(query) || c.memo.toLowerCase().includes(query))
    );

    const matchCategory = selectedCategory === "전체" ? true : p.category === selectedCategory;
    const matchGroup = !selectedGroupFilter ? true : p.groups.includes(selectedGroupFilter);

    return matchQuery && matchCategory && matchGroup;
  });

  const selectedPerson = people.find(p => p.id === selectedPersonId) || null;
  const overdueContacts = getOverdueContacts(people);

  // Gate the entire app behind the encrypted vault lock screen.
  if (!vaultKey) {
    return <LockScreen onUnlocked={handleUnlocked} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-4 pb-28 md:py-6 px-4 md:px-8 font-sans text-slate-700">

      {/* Top Brand Banner */}
      <header className="max-w-7xl mx-auto mb-4 md:mb-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 border-b border-slate-200 pb-4 md:pb-5">
        <div className="flex items-center gap-2.5 md:gap-3 w-full md:w-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg md:text-xl font-bold shrink-0">
            용
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5 flex-wrap">
              용쨔의 비밀노트
              <span className="text-[9px] md:text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full">
                관계 관리
              </span>
            </h1>
            <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 truncate">미팅 1분 전, 소중한 사람들의 정보를 빠르게 확인하세요</p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none shrink-0">
          <button
            id="register-person-btn"
            onClick={() => {
              setEditingPerson(null);
              setIsAddingPerson(true);
              pushLayer("modal");
            }}
            className="py-2 px-4 md:py-2.5 md:px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] md:text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" /> 새 지인 등록
          </button>

          <button
            id="open-quick-capture-btn"
            onClick={() => {
              setIsQuickCaptureOpen(true);
              pushLayer("modal");
            }}
            className="py-2 px-4 md:py-2.5 md:px-5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg text-[11px] md:text-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Mic className="w-3.5 h-3.5" /> 빠른 기록
          </button>

          <button
            id="lock-app-btn"
            onClick={handleLock}
            title="비밀노트 잠그기"
            className="p-2 md:p-2.5 bg-white hover:bg-slate-100 text-slate-500 font-bold rounded-lg border border-slate-200 transition-all shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {people.length === 0 && (
            <button
              id="load-demo-data-btn"
              onClick={handleLoadDemoData}
              className="py-2 px-4 md:py-2.5 md:px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-[11px] md:text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <FolderPlus className="w-3.5 h-3.5" /> 데모 데이터 로드
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-5">

        {/* Overdue-contact reminder banner */}
        {overdueContacts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <Bell className="w-4 h-4" /> 안부 전할 때가 된 사람 ({overdueContacts.length}명)
            </div>
            <div className="flex flex-wrap gap-2">
              {overdueContacts.map(({ person, daysSinceContact }) => (
                <button
                  key={person.id}
                  id={`overdue-contact-btn-${person.id}`}
                  onClick={() => openDetail(person.id)}
                  className="bg-white border border-amber-200 hover:border-amber-400 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all"
                >
                  <span className="text-base leading-none">{person.avatarEmoji}</span>
                  <span className="font-bold text-slate-800">{person.name}</span>
                  <span className="text-amber-700 font-medium">{daysSinceContact}일째</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Left: List, filters */}
          <div className={`lg:col-span-7 space-y-5 ${activeMobileTab === "list" ? "block" : "hidden lg:block"}`}>

            <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="people-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름, 소속, 취향, 자녀 이름 등으로 검색..."
                  className="w-full text-xs bg-slate-50 border border-transparent rounded-lg pl-10 pr-4 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(["전체", "가족", "친구", "지인", "회사-업무", "회사-동료", "외부 기타"] as const).map(cat => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      id={`filter-tab-${cat}`}
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-1.5 px-4 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${getCategoryTabClass(cat, isSelected)}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>커스텀 그룹 필터</span>
                </h3>
                {selectedGroupFilter && (
                  <button
                    id="clear-group-filter-btn"
                    onClick={() => setSelectedGroupFilter(null)}
                    className="text-xs text-teal-700 hover:underline font-bold"
                  >
                    필터 해제
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {customGroups.map(g => {
                  const isFiltered = selectedGroupFilter === g.name;
                  return (
                    <div key={g.id} className="flex items-center">
                      <button
                        id={`group-filter-btn-${g.name}`}
                        onClick={() => setSelectedGroupFilter(isFiltered ? null : g.name)}
                        className={`py-1 px-3 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                          isFiltered ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>#{g.name}</span>
                      </button>
                      <button
                        id={`delete-group-tag-btn-${g.name}`}
                        type="button"
                        onClick={() => handleDeleteGlobalGroup(g.name)}
                        className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded-r text-[9px] -ml-1 border-y border-r border-slate-200 hover:border-rose-200 text-slate-400 transition-colors"
                        title="태그 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                <form onSubmit={handleAddGlobalGroup} className="flex gap-1.5 items-center">
                  <input
                    id="add-global-tag-input"
                    type="text"
                    value={newGroupInput}
                    onChange={(e) => setNewGroupInput(e.target.value)}
                    placeholder="새 태그 생성"
                    className="bg-slate-50 border-none rounded-lg px-2.5 py-1 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 w-20"
                  />
                  <button
                    id="submit-global-tag-btn"
                    type="submit"
                    className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-colors"
                  >
                    +
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400">
                  총 {filteredPeople.length}명이 검색되었습니다.
                </p>
                {people.length > 0 && filteredPeople.length === 0 && (
                  <button
                    id="reset-all-filters-btn"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("전체");
                      setSelectedGroupFilter(null);
                    }}
                    className="text-xs text-teal-700 hover:underline font-bold"
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
                        onClick={() => openDetail(p.id)}
                        className={`relative cursor-pointer p-5 rounded-xl transition-all flex flex-col justify-between group ${
                          isSelected ? "bg-teal-50/40 border-2 border-teal-600" : "bg-white border border-slate-200 hover:border-teal-600/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-start gap-2.5">
                            <div className={`w-11 h-11 text-xl rounded-lg ${p.avatarBg} flex items-center justify-center shrink-0`}>
                              {p.avatarEmoji}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-slate-900 text-base truncate leading-none">{p.name}</h3>
                                <span className={getRelationBadgeClass(p.category)}>{p.category}</span>
                              </div>
                              <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1 font-medium">
                                <Briefcase className="w-3.5 h-3.5" /> {p.company || "소속 없음"}
                              </p>
                            </div>
                          </div>

                          {p.familyInfo?.children && p.familyInfo.children.length > 0 && (
                            <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold">
                              <Baby className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {p.familyInfo.children.map(c => `${c.name}(${c.birthDate ? calculateAge(c.birthDate) : c.ageOrBirth || "나이 미상"})`).join(", ")}
                              </span>
                            </div>
                          )}

                          {p.groups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {p.groups.slice(0, 2).map(g => (
                                <span key={g} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">#{g}</span>
                              ))}
                              {p.groups.length > 2 && (
                                <span className="text-[10px] text-slate-400 px-1 mt-0.5 font-medium">+{p.groups.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono font-medium">
                            <Clock className="w-3 h-3" /> {p.lastContactDate} ({p.lastContactMedium})
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              id={`quick-review-btn-${p.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewingPerson(p);
                                pushLayer("modal");
                              }}
                              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 active:scale-95 transition-all"
                              title="미팅 1분전 퀵 복습"
                            >
                              1분 복습
                            </button>

                            <button
                              id={`quick-capture-btn-${p.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPersonId(p.id);
                                setIsQuickCaptureOpen(true);
                                pushLayer("modal");
                              }}
                              className="p-1.5 hover:bg-teal-50 text-teal-700 rounded-lg transition-colors"
                              title="이 인물에 대해 빠른 기록 남기기"
                            >
                              <Mic className="w-3 h-3" />
                            </button>

                            <button
                              id={`edit-person-btn-${p.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPerson(p);
                                pushLayer("modal");
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
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
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-base">등록된 지인이 없거나 필터 조건에 맞는 검색 결과가 없습니다.</p>
                    <p className="text-xs text-slate-400">새 지인을 추가하거나 데모 데이터를 불러와 보세요.</p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      id="no-data-register-btn"
                      onClick={() => {
                        setEditingPerson(null);
                        setIsAddingPerson(true);
                        pushLayer("modal");
                      }}
                      className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors"
                    >
                      직접 첫 지인 등록
                    </button>
                    <button
                      id="no-data-load-demo-btn"
                      onClick={handleLoadDemoData}
                      className="py-2.5 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-xs transition-colors"
                    >
                      데모 데이터 로딩
                    </button>
                  </div>
                </div>
              )}
            </div>

            <BackupRestore
              people={people}
              customGroups={customGroups}
              vaultKey={vaultKey}
              onImport={handleImportBackup}
              onClearAll={handleClearAllData}
            />

          </div>

          {/* Right: Detail pane */}
          <div className={`lg:col-span-5 ${activeMobileTab === "detail" ? "block" : "hidden lg:block"}`}>

            {selectedPerson ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden relative min-h-[500px] flex flex-col justify-between">

                <div className="p-6 space-y-6">

                  <div className="lg:hidden flex items-center gap-2 pb-3 mb-3 border-b border-slate-200">
                    <button
                      onClick={closeLayer}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                    >
                      ← 목록으로
                    </button>
                  </div>

                  <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className={`w-14 h-14 text-3xl rounded-xl ${selectedPerson.avatarBg} flex items-center justify-center shrink-0`}>
                        {selectedPerson.avatarEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900 leading-none">{selectedPerson.name}</h2>
                          <span className={getRelationBadgeClass(selectedPerson.category)}>{selectedPerson.category}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
                          <Briefcase className="w-3.5 h-3.5" /> {selectedPerson.company || "소속/직장 없음"}
                        </p>
                        {selectedPerson.phone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-mono font-medium">📞 {selectedPerson.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id="edit-selected-person-btn"
                        onClick={() => {
                          setEditingPerson(selectedPerson);
                          pushLayer("modal");
                        }}
                        className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all"
                        title="지인 정보 수정"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        id="delete-selected-person-btn"
                        onClick={() => handleDeletePerson(selectedPerson.id)}
                        className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-all"
                        title="이 지인 정보 영구 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {selectedPerson.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPerson.groups.map(g => (
                        <span key={g} className="text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded font-medium">#{g}</span>
                      ))}
                    </div>
                  )}

                  {/* Family */}
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Heart className="w-4 h-4 text-rose-500" />
                      <span>가족 정보 ({selectedPerson.familyInfo?.spouseName ? "배우자 포함 " : ""}{selectedPerson.familyInfo?.children.length || 0}명)</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {selectedPerson.familyInfo?.spouseName && (
                        <div className="flex items-center gap-1.5 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-400">배우자:</span>
                          <span className="font-bold text-slate-900">{selectedPerson.familyInfo.spouseName}님</span>
                        </div>
                      )}

                      {selectedPerson.familyInfo?.children && selectedPerson.familyInfo.children.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPerson.familyInfo.children.map((child, idx) => {
                            const age = child.birthDate ? calculateAge(child.birthDate) : null;
                            return (
                              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                                <div className="flex items-center justify-between text-slate-900 font-bold text-xs">
                                  <span className="flex items-center gap-1">
                                    <Baby className="w-3.5 h-3.5 text-slate-400" /> {child.name}
                                  </span>
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                    {age || child.ageOrBirth || "나이 미상"}
                                  </span>
                                </div>
                                {child.memo && (
                                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-md italic mt-1">"{child.memo}"</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 text-center py-2 bg-white rounded-lg">자녀 정보가 등록되지 않았습니다.</p>
                      )}
                    </div>
                  </div>

                  {/* Preferences: food / hobbies / notes */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>미팅 전 체크리스트</span>
                    </h4>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                      <div className="flex gap-2">
                        <span className="text-slate-400 font-semibold w-14 shrink-0">음식</span>
                        <span className="text-slate-700">{selectedPerson.preferences.food || "기록 없음"}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400 font-semibold w-14 shrink-0">취미</span>
                        <span className="text-slate-700">{selectedPerson.preferences.hobbies || "기록 없음"}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-400 font-semibold w-14 shrink-0">메모</span>
                        <span className="text-slate-700 whitespace-pre-wrap">{selectedPerson.preferences.notes || "기록 없음"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Events history */}
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" />
                      <span>경조사 & 선물 히스토리</span>
                    </h4>
                    {selectedPerson.eventsHistory && selectedPerson.eventsHistory.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPerson.eventsHistory.map(ev => (
                          <div key={ev.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded text-[10px]">{ev.type}</span>
                              <span className="text-slate-700">{ev.amountOrGift}</span>
                              {ev.note && <span className="text-slate-400">· {ev.note}</span>}
                            </div>
                            <span className="text-slate-400 font-mono text-[10px]">{ev.date}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 text-center py-3 bg-slate-50 rounded-lg border border-slate-200">기록된 경조사/선물 내역이 없습니다.</p>
                    )}
                  </div>

                  {/* Conversation history */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> 대화 기록</span>
                      <button
                        id="selected-person-quick-record-btn"
                        onClick={() => {
                          setIsQuickCaptureOpen(true);
                          pushLayer("modal");
                        }}
                        className="text-xs text-teal-700 hover:underline font-bold normal-case"
                      >
                        + 새 기록 추가
                      </button>
                    </h4>

                    {selectedPerson.history && selectedPerson.history.length > 0 ? (
                      <div className="space-y-3 border-l-2 border-slate-200 pl-4 ml-2">
                        {selectedPerson.history.map(hist => (
                          <div key={hist.id} className="relative space-y-1">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-teal-600 rounded-full ring-4 ring-white" />

                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-mono text-slate-400 flex items-center gap-1 font-medium">
                                <Calendar className="w-3.5 h-3.5" /> {hist.date}
                              </span>
                              <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-[10px]">{hist.medium}</span>
                            </div>

                            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pl-2 border-l-2 border-teal-600/30">
                                {hist.summary}
                              </div>
                              {hist.rawTranscript && (
                                <details className="mt-1">
                                  <summary className="text-[10px] text-slate-400 hover:text-teal-700 cursor-pointer outline-none font-medium">원본 텍스트 보기</summary>
                                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg mt-1.5 whitespace-pre-wrap leading-relaxed">"{hist.rawTranscript}"</p>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-xl text-center border border-slate-200 space-y-1">
                        <p className="text-xs text-slate-400 font-bold">아직 기록이 없어요. 대화를 나누고 채워보세요.</p>
                      </div>
                    )}
                  </div>

                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">지인과 만나기 1분 전이신가요?</p>
                  <button
                    id="selected-person-review-btn"
                    onClick={() => {
                      setReviewingPerson(selectedPerson);
                      pushLayer("modal");
                    }}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    1분 Quick 복습 시작
                  </button>
                </div>

              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <p className="text-sm font-bold text-slate-900">지인을 선택하면 상세 정보가 열립니다.</p>
                <p className="text-xs text-slate-400 leading-relaxed">좌측 지인 목록에서 카드를 누르거나 새 지인을 등록해 보세요.</p>
                <button
                  onClick={closeLayer}
                  className="lg:hidden mt-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs"
                >
                  지인 목록 보기
                </button>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Bottom Nav Bar for Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 px-4 pb-safe flex justify-around items-center">
        <button
          onClick={() => {
            if (activeMobileTab === "detail") closeLayer();
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
            activeMobileTab === "list" ? "text-teal-700 font-bold" : "text-slate-400"
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px]">지인 목록</span>
        </button>

        <button
          onClick={() => {
            setIsQuickCaptureOpen(true);
            pushLayer("modal");
          }}
          className="w-12 h-12 -mt-6 bg-teal-700 hover:bg-teal-800 text-white rounded-full flex items-center justify-center shadow-lg shadow-teal-900/20 transition-transform active:scale-95"
          title="빠른 기록 열기"
        >
          <Mic className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            if (selectedPerson) {
              openDetail(selectedPerson.id);
            } else {
              alert("상세 정보를 보려면 먼저 지인을 선택해 주세요!");
            }
          }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
            !selectedPerson ? "opacity-40 cursor-not-allowed" : ""
          } ${activeMobileTab === "detail" ? "text-teal-700 font-bold" : "text-slate-400"}`}
        >
          <BookMarked className="w-5 h-5" />
          <span className="text-[10px]">상세정보</span>
        </button>
      </div>

      {/* MODALS RENDERING */}
      <AnimatePresence>
        {reviewingPerson && (
          <ReviewModal person={reviewingPerson} onClose={closeLayer} />
        )}

        {isQuickCaptureOpen && (
          <QuickCaptureModal
            people={people}
            selectedPersonId={selectedPersonId || undefined}
            onClose={closeLayer}
            onUpdatePerson={handleUpdatePerson}
            onAddPerson={handleAddPerson}
          />
        )}

        {(isAddingPerson || editingPerson) && (
          <PersonFormModal
            person={editingPerson}
            customGroups={customGroups}
            onClose={closeLayer}
            onSave={handleSavePerson}
          />
        )}
      </AnimatePresence>

      <footer className="text-center py-12 text-[10px] text-slate-300 font-mono tracking-wider">
        © 2026 YONG-JJA'S SECRET NOTE
      </footer>

    </div>
  );
}
