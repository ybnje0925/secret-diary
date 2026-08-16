import { Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import { useMemo } from "react";
import { CustomGroup, Person } from "../types";
import PersonCard from "../components/person/PersonCard";
import { daysSince, getLastStoryDate, getSearchReason, primaryCategoryLabels } from "../utils/saramdam";

type SortMode = "story" | "name" | "recentContact" | "longTime" | "recentAdded";
export type PeopleSortMode = SortMode;

interface Props {
  people: Person[];
  customGroups: CustomGroup[];
  query: string;
  selectedFilter: string;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: string) => void;
  onOpenPerson: (personId: string) => void;
  onAddPerson: (initialName?: string) => void;
  onManageGroups: () => void;
  sortMode: PeopleSortMode;
  onSortModeChange: (mode: PeopleSortMode) => void;
}

const sortLabels: Record<SortMode, string> = {
  story: "최근 이야기 순",
  name: "이름순",
  recentContact: "최근 연락순",
  longTime: "오래 연락하지 않은 순",
  recentAdded: "최근 추가한 순"
};

export default function PeopleView({
  people,
  customGroups,
  query,
  selectedFilter,
  onQueryChange,
  onFilterChange,
  onOpenPerson,
  onAddPerson,
  onManageGroups,
  sortMode,
  onSortModeChange
}: Props) {
  const chips = useMemo(() => ["전체", ...primaryCategoryLabels, ...customGroups.map((group) => group.name)], [customGroups]);
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const matchesFilter = (person: Person) => (
      selectedFilter === "전체" ||
      person.category === selectedFilter ||
      person.groups.includes(selectedFilter)
    );

    const matchesQuery = (person: Person) => {
      if (!normalizedQuery) return true;
      const haystack = [
        person.name,
        person.category,
        person.company,
        ...person.groups,
        person.preferences.food,
        person.preferences.hobbies,
        person.preferences.notes,
        person.familyInfo?.spouseName || "",
        ...(person.familyInfo?.children || []).map((child) => `${child.name} ${child.ageOrBirth} ${child.memo}`)
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    };

    return people
      .filter((person) => matchesFilter(person) && matchesQuery(person))
      .sort((a, b) => sortPeople(a, b, sortMode));
  }, [people, normalizedQuery, selectedFilter, sortMode]);

  return (
    <div className="space-y-4">
      <header className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">사람들</h1>
            <p className="mt-0.5 text-[13px] font-normal leading-[1.6] text-[#7c6252]">함께한 사람들의 이야기를 모아보세요.</p>
          </div>
          <button onClick={() => onAddPerson()} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#d85b36] px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(216,91,54,0.18)]">
            <Plus className="h-4 w-4" /> 사람 추가
          </button>
        </div>
      </header>

      <label className="relative block">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8f7564]" />
        <input
          id="people-search-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="이름, 관계, 그룹, 관심사를 검색해보세요"
          className="h-11 w-full rounded-[16px] border border-[#ead8c9] bg-[#fffaf3] pl-10 pr-3 text-[16px] text-[#2f1b12] outline-none focus:border-[#d85b36]"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => {
          const active = selectedFilter === chip;
          return (
            <button key={chip} onClick={() => onFilterChange(chip)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${active ? "bg-[#d85b36] text-white" : "border border-[#ead8c9] bg-[#fff5ed] text-[#5a392a]"}`}>
              {chip}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-[#5e473a]">
        <span>전체 {filtered.length}명</span>
        <div className="flex items-center gap-2">
          <button onClick={onManageGroups} className="inline-flex items-center gap-1 rounded-full border border-[#ead8c9] bg-white px-2.5 py-1.5 text-xs font-medium text-[#5a392a]">
            <Users className="h-4 w-4" /> 그룹
          </button>
          <label className="inline-flex items-center gap-1 rounded-full border border-[#ead8c9] bg-white px-2.5 py-1.5 text-xs font-medium text-[#5a392a]">
            <SlidersHorizontal className="h-4 w-4" />
            <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value as PeopleSortMode)} className="bg-transparent text-xs font-medium outline-none">
              {(Object.keys(sortLabels) as SortMode[]).map((mode) => <option key={mode} value={mode}>{sortLabels[mode]}</option>)}
            </select>
          </label>
        </div>
      </div>

      {people.length === 0 ? (
        <EmptyState onAdd={() => onAddPerson()} />
      ) : filtered.length === 0 ? (
        <NoSearchResult query={query} onAdd={() => onAddPerson(query.trim())} />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((person) => (
            <div key={person.id}>
              <PersonCard person={person} onOpen={onOpenPerson} searchReason={person.name.toLowerCase().includes(normalizedQuery) ? "" : getSearchReason(person, query)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function sortPeople(a: Person, b: Person, mode: SortMode) {
  if (mode === "name") return a.name.localeCompare(b.name, "ko");
  if (mode === "recentContact") return new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime();
  if (mode === "longTime") return daysSince(b.lastContactDate) - daysSince(a.lastContactDate);
  if (mode === "recentAdded") return Number(b.id.replace(/\D/g, "")) - Number(a.id.replace(/\D/g, ""));
  return new Date(getLastStoryDate(b)).getTime() - new Date(getLastStoryDate(a)).getTime();
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <section className="rounded-[20px] border border-[#ead8c9] bg-[#fffaf3] p-5 text-center shadow-soft">
      <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[#fff1df] text-2xl">🌿</div>
      <h2 className="mt-3 text-[18px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">첫 번째 사람을 담아볼까요?</h2>
      <p className="mt-2 text-sm leading-[1.6] text-[#7c6252]">기억하고 싶은 사람 한 명부터 시작해보세요. 이름과 관계만 적어도 충분해요.</p>
      <button onClick={onAdd} className="mt-4 w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white">첫 사람 담기</button>
    </section>
  );
}

function NoSearchResult({ query, onAdd }: { query: string; onAdd: () => void }) {
  return (
    <section className="rounded-[18px] border border-[#ead8c9] bg-[#fffaf3] p-4 text-center shadow-soft">
      <h2 className="text-[18px] font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">찾는 사람이 없어요.</h2>
      <p className="mt-2 text-sm text-[#7c6252]">{query.trim() ? `"${query.trim()}" 이름으로 새 사람을 담을 수 있어요.` : "다른 이름이나 관심사로 검색해보세요."}</p>
      <button onClick={onAdd} className="mt-3 rounded-full border border-[#dfa98f] bg-white px-4 py-2.5 text-xs font-semibold text-[#c95735]">새로운 사람으로 추가하기</button>
    </section>
  );
}
