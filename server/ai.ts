import { GoogleGenAI, Type } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const PLACEHOLDER_KEYS = new Set(["MY_GEMINI_API_KEY", "YOUR_GEMINI_API_KEY", "your-gemini-api-key"]);
const MAX_ANALYSIS_INPUT = 6000;
const MAX_BRIEFING_RECORDS = 5;

export type AiReason =
  | "GEMINI_API_KEY_MISSING"
  | "GEMINI_API_KEY_PLACEHOLDER"
  | "GEMINI_REQUEST_FAILED"
  | "GEMINI_EMPTY_RESPONSE"
  | "INVALID_RESPONSE"
  | "RATE_LIMIT"
  | "QUOTA_EXCEEDED"
  | "MODEL_ERROR"
  | "MODEL_NOT_FOUND"
  | "INVALID_API_KEY"
  | "PERMISSION_DENIED"
  | "NO_CANDIDATES"
  | "AI_ROLE_DISABLED";

export type GeminiErrorDiagnostics = {
  httpStatus?: number;
  googleErrorCode?: string | number;
  googleErrorStatus?: string;
  message?: string;
};

export type AiMeta = {
  provider: "gemini" | "local";
  model?: string;
  fallback: boolean;
  reason?: AiReason;
  diagnostics?: GeminiErrorDiagnostics;
};

let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
  }
  return aiClient;
}

export function getGeminiKeyStatus(apiKey = process.env.GEMINI_API_KEY) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) return { configured: false, reason: "GEMINI_API_KEY_MISSING" as const };
  if (PLACEHOLDER_KEYS.has(trimmed) || /placeholder|your[_-]?key|sample/i.test(trimmed)) {
    return { configured: false, reason: "GEMINI_API_KEY_PLACEHOLDER" as const };
  }
  return { configured: true };
}

export function localMeta(reason: AiReason, diagnostics?: GeminiErrorDiagnostics): AiMeta {
  return { provider: "local", fallback: true, reason, diagnostics };
}

function geminiMeta(): AiMeta {
  return { provider: "gemini", model: GEMINI_MODEL, fallback: false };
}

export function logAi(endpoint: string, meta: AiMeta, success: boolean) {
  const modelText = meta.model ? ` model=${meta.model}` : "";
  const reasonText = meta.reason ? ` reason=${meta.reason}` : "";
  console.log(`[AI][${endpoint}] provider=${meta.provider}${modelText} fallback=${meta.fallback}${reasonText} success=${success}`);
}

function sanitizeGeminiMessage(message: string) {
  return message
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-api-key]")
    .replace(/key=([0-9A-Za-z_-]+)/gi, "key=[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 320);
}

function pickGoogleErrorPayload(error: any) {
  if (error?.error?.error) return error.error.error;
  if (error?.error) return error.error;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.details?.error) return error.details.error;

  const message = String(error?.message || "");
  const jsonMatch = message.match(/\{[\s\S]*"error"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed?.error || parsed;
    } catch {
      return null;
    }
  }
  return null;
}

export function extractGeminiErrorDiagnostics(error: any): GeminiErrorDiagnostics {
  const payload = pickGoogleErrorPayload(error);
  const httpStatus = Number(error?.status || error?.response?.status || payload?.code || 0) || undefined;
  const googleErrorCode = payload?.code ?? error?.code;
  const googleErrorStatus = payload?.status || error?.statusText || error?.response?.statusText;
  const rawMessage = String(payload?.message || error?.message || error || "");

  return {
    httpStatus,
    googleErrorCode,
    googleErrorStatus,
    message: sanitizeGeminiMessage(rawMessage)
  };
}

function classifyAiError(error: any): AiReason {
  const diagnostics = extractGeminiErrorDiagnostics(error);
  const message = diagnostics.message || "";
  const status = diagnostics.httpStatus || 0;
  const googleStatus = diagnostics.googleErrorStatus || "";
  if (/API key not valid|invalid api key|API_KEY_INVALID/i.test(message)) return "INVALID_API_KEY";
  if (status === 401) return "INVALID_API_KEY";
  if (googleStatus === "PERMISSION_DENIED" || status === 403 || /permission denied|forbidden|unauthorized/i.test(message)) return "PERMISSION_DENIED";
  if (googleStatus === "NOT_FOUND" || status === 404 || /model .*not found|not found|not supported/i.test(message)) return "MODEL_NOT_FOUND";
  if (googleStatus === "RESOURCE_EXHAUSTED" || status === 429) return /quota|exceeded/i.test(message) ? "QUOTA_EXCEEDED" : "RATE_LIMIT";
  if (/empty response/i.test(message)) return "GEMINI_EMPTY_RESPONSE";
  if (/JSON|parse|schema|invalid response/i.test(message)) return "INVALID_RESPONSE";
  return "GEMINI_REQUEST_FAILED";
}

function errorReason(error: any): AiReason {
  return error?.aiReason || classifyAiError(error);
}

function shouldUseLocalFallback(apiKey = process.env.GEMINI_API_KEY) {
  return !getGeminiKeyStatus(apiKey).configured;
}

async function generateGeminiJson(params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">) {
  const keyStatus = getGeminiKeyStatus();
  if (!keyStatus.configured) {
    const error = new Error(keyStatus.reason);
    (error as any).aiReason = keyStatus.reason;
    throw error;
  }

  const response = await getGeminiClient().models.generateContent({ ...params, model: GEMINI_MODEL });
  const text = response.text;
  if (!text) {
    const error = new Error("Gemini empty response");
    (error as any).aiReason = "GEMINI_EMPTY_RESPONSE";
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error("Gemini invalid JSON response");
    (parseError as any).cause = error;
    (parseError as any).aiReason = "INVALID_RESPONSE";
    throw parseError;
  }
}

export async function getAiHealthResult() {
  const keyStatus = getGeminiKeyStatus();
  if (!keyStatus.configured) {
    const meta = localMeta(keyStatus.reason);
    logAi("health", meta, true);
    return {
      success: true,
      configured: false,
      provider: "local-fallback",
      reason: keyStatus.reason,
      endpoints: {
        summarize: "fallback",
        personBriefing: "fallback",
        checkInSuggestions: "disabled",
        checkInStarters: "disabled"
      },
      meta
    };
  }

  try {
    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: "Return exactly the plain text OK. Do not add anything else." }]
    });
    if (!String(response.text || "").trim()) {
      const error = new Error("Gemini health returned empty response");
      (error as any).aiReason = "GEMINI_EMPTY_RESPONSE";
      throw error;
    }
    const meta = geminiMeta();
    logAi("health", meta, true);
    return {
      success: true,
      configured: true,
      provider: "gemini",
      model: GEMINI_MODEL,
      endpoints: {
        summarize: "ok",
        personBriefing: "ok",
        checkInSuggestions: "disabled",
        checkInStarters: "disabled"
      },
      meta
    };
  } catch (error) {
    const reason = errorReason(error);
    const diagnostics = extractGeminiErrorDiagnostics(error);
    const meta = localMeta(reason, diagnostics);
    logAi("health", meta, false);
    console.error("[AI][health] gemini_error", JSON.stringify({
      reason,
      httpStatus: diagnostics.httpStatus,
      googleErrorCode: diagnostics.googleErrorCode,
      googleErrorStatus: diagnostics.googleErrorStatus,
      message: diagnostics.message
    }));
    return {
      success: true,
      configured: true,
      provider: "local-fallback",
      model: GEMINI_MODEL,
      reason,
      diagnostics,
      endpoints: {
        summarize: "fallback",
        personBriefing: "fallback",
        checkInSuggestions: "disabled",
        checkInStarters: "disabled"
      },
      meta
    };
  }
}

export async function summarizeText(body: any) {
  const { scriptText, selectedPersonId, selectedPersonName } = body || {};
  const todayStr = new Date().toISOString().split("T")[0];
  const cleanText = limitAiInput(redactDirectIdentifiers(String(scriptText || "")), MAX_ANALYSIS_INPUT);
  const inputHash = simpleHash(`${selectedPersonId || selectedPersonName || "unknown"}:${cleanText}`);

  if (!cleanText.trim()) {
    return { status: 400, body: { success: false, error: "분석할 텍스트가 필요합니다." } };
  }

  if (shouldUseLocalFallback()) {
    const reason = getGeminiKeyStatus().reason || "GEMINI_API_KEY_MISSING";
    const meta = localMeta(reason);
    logAi("summarize", meta, true);
    return { body: { success: true, data: simulateAnalysis(cleanText, selectedPersonId || selectedPersonName, todayStr, inputHash, meta), simulated: true, meta } };
  }

  try {
    const parsedData = await generateGeminiJson({
      contents: [{ text: buildSummarizePrompt(cleanText, selectedPersonId, todayStr) }],
      config: {
        responseMimeType: "application/json",
        responseSchema: summarizeResponseSchema
      }
    });
    const meta = geminiMeta();
    const data = normalizeRecordAnalysis(parsedData, selectedPersonId || selectedPersonName, todayStr, inputHash, meta);
    logAi("summarize", meta, true);
    return { body: { success: true, data, meta } };
  } catch (error) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("summarize", meta, false);
    return {
      body: {
        success: true,
        data: simulateAnalysis(cleanText, selectedPersonId || selectedPersonName, todayStr, inputHash, meta),
        fallback: true,
        error: "AI 연결이 불안정해 저장된 규칙으로 정리했어요.",
        meta
      }
    };
  }
}

export async function personBriefing(body: any) {
  const personId = String(body?.personId || "");
  const records = Array.isArray(body?.records) ? body.records.slice(0, MAX_BRIEFING_RECORDS) : [];
  const cleanRecords = records
    .map((record: any) => ({
      date: String(record?.date || "").slice(0, 10),
      medium: String(record?.medium || "기타").slice(0, 10),
      summary: limitAiInput(redactDirectIdentifiers(String(record?.summary || "")), 700)
    }))
    .filter((record: any) => record.summary);
  const sourceHash = simpleHash(`${personId}:${JSON.stringify(cleanRecords)}`);

  if (!personId || cleanRecords.length === 0) {
    return { status: 400, body: { success: false, error: "브리핑할 최근 기록이 필요합니다." } };
  }

  if (shouldUseLocalFallback()) {
    const reason = getGeminiKeyStatus().reason || "GEMINI_API_KEY_MISSING";
    const meta = localMeta(reason);
    logAi("briefing", meta, true);
    return { body: { success: true, data: simulateBriefing(cleanRecords, sourceHash, meta), simulated: true, meta } };
  }

  try {
    const parsedData = await generateGeminiJson({
      contents: [{ text: buildBriefingPrompt(personId, cleanRecords) }],
      config: {
        responseMimeType: "application/json",
        responseSchema: briefingResponseSchema
      }
    });
    const meta = geminiMeta();
    const data = normalizeBriefing(parsedData, sourceHash, meta);
    logAi("briefing", meta, true);
    return { body: { success: true, data, meta } };
  } catch (error) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("briefing", meta, false);
    return {
      body: {
        success: true,
        data: simulateBriefing(cleanRecords, sourceHash, meta),
        fallback: true,
        error: "AI 연결이 불안정해 저장된 기록만으로 브리핑했어요.",
        meta
      }
    };
  }
}

export async function checkInSuggestions(_body: any) {
  const meta = localMeta("AI_ROLE_DISABLED");
  logAi("check-in-disabled", meta, true);
  return {
    status: 410,
    body: {
      success: false,
      disabled: true,
      data: { topics: [] },
      error: "AI 안부 추천 기능은 현재 사용하지 않습니다.",
      meta
    }
  };
}

export async function checkInStarters(_body: any) {
  const meta = localMeta("AI_ROLE_DISABLED");
  logAi("starter-disabled", meta, true);
  return {
    status: 410,
    body: {
      success: false,
      disabled: true,
      error: "AI 추천문구 생성 기능은 현재 사용하지 않습니다.",
      meta
    }
  };
}

function buildSummarizePrompt(scriptText: string, selectedPersonId: string | undefined, todayStr: string) {
  return `
You are the memory organizer inside Saramdam, a private relationship-memory app.
Your role is NOT to write messages on behalf of the user.
Your role is to structure facts the user already recorded, classify useful memory, and produce a short briefing.

Privacy and cost rules:
- Use only the provided text.
- Do not ask questions, write KakaoTalk messages, or generate contact wording.
- Do not infer phone numbers, addresses, emails, or other direct identifiers.
- The selected person is represented as an internal id: ${selectedPersonId || "unknown"}.
- Keep every output concise.

Return Korean JSON:
- summary: 2 to 4 short lines about what happened or changed.
- briefing: 2 to 4 short lines summarizing recent changes/memory.
- tags: up to 8 structured memory facts with category in work, family, interest, health, hobby, schedule, recent, preference, promise.
- lastContactDate defaults to ${todayStr} unless the text clearly says another date.
- lastContactMedium is one of 통화, 카톡, 식사, 대면, 메시지, 기타.

Recorded text:
${scriptText}
`;
}

function buildBriefingPrompt(personId: string, records: any[]) {
  return `
You are the memory briefer inside Saramdam.
Summarize what recently changed for this person. Do not write a message to send.

Rules:
- Use only the recent records below.
- Person is identified only as ${personId}; do not need a real name.
- Output 2 to 4 concise Korean lines.
- Classify up to 8 memory facts into work, family, interest, health, hobby, schedule, recent, preference, promise.
- Do not include phone, address, email, or direct identifiers.

Recent records JSON:
${JSON.stringify(records)}
`;
}

const tagSchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: ["work", "family", "interest", "health", "hobby", "schedule", "recent", "preference", "promise"] },
    text: { type: Type.STRING }
  },
  required: ["category", "text"]
};

const summarizeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    detectedPersonName: { type: Type.STRING },
    lastContactDate: { type: Type.STRING },
    lastContactMedium: { type: Type.STRING },
    summary: { type: Type.STRING },
    briefing: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: tagSchema },
    newFamilyDetails: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          ageOrBirth: { type: Type.STRING },
          memo: { type: Type.STRING }
        },
        required: ["name"]
      }
    },
    newMemoInsights: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["lastContactDate", "lastContactMedium", "summary"]
};

const briefingResponseSchema = {
  type: Type.OBJECT,
  properties: {
    briefing: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: tagSchema }
  },
  required: ["briefing"]
};

function normalizeRecordAnalysis(raw: any, selectedPerson: string | undefined, todayStr: string, inputHash: string, meta: AiMeta) {
  const summary = limitLines(String(raw?.summary || "기록한 내용을 정리했습니다."), 4);
  return {
    detectedPersonName: String(raw?.detectedPersonName || selectedPerson || ""),
    lastContactDate: String(raw?.lastContactDate || todayStr).slice(0, 10),
    lastContactMedium: normalizeMedium(raw?.lastContactMedium),
    summary,
    briefing: limitLines(String(raw?.briefing || summary), 4),
    tags: normalizeTags(raw?.tags),
    newFamilyDetails: Array.isArray(raw?.newFamilyDetails) ? raw.newFamilyDetails.slice(0, 4) : [],
    newMemoInsights: Array.isArray(raw?.newMemoInsights) ? raw.newMemoInsights.map((item: any) => String(item).slice(0, 120)).slice(0, 8) : [],
    analysisHash: inputHash,
    analyzedAt: new Date().toISOString(),
    provider: meta.provider,
    model: meta.model,
    fallback: meta.fallback
  };
}

function normalizeBriefing(raw: any, sourceHash: string, meta: AiMeta) {
  return {
    sourceHash,
    briefing: limitLines(String(raw?.briefing || "최근 기록을 정리했습니다."), 4),
    tags: normalizeTags(raw?.tags),
    updatedAt: new Date().toISOString(),
    provider: meta.provider,
    model: meta.model,
    fallback: meta.fallback
  };
}

function normalizeTags(raw: any) {
  const allowed = new Set(["work", "family", "interest", "health", "hobby", "schedule", "recent", "preference", "promise"]);
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map((tag: any) => ({
      category: allowed.has(String(tag?.category)) ? String(tag.category) : "recent",
      text: String(tag?.text || "").trim().slice(0, 120)
    }))
    .filter((tag) => {
      const key = `${tag.category}:${tag.text}`;
      if (!tag.text || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function normalizeMedium(value: unknown) {
  return value === "통화" || value === "카톡" || value === "식사" || value === "대면" || value === "메시지" || value === "기타" ? value : "기타";
}

function simulateAnalysis(scriptText: string, selectedName: string | undefined, todayStr: string, inputHash: string, meta: AiMeta) {
  const lower = scriptText.toLowerCase();
  const tags = extractLocalTags(scriptText);
  const family = /둘째|아들|딸|아이|자녀|출산|육아/.test(scriptText)
    ? [{ name: /둘째/.test(scriptText) ? "둘째" : "자녀", ageOrBirth: /9월/.test(scriptText) ? "9월 예정" : "", memo: "가족 관련 새 정보가 있음" }]
    : [];
  const medium = lower.includes("카톡") ? "카톡" : lower.includes("점심") || lower.includes("식사") ? "식사" : "기타";
  const summary = limitLines(buildLocalSummary(scriptText), 4);
  return {
    detectedPersonName: selectedName || "",
    lastContactDate: todayStr,
    lastContactMedium: medium,
    summary,
    briefing: summary,
    tags,
    newFamilyDetails: family,
    newMemoInsights: tags.map((tag) => tag.text).slice(0, 6),
    analysisHash: inputHash,
    analyzedAt: new Date().toISOString(),
    provider: meta.provider,
    model: meta.model,
    fallback: meta.fallback
  };
}

function simulateBriefing(records: any[], sourceHash: string, meta: AiMeta) {
  const text = records.map((record) => record.summary).join("\n");
  return {
    sourceHash,
    briefing: limitLines(buildLocalSummary(text), 4),
    tags: extractLocalTags(text),
    updatedAt: new Date().toISOString(),
    provider: meta.provider,
    model: meta.model,
    fallback: meta.fallback
  };
}

function extractLocalTags(text: string) {
  const tags: Array<{ category: string; text: string }> = [];
  const push = (category: string, value: string) => tags.push({ category, text: value });
  if (/골프|테니스|러닝|운동|캠핑|낚시/.test(text)) push(/골프|테니스|러닝|운동/.test(text) ? "hobby" : "interest", pickSentence(text, /골프|테니스|러닝|운동|캠핑|낚시/));
  if (/회사|부서|승진|이직|프로젝트|업무|팀장/.test(text)) push("work", pickSentence(text, /회사|부서|승진|이직|프로젝트|업무|팀장/));
  if (/아들|딸|자녀|둘째|출산|육아|배우자|가족/.test(text)) push("family", pickSentence(text, /아들|딸|자녀|둘째|출산|육아|배우자|가족/));
  if (/병원|수술|건강|아프|검사|통증/.test(text)) push("health", pickSentence(text, /병원|수술|건강|아프|검사|통증/));
  if (/[0-9]{1,2}월|다음 달|다음주|예정|기념일|생일/.test(text)) push("schedule", pickSentence(text, /[0-9]{1,2}월|다음 달|다음주|예정|기념일|생일/));
  if (/좋아|선호|맛집|커피|음식/.test(text)) push("preference", pickSentence(text, /좋아|선호|맛집|커피|음식/));
  if (/하기로|약속|만나기로/.test(text)) push("promise", pickSentence(text, /하기로|약속|만나기로/));
  if (!tags.length) push("recent", limitAiInput(text, 80));
  return normalizeTags(tags);
}

function buildLocalSummary(text: string) {
  const sentences = text
    .split(/[\n.。!?]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
  return sentences.length ? sentences.join("\n") : "최근 기록을 정리했습니다.";
}

function pickSentence(text: string, pattern: RegExp) {
  const sentence = text.split(/[\n.。!?]+/).find((line) => pattern.test(line)) || text;
  return sentence.trim().slice(0, 120);
}

function limitAiInput(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function limitLines(value: string, maxLines: number) {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n")
    .slice(0, 500);
}

function redactDirectIdentifiers(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+?82[-.\s]?)?0?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, "[phone]")
    .replace(/\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}/g, "[phone]");
}

function simpleHash(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `ai_${(hash >>> 0).toString(36)}`;
}
