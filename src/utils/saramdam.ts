import { CategoryType, Person } from "../types";

export const categoryLabels: CategoryType[] = ["가족", "친구", "지인", "회사", "그룹", "기타"];
export const primaryCategoryLabels: CategoryType[] = ["가족", "친구", "회사", "지인", "기타"];

const DAY_MS = 1000 * 60 * 60 * 24;

export function daysSince(date: string): number {
  const then = new Date(`${date}T00:00:00`);
  if (Number.isNaN(then.getTime())) return 0;
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
}

export function formatDateKo(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}. ${parsed.getMonth() + 1}. ${parsed.getDate()}`;
}

export function getRelationLine(person: Person): string {
  const group = person.groups[0] || person.company;
  return [person.category, group].filter(Boolean).join(" · ");
}

export function getRecentMemory(person: Person): string {
  return person.history?.[0]?.summary || person.preferences.notes || "아직 담긴 이야기가 없어요.";
}

export function makeMemoryBullets(person: Person): string[] {
  const bullets: string[] = [];
  const spouse = person.familyInfo?.spouseName;
  const child = person.familyInfo?.children?.[0];

  if (spouse || child) {
    bullets.push(`가족 ${[spouse, child && `${child.name} ${child.ageOrBirth || ""}`].filter(Boolean).join(" · ")}`);
  }
  if (person.preferences.hobbies) bullets.push(person.preferences.hobbies);
  if (person.preferences.food) bullets.push(person.preferences.food);
  if (person.preferences.notes) bullets.push(person.preferences.notes.split("\n")[0]);
  if (person.history?.[0]?.summary) bullets.push(person.history[0].summary.split(".")[0]);

  return Array.from(new Set(bullets)).slice(0, 4);
}

export function searchPeople(people: Person[], query: string, category: CategoryType | "전체"): Person[] {
  const normalized = query.trim().toLowerCase();
  return people.filter((person) => {
    const categoryMatch = category === "전체" || person.category === category;
    if (!categoryMatch) return false;
    if (!normalized) return true;

    const haystack = [
      person.name,
      person.category,
      person.company,
      ...person.groups,
      person.preferences.food,
      person.preferences.hobbies,
      person.preferences.notes,
      person.familyInfo?.spouseName || "",
      ...(person.familyInfo?.children || []).map((child) => `${child.name} ${child.memo}`)
    ].join(" ").toLowerCase();

    return haystack.includes(normalized);
  });
}

export function getSearchReason(person: Person, query: string): string {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return "";

  const checks: Array<[string, string]> = [
    ["관계", person.category],
    ["그룹", person.groups.join(", ")],
    ["회사", person.company],
    ["취향", person.preferences.food],
    ["관심사", person.preferences.hobbies],
    ["메모", person.preferences.notes],
    ["가족", [person.familyInfo?.spouseName, ...(person.familyInfo?.children || []).map((child) => `${child.name} ${child.memo}`)].filter(Boolean).join(", ")]
  ];

  const match = checks.find(([, value]) => value.toLowerCase().includes(normalized));
  if (!match) return "";
  const [, value] = match;
  const compact = value.split("\n").find((line) => line.toLowerCase().includes(normalized)) || value;
  return `${match[0]} · ${compact.slice(0, 28)}${compact.length > 28 ? "..." : ""}`;
}

export function getLastStoryDate(person: Person): string {
  return person.history[0]?.date || person.lastContactDate || "";
}

export function normalizeMemoryText(value: string) {
  return value.replace(/\s+/g, "").replace(/[.,!?'"“”]/g, "").toLowerCase();
}
