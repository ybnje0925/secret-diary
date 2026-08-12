import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import BottomNavigation, { AppTab } from "./components/navigation/BottomNavigation";
import LockScreen from "./components/LockScreen";
import StoryCaptureSheet, { ApprovedMemoryItem, StorySavePayload } from "./components/person/StoryCaptureSheet";
import { initialGroups, initialPeople } from "./demoData";
import { CategoryType, CustomGroup, EventHistoryItem, InteractionHistory, Person } from "./types";
import { normalizeMemoryText } from "./utils/saramdam";
import { saveVault, VaultData } from "./vault";
import AddPersonView from "./views/AddPersonView";
import CheckInView from "./views/CheckInView";
import HomeView from "./views/HomeView";
import PeopleView from "./views/PeopleView";
import PersonDetailView from "./views/PersonDetailView";
import SettingsView from "./views/SettingsView";

type AppLayer = "root" | "detail" | "add";

export default function App() {
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [checkInPersonId, setCheckInPersonId] = useState<string | null>(null);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleCategory, setPeopleCategory] = useState<CategoryType | "전체">("전체");
  const [storyInitialPersonId, setStoryInitialPersonId] = useState<string | null | undefined>(undefined);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [layer, setLayer] = useState<AppLayer>("root");

  const peopleRef = useRef<Person[]>([]);
  const groupsRef = useRef<CustomGroup[]>([]);
  const historyLayerRef = useRef<AppLayer>("root");

  useEffect(() => {
    const onPopState = () => {
      historyLayerRef.current = "root";
      setLayer("root");
      setStoryInitialPersonId(undefined);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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

  const handleUnlocked = (key: CryptoKey, data: VaultData) => {
    const loadedPeople = data.people as Person[];
    setVaultKey(key);
    setPeople(loadedPeople);
    setCustomGroups(data.customGroups);
    peopleRef.current = loadedPeople;
    groupsRef.current = data.customGroups;
    setSelectedPersonId(loadedPeople[0]?.id || null);
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

  const handleLoadDemoData = () => {
    savePeople(initialPeople);
    saveGroups(initialGroups);
    setSelectedPersonId(initialPeople[0]?.id || null);
  };

  const handleSavePerson = (person: Person) => {
    const exists = people.some((item) => item.id === person.id);
    const nextPeople = exists ? people.map((item) => (item.id === person.id ? person : item)) : [person, ...people];
    const nextGroups = Array.from(new Set([...customGroups.map((group) => group.name), ...person.groups]))
      .filter(Boolean)
      .map((name, index) => customGroups.find((group) => group.name === name) || { id: `g_${Date.now()}_${index}`, name });

    saveGroups(nextGroups);
    savePeople(nextPeople);
    setSelectedPersonId(person.id);
    setActiveTab("people");
    setEditingPerson(null);
    closeLayer();
  };

  const updatePerson = (personId: string, updater: (person: Person) => Person) => {
    const nextPeople = people.map((person) => (person.id === personId ? updater(person) : person));
    savePeople(nextPeople);
  };

  const handleSaveStory = (personId: string, payload: StorySavePayload) => {
    updatePerson(personId, (person) => applyApprovedStory(person, payload));
    setSelectedPersonId(personId);
    setLayer("detail");
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
    if (!window.confirm("이 이야기 기록을 삭제할까요?")) return;
    updatePerson(personId, (person) => {
      const nextHistory = person.history.filter((item) => item.id !== historyId);
      return {
        ...person,
        history: nextHistory,
        lastContactDate: nextHistory[0]?.date || person.lastContactDate,
        lastContactMedium: nextHistory[0]?.medium || person.lastContactMedium
      };
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
    if (!window.confirm("이 함께한 마음 기록을 삭제할까요?")) return;
    updatePerson(personId, (person) => ({
      ...person,
      eventsHistory: person.eventsHistory.filter((item) => item.id !== eventId)
    }));
  };

  const handleDeletePerson = (personId: string) => {
    const person = people.find((item) => item.id === personId);
    if (!person || !window.confirm(`${person.name}님을 사람담에서 삭제할까요? 저장된 이야기와 함께한 마음 기록도 삭제됩니다.`)) return;
    const nextPeople = people.filter((item) => item.id !== personId);
    savePeople(nextPeople);
    setSelectedPersonId(nextPeople[0]?.id || null);
    setActiveTab("people");
    closeLayer();
  };

  const openEditPerson = (person: Person) => {
    setEditingPerson(person);
    pushLayer("add");
  };

  const openAddPerson = () => {
    setEditingPerson(null);
    pushLayer("add");
  };

  const handleImportBackup = (importedPeople: Person[], importedGroups: CustomGroup[]) => {
    savePeople(importedPeople);
    saveGroups(importedGroups);
    setSelectedPersonId(importedPeople[0]?.id || null);
  };

  const handleClearAllData = () => {
    if (!window.confirm("모든 사람담 데이터를 삭제할까요? 암호화 vault 자체는 유지됩니다.")) return;
    savePeople([]);
    saveGroups([]);
    setSelectedPersonId(null);
  };

  const openPerson = (personId: string) => {
    setSelectedPersonId(personId);
    pushLayer("detail");
  };

  const startCheckIn = (personId: string) => {
    setCheckInPersonId(personId);
    setActiveTab("checkin");
    setLayer("root");
  };

  if (!vaultKey) {
    return <LockScreen onUnlocked={handleUnlocked} />;
  }

  const selectedPerson = people.find((person) => person.id === selectedPersonId) || null;

  return (
    <div className="min-h-screen bg-[#fff8ef] text-[#2f1b12]">
      <main className="mx-auto min-h-screen w-full max-w-md px-5 pb-28 pt-7 md:max-w-3xl lg:max-w-5xl">
        {people.length === 0 && layer === "root" ? (
          <div className="flex min-h-[70vh] flex-col justify-center space-y-5 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#f8d8c7] text-4xl">🧡</div>
            <div>
              <h1 className="text-3xl font-black">사람담</h1>
              <p className="mt-2 text-[#7c6252]">소중한 사람들의 이야기를 담아두세요.</p>
            </div>
            <button onClick={openAddPerson} className="rounded-full bg-[#d85b36] py-4 text-base font-extrabold text-white shadow-[0_12px_24px_rgba(216,91,54,0.25)]">새로운 사람 담기</button>
            <button onClick={handleLoadDemoData} className="rounded-full border border-[#ead8c9] bg-[#fffaf3] py-4 text-base font-extrabold text-[#5a392a]">기존 demo data 표시</button>
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
                onUpdateHistory={(history) => handleUpdateHistory(selectedPerson.id, history)}
                onDeleteHistory={(historyId) => handleDeleteHistory(selectedPerson.id, historyId)}
                onSaveEvent={(event) => handleSaveEvent(selectedPerson.id, event)}
                onDeleteEvent={(eventId) => handleDeleteEvent(selectedPerson.id, eventId)}
              />
            )}
            {layer === "add" && (
              <AddPersonView person={editingPerson} customGroups={customGroups} onBack={() => { setEditingPerson(null); closeLayer(); }} onSave={handleSavePerson} />
            )}
            {layer === "root" && activeTab === "home" && (
              <HomeView people={people} onOpenPerson={openPerson} onAddPerson={openAddPerson} onStartCheckIn={startCheckIn} />
            )}
            {layer === "root" && activeTab === "people" && (
              <PeopleView
                people={people}
                query={peopleQuery}
                selectedCategory={peopleCategory}
                onQueryChange={setPeopleQuery}
                onCategoryChange={setPeopleCategory}
                onOpenPerson={openPerson}
                onAddPerson={openAddPerson}
              />
            )}
            {layer === "root" && activeTab === "checkin" && <CheckInView people={people} initialPersonId={checkInPersonId} />}
            {layer === "root" && activeTab === "settings" && (
              <SettingsView
                people={people}
                customGroups={customGroups}
                vaultKey={vaultKey}
                onImport={handleImportBackup}
                onClearAll={handleClearAllData}
                onLock={handleLock}
              />
            )}
          </>
        )}
      </main>

      {layer === "root" && people.length > 0 && (
        <BottomNavigation
          activeTab={activeTab}
          onChangeTab={(tab) => {
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
            initialPersonId={storyInitialPersonId}
            onClose={() => setStoryInitialPersonId(undefined)}
            onSave={(personId, payload) => {
              handleSaveStory(personId, payload);
              setStoryInitialPersonId(undefined);
            }}
          />
        )}
      </AnimatePresence>
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
  const existingNormalized = new Set(existingLines.map(normalizeMemoryText));
  const additions = nextLines
    .map((line) => line.trim())
    .filter((line) => line && !existingNormalized.has(normalizeMemoryText(line)));

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
