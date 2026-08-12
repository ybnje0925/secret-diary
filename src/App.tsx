import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import BottomNavigation, { AppTab } from "./components/navigation/BottomNavigation";
import QuickRecordSheet from "./components/navigation/QuickRecordSheet";
import LockScreen from "./components/LockScreen";
import { initialGroups, initialPeople } from "./demoData";
import { CategoryType, CustomGroup, Person } from "./types";
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
  const [isQuickRecordOpen, setIsQuickRecordOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [layer, setLayer] = useState<AppLayer>("root");

  const peopleRef = useRef<Person[]>([]);
  const groupsRef = useRef<CustomGroup[]>([]);
  const historyLayerRef = useRef<AppLayer>("root");

  useEffect(() => {
    const onPopState = () => {
      historyLayerRef.current = "root";
      setLayer("root");
      setIsQuickRecordOpen(false);
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
    setVaultKey(key);
    setPeople(data.people as Person[]);
    setCustomGroups(data.customGroups);
    peopleRef.current = data.people as Person[];
    groupsRef.current = data.customGroups;
    setSelectedPersonId(data.people[0]?.id || null);
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
              <PersonDetailView person={selectedPerson} onBack={closeLayer} onEdit={() => openEditPerson(selectedPerson)} />
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
          onQuickRecord={() => setIsQuickRecordOpen(true)}
        />
      )}

      <AnimatePresence>
        <QuickRecordSheet
          isOpen={isQuickRecordOpen}
          onClose={() => setIsQuickRecordOpen(false)}
          onQuickCapture={() => {
            setIsQuickRecordOpen(false);
            window.alert("빠른 기록 저장 화면은 이번 1차 작업에서는 UI 골격만 준비된 mock 상태입니다.");
          }}
          onAddPerson={() => {
            setIsQuickRecordOpen(false);
            openAddPerson();
          }}
        />
      </AnimatePresence>
    </div>
  );
}
