import { Person, CustomGroup } from "./types";
import { generateSalt, deriveKey, encryptText, decryptText, toBase64, fromBase64 } from "./crypto";

const SALT_KEY = "yongjja_salt";
const VAULT_KEY = "yongjja_vault";
const LEGACY_PEOPLE_KEY = "yongjja_people";
const LEGACY_GROUPS_KEY = "yongjja_groups";

export interface VaultData {
  people: Person[];
  customGroups: CustomGroup[];
}

export function hasVault(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null && localStorage.getItem(SALT_KEY) !== null;
}

// Pre-encryption installs stored data as plaintext under these keys — detect
// it so first-time PIN setup can migrate it instead of discarding it.
export function readLegacyPlaintextData(): VaultData {
  let people: Person[] = [];
  let customGroups: CustomGroup[] = [];
  try {
    people = JSON.parse(localStorage.getItem(LEGACY_PEOPLE_KEY) || "[]");
  } catch (e) {
    people = [];
  }
  try {
    customGroups = JSON.parse(localStorage.getItem(LEGACY_GROUPS_KEY) || "[]");
  } catch (e) {
    customGroups = [];
  }
  return { people, customGroups };
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
  localStorage.setItem(SALT_KEY, toBase64(salt));
  const key = await deriveKey(pin, salt);
  await saveVault(key, initialData);
  return key;
}

// Returns the derived key + decrypted data, or throws if the PIN is wrong.
export async function unlockVault(pin: string): Promise<{ key: CryptoKey; data: VaultData }> {
  const saltB64 = localStorage.getItem(SALT_KEY);
  const vaultPayload = localStorage.getItem(VAULT_KEY);
  if (!saltB64 || !vaultPayload) {
    throw new Error("잠금 데이터가 없습니다.");
  }
  const salt = fromBase64(saltB64);
  const key = await deriveKey(pin, salt);
  const json = await decryptText(key, vaultPayload);
  const data = JSON.parse(json) as VaultData;
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
  return JSON.parse(json) as VaultData;
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
    return { format: "plain", data: { people: json.people, customGroups: json.customGroups || [] } };
  }
  throw new Error("올바른 용쨔의 비밀노트 백업 파일이 아닙니다.");
}
