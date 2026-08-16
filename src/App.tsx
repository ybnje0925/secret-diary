import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog, { ConfirmDialogOptions } from "./components/common/ConfirmDialog";
import BottomNavigation, { AppTab } from "./components/navigation/BottomNavigation";
import LockScreen from "./components/LockScreen";
import GroupManagerSheet from "./components/people/GroupManagerSheet";
import StoryCaptureSheet, { ApprovedMemoryItem, StorySavePayload } from "./components/person/StoryCaptureSheet";
import { CustomGroup, EventHistoryItem, InteractionHistory, Person } from "./types";
import { AppSettings, loadAppSettings, saveAppSettings } from "./utils/appSettings";
import { normalizeMemoryText } from "./utils/saramdam";
import { clearIncompleteVaultSetup, getVaultStorageState, saveVault, VaultData } from "./vault";
import AddPersonView, { EditSection } from "./views/AddPersonView";
import CheckInView from "./views/CheckInView";
import HomeView from "./views/HomeView";
import PeopleView, { PeopleSortMode } from "./views/PeopleView";
import PersonDetailView from "./views/PersonDetailView";
import SettingsView from "./views/SettingsView";
import OnboardingView from "./views/OnboardingView";

type AppLayer = "root" | "detail" | "add";
type ConfirmRequest = ConfirmDialogOptions & { onConfirm: () => void };
type EntryStage = "unlock" | "onboarding" | "pin-setup";
const MIN_AUTO_LOCK_GRACE_MS = 10 * 60 * 1000;

export default function App() {
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [checkInPersonId, setCheckInPersonId] = useState<string | null>(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleFilter, setPeopleFilter] = useState("전체");
  const [peopleSortMode, setPeopleSortMode] = useState<PeopleSortMode>("story");
  const [storyInitialPersonId, setStoryInitialPersonId] = useState<string | null | undefined>(undefined);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editingSection, setEditingSection] = useState<EditSection | undefined>(undefined);
  const [addInitialName, setAddInitialName] = useState("");
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [layer, setLayer] = useState<AppLayer>("root");
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
  const [entryStage, setEntryStage] = useState<EntryStage>(() => {
    const vaultState = getVaultStorageState();
    if (vaultState === "ready") return "unlock";
    if (vaultState === "incomplete") clearIncompleteVaultSetup();
    return loadAppSettings().onboardingCompleted ? "pin-setup" : "onboarding";
  });
  const [firstUsePromptDismissed, setFirstUsePromptDismissed] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const peopleRef = useRef<Person[]>([]);
  const groupsRef = useRef<CustomGroup[]>([]);
  const historyLayerRef = useRef<AppLayer>("root");
  const layerRef = useRef<AppLayer>("root");
  const groupManagerOpenRef = useRef(false);
  const storyOpenRef = useRef(false);
  const confirmOpenRef = useRef(false);
  const backPressedAtRef = useRef(0);
  const autoLockTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const lastActiveAtRef = useRef(Date.now());
  const tabScrollPositionsRef = useRef<Record<AppTab, number>>({ home: 0, people: 0, checkin: 0, settings: 0 });

  useEffect(() => { layerRef.current = layer; }, [layer]);
  useEffect(() => { groupManagerOpenRef.current = groupManagerOpen; }, [groupManagerOpen]);
  useEffect(() => { storyOpenRef.current = storyInitialPersonId !== undefined; }, [storyInitialPersonId]);
  useEffect(() => { confirmOpenRef.current = confirmRequest !== null; }, [confirmRequest]);

  useEffect(() => {
    if (!vaultKey) return;
    const initialLayer = historyLayerRef.current;
    window.history.replaceState({ layer: initialLayer }, "");
    window.history.pushState({ layer: initialLayer, guard: true }, "");
  }, [vaultKey]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (confirmOpenRef.current) {
        setConfirmRequest(null);
        window.history.pushState({ layer: historyLayerRef.current, guard: true }, "");
        return;
      }
      const overlayBackEvent = new CustomEvent("saramdam:overlay-back", { cancelable: true });
      if (!window.dispatchEvent(overlayBackEvent)) {
        window.history.pushState({ layer: historyLayerRef.current, guard: true }, "");
        return;
      }
      if (storyOpenRef.current) {
        setStoryInitialPersonId(undefined);
        window.history.pushState({ layer: historyLayerRef.current, guard: true }, "");
        return;
      }
      if (groupManagerOpenRef.current) {
        setGroupManagerOpen(false);
        window.history.pushState({ layer: historyLayerRef.current, guard: true }, "");
        return;
      }
      if (historyLayerRef.current === "root") {
        const rootBackEvent = new CustomEvent("saramdam:root-back", { cancelable: true });
        if (!window.dispatchEvent(rootBackEvent)) {
          window.history.pushState({ layer: "root", guard: true }, "");
          return;
        }
        const now = Date.now();
        if (now - backPressedAtRef.current < 2000) {
          return;
        }
        backPressedAtRef.current = now;
        setToast("뒤로 한 번 더 누르면 종료됩니다.");
        window.setTimeout(() => setToast(""), 1800);
        window.history.pushState({ layer: "root", guard: true }, "");
        return;
      }
      const nextLayer: AppLayer = event.state?.layer === "detail" ? "detail" : "root";
      historyLayerRef.current = nextLayer;
      setLayer(nextLayer);
      setStoryInitialPersonId(undefined);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const updateKeyboardState = () => {
      const activeElement = document.activeElement;
      const isFormControl = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLSelectElement;
      setKeyboardOpen(isFormControl && window.innerHeight - visualViewport.height > 120);
    };

    visualViewport.addEventListener("resize", updateKeyboardState);
    window.addEventListener("focusin", updateKeyboardState);
    window.addEventListener("focusout", updateKeyboardState);
    return () => {
      visualViewport.removeEventListener("resize", updateKeyboardState);
      window.removeEventListener("focusin", updateKeyboardState);
      window.removeEventListener("focusout", updateKeyboardState);
    };
  }, []);

  useEffect(() => {
    if (layer !== "root") return;
    const top = tabScrollPositionsRef.current[activeTab] || 0;
    window.requestAnimationFrame(() => window.scrollTo({ top, behavior: "auto" }));
  }, [activeTab, layer]);

  const rememberTabScroll = () => {
    if (layerRef.current === "root") {
      tabScrollPositionsRef.current[activeTab] = window.scrollY;
    }
  };

  const requestConfirm = (options: ConfirmRequest) => {
    setConfirmRequest(options);
  };

  const pushLayer = (nextLayer: Exclude<AppLayer, "root">) => {
    if (historyLayerRef.current !== nextLayer) {
      window.history.pushState({ layer: nextLayer }, "");
      historyLayerRef.current = nextLayer;
    }
    setLayer(nextLayer);
  };

  const closeLayer = () => {
    if (historyLayerRef.current !== "root") {
      window.history.back();
      return;
    }
    setLayer("root");
  };

  const persistVault = (nextPeople: Person[], nextGroups: CustomGroup[]) => {
    peopleRef.current = nextPeople;
    groupsRef.current = nextGroups;
    if (!vaultKey) return;
    saveVault(vaultKey, { people: nextPeople, customGroups: nextGroups }).catch((error) => {
      console.error("Failed to persist encrypted vault:", error);
    });
  };

  const savePeople = (nextPeople: Person[]) => {
    setPeople(nextPeople);
    persistVault(nextPeople, groupsRef.current);
  };

  const saveGroups = (nextGroups: CustomGroup[]) => {
    setCustomGroups(nextGroups);
    persistVault(peopleRef.current, nextGroups);
  };

  const handleUnlocked = (key: CryptoKey, data: VaultData, meta?: { created: boolean }) => {
    const loadedPeople = data.people as Person[];
    setVaultKey(key);
    setPeople(loadedPeople);
    setCustomGroups(data.customGroups);
    peopleRef.current = loadedPeople;
    groupsRef.current = data.customGroups;
    setSelectedPersonId(loadedPeople[0]?.id || null);
    if (meta?.created && loadedPeople.length === 0) {
      const nextSettings = { ...appSettings, onboardingCompleted: true };
      setAppSettings(nextSettings);
      saveAppSettings(nextSettings);
      setEditingPerson(null);
      setEditingSection(undefined);
      setAddInitialName("");
      setActiveTab("people");
      setLayer("add");
      historyLayerRef.current = "add";
      layerRef.current = "add";
      setToast("PIN 설정이 완료됐어요. 첫 번째 사람을 담아볼까요?");
      window.setTimeout(() => setToast(""), 2600);
      return;
    }
    if (meta?.created) {
      updateAppSettings({ onboardingCompleted: true });
    }
  };

  const updateAppSettings = (patch: Partial<AppSettings>) => {
    const nextSettings = { ...appSettings, ...patch };
    setAppSettings(nextSettings);
    saveAppSettings(nextSettings);
  };

  const handleVaultRekey = (key: CryptoKey, data: VaultData) => {
    setVaultKey(key);
    setPeople(data.people);
    setCustomGroups(data.customGroups);
    peopleRef.current = data.people;
    groupsRef.current = data.customGroups;
  };

  const handleLock = () => {
    setVaultKey(null);
    setPeople([]);
    setCustomGroups([]);
    peopleRef.current = [];
    groupsRef.current = [];
    setSelectedPersonId(null);
    setLayer("root");
    setActiveTab("home");
  };

  useEffect(() => {
    if (!vaultKey || appSettings.autoLockMinutes === "off") {
      if (autoLockTimerRef.current) window.clearTimeout(autoLockTimerRef.current);
      return;
    }

    const configuredMs = Number(appSettings.autoLockMinutes) * 60 * 1000;
    const effectiveLockMs = Math.max(configuredMs, MIN_AUTO_LOCK_GRACE_MS);

    const lockForInactivity = () => {
      if (autoLockTimerRef.current) window.clearTimeout(autoLockTimerRef.current);
      handleLock();
      setToast("자동 잠금으로 사람談을 잠갔어요.");
      window.setTimeout(() => setToast(""), 2000);
    };

    const scheduleAutoLock = () => {
      if (autoLockTimerRef.current) window.clearTimeout(autoLockTimerRef.current);
      if (document.visibilityState !== "visible") return;
      const remainingMs = effectiveLockMs - (Date.now() - lastActiveAtRef.current);
      autoLockTimerRef.current = window.setTimeout(() => {
        if (Date.now() - lastActiveAtRef.current >= effectiveLockMs) {
          lockForInactivity();
          return;
        }
        scheduleAutoLock();
      }, Math.max(remainingMs, 1000));
    };

    const markActive = () => {
      lastActiveAtRef.current = Date.now();
      scheduleAutoLock();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (autoLockTimerRef.current) window.clearTimeout(autoLockTimerRef.current);
        return;
      }
      if (Date.now() - lastActiveAtRef.current >= effectiveLockMs) {
        lockForInactivity();
        return;
      }
      scheduleAutoLock();
    };

    lastActiveAtRef.current = Date.now();
    scheduleAutoLock();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (autoLockTimerRef.current) window.clearTimeout(autoLockTimerRef.current);
      events.forEach((eventName) => window.removeEventListener(eventName, markActive));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [vaultKey, appSettings.autoLockMinutes]);

  const handleSavePerson = (person: Person) => {
    const exists = people.some((item) => item.id === person.id);
    const personToSave = exists
      ? person
      : { ...person, remindIntervalDays: person.remindIntervalDays || appSettings.defaultRemindIntervalDays };
    const nextPeople = exists ? people.map((item) => (item.id === person.id ? personToSave : item)) : [personToSave, ...people];
    const nextGroups = Array.from(new Set([...customGroups.map((group) => group.name), ...personToSave.groups]))
      .filter(Boolean)
      .map((name, index) => customGroups.find((group) => group.name === name) || { id: `g_${Date.now()}_${index}`, name });

    saveGroups(nextGroups);
    savePeople(nextPeople);
    setSelectedPersonId(personToSave.id);
    setActiveTab("people");
    setEditingPerson(null);
    setEditingSection(undefined);
    setAddInitialName("");
    setLayer("detail");
    historyLayerRef.current = "detail";
    window.history.replaceState({ layer: "detail" }, "");
    setToast(exists ? "변경사항을 저장했어요." : `${personToSave.name}님을 사람談에 담았어요 🌿`);
    window.setTimeout(() => setToast(""), 2500);
  };

  const updatePerson = (personId: string, updater: (person: Person) => Person) => {
    const nextPeople = people.map((person) => (person.id === personId ? updater(person) : person));
    savePeople(nextPeople);
  };

  const handleSaveStory = (personId: string, payload: StorySavePayload) => {
    const isFirstStory = people.find((person) => person.id === personId)?.history.length === 0;
    updatePerson(personId, (person) => applyApprovedStory(person, payload));
    setSelectedPersonId(personId);
    setLayer("detail");
    if (isFirstStory) {
      setToast("첫 번째 이야기를 담아두었어요 🌿");
      window.setTimeout(() => setToast(""), 2600);
    }
  };

  const handleUpdateHistory = (personId: string, history: InteractionHistory) => {
    updatePerson(personId, (person) => ({
      ...person,
      lastContactDate: person.history[0]?.id === history.id ? history.date : person.lastContactDate,
      lastContactMedium: person.history[0]?.id === history.id ? history.medium : person.lastContactMedium,
      history: person.history.map((item) => (item.id === history.id ? history : item))
    }));
  };

  const handleDeleteHistory = (personId: string, historyId: string) => {
    requestConfirm({
      title: "이야기 기록을 삭제할까요?",
      message: "삭제한 이야기는 다시 되돌릴 수 없어요.",
      confirmLabel: "삭제",
      danger: true,
      onConfirm: () => {
        updatePerson(personId, (person) => {
          const nextHistory = person.history.filter((item) => item.id !== historyId);
          return {
            ...person,
            history: nextHistory,
            lastContactDate: nextHistory[0]?.date || person.lastContactDate,
            lastContactMedium: nextHistory[0]?.medium || person.lastContactMedium
          };
        });
        setToast("이야기 기록을 삭제했어요.");
        window.setTimeout(() => setToast(""), 2000);
      }
    });
  };

  const handleSaveEvent = (personId: string, event: EventHistoryItem) => {
    updatePerson(personId, (person) => {
      const exists = person.eventsHistory.some((item) => item.id === event.id);
      return {
        ...person,
        eventsHistory: exists
          ? person.eventsHistory.map((item) => (item.id === event.id ? event : item))
          : [event, ...person.eventsHistory]
      };
    });
  };

  const handleDeleteEvent = (personId: string, eventId: string) => {
    requestConfirm({
      title: "함께한 마음 기록을 삭제할까요?",
      message: "삭제한 기록은 다시 되돌릴 수 없어요.",
      confirmLabel: "삭제",
      danger: true,
      onConfirm: () => {
        updatePerson(personId, (person) => ({
          ...person,
          eventsHistory: person.eventsHistory.filter((item) => item.id !== eventId)
        }));
        setToast("함께한 마음 기록을 삭제했어요.");
        window.setTimeout(() => setToast(""), 2000);
      }
    });
  };

  const handleDeletePerson = (personId: string) => {
    const person = people.find((item) => item.id === personId);
    if (!person) return;
    requestConfirm({
      title: `${person.name}님을 삭제할까요?`,
      message: `${person.name}님과 함께 담아둔 이야기와 관련 정보가 삭제됩니다.`,
      confirmLabel: "삭제",
      danger: true,
      onConfirm: () => {
        const nextPeople = peopleRef.current.filter((item) => item.id !== personId);
        savePeople(nextPeople);
        setSelectedPersonId(nextPeople[0]?.id || null);
        setActiveTab("people");
        closeLayer();
        setToast("사람 기록을 삭제했어요.");
        window.setTimeout(() => setToast(""), 2000);
      }
    });
  };

  const openEditPerson = (person: Person, section?: EditSection) => {
    setEditingPerson(person);
    setEditingSection(section);
    setAddInitialName("");
    pushLayer("add");
  };

  const openAddPerson = (initialName = "") => {
    setEditingPerson(null);
    setEditingSection(undefined);
    setAddInitialName(initialName);
    pushLayer("add");
  };

  const openExistingFromAdd = (personId: string) => {
    setEditingPerson(null);
    setEditingSection(undefined);
    setAddInitialName("");
    setSelectedPersonId(personId);
    setLayer("detail");
    historyLayerRef.current = "detail";
    window.history.replaceState({ layer: "detail" }, "");
  };

  const createGroup = (name: string) => {
    if (customGroups.some((group) => group.name === name)) return;
    saveGroups([{ id: `g_${Date.now()}`, name }, ...customGroups]);
  };

  const renameGroup = (groupId: string, nextName: string) => {
    const target = customGroups.find((group) => group.id === groupId);
    if (!target || !nextName.trim()) return;
    const cleanName = nextName.trim();
    const nextGroups = customGroups.map((group) => group.id === groupId ? { ...group, name: cleanName } : group);
    const nextPeople = people.map((person) => ({
      ...person,
      groups: person.groups.map((group) => group === target.name ? cleanName : group)
    }));
    setCustomGroups(nextGroups);
    setPeople(nextPeople);
    persistVault(nextPeople, nextGroups);
    if (peopleFilter === target.name) setPeopleFilter(cleanName);
  };

  const deleteGroup = (group: CustomGroup) => {
    requestConfirm({
      title: `${group.name} 그룹을 삭제할까요?`,
      message: "그룹에 속한 사람과 이야기는 삭제되지 않아요.",
      confirmLabel: "삭제",
      danger: true,
      onConfirm: () => {
        const nextGroups = groupsRef.current.filter((item) => item.id !== group.id);
        const nextPeople = peopleRef.current.map((person) => ({
          ...person,
          groups: person.groups.filter((name) => name !== group.name)
        }));
        setCustomGroups(nextGroups);
        setPeople(nextPeople);
        persistVault(nextPeople, nextGroups);
        if (peopleFilter === group.name) setPeopleFilter("전체");
        setToast("그룹을 삭제했어요.");
        window.setTimeout(() => setToast(""), 2000);
      }
    });
  };

  const handleImportBackup = (importedPeople: Person[], importedGroups: CustomGroup[]) => {
    savePeople(importedPeople);
    saveGroups(importedGroups);
    setSelectedPersonId(importedPeople[0]?.id || null);
  };

  const handleClearAllData = () => {
    requestConfirm({
      title: "모든 데이터를 삭제할까요?",
      message: "사람談에 저장된 사람, 이야기, 관련 정보가 삭제됩니다.\n암호화 vault 자체는 유지됩니다.",
      confirmLabel: "모두 삭제",
      danger: true,
      onConfirm: () => {
        savePeople([]);
        saveGroups([]);
        setSelectedPersonId(null);
        setFirstUsePromptDismissed(false);
        setToast("모든 데이터를 삭제했어요.");
        window.setTimeout(() => setToast(""), 2000);
      }
    });
  };

  const openPerson = (personId: string) => {
    rememberTabScroll();
    setSelectedPersonId(personId);
    pushLayer("detail");
  };

  const startCheckIn = (personId: string) => {
    rememberTabScroll();
    setCheckInPersonId(personId);
    setActiveTab("checkin");
    setLayer("root");
  };

  const viewLongTimePeople = () => {
    rememberTabScroll();
    setPeopleQuery("");
    setPeopleFilter("전체");
    setPeopleSortMode("longTime");
    setActiveTab("people");
    setLayer("root");
  };

  if (!vaultKey) {
    if (entryStage === "onboarding") {
      return (
        <main className="min-h-[100svh] bg-[#fff8ef] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] text-[#2f1b12]">
          <div className="mx-auto w-full max-w-md">
            <OnboardingView
              onComplete={() => {
                updateAppSettings({ onboardingCompleted: true });
                setEntryStage("pin-setup");
              }}
              onSkip={() => {
                updateAppSettings({ onboardingCompleted: true });
                setEntryStage("pin-setup");
              }}
            />
          </div>
        </main>
      );
    }
    return <LockScreen initialMode={entryStage === "unlock" ? "unlock" : "setup"} onUnlocked={handleUnlocked} />;
  }

  const selectedPerson = people.find((person) => person.id === selectedPersonId) || null;

  return (
    <div className="min-h-[100svh] bg-[#fff8ef] text-[#2f1b12]">
      <main className="mx-auto min-h-[100svh] w-full max-w-md px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] md:max-w-3xl lg:max-w-5xl">
        {people.length === 0 && layer === "root" ? (
          <div className="flex min-h-[70vh] flex-col justify-center space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#f8d8c7] text-3xl">🌿</div>
            <div>
              <h1 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em]">첫 번째 사람을 담아볼까요?</h1>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-[1.6] text-[#7c6252]">
                가장 먼저 떠오르는 사람 한 명이면 충분해요.
              </p>
            </div>
            <button onClick={() => openAddPerson()} className="rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(216,91,54,0.18)]">+ 사람 담기</button>
            {!firstUsePromptDismissed && (
              <button onClick={() => setFirstUsePromptDismissed(true)} className="rounded-full border border-[#ead8c9] bg-[#fffaf3] py-3 text-sm font-medium text-[#5a392a]">나중에 할게요</button>
            )}
          </div>
        ) : (
          <>
            {layer === "detail" && selectedPerson && (
              <PersonDetailView
                person={selectedPerson}
                onBack={closeLayer}
                onEdit={() => openEditPerson(selectedPerson)}
                onDeletePerson={() => handleDeletePerson(selectedPerson.id)}
                onStartStory={() => setStoryInitialPersonId(selectedPerson.id)}
                onStartCheckIn={() => startCheckIn(selectedPerson.id)}
                aiEnabled={appSettings.aiEnabled}
                onSaveStory={(payload) => handleSaveStory(selectedPerson.id, payload)}
                onUpdateHistory={(history) => handleUpdateHistory(selectedPerson.id, history)}
                onDeleteHistory={(historyId) => handleDeleteHistory(selectedPerson.id, historyId)}
                onSaveEvent={(event) => handleSaveEvent(selectedPerson.id, event)}
                onDeleteEvent={(eventId) => handleDeleteEvent(selectedPerson.id, eventId)}
              />
            )}
            {layer === "add" && (
              <AddPersonView
                person={editingPerson}
                people={people}
                customGroups={customGroups}
                initialName={addInitialName}
                editSection={editingSection}
                onBack={() => { setEditingPerson(null); setEditingSection(undefined); setAddInitialName(""); closeLayer(); }}
                onSave={handleSavePerson}
                onOpenExisting={openExistingFromAdd}
              />
            )}
            {layer === "root" && activeTab === "home" && (
              <HomeView people={people} onOpenPerson={openPerson} onStartCheckIn={startCheckIn} onViewLongTimePeople={viewLongTimePeople} />
            )}
            {layer === "root" && activeTab === "people" && (
              <PeopleView
                people={people}
                customGroups={customGroups}
                query={peopleQuery}
                selectedFilter={peopleFilter}
                onQueryChange={setPeopleQuery}
                onFilterChange={setPeopleFilter}
                onOpenPerson={openPerson}
                onAddPerson={openAddPerson}
                onManageGroups={() => setGroupManagerOpen(true)}
                sortMode={peopleSortMode}
                onSortModeChange={setPeopleSortMode}
              />
            )}
            {layer === "root" && activeTab === "checkin" && (
              <CheckInView
                people={people}
                aiEnabled={appSettings.aiEnabled}
                initialPersonId={checkInPersonId}
                onContactComplete={(personId, history) => {
                  updatePerson(personId, (person) => ({
                    ...person,
                    lastContactDate: history.date,
                    lastContactMedium: history.medium,
                    history: [history, ...person.history]
                  }));
                }}
              />
            )}
            {layer === "root" && activeTab === "settings" && (
              <SettingsView
                people={people}
                customGroups={customGroups}
                vaultKey={vaultKey}
                appSettings={appSettings}
                onSettingsChange={updateAppSettings}
                onImport={handleImportBackup}
                onClearAll={handleClearAllData}
                onRequestConfirm={requestConfirm}
                onLock={handleLock}
                onVaultRekey={handleVaultRekey}
              />
            )}
          </>
        )}
      </main>

      {layer === "root" && people.length > 0 && !keyboardOpen && (
        <BottomNavigation
          activeTab={activeTab}
          onChangeTab={(tab) => {
            rememberTabScroll();
            setActiveTab(tab);
            setCheckInPersonId(null);
          }}
          onQuickRecord={() => setStoryInitialPersonId(null)}
        />
      )}

      <AnimatePresence>
        {storyInitialPersonId !== undefined && (
          <StoryCaptureSheet
            people={people}
            aiEnabled={appSettings.aiEnabled}
            initialPersonId={storyInitialPersonId}
            onClose={() => setStoryInitialPersonId(undefined)}
            onSave={(personId, payload) => {
              handleSaveStory(personId, payload);
              setStoryInitialPersonId(undefined);
            }}
          />
        )}
      </AnimatePresence>

      {groupManagerOpen && (
        <GroupManagerSheet
          groups={customGroups}
          onClose={() => setGroupManagerOpen(false)}
          onCreate={createGroup}
          onRename={renameGroup}
          onDelete={deleteGroup}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 top-[calc(1.25rem+env(safe-area-inset-top))] z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full border border-[#ead8c9] bg-[#fffaf3] px-5 py-3 text-center text-sm font-semibold text-[#5a392a] shadow-soft">
          {toast}
        </div>
      )}

      {confirmRequest && (
        <ConfirmDialog
          {...confirmRequest}
          onCancel={() => setConfirmRequest(null)}
          onConfirm={() => {
            const action = confirmRequest.onConfirm;
            setConfirmRequest(null);
            action();
          }}
        />
      )}
    </div>
  );
}

function applyApprovedStory(person: Person, payload: StorySavePayload): Person {
  const nextNotes = appendUniqueLines(person.preferences.notes, payload.approvedItems.filter((item) => item.category !== "family").map((item) => item.text));
  const nextChildren = applyFamilyItems(person, payload.approvedItems.filter((item) => item.category === "family"));

  return {
    ...person,
    lastContactDate: payload.history.date,
    lastContactMedium: payload.history.medium,
    history: [payload.history, ...person.history],
    familyInfo: {
      ...person.familyInfo,
      children: nextChildren
    },
    preferences: {
      ...person.preferences,
      notes: nextNotes
    }
  };
}

function appendUniqueLines(existing: string, nextLines: string[]) {
  const existingLines = existing.split("\n").map((line) => line.trim()).filter(Boolean);
  const existingNormalized = existingLines.map(normalizeMemoryText);
  const additions = nextLines
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const normalized = normalizeMemoryText(line);
      const isDuplicate = existingNormalized.some((current) => current === normalized || current.includes(normalized) || normalized.includes(current));
      if (!isDuplicate) existingNormalized.push(normalized);
      return !isDuplicate;
    });

  return [...existingLines, ...additions].join("\n");
}

function applyFamilyItems(person: Person, familyItems: ApprovedMemoryItem[]) {
  const children = [...person.familyInfo.children];

  familyItems.forEach((item) => {
    const child = item.child;
    if (!child?.name) return;
    const existingIndex = children.findIndex((existing) => existing.name.trim() === child.name.trim());

    if (existingIndex >= 0) {
      const existing = children[existingIndex];
      const nextMemo = appendUniqueLines(existing.memo, [child.memo || item.text]);
      children[existingIndex] = {
        ...existing,
        ageOrBirth: existing.ageOrBirth || child.ageOrBirth,
        memo: nextMemo
      };
    } else {
      children.push({
        name: child.name,
        ageOrBirth: child.ageOrBirth || "",
        memo: child.memo || item.text
      });
    }
  });

  return children;
}

