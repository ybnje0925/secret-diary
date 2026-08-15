import { ArrowLeft, Camera, ChevronDown, Leaf, Upload, UserRound } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Avatar from "../components/common/Avatar";
import { CategoryType, ChildInfo, ContactMedium, CustomGroup, Person } from "../types";
import { getRelationLine, primaryCategoryLabels } from "../utils/saramdam";

interface Props {
  person?: Person | null;
  people: Person[];
  customGroups: CustomGroup[];
  initialName?: string;
  onBack: () => void;
  onSave: (person: Person) => void;
  onOpenExisting: (personId: string) => void;
}

const profilePresets = [
  { id: "man" as const, label: "남자", emoji: "👨", bg: "bg-[#f3dfd1]" },
  { id: "woman" as const, label: "여자", emoji: "👩", bg: "bg-[#f6e2d9]" },
  { id: "neutral" as const, label: "기본", emoji: "🙂", bg: "bg-[#f1e5d8]" },
  { id: "plant" as const, label: "새싹", emoji: "🌱", bg: "bg-[#eaf0dc]" },
  { id: "heart" as const, label: "마음", emoji: "💗", bg: "bg-[#fde4d5]" }
];

const mediumOptions: ContactMedium[] = ["통화", "카톡", "식사", "대면", "메시지", "기타"];

export default function AddPersonView({ person, people, customGroups, initialName, onBack, onSave, onOpenExisting }: Props) {
  const isEdit = Boolean(person);
  const [name, setName] = useState(person?.name || initialName || "");
  const [category, setCategory] = useState<CategoryType>(person?.category || "친구");
  const [groups, setGroups] = useState<string[]>(person?.groups || []);
  const [groupInput, setGroupInput] = useState("");
  const [memo, setMemo] = useState(person?.preferences.notes || "");
  const [company, setCompany] = useState(person?.company || "");
  const [phone, setPhone] = useState(person?.phone || "");
  const [food, setFood] = useState(person?.preferences.food || "");
  const [hobbies, setHobbies] = useState(person?.preferences.hobbies || "");
  const [spouseName, setSpouseName] = useState(person?.familyInfo.spouseName || "");
  const [childrenText, setChildrenText] = useState((person?.familyInfo.children || []).map((child) => [child.name, child.ageOrBirth, child.memo].filter(Boolean).join(" · ")).join("\n"));
  const [lastContactDate, setLastContactDate] = useState(person?.lastContactDate || new Date().toISOString().split("T")[0]);
  const [lastContactMedium, setLastContactMedium] = useState<ContactMedium>(person?.lastContactMedium || "기타");
  const [remindIntervalDays, setRemindIntervalDays] = useState(String(person?.remindIntervalDays || 60));
  const [showDetails, setShowDetails] = useState(isEdit);
  const [forceAdd, setForceAdd] = useState(false);
  const [avatarImageDataUrl, setAvatarImageDataUrl] = useState(person?.avatarImageDataUrl || "");
  const [avatarPreset, setAvatarPreset] = useState<Person["avatarPreset"]>(person?.avatarPreset || "neutral");
  const [avatarEmoji, setAvatarEmoji] = useState(person?.avatarEmoji || "🙂");
  const [avatarBg, setAvatarBg] = useState(person?.avatarBg || "bg-[#f3dfd1]");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const similarPeople = useMemo(() => {
    const normalized = normalizeName(name);
    if (!normalized || isEdit) return [];
    return people.filter((item) => normalizeName(item.name) === normalized || normalizeName(item.name).includes(normalized) || normalized.includes(normalizeName(item.name))).slice(0, 3);
  }, [isEdit, name, people]);

  const previewPerson: Person = {
    id: person?.id || "preview",
    name: name || "새로운 사람",
    phone,
    company,
    category,
    groups,
    familyInfo: { spouseName: spouseName || undefined, children: parseChildren(childrenText) },
    preferences: { food, hobbies, notes: memo },
    eventsHistory: person?.eventsHistory || [],
    avatarEmoji,
    avatarBg,
    avatarImageDataUrl,
    avatarPreset,
    lastContactDate,
    lastContactMedium,
    remindIntervalDays: Number(remindIntervalDays) || 60,
    history: person?.history || []
  };

  const addGroup = (value: string) => {
    const next = value.trim();
    if (!next || groups.includes(next)) return;
    setGroups([...groups, next]);
    setGroupInput("");
  };

  const handleImageFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarImageDataUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (similarPeople.length > 0 && !forceAdd) return;

    const today = new Date().toISOString().split("T")[0];
    onSave({
      id: person?.id || `p_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      company: company.trim(),
      category,
      groups,
      familyInfo: {
        spouseName: spouseName.trim() || undefined,
        children: parseChildren(childrenText)
      },
      preferences: {
        food: food.trim(),
        hobbies: hobbies.trim(),
        notes: memo.trim()
      },
      eventsHistory: person?.eventsHistory || [],
      avatarEmoji,
      avatarBg,
      avatarImageDataUrl: avatarImageDataUrl || undefined,
      avatarPreset,
      lastContactDate,
      lastContactMedium,
      remindIntervalDays: Number(remindIntervalDays) || 60,
      history: person?.history?.length
        ? person.history
        : memo.trim()
          ? [{ id: `h_${Date.now()}`, date: today, medium: "기타", summary: memo.trim() }]
          : []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-6">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-full p-2 text-[#2f1b12]"><ArrowLeft className="h-6 w-6" /></button>
        <h1 className="text-[22px] font-semibold leading-[1.35] tracking-[-0.025em] text-[#2f1b12]">{isEdit ? "사람 정보 수정" : "새로운 사람을 담아볼까요?"}</h1>
        <button className="text-base font-semibold text-[#c95735]">{isEdit ? "저장" : "추가"}</button>
      </header>

      <section className="rounded-[18px] bg-[#fff0e3] p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#f8dfcd] text-2xl">🌱</span>
          <p className="text-[15px] font-semibold leading-relaxed text-[#3f2a20]">
            처음부터 모든 걸 적을 필요는 없어요.<br />이름과 관계만으로 시작해도 충분해요.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <div className="flex flex-col items-center">
          <Avatar person={previewPerson} size="lg" />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0])} />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full border border-[#ead8c9] bg-white px-4 py-2 text-sm font-medium text-[#5a392a]">
              <Upload className="mr-1 inline h-4 w-4" /> 사진 선택
            </button>
            {avatarImageDataUrl && (
              <button type="button" onClick={() => setAvatarImageDataUrl("")} className="rounded-full bg-[#fff1e8] px-4 py-2 text-sm font-medium text-[#c95735]">
                기본으로
              </button>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-[#2f1b12]">기본 프로필 선택</p>
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
                <span className="mt-1 block text-[11px] font-medium text-[#5e473a]">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
        <Field label="이름 *">
          <input required value={name} onChange={(event) => { setName(event.target.value); setForceAdd(false); }} placeholder="이름을 입력해주세요" className="saram-input" />
        </Field>
        {similarPeople.length > 0 && !forceAdd && (
          <div className="mb-4 rounded-2xl bg-[#fff1e8] p-4">
            <h2 className="font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">같은 이름의 사람이 있어요.</h2>
            <div className="mt-3 space-y-2">
              {similarPeople.map((item) => (
                <button key={item.id} type="button" onClick={() => onOpenExisting(item.id)} className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-3 text-left">
                  <span>
                    <span className="block font-semibold text-[#2f1b12]">{item.name}</span>
                    <span className="text-sm text-[#7c6252]">{getRelationLine(item)}</span>
                  </span>
                  <span className="text-xs font-semibold text-[#c95735]">보기</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setForceAdd(true)} className="mt-3 text-sm font-semibold text-[#c95735]">그래도 새로운 사람으로 추가하기</button>
          </div>
        )}
        <Field label="관계 *">
          <div className="grid grid-cols-5 gap-2">
            {primaryCategoryLabels.map((label) => (
              <button key={label} type="button" onClick={() => setCategory(label)} className={`rounded-full px-3 py-2 text-sm font-medium ${category === label ? "bg-[#d85b36] text-white" : "border border-[#ead8c9] bg-white text-[#5a392a]"}`}>
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="그룹 (선택)">
          <div className="flex gap-2">
            <input list="group-options" value={groupInput} onChange={(event) => setGroupInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addGroup(groupInput); } }} placeholder="예) 테니스 모임, 대학교" className="saram-input h-12 flex-1" />
            <button type="button" onClick={() => addGroup(groupInput)} className="rounded-full bg-[#d85b36] px-4 text-sm font-semibold text-white">추가</button>
          </div>
          <datalist id="group-options">
            {customGroups.map((item) => <option key={item.id} value={item.name} />)}
          </datalist>
          {groups.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {groups.map((group) => (
                <button key={group} type="button" onClick={() => setGroups(groups.filter((item) => item !== group))} className="rounded-full bg-[#fff1e8] px-3 py-1.5 text-xs font-medium text-[#9a6044]">
                  {group} ×
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label="기억하고 싶은 한마디 (선택)">
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} maxLength={300} placeholder="대학교 때부터 친한 친구" className="saram-input min-h-28 resize-none" />
          <p className="mt-1 text-right text-xs text-[#8f7564]">{memo.length}/300</p>
        </Field>
      </section>

      <button type="button" onClick={() => setShowDetails((value) => !value)} className="flex w-full items-center justify-between rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 text-left font-semibold text-[#2f1b12] shadow-soft">
        <span className="inline-flex items-center gap-2"><UserRound className="h-5 w-5 text-[#c95735]" /> 정보 조금 더 추가하기</span>
        <ChevronDown className={`h-5 w-5 transition ${showDetails ? "rotate-180" : ""}`} />
      </button>

      {showDetails && (
        <section className="rounded-2xl border border-[#ead8c9] bg-[#fffaf3] p-4 shadow-soft">
          <Field label="연락처">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" className="saram-input" />
          </Field>
          <Field label="회사 / 소속">
            <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="회사, 동호회, 학교 등" className="saram-input" />
          </Field>
          <Field label="가족">
            <input value={spouseName} onChange={(event) => setSpouseName(event.target.value)} placeholder="배우자 이름 (선택)" className="saram-input mb-2" />
            <textarea value={childrenText} onChange={(event) => setChildrenText(event.target.value)} placeholder={"자녀나 가족을 한 줄씩 적어보세요\n예) 민지 · 9살 · 테니스 배우는 중"} className="saram-input min-h-24 resize-none" />
          </Field>
          <Field label="취향">
            <input value={food} onChange={(event) => setFood(event.target.value)} placeholder="좋아하는 음식" className="saram-input mb-2" />
            <input value={hobbies} onChange={(event) => setHobbies(event.target.value)} placeholder="취미, 관심사" className="saram-input" />
          </Field>
          <Field label="연락">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={lastContactDate} onChange={(event) => setLastContactDate(event.target.value)} className="saram-input" />
              <select value={lastContactMedium} onChange={(event) => setLastContactMedium(event.target.value as ContactMedium)} className="saram-input">
                {mediumOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <input value={remindIntervalDays} onChange={(event) => setRemindIntervalDays(event.target.value)} inputMode="numeric" placeholder="연락주기 일수" className="saram-input mt-2" />
          </Field>
        </section>
      )}

      <p className="flex gap-3 rounded-2xl bg-[#fff1df] p-4 text-sm leading-relaxed text-[#5e473a]">
        <Leaf className="h-5 w-5 shrink-0 text-[#85a56a]" />
        <span>이야기는 앞으로의 기록을 통해 자연스럽게 채워질 거예요.</span>
      </p>

      <button className="sticky bottom-3 w-full rounded-full bg-[#d85b36] py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(216,91,54,0.18)]">
        {isEdit ? "변경사항 저장" : "사람談에 추가하기"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-4 block last:mb-0">
      <span className="mb-2 block text-sm font-semibold leading-[1.45] tracking-[-0.015em] text-[#2f1b12]">{label}</span>
      {children}
    </label>
  );
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function parseChildren(value: string): ChildInfo[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", ageOrBirth = "", ...memoParts] = line.split("·").map((part) => part.trim());
      return { name, ageOrBirth, memo: memoParts.join(" · ") };
    })
    .filter((child) => child.name);
}
