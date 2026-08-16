import { GoogleGenAI, Type } from "@google/genai";
import type { CheckInRecommendationTopic } from "../src/utils/checkInRecommendations.js";
import { buildCheckInCandidates, buildCheckInTopics, buildLocalStarters } from "../src/utils/checkInRecommendations.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const PLACEHOLDER_KEYS = new Set(["MY_GEMINI_API_KEY", "YOUR_GEMINI_API_KEY", "your-gemini-api-key"]);

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
  | "NO_CANDIDATES";

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
  if (googleStatus === "RESOURCE_EXHAUSTED" || status === 429) {
    if (/quota|exceeded/i.test(message)) return "QUOTA_EXCEEDED";
    return "RATE_LIMIT";
  }
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
        checkInSuggestions: "fallback",
        checkInStarters: "fallback"
      },
      meta
    };
  }

  try {
    const response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: "Return exactly the plain text OK. Do not add anything else." }]
    });
    const healthText = String(response.text || "").trim();
    if (!healthText) {
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
        checkInSuggestions: "ok",
        checkInStarters: "ok"
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
        checkInSuggestions: "fallback",
        checkInStarters: "fallback"
      },
      meta
    };
  }
}

export async function summarizeText(body: any) {
  const { scriptText, selectedPersonName } = body || {};
  const todayStr = new Date().toISOString().split("T")[0];
  if (!scriptText || !String(scriptText).trim()) {
    return { status: 400, body: { success: false, error: "분석할 텍스트가 필요합니다." } };
  }

  if (shouldUseLocalFallback()) {
    const reason = getGeminiKeyStatus().reason || "GEMINI_API_KEY_MISSING";
    const meta = localMeta(reason);
    logAi("summarize", meta, true);
    return { body: { success: true, data: simulateAnalysis(scriptText, selectedPersonName, todayStr), simulated: true, meta } };
  }

  try {
    const parsedData = await generateGeminiJson({
      contents: [{ text: buildSummarizePrompt(scriptText, selectedPersonName, todayStr) }],
      config: {
        responseMimeType: "application/json",
        responseSchema: summarizeResponseSchema,
      }
    });
    const meta = geminiMeta();
    logAi("summarize", meta, true);
    return { body: { success: true, data: parsedData, meta } };
  } catch (error) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("summarize", meta, false);
    return {
      body: {
        success: true,
        data: simulateAnalysis(String(scriptText || ""), selectedPersonName, todayStr),
        fallback: true,
        error: "AI 연결이 불안정해 저장된 규칙으로 정리했어요.",
        meta
      }
    };
  }
}

export async function checkInSuggestions(body: any) {
  const { person } = body || {};
  if (!person?.name) {
    return { status: 400, body: { success: false, error: "선택한 사람 정보가 필요합니다." } };
  }

  const candidates = buildCheckInCandidates(person).slice(0, 8);
  const localTopics = buildCheckInTopics(person);
  if (candidates.length === 0 || localTopics.length === 0) {
    const meta: AiMeta = { provider: "local", fallback: false, reason: "NO_CANDIDATES" };
    logAi("check-in", meta, true);
    return { body: { success: true, data: { topics: [] }, meta } };
  }

  if (shouldUseLocalFallback()) {
    const reason = getGeminiKeyStatus().reason || "GEMINI_API_KEY_MISSING";
    const meta = localMeta(reason);
    logAi("check-in", meta, true);
    return { body: { success: true, data: { topics: localTopics }, candidates, simulated: true, meta } };
  }

  try {
    const parsed = await generateGeminiJson({
      contents: [{ text: buildCheckInPrompt(person, candidates) }],
      config: { responseMimeType: "application/json", responseSchema: checkInResponseSchema }
    });
    const topics = refineAiTopics(parsed.topics || [], localTopics);
    const meta = geminiMeta();
    logAi("check-in", meta, true);
    return { body: { success: true, data: { topics: topics.length ? topics : localTopics }, candidates, meta } };
  } catch (error) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("check-in", meta, false);
    return {
      body: {
        success: true,
        data: { topics: buildCheckInTopics(person) },
        fallback: true,
        error: "AI 연결이 잠시 불안정해요. 저장된 기록으로 계속 사용할 수 있어요.",
        meta
      }
    };
  }
}

export async function checkInStarters(body: any) {
  const { person, topic, tone } = body || {};
  if (!person?.name || !topic?.topic) {
    return { status: 400, body: { success: false, error: "사람과 주제 정보가 필요합니다." } };
  }

  if (shouldUseLocalFallback()) {
    const reason = getGeminiKeyStatus().reason || "GEMINI_API_KEY_MISSING";
    const meta = localMeta(reason);
    logAi("starter", meta, true);
    return { body: { success: true, data: buildLocalStarters(person, topic, tone), simulated: true, meta } };
  }

  try {
    const parsed = await generateGeminiJson({
      contents: [{ text: buildStarterPrompt(person, topic, tone) }],
      config: { responseMimeType: "application/json", responseSchema: starterResponseSchema }
    });
    const meta = geminiMeta();
    logAi("starter", meta, true);
    return { body: { success: true, data: parsed, meta } };
  } catch (error) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("starter", meta, false);
    return {
      body: {
        success: true,
        data: buildLocalStarters(person, topic, tone),
        fallback: true,
        error: "AI 연결이 잠시 불안정해요. 저장된 기록으로 계속 사용할 수 있어요.",
        meta
      }
    };
  }
}

function buildSummarizePrompt(scriptText: string, selectedPersonName: string | undefined, todayStr: string) {
  return `
    당신은 친근하고 세심한 개인 비서 '용쨔'입니다.
    사용자가 지인과 나눈 대화의 텍스트를 입력했습니다. 이 텍스트를 분석하여 지인에 관한 핵심 요약 및 개인 정보를 정교하게 추출해 주세요.

    지침:
    1. 선택된 인물명 '${selectedPersonName || ""}'이 있으면 해당 인물 정보를 기준으로 분석합니다.
    2. 핵심 줄거리 및 약속, 나눈 이야기를 3줄의 간결한 한글 요약으로 만들어 주세요.
    3. 대화 일자는 특별히 언급되지 않는 한 오늘 날짜인 '${todayStr}'로 기록하고, 연락 수단을 문맥에서 파악해 주세요.
    4. 새롭게 언급된 자녀나 배우자 정보가 있다면 추출해 주세요.
    5. 취미, 식성, 건강 상태, 회사 업무 상태, 약속 메모 등이 있다면 newMemoInsights에 짧게 추가해 주세요.

    분석할 대화 텍스트: "${scriptText}"
  `;
}

const summarizeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    detectedPersonName: { type: Type.STRING },
    lastContactDate: { type: Type.STRING },
    lastContactMedium: { type: Type.STRING },
    summary: { type: Type.STRING },
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
  required: ["detectedPersonName", "lastContactDate", "lastContactMedium", "summary"]
};

function buildCheckInPrompt(person: any, candidates: any[]) {
  return `
You are helping with Saramdam, a relationship memory app.
The app already selected evidence-backed memory candidates.
Your job is only to turn selected candidates into natural Korean check-in topics and short questions.
Do not act as a fact finder. The app has already ranked what is worth recommending.

Rules:
- Use ONLY the provided candidates.
- Prefer higher finalScore candidates, but return fewer topics when evidence is weak.
- Do not invent names, family relations, ages, jobs, health status, or current situations.
- If current status is unknown, clearly frame it as a past record.
- Show a source for every topic.
- Handle sensitive topics gently and do not ask for a specific outcome.
- Return at least 1 and at most 4 topics only when the evidence is enough.
- Keep the candidateId from the selected candidate. Do not use candidates not listed.
- Korean messages should sound like a real short KakaoTalk check-in.

Person context:
${JSON.stringify({ name: person.name, category: person.category, groups: person.groups, company: person.company, lastContactDate: person.lastContactDate })}

Evidence-backed candidates JSON:
${JSON.stringify(candidates.map(({ id, text, sourceType, sourceDate, source, category, sensitivity, recencyScore, followUpScore, repetitionScore, finalScore }) => ({
    id,
    text,
    sourceType,
    sourceDate,
    source,
    category,
    sensitivity,
    recencyScore,
    followUpScore,
    repetitionScore,
    finalScore
  })))}
  `;
}

const checkInResponseSchema = {
  type: Type.OBJECT,
  properties: {
    topics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          candidateId: { type: Type.STRING },
          icon: { type: Type.STRING },
          topic: { type: Type.STRING },
          reason: { type: Type.STRING },
          source: { type: Type.STRING },
          sensitivity: { type: Type.STRING, enum: ["normal", "sensitive"] },
          suggestedQuestion: { type: Type.STRING }
        },
        required: ["candidateId", "topic", "reason", "source", "sensitivity", "suggestedQuestion"]
      }
    }
  },
  required: ["topics"]
};

function buildStarterPrompt(person: any, topic: any, tone: string) {
  return `
Create 3 Korean conversation starter messages for Saramdam.
Use ONLY the selected topic and source. Do not add new facts.

Person context:
${JSON.stringify({ name: person.name, category: person.category, groups: person.groups, company: person.company })}

Selected topic:
${JSON.stringify(topic)}

Tone adjustment requested: ${tone || "casual"}

Rules:
- natural: warm and natural.
- friendly: a bit more casual if relationship allows, but do not force banmal only from category.
- polite: concise and respectful.
- If topic is sensitive, be gentle and do not assume outcomes.
- Do not mention facts not present in topic/source/person data.
- Keep each message short enough for KakaoTalk.
- Avoid counselor-like wording, long greetings, and technical app language.
  `;
}

const starterResponseSchema = {
  type: Type.OBJECT,
  properties: {
    natural: { type: Type.STRING },
    friendly: { type: Type.STRING },
    polite: { type: Type.STRING }
  },
  required: ["natural", "friendly", "polite"]
};

function refineAiTopics(rawTopics: any[], localTopics: CheckInRecommendationTopic[]) {
  const byCandidateId = new Map(localTopics.map((topic) => [topic.candidateId, topic]));
  const seen = new Set<string>();

  return rawTopics
    .map((topic) => {
      const base = byCandidateId.get(String(topic?.candidateId || ""));
      if (!base) return null;
      return {
        ...base,
        id: String(topic.id || base.id),
        icon: String(topic.icon || base.icon),
        topic: String(topic.topic || base.topic).slice(0, 40),
        reason: String(topic.reason || base.reason).slice(0, 120),
        source: base.source,
        sensitivity: base.sensitivity,
        suggestedQuestion: String(topic.suggestedQuestion || base.suggestedQuestion).slice(0, 140)
      };
    })
    .filter(Boolean)
    .filter((topic) => {
      const key = String(topic?.candidateId || topic?.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function simulateAnalysis(scriptText: string, selectedName: string | undefined, todayStr: string) {
  const name = selectedName || "김민수";
  const textLower = scriptText.toLowerCase();

  if (textLower.includes("테니스") || textLower.includes("라켓") || textLower.includes("레슨")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "식사",
      summary: "오늘 만남에서 테니스 동호회 이야기를 주로 나누었습니다.\n최근 서브 리턴 연습을 시작하여 손목에 약간 무리가 왔다고 합니다.\n다음 달 동호회 정기 월례 대회에 함께 복식 파트너로 참가하기로 조율했습니다.",
      newFamilyDetails: [{ name: "민지", ageOrBirth: "9살", memo: "최근 어린이 테니스 교실을 시작해서 아주 신나함" }],
      newMemoInsights: ["테니스 구력 3년차, 주 2회 실내 연습장 다님", "라켓은 요넥스 제품 사용 중"]
    };
  }

  if (textLower.includes("육아") || textLower.includes("어린이집") || textLower.includes("유치원") || textLower.includes("아들") || textLower.includes("딸")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "통화",
      summary: "자녀 육아와 새 환경 적응에 관한 이야기를 나누었습니다.\n가족 일정과 준비할 일을 함께 확인했습니다.\n다음 만남에서 부담 없이 후속 안부를 물어볼 수 있습니다.",
      newFamilyDetails: [{ name: "예나", ageOrBirth: "6살", memo: "새 환경 적응 이야기가 있었음" }],
      newMemoInsights: ["주말 가족 일정과 아이 적응에 관심이 있음"]
    };
  }

  return {
    detectedPersonName: name,
    lastContactDate: todayStr,
    lastContactMedium: "통화",
    summary: "지인과 일상 근황을 나누었습니다.\n최근 근황과 관심사에 관한 대화였습니다.\n다음 만남 일정을 긍정적으로 기약했습니다.",
    newFamilyDetails: [],
    newMemoInsights: ["최근 근황과 관심사를 가볍게 확인함"]
  };
}
