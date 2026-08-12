import { Plus, Search } from "lucide-react";
import { CategoryType, Person } from "../types";
import PersonCard from "../components/person/PersonCard";
import { categoryLabels, searchPeople } from "../utils/saramdam";

interface Props {
  people: Person[];
  query: string;
  selectedCategory: CategoryType | "전체";
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: CategoryType | "전체") => void;
  onOpenPerson: (personId: string) => void;
  onAddPerson: () => void;
}

export default function PeopleView({ people, query, selectedCategory, onQueryChange, onCategoryChange, onOpenPerson, onAddPerson }: Props) {
  const filtered = searchPeople(people, query, selectedCategory);
  const chips: Array<CategoryType | "전체"> = ["전체", ...categoryLabels.filter((label) => label !== "기타")];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-[#2f1b12]">사람들</h1>
        <button onClick={onAddPerson} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d85b36] text-white shadow-[0_10px_20px_rgba(216,91,54,0.25)]">
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <label className="relative block">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8f7564]" />
        <input
          id="people-search-input"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="이름, 관계, 그룹, 취미를 검색해보세요"
          className="h-13 w-full rounded-2xl border border-[#ead8c9] bg-[#fffaf3] pl-12 pr-4 text-[15px] text-[#2f1b12] outline-none focus:border-[#d85b36]"
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => {
          const active = selectedCategory === chip;
          return (
            <button key={chip} onClick={() => onCategoryChange(chip)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${active ? "bg-[#d85b36] text-white" : "border border-[#ead8c9] bg-[#fff5ed] text-[#5a392a]"}`}>
              {chip}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm text-[#5e473a]">
        <span>전체 {filtered.length}명</span>
        <button>최근 연락순⌄</button>
      </div>

      <div className="space-y-3">
        {filtered.map((person) => (
          <div key={person.id}>
            <PersonCard person={person} onOpen={onOpenPerson} />
          </div>
        ))}
      </div>
    </div>
  );
}
