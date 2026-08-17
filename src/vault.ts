import { Person, CustomGroup, ChildInfo, Preferences, EventHistoryItem, FollowUpItem, AiMemoryTag, RecordAiAnalysis, PersonAiBriefing } from "./types";
import { generateSalt, deriveKey, encryptText, decryptText, toBase64, fromBase64 } from "./crypto";

const SALT_KEY = "yongjja_salt";
const VAULT_KEY = "yongjja_vault";
const LEGACY_PEOPLE_KEY = "yongjja_people";
const LEGACY_GROUPS_KEY = "yongjja_groups";

export type VaultStorageState = "empty" | "ready" | "incomplete";

export interface VaultData {
  people: Person[];
  customGroups: CustomGroup[];
}

// Upgrades a person record from any earlier schema version to the current
// one. Old builds stored a flat `memo` string and no eventsHistory/
// remindIntervalDays — this preserves that data instead of discarding it.
function migrateChild(raw: any): ChildInfo {
  return {
    name: raw?.name || "",
    birthDate: raw?.birthDate || undefined,
    ageOrBirth: raw?.ageOrBirth || "",
    memo: raw?.memo || ""
  };
}

function migratePreferences(raw: any): Preferences {
  if (raw?.preferences) {
    return {
      food: raw.preferences.food || "",
      hobbies: raw.preferences.hobbies || "",
      notes: raw.preferences.notes || ""
    };
  }
  // Pre-schema-v2 records kept everything in one free-text `memo` field.
  return { food: "", hobbies: "", notes: typeof raw?.memo === "string" ? raw.memo : "" };
}

function migrateEventsHistory(raw: any): EventHistoryItem[] {
  if (!Array.isArray(raw?.eventsHistory)) return [];
  return raw.eventsHistory.map((e: any) => ({
    id: e.id || "e_" + Math.random().toString(36).slice(2),
    date: e.date || "",
    type: e.type || "기타",
    amountOrGift: e.amountOrGift || "",
    note: e.note || ""
  }));
}

function migrateFollowUps(raw: any, personId: string): FollowUpItem[] {
  if (!Array.isArray(raw?.followUps)) return [];
  return raw.followUps
    .filter((item: any) => item?.text)
    .map((item: any) => ({
      id: item.id || "fu_" + Math.random().toString(36).slice(2),
      personId: item.personId || personId,
      sourceRecordId: item.sourceRecordId || "",
      text: String(item.text || "").trim(),
      status: item.status === "completed" ? "completed" : "pending",
      createdAt: item.createdAt || new Date().toISOString(),
      completedAt: item.completedAt || undefined,
      resultRecordId: item.resultRecordId || undefined
    }));
}

function migrateAiTags(raw: any): AiMemoryTag[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((tag: any) => tag?.category && tag?.text)
    .map((tag: any) => ({
      category: tag.category,
      text: String(tag.text || "").trim()
    }))
    .filter((tag: AiMemoryTag) => tag.text);
}

function migrateRecordAiAnalysis(raw: any): RecordAiAnalysis | undefined {
  if (!raw?.inputHash || !raw?.summary) return undefined;
  return {
    inputHash: String(raw.inputHash),
    summary: String(raw.summary || ""),
    briefing: raw.briefing ? String(raw.briefing) : undefined,
    tags: migrateAiTags(raw.tags),
    analyzedAt: raw.analyzedAt || new Date().toISOString(),
    provider: raw.provider === "gemini" ? "gemini" : raw.provider === "local" ? "local" : undefined,
    model: raw.model || undefined,
    fallback: typeof raw.fallback === "boolean" ? raw.fallback : undefined
  };
}

function migrateHistory(raw: any): any[] {
  if (!Array.isArray(raw?.history)) return [];
  return raw.history.map((item: any) => ({
    ...item,
    aiAnalysis: migrateRecordAiAnalysis(item?.aiAnalysis)
  }));
}

function migratePersonAiBriefing(raw: any): PersonAiBriefing | undefined {
  if (!raw?.aiBriefing?.sourceHash || !raw?.aiBriefing?.text) return undefined;
  return {
    sourceHash: String(raw.aiBriefing.sourceHash),
    text: String(raw.aiBriefing.text || ""),
    tags: migrateAiTags(raw.aiBriefing.tags),
    updatedAt: raw.aiBriefing.updatedAt || new Date().toISOString(),
    provider: raw.aiBriefing.provider === "gemini" ? "gemini" : raw.aiBriefing.provider === "local" ? "local" : undefined,
    model: raw.aiBriefing.model || undefined,
    fallback: typeof raw.aiBriefing.fallback === "boolean" ? raw.aiBriefing.fallback : undefined
  };
}

export function migratePersonSchema(raw: any): Person {
  const id = raw.id;
  return {
    id,
    name: raw.name || "",
    phone: raw.phone || "",
    company: raw.company || "",
    category: raw.category || "지인",
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    familyInfo: {
      spouseName: raw.familyInfo?.spouseName || undefined,
      children: Array.isArray(raw.familyInfo?.children) ? raw.familyInfo.children.map(migrateChild) : []
    },
    preferences: migratePreferences(raw),
    eventsHistory: migrateEventsHistory(raw),
    avatarEmoji: raw.avatarEmoji || "👤",
    avatarBg: raw.avatarBg || "",
    lastContactDate: raw.lastContactDate || "",
    lastContactMedium: raw.lastContactMedium || "기타",
    remindIntervalDays: typeof raw.remindIntervalDays === "number" ? raw.remindIntervalDays : undefined,
    history: migrateHistory(raw),
    followUps: migrateFollowUps(raw, id),
    aiBriefing: migratePersonAiBriefing(raw)
  };
}

function migrateVaultData(raw: any): VaultData {
  return {
    people: Array.isArray(raw?.people) ? raw.people.map(migratePersonSchema) : [],
    customGroups: Array.isArray(raw?.customGroups) ? raw.customGroups : []
  };
}

export function hasVault(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null && localStorage.getItem(SALT_KEY) !== null;
}

export function getVaultStorageState(): VaultStorageState {
  const hasSalt = localStorage.getItem(SALT_KEY) !== null;
  const hasPayload = localStorage.getItem(VAULT_KEY) !== null;
  if (hasSalt && hasPayload) return "ready";
  if (!hasSalt && !hasPayload) return "empty";
  return "incomplete";
}

export function clearIncompleteVaultSetup(): void {
  if (getVaultStorageState() !== "incomplete") return;
  localStorage.removeItem(SALT_KEY);
  localStorage.removeItem(VAULT_KEY);
}

// Pre-encryption installs stored data as plaintext under these keys — detect
// it so first-time PIN setup can migrate it instead of discarding it.
export function readLegacyPlaintextData(): VaultData {
  let rawPeople: any[] = [];
  let customGroups: CustomGroup[] = [];
  try {
    rawPeople = JSON.parse(localStorage.getItem(LEGACY_PEOPLE_KEY) || "[]");
  } catch (e) {
    rawPeople = [];
  }
  try {
    customGroups = JSON.parse(localStorage.getItem(LEGACY_GROUPS_KEY) || "[]");
  } catch (e) {
    customGroups = [];
  }
  return { people: rawPeople.map(migratePersonSchema), customGroups };
}

export function hasLegacyPlaintextData(): boolean {
  return localStorage.getItem(LEGACY_PEOPLE_KEY) !== null || localStorage.getItem(LEGACY_GROUPS_KEY) !== null;
}

export function clearLegacyPlaintextData(): void {
  localStorage.removeItem(LEGACY_PEOPLE_KEY);
  localStorage.removeItem(LEGACY_GROUPS_KEY);
}

// First-time setup: create a fresh salt, derive the key from the chosen PIN,
// and seed the vault (optionally migrating pre-encryption plaintext data).
export async function createVault(pin: string, initialData: VaultData): Promise<CryptoKey> {
  const salt = generateSalt();
  const key = await deriveKey(pin, salt);
  const payload = await encryptText(key, JSON.stringify(initialData));
  localStorage.setItem(SALT_KEY, toBase64(salt));
  localStorage.setItem(VAULT_KEY, payload);
  return key;
}

export async function changeVaultPin(currentPin: string, nextPin: string): Promise<{ key: CryptoKey; data: VaultData }> {
  const { data } = await unlockVault(currentPin);
  const nextSalt = generateSalt();
  const nextKey = await deriveKey(nextPin, nextSalt);
  const nextPayload = await encryptText(nextKey, JSON.stringify(data));
  localStorage.setItem(SALT_KEY, toBase64(nextSalt));
  localStorage.setItem(VAULT_KEY, nextPayload);
  return { key: nextKey, data };
}

// Returns the derived key + decrypted (schema-migrated) data, or throws if
// the PIN is wrong.
export async function unlockVault(pin: string): Promise<{ key: CryptoKey; data: VaultData }> {
  const saltB64 = localStorage.getItem(SALT_KEY);
  const vaultPayload = localStorage.getItem(VAULT_KEY);
  if (!saltB64 || !vaultPayload) {
    throw new Error("잠금 데이터가 없습니다.");
  }
  const salt = fromBase64(saltB64);
  const key = await deriveKey(pin, salt);
  const json = await decryptText(key, vaultPayload);
  const data = migrateVaultData(JSON.parse(json));
  return { key, data };
}

export async function saveVault(key: CryptoKey, data: VaultData): Promise<void> {
  const payload = await encryptText(key, JSON.stringify(data));
  localStorage.setItem(VAULT_KEY, payload);
}

// Decrypt a backup file's payload using its own embedded salt + a PIN the
// user supplies for that specific backup (which may differ from the current
// device's live PIN, e.g. when restoring onto a brand-new device).
export async function decryptBackupPayload(
  pin: string,
  saltB64: string,
  payload: string
): Promise<VaultData> {
  const salt = fromBase64(saltB64);
  const key = await deriveKey(pin, salt);
  const json = await decryptText(key, payload);
  return migrateVaultData(JSON.parse(json));
}

// Encrypt data for a downloadable backup file using the CURRENT session key,
// reusing the same salt already stored on this device.
export async function encryptBackupPayload(
  key: CryptoKey,
  data: VaultData
): Promise<{ salt: string; payload: string }> {
  const saltB64 = localStorage.getItem(SALT_KEY);
  if (!saltB64) throw new Error("암호화 salt를 찾을 수 없습니다.");
  const payload = await encryptText(key, JSON.stringify(data));
  return { salt: saltB64, payload };
}

export type ParsedBackup =
  | { format: "encrypted"; salt: string; payload: string }
  | { format: "plain"; data: VaultData };

// Backup files come in two shapes: the legacy plaintext export (pre-encryption
// builds) and the new encrypted export. Detect which one this is.
export function parseBackupFile(rawJson: string): ParsedBackup {
  const json = JSON.parse(rawJson);
  if (json.encrypted === true && typeof json.salt === "string" && typeof json.payload === "string") {
    return { format: "encrypted", salt: json.salt, payload: json.payload };
  }
  if (Array.isArray(json.people)) {
    return { format: "plain", data: migrateVaultData(json) };
  }
  throw new Error("올바른 사람談 백업 파일이 아닙니다.");
}
