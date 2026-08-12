import { ArrowLeft, Camera, Leaf, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Avatar from "../components/common/Avatar";
import { CategoryType, CustomGroup, Person } from "../types";
import { categoryLabels } from "../utils/saramdam";

interface Props {
  person?: Person | null;
  customGroups: CustomGroup[];
  onBack: () => void;
  onSave: (person: Person) => void;
}

const profilePresets = [
  { id: "man" as const, label: "남자", emoji: "👨", bg: "bg-[#f3dfd1]" },
  { id: "woman" as const, label: "여자", emoji: "👩", bg: "bg-[#f6e2d9]" },
  { id: "neutral" as const, label: "기본", emoji: "🙂", bg: "bg-[#f1e5d8]" },
  { id: "plant" as const, label: "새싹", emoji: "🌱", bg: "bg-[#eaf0dc]" },
  { id: "heart" as const, label: "마음", emoji: "🧡", bg: "bg-[#fde4d5]" }
];

export default function AddPersonView({ person, customGroups, onBack, onSave }: Props) {
  const [name, setName] = useState(person?.name || "");
  const [category, setCategory] = useState<CategoryType>(person?.category || "친구");
  const [group, setGroup] = useState(person?.groups?.[0] || "");
  const [memo, setMemo] = useState(person?.preferences.notes || "");
  const [avatarImageDataUrl, setAvatarImageDataUrl] = useState(person?.avatarImageDataUrl || "");
  const [avatarPreset, setAvatarPreset] = useState<Person["avatarPreset"]>(person?.avatarPreset || "neutral");
  const [avatarEmoji, setAvatarEmoji] = useState(person?.avatarEmoji || "🙂");
  const [avatarBg, setAvatarBg] = useState(person?.avatarBg || "bg-[#f3dfd1]");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewPerson: Person = {
    id: person?.id || "preview",
    name: name || "프로필",
    phone: "",
    company: "",
    category,
    groups: group ? [group] : [],
    familyInfo: person?.familyInfo || { children: [] },
    preferences: { food: "", hobbies: "", notes: memo },
    eventsHistory: [],
    avatarEmoji,
    avatarBg,
    avatarImageDataUrl,
    avatarPreset,
    lastContactDate: person?.lastContactDate || new Date().toISOString().split("T")[0],
    lastContactMedium: person?.lastContactMedium || "기타",
    history: []
  };

  const handleImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarImageDataUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

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
      avatarEmoji,
      avatarBg,
      avatarImageDataUrl: avatarImageDataUrl || undefined,
      avatarPreset,
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
        <h1 className="text-xl font-black text-[#2f1b12]">{person ? "사람 정보 수정" : "새 사람 추가하기"}</h1>
        <button className="text-base font-extrabold text-[#c95735]">저장</button>
      </header>

      <section className="rounded-2xl bg-[#fff0e3] p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f8dfcd] text-3xl">🌱</span>
          <p className="text-[15px] font-semibold leading-relaxed text-[#3f2a20]">새로운 사람과의 소중한 이야기를<br />사람담에 담아보세요.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <div className="flex flex-col items-center">
          <Avatar person={previewPerson} size="lg" />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0])} />
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border border-[#ead8c9] bg-white px-4 py-2 text-sm font-extrabold text-[#5a392a]">
              <Upload className="mr-1 inline h-4 w-4" /> 사진 선택
            </button>
            {avatarImageDataUrl && (
              <button type="button" onClick={() => setAvatarImageDataUrl("")} className="rounded-full bg-[#fff1e8] px-4 py-2 text-sm font-extrabold text-[#c95735]">
                기본으로
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-extrabold text-[#2f1b12]">기본 프로필 선택</p>
          <div className="grid grid-cols-5 gap-2">
            {profilePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setAvatarPreset(preset.id);
                  setAvatarEmoji(preset.emoji);
                  setAvatarBg(preset.bg);
                  setAvatarImageDataUrl("");
                }}
                className={`rounded-2xl border p-2 text-center ${avatarPreset === preset.id && !avatarImageDataUrl ? "border-[#d85b36] bg-[#fff1e8]" : "border-[#ead8c9] bg-white"}`}
              >
                <span className="block text-2xl">{preset.emoji}</span>
                <span className="mt-1 block text-[11px] font-bold text-[#5e473a]">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

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
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={200} placeholder="이 사람을 떠올리게 하는 한마디를 적어보세요." className="saram-input min-h-28 resize-none" />
          <p className="mt-1 text-right text-xs text-[#8f7564]">{memo.length}/200</p>
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
