// Web Crypto helpers for client-side AES-256-GCM encryption at rest.
// The PIN never leaves the device and no key material is ever transmitted or
// stored — only a random (non-secret) salt and the ciphertext are persisted.
const PBKDF2_ITERATIONS = 200_000;

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Payload format: "<base64 iv>.<base64 ciphertext>"
export async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

// Throws (AES-GCM auth tag mismatch) when the key/PIN is wrong — this is what
// makes PIN verification possible without storing the PIN anywhere.
export async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split(".");
  if (!ivB64 || !dataB64) throw new Error("잘못된 암호화 데이터 형식입니다.");
  const iv = fromBase64(ivB64);
  const data = fromBase64(dataB64);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
  return new TextDecoder().decode(plainBuf);
}
