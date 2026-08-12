import { ArrowLeft, Camera, Leaf } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { CategoryType, CustomGroup, Person } from "../types";
import { categoryLabels } from "../utils/saramdam";
import { useState } from "react";

interface Props {
  person?: Person | null;
  customGroups: CustomGroup[];
  onBack: () => void;
  onSave: (person: Person) => void;
}

export default function AddPersonView({ person, customGroups, onBack, onSave }: Props) {
  const [name, setName] = useState(person?.name || "");
  const [category, setCategory] = useState<CategoryType>(person?.category || "친구");
  const [group, setGroup] = useState(person?.groups?.[0] || "");
  const [memo, setMemo] = useState(person?.preferences.notes || "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: person?.id || `p_${Date.now()}`,
      name: name.trim(),
      phone: person?.phone || "",
      company: person?.company || "",
      category,
      groups: group.trim() ? [group.trim()] : [],
      familyInfo: person?.familyInfo || { children: [] },
      preferences: { food: person?.preferences.food || "", hobbies: person?.preferences.hobbies || "", notes: memo.trim() },
      eventsHistory: person?.eventsHistory || [],
      avatarEmoji: person?.avatarEmoji || "🙂",
      avatarBg: person?.avatarBg || "bg-[#f3dfd1]",
      lastContactDate: person?.lastContactDate || new Date().toISOString().split("T")[0],
      lastContactMedium: person?.lastContactMedium || "기타",
      remindIntervalDays: person?.remindIntervalDays || 60,
      history: person?.history?.length
        ? person.history
        : memo.trim()
          ? [{ id: `h_${Date.now()}`, date: new Date().toISOString().split("T")[0], medium: "기타", summary: memo.trim() }]
          : []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-xl font-black text-[#2f1b12]">{person ? "사람 이야기 편집" : "새 사람 추가하기"}</h1>
        <button className="text-base font-extrabold text-[#c95735]">저장</button>
      </header>

      <section className="rounded-2xl bg-[#fff0e3] p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8dfcd] text-3xl">🌱</span>
          <p className="text-[15px] font-semibold leading-relaxed text-[#3f2a20]">새로운 사람과의 소중한 이야기를<br />사람담에 담아보세요.</p>
        </div>
      </section>

      <button type="button" className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#eaded4] text-[#8f7564]">
        <Camera className="h-8 w-8" />
        <span className="mt-1 text-xs font-bold">사진 추가</span>
      </button>

      <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <Field label="이름 *">
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="이름을 입력해주세요" className="saram-input" />
        </Field>
        <Field label="관계 *">
          <select value={category} onChange={(event) => setCategory(event.target.value as CategoryType)} className="saram-input">
            {categoryLabels.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
        </Field>
        <Field label="그룹 (선택)">
          <input list="group-options" value={group} onChange={(event) => setGroup(event.target.value)} placeholder="예) 테니스 모임, 회사 사람들" className="saram-input" />
          <datalist id="group-options">
            {customGroups.map((item) => <option key={item.id} value={item.name} />)}
          </datalist>
        </Field>
        <Field label="기억하고 싶은 한마디 (선택)">
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={100} placeholder="이 사람을 떠올리게 하는 한마디를 적어보세요." className="saram-input min-h-28 resize-none" />
          <p className="mt-1 text-right text-xs text-[#8f7564]">{memo.length}/100</p>
        </Field>
      </section>

      <p className="flex gap-3 rounded-2xl bg-[#fff1df] p-4 text-sm leading-relaxed text-[#5e473a]">
        <Leaf className="h-5 w-5 shrink-0 text-[#85a56a]" />
        <span>처음엔 간단하게만 입력해도 괜찮아요. 나머지는 앞으로의 기록을 통해 천천히 채워집니다.</span>
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-2 block text-sm font-extrabold text-[#2f1b12]">{label}</span>
      {children}
    </label>
  );
}
