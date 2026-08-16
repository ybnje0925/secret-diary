import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { buildCheckInCandidates, buildCheckInTopics, buildLocalStarters } from "./src/utils/checkInRecommendations";

dotenv.config();

export const app = express();
const PORT = Number(process.env.PORT) || 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PLACEHOLDER_KEYS = new Set(["MY_GEMINI_API_KEY", "YOUR_GEMINI_API_KEY", "your-gemini-api-key"]);

type AiReason =
  | "GEMINI_API_KEY_MISSING"
  | "GEMINI_API_KEY_PLACEHOLDER"
  | "GEMINI_REQUEST_FAILED"
  | "GEMINI_EMPTY_RESPONSE"
  | "INVALID_RESPONSE"
  | "RATE_LIMIT"
  | "MODEL_ERROR"
  | "INVALID_API_KEY"
  | "NO_CANDIDATES";

type AiMeta = {
  provider: "gemini" | "local";
  model?: string;
  fallback: boolean;
  reason?: AiReason;
};

// Pasted chat text only now (no more audio uploads), so a small limit is plenty.
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

// Initialize Gemini client lazily to avoid crashing if API key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    const keyStatus = getGeminiKeyStatus(apiKey);
    if (!keyStatus.configured) {
      console.warn(`[AI] GEMINI_API_KEY is not configured. reason=${keyStatus.reason}`);
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function getGeminiKeyStatus(apiKey = process.env.GEMINI_API_KEY) {
  const trimmed = String(apiKey || "").trim();
  if (!trimmed) return { configured: false, reason: "GEMINI_API_KEY_MISSING" as const };
  if (PLACEHOLDER_KEYS.has(trimmed) || /placeholder|your[_-]?key|sample/i.test(trimmed)) {
    return { configured: false, reason: "GEMINI_API_KEY_PLACEHOLDER" as const };
  }
  return { configured: true };
}

function localMeta(reason: AiReason): AiMeta {
  return { provider: "local", fallback: true, reason };
}

function geminiMeta(): AiMeta {
  return { provider: "gemini", model: GEMINI_MODEL, fallback: false };
}

function logAi(endpoint: string, meta: AiMeta, success: boolean) {
  const modelText = meta.model ? ` model=${meta.model}` : "";
  const reasonText = meta.reason ? ` reason=${meta.reason}` : "";
  console.log(`[AI][${endpoint}] provider=${meta.provider}${modelText} fallback=${meta.fallback}${reasonText} success=${success}`);
}

function classifyAiError(error: any): AiReason {
  const message = String(error?.message || error || "");
  const status = Number(error?.status || error?.code || error?.response?.status || 0);
  if (status === 401 || status === 403 || /API key not valid|permission|unauthorized|forbidden/i.test(message)) return "INVALID_API_KEY";
  if (status === 429 || /quota|rate limit|resource exhausted/i.test(message)) return "RATE_LIMIT";
  if (status === 404 || /model|not found|not supported/i.test(message)) return "MODEL_ERROR";
  if (/empty response/i.test(message)) return "GEMINI_EMPTY_RESPONSE";
  if (/JSON|parse|schema|invalid response/i.test(message)) return "INVALID_RESPONSE";
  return "GEMINI_REQUEST_FAILED";
}

async function generateGeminiJson(endpoint: string, params: Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">) {
  const keyStatus = getGeminiKeyStatus();
  if (!keyStatus.configured) {
    const error = new Error(keyStatus.reason);
    (error as any).aiReason = keyStatus.reason;
    throw error;
  }

  const ai = getGeminiClient();
  const aiResponse = await ai.models.generateContent({
    ...params,
    model: GEMINI_MODEL
  });
  const resultText = aiResponse.text;
  if (!resultText) {
    const error = new Error("Gemini empty response");
    (error as any).aiReason = "GEMINI_EMPTY_RESPONSE";
    throw error;
  }

  try {
    return JSON.parse(resultText);
  } catch (error) {
    const parseError = new Error("Gemini invalid JSON response");
    (parseError as any).cause = error;
    (parseError as any).aiReason = "INVALID_RESPONSE";
    throw parseError;
  }
}

function shouldUseLocalFallback(apiKey = process.env.GEMINI_API_KEY) {
  return !getGeminiKeyStatus(apiKey).configured;
}

function errorReason(error: any): AiReason {
  return error?.aiReason || classifyAiError(error);
}

app.get("/api/ai-health", async (_req, res) => {
  const keyStatus = getGeminiKeyStatus();
  if (!keyStatus.configured) {
    const meta = localMeta(keyStatus.reason);
    logAi("health", meta, true);
    return res.json({
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
    });
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "응답으로 OK만 반환",
      config: { temperature: 0, maxOutputTokens: 8 }
    });
    const ok = String(response.text || "").trim().toUpperCase().includes("OK");
    if (!ok) {
      const error = new Error("Gemini health returned unexpected response");
      (error as any).aiReason = "INVALID_RESPONSE";
      throw error;
    }
    const meta = geminiMeta();
    logAi("health", meta, true);
    res.json({
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
    });
  } catch (error: any) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("health", meta, false);
    res.json({
      success: true,
      configured: true,
      provider: "local-fallback",
      model: GEMINI_MODEL,
      reason,
      endpoints: {
        summarize: "fallback",
        checkInSuggestions: "fallback",
        checkInStarters: "fallback"
      },
      meta
    });
  }
});

// REST API for quick-capture text analysis (STT one-liner memo or pasted
// KakaoTalk/conversation text) using Gemini.
app.post("/api/summarize-text", async (req, res) => {
  try {
    const { scriptText, selectedPersonName } = req.body;
    const todayStr = new Date().toISOString().split("T")[0];

    if (!scriptText || !String(scriptText).trim()) {
      return res.status(400).json({ success: false, error: "분석할 텍스트가 필요합니다." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (shouldUseLocalFallback(apiKey)) {
      // Return a simulated mock intelligence if API key is missing or is placeholder,
      // so the app remains perfectly functional in local dev previews!
      const reason = getGeminiKeyStatus(apiKey).reason || "GEMINI_API_KEY_MISSING";
      const meta = localMeta(reason);
      logAi("summarize", meta, true);

      const simulatedResponse = simulateAnalysis(scriptText, selectedPersonName, todayStr);
      return res.json({
        success: true,
        data: simulatedResponse,
        simulated: true,
        meta
      });
    }

    const prompt = `
      당신은 친근하고 세심한 개인 비서 '용쨔'입니다.
      사용자가 지인과 나눈 대화(카톡 대화, 통화 후 한 줄 메모 등)의 텍스트를 입력했습니다. 이 텍스트를 분석하여 지인에 관한 핵심 요약 및 개인 정보를 정교하게 추출해 주세요.

      다음 세부 지침을 따라 분석해 주세요:
      1. 대화 속 상대방이 누구인지 분석합니다. (만약 선택된 인물명 '${selectedPersonName || ""}'이 제공되었다면 해당 인물 정보를 기준으로 분석하고, 그렇지 않다면 대화 내용에서 파악합니다.)
      2. 대화 내용의 핵심 줄거리 및 약속, 나눈 이야기 등을 3줄의 간결한 한글 요약으로 만들어 주세요. 각 요약은 독립된 3줄 문장 형태여야 합니다.
      3. 대화 일자는 대화에서 특별히 언급되지 않는 한 오늘 날짜인 '${todayStr}'로 기록하며, 연락 수단(통화, 카톡, 식사, 대면, 기타)을 문맥에서 파악해 지정해 주세요.
      4. 대화 중 새롭게 언급된 자녀나 배우자 정보가 있다면 추출해 주세요. (예: '첫째 아들 민우가 초등학교 들어갔어', '우리 딸 주아가 벌써 5살이야' -> name: '민우', ageOrBirth: '초등학교 입학', memo: '새 학교 적응 중' 등)
      5. 대화 중 파악한 상대방의 취미, 좋아하는 식성, 좋아하는 것, 건강 상태, 회사 업무 상태, 약속 메모 등이 있다면 'newMemoInsights' 리스트에 짤막한 요약 메모로 추가해 주세요. (예: '요즘 필라테스 시작했음', '아보카도 샐러드 좋아함', '가을에 제주도 여행 계획 중')

      분석할 대화 텍스트: "${scriptText}"
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        detectedPersonName: {
          type: Type.STRING,
          description: "대화 속에서 정보를 업데이트할 지인의 이름 (예: '김지현', '박민지' 등)"
        },
        lastContactDate: {
          type: Type.STRING,
          description: "최근 만남/통화 날짜 (형식: YYYY-MM-DD)"
        },
        lastContactMedium: {
          type: Type.STRING,
          description: "연락 수단. 다음 중 정확히 하나의 문자열이어야 함: '통화', '카톡', '식사', '대면', '기타'"
        },
        summary: {
          type: Type.STRING,
          description: "대화의 핵심 요약 3줄 (줄바꿈 문자 \\n로 연결된 3줄 문자열 또는 마크다운 줄바꿈이 들어간 3개 문장)"
        },
        newFamilyDetails: {
          type: Type.ARRAY,
          description: "새롭게 인지한 자녀 등 가족의 정보 리스트",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "자녀나 가족 구성원의 이름" },
              ageOrBirth: { type: Type.STRING, description: "나이, 생년월일 혹은 학년 (예: '7살', '초등 2학년')" },
              memo: { type: Type.STRING, description: "특이사항/학습/좋아하는 것 메모" }
            },
            required: ["name"]
          }
        },
        newMemoInsights: {
          type: Type.ARRAY,
          description: "취미, 관심사, 식성 등 새로 수집한 지인의 특징 키워드/메모 리스트",
          items: {
            type: Type.STRING
          }
        }
      },
      required: ["detectedPersonName", "lastContactDate", "lastContactMedium", "summary"]
    };

    const parsedData = await generateGeminiJson("summarize", {
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2
      }
    });

    const meta = geminiMeta();
    logAi("summarize", meta, true);
    res.json({
      success: true,
      data: parsedData,
      meta
    });

  } catch (error: any) {
    const { scriptText, selectedPersonName } = req.body || {};
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("summarize", meta, false);
    console.error("AI Analysis failed:", reason);
    res.json({
      success: true,
      data: simulateAnalysis(String(scriptText || ""), selectedPersonName, new Date().toISOString().split("T")[0]),
      fallback: true,
      error: "AI 연결이 불안정해 저장된 규칙으로 정리했어요.",
      meta
    });
  }
});

app.post("/api/check-in-suggestions", async (req, res) => {
  try {
    const { person } = req.body;
    if (!person?.name) {
      return res.status(400).json({ success: false, error: "선택한 사람 정보가 필요합니다." });
    }

    const candidates = buildCheckInCandidates(person).slice(0, 8);
    const localTopics = buildCheckInTopics(person);
    if (candidates.length === 0 || localTopics.length === 0) {
      const meta: AiMeta = { provider: "local", fallback: false, reason: "NO_CANDIDATES" };
      logAi("check-in", meta, true);
      return res.json({ success: true, data: { topics: [] }, meta });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (shouldUseLocalFallback(apiKey)) {
      const reason = getGeminiKeyStatus(apiKey).reason || "GEMINI_API_KEY_MISSING";
      const meta = localMeta(reason);
      logAi("check-in", meta, true);
      return res.json({ success: true, data: { topics: localTopics }, candidates, simulated: true, meta });
    }

    const prompt = `
You are helping with Saramdam, a relationship memory app.
The app already selected evidence-backed memory candidates.
Your job is only to turn selected candidates into natural Korean check-in topics and short questions.
Do not act as a fact finder. The app has already ranked what is worth recommending.

Rules:
- Use ONLY the provided candidates.
- Prefer higher finalScore candidates, but return fewer topics when evidence is weak.
- Do not invent names, family relations, ages, jobs, health status, or current situations.
- If current status is unknown, clearly frame it as a past record.
- Separate facts from suggested questions.
- Show a source for every topic.
- If evidence is weak, return fewer topics.
- Handle sensitive topics gently. Sensitive categories include health, family problems, job changes, money, death, conflict, illness.
- For sensitive topics, do not ask for a specific outcome. Suggest a soft check-in.
- Return at least 1 and at most 4 topics only when the evidence is enough.
- Keep the candidateId from the selected candidate. Do not use candidates not listed.
- Korean messages should sound like a real short KakaoTalk check-in, not a counselor or a formal business letter.
- suggestedQuestion must be directly usable as a message idea and must not state unverified outcomes.

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

    const responseSchema = {
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

    const parsed = await generateGeminiJson("check-in", {
      contents: [{ text: prompt }],
      config: { responseMimeType: "application/json", responseSchema, temperature: 0.2 }
    });

    const topics = refineAiTopics(parsed.topics || [], localTopics);
    const meta = geminiMeta();
    logAi("check-in", meta, true);
    res.json({ success: true, data: { topics: topics.length ? topics : localTopics }, candidates, meta });
  } catch (error: any) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("check-in", meta, false);
    console.error("Check-in suggestions failed:", reason);
    const fallbackPerson = req.body?.person;
    if (fallbackPerson?.name) {
      return res.json({
        success: true,
        data: { topics: buildCheckInTopics(fallbackPerson) },
        fallback: true,
        error: "AI 연결이 잠시 불안정해요. 저장된 기록으로 계속 사용할 수 있어요.",
        meta
      });
    }
    res.status(500).json({ success: false, error: "안부 주제를 불러오지 못했습니다.", meta });
  }
});

app.post("/api/check-in-starters", async (req, res) => {
  try {
    const { person, topic, tone } = req.body;
    if (!person?.name || !topic?.topic) {
      return res.status(400).json({ success: false, error: "사람과 주제 정보가 필요합니다." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (shouldUseLocalFallback(apiKey)) {
      const reason = getGeminiKeyStatus(apiKey).reason || "GEMINI_API_KEY_MISSING";
      const meta = localMeta(reason);
      logAi("starter", meta, true);
      return res.json({ success: true, data: buildLocalStarters(person, topic, tone), simulated: true, meta });
    }

    const prompt = `
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
- Do not auto-send anything.
- Keep each message short enough for KakaoTalk.
- Avoid counselor-like wording, long greetings, and technical app language.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        natural: { type: Type.STRING },
        friendly: { type: Type.STRING },
        polite: { type: Type.STRING }
      },
      required: ["natural", "friendly", "polite"]
    };

    const parsed = await generateGeminiJson("starter", {
      contents: [{ text: prompt }],
      config: { responseMimeType: "application/json", responseSchema, temperature: 0.4 }
    });

    const meta = geminiMeta();
    logAi("starter", meta, true);
    res.json({ success: true, data: parsed, meta });
  } catch (error: any) {
    const reason = errorReason(error);
    const meta = localMeta(reason);
    logAi("starter", meta, false);
    console.error("Check-in starters failed:", reason);
    const { person, topic, tone } = req.body || {};
    if (person?.name && topic?.topic) {
      return res.json({
        success: true,
        data: buildLocalStarters(person, topic, tone),
        fallback: true,
        error: "AI 연결이 잠시 불안정해요. 저장된 기록으로 계속 사용할 수 있어요.",
        meta
      });
    }
    res.status(500).json({ success: false, error: "대화 시작 문구를 불러오지 못했습니다.", meta });
  }
});

function refineAiTopics(rawTopics: any[], localTopics: any[]) {
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
      const key = String(topic.candidateId || topic.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function simulateCheckInTopics(person: any) {
  const topics: any[] = [];
  const history = Array.isArray(person.history) ? person.history : [];
  const children = person.familyInfo?.children || [];
  const preferences = person.preferences || {};

  history.slice(0, 3).forEach((item: any, index: number) => {
    const text = String(item.summary || "").split("\n")[0];
    if (!text) return;
    const sensitive = /수술|질병|아프|통증|병원|퇴사|이직|갈등|사망|장례|금전|걱정|힘들|스트레스/.test(text);
    topics.push({
      id: `sim-history-${index}`,
      icon: sensitive ? "❤️" : pickCheckInIcon(text),
      topic: sensitive ? "지난번 걱정했던 일" : makeCheckInTopicTitle(text),
      reason: sensitive ? "지난번 조심스럽게 안부를 전하면 좋을 이야기를 나눴어요." : text,
      source: `${item.date || "최근 기록"} · ${item.medium || "이야기"}`,
      sensitivity: sensitive ? "sensitive" : "normal",
      suggestedQuestion: sensitive
        ? "상황을 단정하지 말고 요즘은 조금 괜찮아졌는지 조심스럽게 물어보는 건 어떨까요?"
        : "그때 이야기했던 일은 요즘 어떤지 자연스럽게 물어보세요."
    });
  });

  children.slice(0, 2).forEach((child: any, index: number) => {
    if (!child.name && !child.memo) return;
    const sensitive = /아프|수술|걱정|병원|갈등/.test(child.memo || "");
    topics.push({
      id: `sim-family-${index}`,
      icon: "👧",
      topic: `${child.name || "가족"} 이야기`,
      reason: child.memo ? `${child.name}에 대해 이렇게 기록되어 있어요: ${child.memo}` : `${child.name}에 대한 가족 기록이 있어요.`,
      source: "가족 정보에서",
      sensitivity: sensitive ? "sensitive" : "normal",
      suggestedQuestion: sensitive ? "가족들은 요즘 잘 지내는지 부담스럽지 않게 물어보세요." : `${child.name}는 요즘 어떻게 지내는지 물어보세요.`
    });
  });

  if (preferences.hobbies) {
    topics.push({
      id: "sim-hobby",
      icon: pickCheckInIcon(preferences.hobbies),
      topic: makeCheckInTopicTitle(preferences.hobbies),
      reason: `${person.name}님은 ${preferences.hobbies}에 관심이 있어요.`,
      source: "취향 정보에서",
      sensitivity: "normal",
      suggestedQuestion: "요즘도 즐기고 있는지 자연스럽게 물어보세요."
    });
  }

  if (preferences.food) {
    topics.push({
      id: "sim-food",
      icon: "☕",
      topic: "좋아하는 것 이야기",
      reason: `${preferences.food}라고 기록되어 있어요.`,
      source: "취향 정보에서",
      sensitivity: "normal",
      suggestedQuestion: "최근에도 좋아하는 맛집이나 메뉴가 있는지 물어보세요."
    });
  }

  return topics.slice(0, 4);
}

function simulateCheckInStarters(person: any, topic: any, tone: string) {
  const respectful = String(person.category || "").includes("회사");
  const sensitive = topic.sensitivity === "sensitive";
  if (tone === "short") {
    return {
      natural: "오랜만이야! 문득 생각나서 연락했어. 잘 지내?",
      friendly: `${person.name}아 잘 지내? 생각나서 연락했어.`,
      polite: "오랜만이에요. 잘 지내고 계신가요?"
    };
  }
  return {
    natural: sensitive
      ? "오랜만이야. 지난번에 이야기했던 게 문득 생각났어. 요즘은 조금 괜찮아?"
      : `오랜만이야! 지난번에 ${topic.topic} 얘기했던 게 생각났어. 요즘은 어때?`,
    friendly: respectful
      ? `${person.name}님, 오랜만이에요. ${topic.topic} 이야기가 생각났는데 요즘은 어떠세요?`
      : `${person.name}아 갑자기 네 생각나서 ㅋㅋ ${sensitive ? "요즘은 좀 괜찮아?" : `${topic.topic}는 요즘도 이어가고 있어?`}`,
    polite: sensitive
      ? "오랜만이에요. 지난번에 이야기하셨던 일이 문득 생각났어요. 요즘은 조금 괜찮으신가요?"
      : `오랜만이에요. 지난번에 ${topic.topic} 이야기가 생각났어요. 요즘은 어떠세요?`
  };
}

function pickCheckInIcon(text: string) {
  if (/커피|카페|핸드드립/.test(text)) return "☕";
  if (/테니스|운동|축구|골프/.test(text)) return "🎾";
  if (/가족|딸|아들|아내|남편|아이/.test(text)) return "👧";
  if (/회사|업무|직장|이직/.test(text)) return "💼";
  if (/아프|건강|수술|병원|걱정/.test(text)) return "❤️";
  return "🌿";
}

function makeCheckInTopicTitle(text: string) {
  if (/커피|카페|핸드드립/.test(text)) return "요즘도 커피 즐겨요?";
  if (/테니스|운동/.test(text)) return "운동 이야기는 어때요?";
  if (/회사|업무|직장/.test(text)) return "요즘 일은 어때요?";
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
}

// Any unmatched /api/* request must fail as JSON, never fall through to the
// SPA's HTML catch-all — that HTML response is what breaks the frontend's
// response.json() call with "Unexpected token '<'" style parse errors.
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, error: "요청하신 API 엔드포인트를 찾을 수 없습니다." });
});

// Helper function to simulate analysis when GEMINI_API_KEY is not configured
function simulateAnalysis(scriptText: string, selectedName: string | undefined, todayStr: string) {
  const name = selectedName || "김민수";
  const textLower = scriptText.toLowerCase();

  if (textLower.includes("테니스") || textLower.includes("라켓") || textLower.includes("레슨")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "식사",
      summary: "오늘 만남에서 테니스 동호회 이야기를 주로 나누었습니다.\n최근 서브 리턴 연습을 시작하여 손목에 약간 무리가 왔다고 합니다.\n다음 달 동호회 정기 월례 대회에 함께 복식 파트너로 참가하기로 조율했습니다.",
      newFamilyDetails: [
        { name: "민지", ageOrBirth: "9살", memo: "최근 어린이 테니스 교실을 시작해서 아주 신나함" }
      ],
      newMemoInsights: [
        "테니스 구력 3년차, 주 2회 실내 연습장 다님",
        "라켓은 요넥스 제품 사용 중",
        "모임 후 삼겹살에 사이다 먹는 것을 최고로 좋아함"
      ]
    };
  } else if (textLower.includes("육아") || textLower.includes("어린이집") || textLower.includes("유치원") || textLower.includes("아들") || textLower.includes("딸")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "통화",
      summary: "자녀 육아 스트레스 및 유치원 추첨 관련 고민을 나누었습니다.\n첫째가 최근 영어 유치원에 완벽하게 적응하여 영어를 자주 쓴다고 합니다.\n다음 주 주말에 가족 동반으로 수목원에 나들이 가기로 제안했습니다.",
      newFamilyDetails: [
        { name: "예나", ageOrBirth: "6살", memo: "영어 유치원 블루반 입학하여 신나게 적응 중" },
        { name: "도윤", ageOrBirth: "3살", memo: "순하고 혼자서 블록 쌓기를 아주 잘함" }
      ],
      newMemoInsights: [
        "주말에는 주로 근외 카페나 수목원 등 야외 가족 나들이 선호",
        "커피는 디카페인 바닐라 라떼만 마심"
      ]
    };
  } else if (textLower.includes("회사") || textLower.includes("부장") || textLower.includes("업무") || textLower.includes("이직") || textLower.includes("프로젝트")) {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "대면",
      summary: "회사 프로젝트 마감 및 최근 조직 개편에 대해 이야기했습니다.\n새로 부임한 부서장과의 조율에 에너지를 많이 쓰고 있다고 털어놓았습니다.\n스트레스 해소를 위해 향후 주말 낚시 캠핑을 계획하고 있습니다.",
      newFamilyDetails: [],
      newMemoInsights: [
        "최근 잦은 야근으로 피로도가 매우 높음, 비타민에 관심 많음",
        "음식은 매콤한 아구찜이나 해물탕 선호"
      ]
    };
  } else {
    return {
      detectedPersonName: name,
      lastContactDate: todayStr,
      lastContactMedium: "통화",
      summary: `지인과 나눈 대화 속에서 주요 비즈니스 및 일상 근황을 나누었습니다.\n최근 근황과 취미에 집중된 대화였습니다.\n다음 만남 일정을 상호 긍정적으로 기약했습니다.`,
      newFamilyDetails: [
        { name: "지우", ageOrBirth: "8살", memo: "올해 초등학교 입학해서 태권도장 다님" }
      ],
      newMemoInsights: [
        "취미로 맛집 탐방과 골프 연습을 병행하고 있음",
        "자몽 에이드를 매우 좋아함"
      ]
    };
  }
}

// Serve Vite dev server or static distribution files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in development mode.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static distribution files in production mode.");
  }

  // Final safety net: guarantee every error response is JSON (never Express's
  // default HTML error page), e.g. body-parser's "entity too large" error.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const message =
      err.type === "entity.too.large"
        ? "입력한 텍스트가 너무 깁니다. 조금 줄여서 다시 시도해 주세요."
        : err.message || "서버 오류가 발생했습니다.";
    res.status(status).json({ success: false, error: message });
  });

  if (process.env.VERCEL === "1") return;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[사람談] Server running on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL === "1") {
  console.log("[사람談] Express app exported for Vercel Functions.");
} else {
  startServer();
}

export default app;
